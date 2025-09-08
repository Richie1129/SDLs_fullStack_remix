const { SocketHandlerFactory } = require('../socketHandlers');
const Task = require('../../models/task');
const Column = require('../../models/column');
const Project = require('../../models/project');
const { logTaskChange, logFieldChanges } = require('../../utils/taskChangeLogger');
const { Op } = require('sequelize');
const sequelize = require('../../util/database');

/**
 * 任務相關 Socket 事件處理器
 * 重構自 index.js，消除重複代碼
 */
class TaskHandler {
    /**
     * 註冊所有任務相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 創建任務
        SocketHandlerFactory.registerProtectedEvent(
            socket, 
            'taskItemCreated', 
            this.handleTaskCreate, 
            'write'
        );

        // 更新任務
        SocketHandlerFactory.registerProtectedEvent(
            socket, 
            'cardUpdated', 
            this.handleTaskUpdate, 
            'write'
        );

        // 刪除任務
        SocketHandlerFactory.registerProtectedEvent(
            socket, 
            'cardDelete', 
            this.handleTaskDelete, 
            'write'
        );

        // 拖拽任務
        SocketHandlerFactory.registerProtectedEvent(
            socket, 
            'cardItemDragged', 
            this.handleTaskDrag, 
            'write'
        );

        // 任務提交
        SocketHandlerFactory.registerSimpleEvent(
            socket, 
            'taskSubmitted', 
            this.handleTaskSubmit
        );
    }

    /**
     * 處理任務創建
     */
    static async handleTaskCreate(data) {
        const { selectedcolumn, item, kanbanData, projectId } = data;
        const currentUser = this.getCurrentUser(data);
        const extractedOwner = currentUser?.username || "未知";

        try {
            const columnId = kanbanData[selectedcolumn]?.id;

            // 創建任務
            const createdTask = await Task.create({
                title: item.title,
                content: item.content,
                labels: item.labels || [],
                assignees: item.assignees || [],
                owner: extractedOwner,
                columnId: columnId,
            }, { req: data._reqContext });

            // 更新列表的任務陣列
            const column = await Column.findByPk(columnId);
            column.task = [...column.task, createdTask.id];
            await column.save();

            // 記錄任務創建日誌
            try {
                await logTaskChange({
                    taskId: createdTask.id,
                    changeType: 'create',
                    changedBy: extractedOwner,
                    projectId: projectId,
                    description: `在「${kanbanData[selectedcolumn]?.name || '未知列表'}」中創建了任務「${createdTask.title}」`
                });
            } catch (logError) {
                console.warn('任務創建日誌記錄失敗:', logError.message);
            }

            // 更新專案時間戳
            await Project.update({ id: projectId }, {
                where: { id: projectId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播任務創建事件
            this.broadcastToProject(projectId, "taskItemCreated", {
                taskId: createdTask.id,
                columnId: columnId,
                projectId: projectId
            });

            // 廣播活動更新
            this.broadcastToProject(projectId, "activityUpdate", {
                type: 'create',
                taskId: createdTask.id,
                taskTitle: createdTask.title,
                user: extractedOwner,
                timestamp: new Date(),
                columnName: kanbanData[selectedcolumn]?.name || '未知列表',
                taskDetails: {
                    content: createdTask.content,
                    labels: createdTask.labels,
                    assignees: createdTask.assignees
                }
            });

            console.log(`✅ 任務創建成功: ${createdTask.id} - ${createdTask.title}`);

        } catch (error) {
            console.error("創建任務錯誤:", error);
            this.emitError('taskItemCreated', { 
                message: '創建任務時發生錯誤',
                code: 'TASK_CREATE_ERROR'
            });
        }
    }

    /**
     * 處理任務更新
     */
    static async handleTaskUpdate(data) {
        const { cardData, projectId } = data;
        const currentUser = this.getCurrentUser(data);
        const changedBy = currentUser?.username || cardData.owner || "未知";

        try {
            // 取得原始資料以比較變更
            const originalTask = await Task.findByPk(cardData.id);

            // 使用交易更新任務
            const t = await sequelize.transaction();
            try {
                const updateTask = await Task.update({
                    ...cardData,
                    files: cardData.files || [],
                    images: cardData.images || []
                }, {
                    where: { id: cardData.id },
                    transaction: t,
                    individualHooks: true,
                    req: data._reqContext
                });

                // 同步更新關聯評論的反正規化快照
                if (originalTask && (originalTask.title !== cardData.title || originalTask.content !== cardData.content)) {
                    const Comment = require('../../models/comment');
                    await Comment.update(
                        { task_title: cardData.title, task_content: cardData.content },
                        { where: { taskId: cardData.id }, transaction: t }
                    );
                }

                await t.commit();

                // 記錄欄位變更
                if (originalTask) {
                    await logFieldChanges(
                        originalTask.dataValues, 
                        cardData, 
                        cardData.id, 
                        changedBy, 
                        projectId
                    );
                }

                // 更新專案時間戳
                await Project.update({ id: projectId }, {
                    where: { id: projectId },
                    individualHooks: true,
                    req: data._reqContext
                });

                // 廣播更新事件
                this.broadcastToProject(projectId, "taskItem", updateTask);

                // 廣播活動更新
                const taskColumn = await Column.findOne({
                    where: { id: originalTask.columnId },
                    attributes: ['id', 'name']
                });

                this.broadcastToProject(projectId, "activityUpdate", {
                    type: 'update',
                    taskId: cardData.id,
                    taskTitle: cardData.title,
                    user: changedBy,
                    timestamp: new Date(),
                    columnName: taskColumn?.name || '未知列表'
                });

                console.log(`✅ 任務更新成功: ${cardData.id} - ${cardData.title}`);

            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }

        } catch (error) {
            console.error("更新任務錯誤:", error);
            this.emitError('taskUpdate', { 
                message: '更新任務時發生錯誤',
                code: 'TASK_UPDATE_ERROR'
            });
        }
    }

    /**
     * 處理任務刪除
     */
    static async handleTaskDelete(data) {
        const { cardData, columnIndex, projectId } = data;
        const currentUser = this.getCurrentUser(data);
        const deletedBy = currentUser?.username || cardData.owner || "未知";

        try {
            // 以任務自身的 columnId 為準
            const taskRow = await Task.findByPk(cardData.id);
            let columnIdToUse = taskRow?.columnId || columnIndex;
            const column = columnIdToUse ? await Column.findByPk(columnIdToUse) : null;

            if (!column) {
                console.error('找不到對應的列表');
                this.emitError('taskDelete', { 
                    message: '找不到對應的列表',
                    code: 'COLUMN_NOT_FOUND'
                });
                return;
            }

            console.log(`🗑️ 開始刪除任務 ${cardData.id}...`);

            // 清理 MinIO 檔案
            try {
                const { extractTaskFileNames, batchDeleteMinioFiles } = require('../../utils/minioFileHelper');
                const fileNames = extractTaskFileNames(cardData);
                
                if (fileNames.length > 0) {
                    console.log(`📁 發現 ${fileNames.length} 個檔案需要刪除:`, fileNames);
                    const deleteResult = await batchDeleteMinioFiles(fileNames);
                    console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                }
            } catch (fileCleanupError) {
                console.warn('MinIO 檔案清理錯誤:', fileCleanupError.message);
            }

            // 記錄任務刪除日誌
            try {
                await logTaskChange({
                    taskId: cardData.id,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: projectId,
                    description: `刪除任務「${cardData.title}」`
                });
            } catch (logError) {
                console.warn('任務刪除日誌記錄失敗:', logError.message);
            }

            // 從列表中移除任務ID
            const updatedTasks = (Array.isArray(column.task) ? column.task : [])
                .filter(taskId => Number(taskId) !== Number(cardData.id));

            await column.update({ task: updatedTasks });

            // 刪除任務記錄
            const deletedRowCount = await Task.destroy({
                where: { id: cardData.id },
                individualHooks: true,
                req: data._reqContext
            });

            // 更新專案時間戳
            await Project.update(
                { updatedAt: new Date() },
                {
                    where: { id: projectId },
                    individualHooks: true,
                    req: data._reqContext
                }
            );

            // 廣播刪除事件
            this.broadcastToProject(projectId, "taskDeleted", {
                taskId: cardData.id,
                columnId: columnIdToUse,
                deletedBy: deletedBy
            });

            this.broadcastToProject(projectId, "activityUpdate", {
                type: 'delete',
                taskId: cardData.id,
                taskTitle: cardData.title,
                user: deletedBy,
                timestamp: new Date(),
                columnName: column.name,
                taskDetails: {
                    content: cardData.content,
                    labels: cardData.labels,
                    assignees: cardData.assignees
                }
            });

            console.log(`✅ 任務 ${cardData.id} 刪除完成，影響 ${deletedRowCount} 行`);

        } catch (error) {
            console.error('任務刪除錯誤:', error);
            this.emitError('taskDelete', { 
                message: '刪除任務時發生錯誤',
                code: 'TASK_DELETE_ERROR'
            });
        }
    }

    /**
     * 處理任務拖拽
     */
    static async handleTaskDrag(data) {
        const { destination, source, projectId, taskId } = data;

        try {
            const sourceColumnId = parseInt(source.columnId);
            const destColumnId = parseInt(destination.columnId);
            
            console.log(`🔄 拖拽任務 ${taskId} 從列表 ${sourceColumnId} 移動到列表 ${destColumnId}`);

            // 載入來源與目標欄位
            const sourceColumn = await Column.findByPk(sourceColumnId);
            const destColumn = sourceColumnId === destColumnId ? sourceColumn : await Column.findByPk(destColumnId);
            
            if (!sourceColumn || !destColumn) {
                console.error(`找不到來源或目標欄位: source=${sourceColumnId}, dest=${destColumnId}`);
                return;
            }

            // 重排任務陣列
            const sourceTasks = Array.isArray(sourceColumn.task) ? [...sourceColumn.task] : [];
            const destTasks = sourceColumnId === destColumnId ? sourceTasks : (Array.isArray(destColumn.task) ? [...destColumn.task] : []);

            // 從來源移除
            const taskIndexInSource = sourceTasks.indexOf(parseInt(taskId));
            if (taskIndexInSource > -1) {
                sourceTasks.splice(taskIndexInSource, 1);
            }

            // 插入到目標位置
            const insertAt = Math.max(0, Math.min(destination.index, destTasks.length));
            destTasks.splice(insertAt, 0, parseInt(taskId));

            // 記錄移動操作（只有跨列表移動才記錄）
            if (sourceColumnId !== destColumnId) {
                const changedBy = this.getCurrentUsername(data);
                
                try {
                    const movedTask = await Task.findByPk(taskId);
                    await logTaskChange({
                        taskId: taskId,
                        changeType: 'move',
                        fieldName: 'column',
                        changedBy,
                        projectId: projectId,
                        oldValue: sourceColumn.name,
                        newValue: destColumn.name,
                        description: `將任務「${movedTask?.title || taskId}」從「${sourceColumn.name}」移動到「${destColumn.name}」`
                    });
                } catch (logError) {
                    console.warn('任務拖拽日誌記錄失敗:', logError.message);
                }
            }

            // 更新數據庫
            await Column.update({ task: sourceTasks }, { 
                where: { id: sourceColumnId }, 
                individualHooks: true, 
                req: data._reqContext 
            });
            
            if (sourceColumnId !== destColumnId) {
                await Column.update({ task: destTasks }, { 
                    where: { id: destColumnId }, 
                    individualHooks: true, 
                    req: data._reqContext 
                });
                await Task.update({ columnId: destColumnId }, { 
                    where: { id: taskId }, 
                    individualHooks: true, 
                    req: data._reqContext 
                });
            }

            // 更新專案時間戳
            await Project.update({ id: projectId }, {
                where: { id: projectId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播更新
            const { buildKanbanData } = require('../../utils/kanbanHelper');
            const latest = await buildKanbanData(projectId);
            this.broadcastToProject(projectId, "dragtaskItem", latest);

            // 廣播活動更新（只有跨列表移動）
            if (sourceColumnId !== destColumnId) {
                this.broadcastToProject(projectId, "activityUpdate", {
                    type: 'move',
                    taskId: taskId,
                    user: this.getCurrentUsername(data),
                    from: sourceColumn.name,
                    to: destColumn.name,
                    timestamp: new Date()
                });
            }

            console.log(`✅ 拖拽操作完成: 任務 ${taskId}`);

        } catch (error) {
            console.error('任務拖拽錯誤:', error);
            this.emitError('taskDrag', { 
                message: '拖拽任務時發生錯誤',
                code: 'TASK_DRAG_ERROR'
            });
        }
    }

    /**
     * 處理任務提交
     */
    static async handleTaskSubmit(data) {
        console.log('Task submitted:', data);
        this.socket.broadcast.emit('refreshKanban', data);
    }
}

module.exports = TaskHandler;