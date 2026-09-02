const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Task = require('../../models/task');
const Column = require('../../models/column');
const Kanban = require('../../models/kanban');
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
            
            if (!columnId) {
                console.error(`❌ 任務創建失敗: 找不到列表 (selectedcolumn: ${selectedcolumn})`);
                console.error('kanbanData:', kanbanData?.map(col => ({ id: col.id, name: col.name })));
                this.emitError('taskItemCreated', {
                    message: '找不到目標列表',
                    code: 'COLUMN_NOT_FOUND'
                });
                return;
            }

            console.log(`📝 Creating task "${item.title}" in column ${columnId} (index: ${selectedcolumn})`);

            // 使用 Transaction + Row Lock 確保原子性
            const t = await sequelize.transaction();
            let createdTask;
            try {
                createdTask = await Task.create({
                    title: item.title,
                    content: item.content,
                    labels: item.labels || [],
                    assignees: item.assignees || [],
                    owner: extractedOwner,
                    columnId: columnId,
                }, { transaction: t, req: data._reqContext });

                // 鎖定 Column row 後更新任務陣列，防止並發寫入覆蓋
                const column = await Column.findByPk(columnId, {
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });
                if (!column) {
                    throw new Error(`列表 ${columnId} 已被刪除`);
                }
                column.task = [...column.task, createdTask.id];
                await column.save({ transaction: t });

                await t.commit();
            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }

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
            await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });

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
            writeSocketErrorReport(error, 'taskItemCreated', this.socket.user);
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
            // 使用交易更新任務
            const t = await sequelize.transaction();
            try {
                // H14: 在 transaction 內由 DB 反查歸屬（fail-closed：查不到所屬專案一律拒絕）
                const { status, task: originalTask } = await this.loadTaskInProject(cardData.id, projectId, { transaction: t });
                if (status === 'NOT_FOUND') {
                    await t.rollback();
                    this.emitError('taskUpdate', { message: '任務不存在', code: 'TASK_NOT_FOUND' });
                    return;
                }
                if (status !== 'OK') {
                    await t.rollback();
                    this.emitError('taskUpdate', { message: '任務不屬於此專案', code: 'RESOURCE_MISMATCH' });
                    return;
                }

                // R2-H6: Task.update 回傳 [affectedCount]，改用 reload 取得實際資料
                await Task.update({
                    title: cardData.title,
                    content: cardData.content,
                    labels: cardData.labels,
                    assignees: cardData.assignees,
                    owner: cardData.owner,
                    dueDate: cardData.dueDate,
                    files: cardData.files || [],
                    images: cardData.images || [],
                }, {
                    where: { id: cardData.id },
                    transaction: t,
                    individualHooks: true,
                    req: data._reqContext
                });
                const updatedTask = await Task.findByPk(cardData.id, { transaction: t });

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
                await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });

                // 廣播更新事件（R2-H6: 廣播實際 Task 資料而非 affectedCount）
                this.broadcastToProject(projectId, "taskItem", updatedTask);

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
            writeSocketErrorReport(error, 'cardUpdated', this.socket.user);
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
        const { cardData, projectId } = data;
        const currentUser = this.getCurrentUser(data);
        const deletedBy = currentUser?.username || cardData?.owner || "未知";
        const taskId = cardData?.id;

        try {
            // 使用 Transaction + Row Lock 確保 Column 陣列更新與 Task 刪除的原子性
            const t = await sequelize.transaction();
            let columnIdToUse, columnName, taskRow;
            let fileNamesToDelete = [];
            try {
                // H14: 由 DB 反查任務歸屬，確認它真的屬於聲稱的 projectId；不採信 client 傳來的 cardData
                const { status, task } = await this.loadTaskInProject(taskId, projectId, { transaction: t });

                if (status === 'NOT_FOUND') {
                    await t.rollback();
                    this.emitError('taskDelete', {
                        message: '任務不存在，可能已被刪除',
                        code: 'TASK_NOT_FOUND'
                    });
                    return;
                }

                if (status !== 'OK') {
                    await t.rollback();
                    console.warn(`拒絕刪除任務 ${taskId}：不屬於專案 ${projectId}（user: ${deletedBy}）`);
                    this.emitError('taskDelete', {
                        message: '任務不屬於此專案',
                        code: 'RESOURCE_MISMATCH'
                    });
                    return;
                }

                taskRow = task;
                columnIdToUse = taskRow.columnId;

                // 需要清理的 MinIO 檔案一律取自 DB 內的任務資料（Transaction 內讀取，commit 後再刪）
                try {
                    const { extractTaskFileNames } = require('../../utils/minioFileHelper');
                    fileNamesToDelete = extractTaskFileNames(taskRow);
                } catch (fileErr) {
                    console.warn('收集 MinIO 檔案清單錯誤:', fileErr.message);
                }

                // 鎖定 Column row 防止並發刪除覆蓋陣列
                const column = await Column.findByPk(columnIdToUse, {
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (!column) {
                    await t.rollback();
                    console.error('找不到對應的列表');
                    this.emitError('taskDelete', {
                        message: '找不到對應的列表',
                        code: 'COLUMN_NOT_FOUND'
                    });
                    return;
                }

                columnName = column.name || '未知列表';
                console.log(`開始刪除任務 ${taskId}...`);

                // 從列表中移除任務 ID
                column.task = (Array.isArray(column.task) ? column.task : [])
                    .filter(id => Number(id) !== Number(taskId));
                await column.save({ transaction: t });

                // 刪除任務記錄
                await Task.destroy({
                    where: { id: taskId },
                    transaction: t,
                    individualHooks: true,
                    req: data._reqContext
                });

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

            // Transaction commit 後才刪除 MinIO 檔案（不可回滾操作放最後）
            if (fileNamesToDelete.length > 0) {
                try {
                    const { batchDeleteMinioFiles } = require('../../utils/minioFileHelper');
                    console.log(`發現 ${fileNamesToDelete.length} 個檔案需要刪除`);
                    const deleteResult = await batchDeleteMinioFiles(fileNamesToDelete);
                    console.log(`MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                } catch (fileCleanupError) {
                    console.warn('MinIO 檔案清理錯誤:', fileCleanupError.message);
                }
            }

            // 記錄任務刪除日誌（非關鍵路徑；標題取自 DB）
            try {
                await logTaskChange({
                    taskId: taskId,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: projectId,
                    description: `在「${columnName}」中刪除任務「${taskRow.title}」`
                });
            } catch (logError) {
                console.warn('任務刪除日誌記錄失敗:', logError.message);
            }

            // 廣播刪除事件
            this.broadcastToProject(projectId, "taskDeleted", {
                taskId: taskId,
                columnId: columnIdToUse,
                deletedBy: deletedBy
            });

            this.broadcastToProject(projectId, "activityUpdate", {
                type: 'delete',
                taskId: taskId,
                taskTitle: taskRow.title,
                user: deletedBy,
                timestamp: new Date(),
                columnName: columnName,
                taskDetails: {
                    content: taskRow.content,
                    labels: taskRow.labels,
                    assignees: taskRow.assignees
                }
            });

            console.log(`任務 ${taskId} 刪除完成`);

        } catch (error) {
            console.error('任務刪除錯誤:', error);
            writeSocketErrorReport(error, 'cardDelete', this.socket.user);
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

            // 使用 Transaction + Row Lock 確保原子性，防止並發拖曳覆蓋
            const t = await sequelize.transaction();
            let sourceColumn, destColumn, sourceTasks, destTasks;
            try {
                // H14: 任務與來源／目標欄位都必須屬於聲稱的 projectId，否則可跨專案搬運任務（等同讀取他人資料）
                const taskCheck = await this.loadTaskInProject(taskId, projectId, { transaction: t });
                const sourceCheck = await this.loadColumnInProject(sourceColumnId, projectId, { transaction: t });
                const destCheck = await this.loadColumnInProject(destColumnId, projectId, { transaction: t });
                if (taskCheck.status !== 'OK' || sourceCheck.status !== 'OK' || destCheck.status !== 'OK') {
                    await t.rollback();
                    console.warn(`拒絕拖曳任務 ${taskId}（${sourceColumnId} → ${destColumnId}）：資源不屬於專案 ${projectId}`);
                    this.emitError('taskDrag', {
                        message: '任務或列表不屬於此專案',
                        code: 'RESOURCE_MISMATCH'
                    });
                    return;
                }

                // 一致的 lock ordering（永遠先鎖 ID 較小的欄位）防止 deadlock
                if (sourceColumnId === destColumnId) {
                    sourceColumn = await Column.findByPk(sourceColumnId, {
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });
                    destColumn = sourceColumn;
                } else {
                    const [firstId, secondId] = sourceColumnId < destColumnId
                        ? [sourceColumnId, destColumnId]
                        : [destColumnId, sourceColumnId];

                    const firstCol = await Column.findByPk(firstId, {
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });
                    const secondCol = await Column.findByPk(secondId, {
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });

                    sourceColumn = sourceColumnId === firstId ? firstCol : secondCol;
                    destColumn = destColumnId === firstId ? firstCol : secondCol;
                }

                if (!sourceColumn || !destColumn) {
                    await t.rollback();
                    console.error(`找不到來源或目標欄位: source=${sourceColumnId}, dest=${destColumnId}`);
                    this.emitError('taskDrag', {
                        message: '找不到來源或目標欄位',
                        code: 'COLUMN_NOT_FOUND'
                    });
                    return;
                }

                // 重排任務陣列
                sourceTasks = Array.isArray(sourceColumn.task) ? [...sourceColumn.task] : [];
                destTasks = sourceColumnId === destColumnId ? sourceTasks : (Array.isArray(destColumn.task) ? [...destColumn.task] : []);

                // 從來源移除
                const taskIndexInSource = sourceTasks.indexOf(parseInt(taskId));
                if (taskIndexInSource > -1) {
                    sourceTasks.splice(taskIndexInSource, 1);
                }

                // 插入到目標位置
                const insertAt = Math.max(0, Math.min(destination.index, destTasks.length));
                destTasks.splice(insertAt, 0, parseInt(taskId));

                // 使用 instance save 更新（與鎖定的 row 一致）
                sourceColumn.task = sourceTasks;
                await sourceColumn.save({ transaction: t });

                if (sourceColumnId !== destColumnId) {
                    destColumn.task = destTasks;
                    await destColumn.save({ transaction: t });
                    await Task.update({ columnId: destColumnId }, {
                        where: { id: taskId },
                        transaction: t,
                        individualHooks: true,
                        req: data._reqContext
                    });
                }

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

            // 記錄移動操作（Transaction 外，非關鍵路徑）
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
            writeSocketErrorReport(error, 'cardItemDragged', this.socket.user);
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