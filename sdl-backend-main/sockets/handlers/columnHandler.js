const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Column = require('../../models/column');
const Kanban = require('../../models/kanban');
const Task = require('../../models/task');
const Project = require('../../models/project');
const { logColumnChange, logColumnReorder } = require('../../utils/columnChangeLogger');
const { Op } = require('sequelize');
const sequelize = require('../../util/database');
const { buildKanbanData } = require('../../utils/kanbanHelper');

/**
 * 欄位(列表)相關 Socket 事件處理器
 */
class ColumnHandler {
    /**
     * 註冊所有欄位相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 創建欄位
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'ColumnCreated',
            this.handleColumnCreate,
            'write'
        );

        // 欄位順序變更
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'columnOrderChanged',
            this.handleColumnOrderChange,
            'write'
        );

        // 刪除欄位
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'ColumnDelete',
            this.handleColumnDelete,
            'write'
        );
    }

    /**
     * 處理欄位創建
     */
    static async handleColumnCreate(data) {
        const { projectId, newGroupName } = data;
        const createdBy = this.getCurrentUsername(data);

        try {
            // 使用 Transaction + Row Lock 確保 Kanban.column 陣列的原子更新
            const t = await sequelize.transaction();
            let newColumn, kanbanRow;
            try {
                // 鎖定 Kanban row 防止並發建立欄位覆蓋陣列
                kanbanRow = await Kanban.findOne({
                    where: { projectId },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (!kanbanRow) {
                    await t.rollback();
                    console.error(`找不到專案 ${projectId} 的 Kanban 記錄`);
                    this.emitError('columnCreate', {
                        message: 'Kanban 記錄不存在',
                        code: 'KANBAN_NOT_FOUND'
                    });
                    return;
                }

                // 創建新欄位
                newColumn = await Column.create({
                    name: newGroupName,
                    task: [],
                    kanbanId: kanbanRow.id
                }, { transaction: t });

                // 更新 Kanban 的欄位順序
                kanbanRow.column = [...(kanbanRow.column || []), newColumn.id];
                await kanbanRow.save({ transaction: t });

                // 更新專案時間戳
                await Project.update(
                    { updatedAt: new Date() },
                    { where: { id: projectId }, transaction: t }
                );

                await t.commit();
            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }

            // 記錄欄位創建日誌（非關鍵路徑）
            try {
                await logColumnChange({
                    columnId: newColumn.id,
                    changeType: 'create',
                    changedBy: createdBy,
                    projectId: projectId,
                    description: `創建了新列表「${newGroupName}」`
                });
            } catch (logError) {
                console.warn('列表創建日誌記錄失敗:', logError.message);
            }

            // 廣播創建成功事件（包含新列表資訊）
            this.broadcastToProject(projectId, "ColumnCreatedSuccess", {
                kanbanRow,
                newColumn: {
                    id: newColumn.id,
                    name: newColumn.name,
                    task: newColumn.task,
                    order: kanbanRow.column.length - 1
                }
            });

            // 廣播活動更新
            this.broadcastToProject(projectId, "activityUpdate", {
                type: 'create',
                user: createdBy,
                timestamp: new Date(),
                description: `建立了新列表「${newGroupName}」`
            });

            console.log(`列表創建成功: ${newColumn.id} - ${newGroupName}`);

        } catch (error) {
            console.error("處理欄位創建時出錯：", error);
            writeSocketErrorReport(error, 'ColumnCreated', this.socket.user);
            this.emitError('columnCreate', {
                message: '創建列表時發生錯誤',
                code: 'COLUMN_CREATE_ERROR'
            });
        }
    }

    /**
     * 處理欄位順序變更
     */
    static async handleColumnOrderChange(data) {
        const { projectId, columnOrder, kanbanData, kanbanId } = data;
        const changedBy = this.getCurrentUsername(data);
        const roomProjectId = projectId || kanbanId; // 向後相容

        try {
            // 計算新的欄位順序
            let newOrder = [];
            if (Array.isArray(columnOrder)) {
                newOrder = columnOrder.map(id => parseInt(id));
            } else if (Array.isArray(kanbanData)) {
                newOrder = kanbanData.map(c => parseInt(c.id));
            }

            const kanbanRow = await Kanban.findOne({ where: { projectId: roomProjectId } });
            if (!kanbanRow) {
                throw new Error('Kanban 記錄不存在');
            }

            // 記錄列表重新排序
            const oldOrder = kanbanRow.column;
            try {
                await logColumnReorder(oldOrder, newOrder, changedBy, roomProjectId);
            } catch (logError) {
                console.warn('列表重新排序日誌記錄失敗:', logError.message);
            }

            // 更新順序
            await Kanban.update({ column: newOrder }, { where: { id: kanbanRow.id } });
            await Project.update({ updatedAt: new Date() }, { where: { id: roomProjectId } });

            // 發送最新完整資料
            const latest = await buildKanbanData(roomProjectId);
            this.broadcastToProject(roomProjectId, "columnOrderUpdated", latest);

            // 廣播活動更新
            this.broadcastToProject(roomProjectId, "activityUpdate", {
                type: 'update',
                user: changedBy,
                timestamp: new Date(),
                description: `調整了列表順序`
            });

            console.log("✅ 欄位順序更新成功");

        } catch (error) {
            console.error("欄位順序變更錯誤:", error);
            writeSocketErrorReport(error, 'columnOrderChanged', this.socket.user);
            this.emitError('columnOrderChange', {
                message: '變更列表順序時發生錯誤',
                code: 'COLUMN_ORDER_ERROR'
            });
        }
    }

    /**
     * 處理欄位刪除
     */
    static async handleColumnDelete(data) {
        const { columnData, kanbanId } = data;
        const deletedBy = this.getCurrentUsername(data);

        try {
            // 注意：前端傳來的 kanbanId 實際上是 projectId
            const rawTasks = Array.isArray(columnData.task) ? columnData.task : [];
            const taskIds = rawTasks.map(t => (t && typeof t === 'object') ? t.id : t).filter(Boolean);

            // 先收集需要刪除的 MinIO 檔案名（在 Transaction 前讀取，commit 後再刪）
            let fileNamesToDelete = [];
            try {
                const { extractTaskFileNames } = require('../../utils/minioFileHelper');
                let tasksForCleanup = rawTasks;
                if (tasksForCleanup.length > 0 && (typeof tasksForCleanup[0] !== 'object' || tasksForCleanup[0] === null)) {
                    tasksForCleanup = await Task.findAll({ where: { id: { [Op.in]: taskIds } } });
                }
                for (const task of tasksForCleanup) {
                    fileNamesToDelete.push(...extractTaskFileNames(task));
                }
                fileNamesToDelete = [...new Set(fileNamesToDelete)];
            } catch (fileErr) {
                console.warn('收集 MinIO 檔案清單錯誤:', fileErr.message);
            }

            // 使用 Transaction 確保三步操作的原子性
            const t = await sequelize.transaction();
            let updatedColumns;
            try {
                const kanban = await Kanban.findOne({
                    where: { projectId: kanbanId },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (!kanban) {
                    await t.rollback();
                    console.error("找不到 Kanban 記錄:", kanbanId);
                    this.emitError('columnDelete', {
                        message: 'Kanban 記錄不存在',
                        code: 'KANBAN_NOT_FOUND'
                    });
                    return;
                }

                // 步驟 1: 更新 Kanban 表，移除欄位 ID
                updatedColumns = kanban.column.filter(columnId => columnId !== columnData.id);
                await kanban.update({ column: updatedColumns }, { transaction: t });

                // 步驟 2: 刪除欄位中的所有任務
                if (taskIds.length > 0) {
                    console.log(`🗑️ 開始刪除欄位 ${columnData.name} 中的 ${taskIds.length} 個任務...`);
                    await Task.destroy({
                        where: { id: { [Op.in]: taskIds } },
                        transaction: t,
                        individualHooks: true,
                        req: data._reqContext
                    });
                }

                // 步驟 3: 刪除欄位本身
                await Column.destroy({ where: { id: columnData.id }, transaction: t });

                // 更新專案時間戳
                await Project.update({ updatedAt: new Date() }, { where: { id: kanbanId }, transaction: t });

                await t.commit();
            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }

            // Transaction commit 後才刪除 MinIO 檔案（不可回滾操作放最後）
            if (fileNamesToDelete.length > 0) {
                try {
                    const { batchDeleteMinioFiles } = require('../../utils/minioFileHelper');
                    console.log(`📁 欄位 ${columnData.name} 發現 ${fileNamesToDelete.length} 個檔案需要刪除`);
                    const deleteResult = await batchDeleteMinioFiles(fileNamesToDelete);
                    console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                } catch (fileCleanupError) {
                    console.warn('MinIO 檔案清理錯誤:', fileCleanupError.message);
                }
            }

            // 記錄列表刪除日誌（非關鍵路徑）
            try {
                await logColumnChange({
                    columnId: columnData.id,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: kanbanId,
                    description: `刪除了列表「${columnData.name}」及其包含的任務`
                });
            } catch (logError) {
                console.warn('列表刪除日誌記錄失敗:', logError.message);
            }

            // 廣播刪除事件
            this.broadcastToProject(kanbanId, "columnDeleted", {
                kanbanId,
                updatedColumns,
                deletedColumnId: columnData.id
            });

            console.log(`✅ 欄位和其任務刪除成功: ${columnData.name}`);

        } catch (error) {
            console.error("處理欄位刪除錯誤:", error);
            writeSocketErrorReport(error, 'ColumnDelete', this.socket.user);
            this.emitError('columnDelete', {
                message: '刪除列表時發生錯誤',
                code: 'COLUMN_DELETE_ERROR'
            });
        }
    }
}

module.exports = ColumnHandler;