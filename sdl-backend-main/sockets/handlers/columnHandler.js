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

            // H14: 只接受真正屬於此 kanban 的欄位 ID（去重），client 漏掉的欄位依原順序補回，避免欄位「消失」
            const ownedColumns = await Column.findAll({ attributes: ['id'], where: { kanbanId: kanbanRow.id } });
            const ownedIds = new Set(ownedColumns.map(c => Number(c.id)));
            const oldOrder = Array.isArray(kanbanRow.column) ? kanbanRow.column : [];
            newOrder = [...new Set(newOrder.filter(id => ownedIds.has(id)))];
            for (const id of oldOrder) {
                if (ownedIds.has(Number(id)) && !newOrder.includes(Number(id))) newOrder.push(Number(id));
            }

            // 記錄列表重新排序
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
        // 注意：前端傳來的 kanbanId 實際上是 projectId
        const projectId = kanbanId;
        const columnId = Number(columnData?.id);

        try {
            if (!Number.isInteger(columnId)) {
                this.emitError('columnDelete', {
                    message: '缺少有效的列表 ID',
                    code: 'INVALID_COLUMN_ID'
                });
                return;
            }

            // 使用 Transaction 確保三步操作的原子性
            const t = await sequelize.transaction();
            let updatedColumns;
            let fileNamesToDelete = [];
            let columnName = columnData?.name || '未知列表';
            try {
                const kanban = await Kanban.findOne({
                    where: { projectId },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (!kanban) {
                    await t.rollback();
                    console.error("找不到 Kanban 記錄:", projectId);
                    this.emitError('columnDelete', {
                        message: 'Kanban 記錄不存在',
                        code: 'KANBAN_NOT_FOUND'
                    });
                    return;
                }

                // H14: 由 DB 反查欄位歸屬，確認它真的屬於聲稱的 projectId；不採信 client 傳來的 columnData
                const { status, column } = await this.loadColumnInProject(columnId, projectId, { transaction: t });
                const currentOrder = Array.isArray(kanban.column) ? kanban.column : [];
                const inOrder = currentOrder.some(id => Number(id) === columnId);

                if (status === 'MISMATCH') {
                    await t.rollback();
                    console.warn(`拒絕刪除列表 ${columnId}：不屬於專案 ${projectId}（user: ${deletedBy}）`);
                    this.emitError('columnDelete', {
                        message: '列表不屬於此專案',
                        code: 'RESOURCE_MISMATCH'
                    });
                    return;
                }

                if (status === 'NOT_FOUND' && !inOrder) {
                    await t.rollback();
                    this.emitError('columnDelete', {
                        message: '列表不存在，可能已被刪除',
                        code: 'COLUMN_NOT_FOUND'
                    });
                    return;
                }

                // 步驟 1: 更新 Kanban 表，移除欄位 ID（欄位 row 已不存在但殘留在順序陣列時，只做這步清理）
                updatedColumns = currentOrder.filter(id => Number(id) !== columnId);
                await kanban.update({ column: updatedColumns }, { transaction: t });

                if (column) {
                    columnName = column.name || columnName;

                    // 步驟 2: 刪除欄位中的所有任務；清單由 DB 依 columnId 反查，並順便收集要清理的 MinIO 檔案
                    const tasks = await Task.findAll({ where: { columnId: column.id }, lock: t.LOCK.UPDATE, transaction: t });
                    const taskIds = tasks.map(task => task.id);
                    try {
                        const { extractTaskFileNames } = require('../../utils/minioFileHelper');
                        for (const task of tasks) {
                            fileNamesToDelete.push(...extractTaskFileNames(task));
                        }
                        fileNamesToDelete = [...new Set(fileNamesToDelete)];
                    } catch (fileErr) {
                        console.warn('收集 MinIO 檔案清單錯誤:', fileErr.message);
                    }

                    if (taskIds.length > 0) {
                        console.log(`🗑️ 開始刪除欄位 ${columnName} 中的 ${taskIds.length} 個任務...`);
                        await Task.destroy({
                            where: { id: { [Op.in]: taskIds } },
                            transaction: t,
                            individualHooks: true,
                            req: data._reqContext
                        });
                    }

                    // 步驟 3: 刪除欄位本身
                    await Column.destroy({ where: { id: column.id }, transaction: t });
                }

                // 更新專案時間戳
                await Project.update({ updatedAt: new Date() }, { where: { id: projectId }, transaction: t });

                await t.commit();
            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }

            // Transaction commit 後才刪除 MinIO 檔案（不可回滾操作放最後）
            if (fileNamesToDelete.length > 0) {
                try {
                    const { batchDeleteMinioFiles } = require('../../utils/minioFileHelper');
                    console.log(`📁 欄位 ${columnName} 發現 ${fileNamesToDelete.length} 個檔案需要刪除`);
                    const deleteResult = await batchDeleteMinioFiles(fileNamesToDelete);
                    console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                } catch (fileCleanupError) {
                    console.warn('MinIO 檔案清理錯誤:', fileCleanupError.message);
                }
            }

            // 記錄列表刪除日誌（非關鍵路徑）
            try {
                await logColumnChange({
                    columnId: columnId,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: projectId,
                    description: `刪除了列表「${columnName}」及其包含的任務`
                });
            } catch (logError) {
                console.warn('列表刪除日誌記錄失敗:', logError.message);
            }

            // 廣播刪除事件
            this.broadcastToProject(projectId, "columnDeleted", {
                kanbanId,
                updatedColumns,
                deletedColumnId: columnId
            });

            console.log(`✅ 欄位和其任務刪除成功: ${columnName}`);

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