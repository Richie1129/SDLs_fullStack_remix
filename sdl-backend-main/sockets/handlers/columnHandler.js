const { SocketHandlerFactory } = require('../socketHandlers');
const Column = require('../../models/column');
const Kanban = require('../../models/kanban');
const Task = require('../../models/task');
const Project = require('../../models/project');
const { logColumnChange, logColumnReorder } = require('../../utils/columnChangeLogger');
const { Op } = require('sequelize');
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
            // 找到對應的 Kanban 記錄
            const kanbanRow = await Kanban.findOne({ where: { projectId } });
            if (!kanbanRow) {
                console.error(`找不到專案 ${projectId} 的 Kanban 記錄`);
                this.emitError('columnCreate', { 
                    message: 'Kanban 記錄不存在',
                    code: 'KANBAN_NOT_FOUND'
                });
                return;
            }

            // 創建新欄位
            const newColumn = await Column.create({
                name: newGroupName,
                task: [],
                kanbanId: kanbanRow.id
            });

            // 記錄欄位創建日誌
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

            // 更新 Kanban 的欄位順序
            kanbanRow.column = [...(kanbanRow.column || []), newColumn.id];
            await kanbanRow.save();

            // 更新專案時間戳
            await Project.update({ id: projectId }, {
                where: { id: projectId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播創建成功事件
            this.broadcastToProject(projectId, "ColumnCreatedSuccess", kanbanRow);

            // 廣播活動更新
            this.broadcastToProject(projectId, "activityUpdate", {
                type: 'create',
                user: createdBy,
                timestamp: new Date(),
                description: `建立了新列表「${newGroupName}」`
            });

            console.log(`✅ 列表創建成功: ${newColumn.id} - ${newGroupName}`);

        } catch (error) {
            console.error("處理欄位創建時出錯：", error);
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
            await Project.update({ id: roomProjectId }, { 
                where: { id: roomProjectId }, 
                individualHooks: true, 
                req: data._reqContext 
            });

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
            const kanban = await Kanban.findOne({ where: { projectId: kanbanId } });

            if (!kanban) {
                console.error("找不到 Kanban 記錄:", kanbanId);
                this.emitError('columnDelete', { 
                    message: 'Kanban 記錄不存在',
                    code: 'KANBAN_NOT_FOUND'
                });
                return;
            }

            // 更新 Kanban 表，移除欄位ID
            const updatedColumns = kanban.column.filter(columnId => columnId !== columnData.id);
            await kanban.update({ column: updatedColumns });

            // 刪除欄位中的所有任務
            try {
                const rawTasks = Array.isArray(columnData.task) ? columnData.task : [];
                const taskIds = rawTasks.map(t => (t && typeof t === 'object') ? t.id : t).filter(Boolean);
                
                console.log(`🗑️ 開始刪除欄位 ${columnData.name} 中的 ${taskIds.length} 個任務及其檔案...`);

                // 批量清理 MinIO 檔案
                try {
                    const { extractTaskFileNames, batchDeleteMinioFiles } = require('../../utils/minioFileHelper');
                    const allFileNames = [];
                    let tasksForCleanup = rawTasks;
                    
                    // 若為 ID 陣列，從資料庫取回完整任務資料
                    if (tasksForCleanup.length > 0 && (typeof tasksForCleanup[0] !== 'object' || tasksForCleanup[0] === null)) {
                        tasksForCleanup = await Task.findAll({ where: { id: { [Op.in]: taskIds } } });
                    }
                    
                    for (const task of tasksForCleanup) {
                        const taskFileNames = extractTaskFileNames(task);
                        allFileNames.push(...taskFileNames);
                    }

                    // 移除重複的檔案名
                    const uniqueFileNames = [...new Set(allFileNames)];
                    
                    if (uniqueFileNames.length > 0) {
                        console.log(`📁 欄位 ${columnData.name} 發現 ${uniqueFileNames.length} 個檔案需要刪除:`, uniqueFileNames);
                        const deleteResult = await batchDeleteMinioFiles(uniqueFileNames);
                        console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                    }
                } catch (fileCleanupError) {
                    console.warn('MinIO 檔案清理錯誤:', fileCleanupError.message);
                }

                // 刪除任務記錄
                const deleteTasks = await Task.destroy({
                    where: { id: { [Op.in]: taskIds } },
                    individualHooks: true,
                    req: data._reqContext
                });

                console.log(`✅ 已成功删除任務，任務ID:`, taskIds);

            } catch (error) {
                console.error("删除任務時發生錯誤:", error);
            }

            // 記錄列表刪除日誌
            try {
                await logColumnChange({
                    columnId: columnData.id,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: kanbanId, // 注意：這裡的 kanbanId 實際上是 projectId
                    description: `刪除了列表「${columnData.name}」及其包含的任務`
                });
            } catch (logError) {
                console.warn('列表刪除日誌記錄失敗:', logError.message);
            }

            // 刪除欄位本身
            await Column.destroy({ where: { id: columnData.id } });
            
            await Project.update({ id: kanbanId }, {
                where: { id: kanbanId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播刪除事件
            this.broadcastToProject(kanbanId, "columnDeleted", { 
                kanbanId, 
                updatedColumns, 
                deletedColumnId: columnData.id 
            });

            console.log(`✅ 欄位和其任務刪除成功: ${columnData.name}`);

        } catch (error) {
            console.error("處理欄位刪除錯誤:", error);
            this.emitError('columnDelete', { 
                message: '刪除列表時發生錯誤',
                code: 'COLUMN_DELETE_ERROR'
            });
        }
    }
}

module.exports = ColumnHandler;