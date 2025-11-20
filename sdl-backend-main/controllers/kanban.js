const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Project = require('../models/project');
const TaskChangeLog = require('../models/task_change_log');
const ColumnChangeLog = require('../models/column_change_log');
const NodeChangeLog = require('../models/node_change_log');
const Node = require('../models/node');
const AuditEvent = require('../models/audit_event');
const Comment = require('../models/comment');
const ProjectComment = require('../models/project_comment');
const { Op } = require('sequelize');

// 清理函數：移除 Column 中不存在的任務 ID
const cleanupColumnTasks = async (columnItem) => {
    if (!columnItem.task || !Array.isArray(columnItem.task)) {
        return [];
    }

    // 獲取所有存在的任務
    const existingTasks = await Task.findAll({
        attributes: ['id'],
        where: {
            columnId: columnItem.id
        }
    });

    const existingTaskIds = new Set(existingTasks.map(task => task.id));
    
    // 過濾掉不存在的任務 ID
    const cleanedTaskIds = columnItem.task.filter(taskId => existingTaskIds.has(taskId));
    
    // 如果有變化，更新資料庫
    if (cleanedTaskIds.length !== columnItem.task.length) {
        console.log(`清理 Column ${columnItem.id}: 移除了 ${columnItem.task.length - cleanedTaskIds.length} 個無效的任務 ID`);
        await Column.update(
            { task: cleanedTaskIds },
            { where: { id: columnItem.id }, individualHooks: true }
        );
    }

    return cleanedTaskIds;
};

exports.getKanban = async ( req, res ) => {
    const projectId = req.params.projectId;
    //kanban
    const kanbanData = await Kanban.findAll({
        attributes:[
            'id',
            'column'],
        where:{
            projectId : projectId
        },
    })
    if(!kanbanData || kanbanData.length === 0){
        return res.status(500).send({message: 'NoRecord!'})
    }
    const { id, column } = kanbanData[0];

    //column
    const columnData = await Column.findAll({
            attributes:[
                'id',
                'name',
                'task'
            ],
            where:{
                kanbanId : id
            }
    })

    const sortedColumnData = column
    .map(columnId => columnData.find(item => item.id === columnId))
    .filter(item => item !== undefined); 

    // Batch Fetch Tasks
    const columnIds = sortedColumnData.map(c => c.id);
    const allTasks = await Task.findAll({
        attributes: ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'images', 'files', 'createdAt', 'updatedAt', 'columnId'],
        where: {
            columnId: { [Op.in]: columnIds }
        }
    });

    // Group tasks by columnId
    const tasksByColumn = new Map();
    allTasks.forEach(task => {
        if (!tasksByColumn.has(task.columnId)) {
            tasksByColumn.set(task.columnId, []);
        }
        tasksByColumn.get(task.columnId).push(task);
    });

    // Process columns
    await Promise.all(sortedColumnData.map(async (columnItem, columnIndex) => {
        const columnTasks = tasksByColumn.get(columnItem.id) || [];
        const existingTaskIds = new Set(columnTasks.map(t => t.id));
        
        // Cleanup logic in memory
        let currentTaskIds = columnItem.task || [];
        if (!Array.isArray(currentTaskIds)) currentTaskIds = [];
        
        const cleanedTaskIds = currentTaskIds.filter(taskId => existingTaskIds.has(taskId));
        
        // Update DB if needed (rare case)
        if (cleanedTaskIds.length !== currentTaskIds.length) {
            console.log(`清理 Column ${columnItem.id}: 移除了 ${currentTaskIds.length - cleanedTaskIds.length} 個無效的任務 ID`);
            await Column.update(
                { task: cleanedTaskIds },
                { where: { id: columnItem.id }, individualHooks: true }
            );
            columnItem.task = cleanedTaskIds;
        }

        // Sort tasks based on column order
        const taskMap = new Map(columnTasks.map(t => [t.id, t]));
        const sortedTaskData = columnItem.task
            .map(taskId => taskMap.get(taskId))
            .filter(task => task !== undefined);
            
        sortedColumnData[columnIndex].task = sortedTaskData;
    }));

    res.status(200).json(sortedColumnData);

}

exports.getKanbanTask = async ( req, res ) =>{
    const columnId = req.params.columnId;
    const taskData = await Task.findAll({
        attributes:[
            'id', 
            'title', 
            'content', 
            'labels', 
            'owner',
            'assignees',
            'images',
            'files',
            'createdAt',
            'updatedAt'
        ],
        where:{
            columnId : columnId
        }
    })
    .then( result =>{
        res.status(200).json(result);
    })
    .catch( err => {
        console.log(err);
        res.status(500).send({message: 'Something Wrong!'})
    });
}

// 新增：取得任務變更記錄
exports.getTaskChangeLogs = async (req, res) => {
    try {
        const { taskId } = req.params;
        
        const changeLogs = await TaskChangeLog.findAll({
            where: { taskId },
            order: [['createdAt', 'DESC']],
            limit: 50 // 限制最多顯示50筆記錄
        });
        
        res.status(200).json(changeLogs);
    } catch (error) {
        console.error('取得變更記錄失敗:', error);
        res.status(500).json({ message: '取得變更記錄失敗' });
    }
};

// 新增：取得專案活動流
exports.getProjectActivity = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 20, offset = 0, before } = req.query;
        
        // 建立查詢條件
        const whereCondition = { projectId };
        if (before) {
            whereCondition.createdAt = {
                [Op.lt]: new Date(before)
            };
        }
        
        // 同時查詢任務、列表、節點和評論的變更記錄
        const [taskActivities, columnActivities, nodeActivities, commentActivities] = await Promise.all([
            TaskChangeLog.findAll({
                where: whereCondition,
                include: [{
                    model: Task,
                    attributes: ['id', 'title'],
                    required: false
                }],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit) * 2 // 取更多記錄以確保合併後有足夠的資料
            }),
            ColumnChangeLog.findAll({
                where: whereCondition,
                include: [{
                    model: Column,
                    as: 'Column',
                    attributes: ['id', 'name'],
                    required: false
                }],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit) * 2
            }),
            NodeChangeLog.findAll({
                where: whereCondition,
                include: [{
                    model: Node,
                    as: 'Node',
                    attributes: ['id', 'title', 'content'],
                    required: false
                }],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit) * 2
            }),
            AuditEvent.findAll({
                where: {
                    projectId: parseInt(projectId),
                    action: {
                        [Op.in]: ['COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE',
                                 'PROJECT_COMMENT_CREATE', 'PROJECT_COMMENT_UPDATE', 'PROJECT_COMMENT_DELETE']
                    },
                    ...(before && { timestamp: { [Op.lt]: new Date(before) } })
                },
                order: [['timestamp', 'DESC']],
                limit: parseInt(limit) * 2
            })
        ]);

        // 格式化評論活動的輔助函數
        const formatCommentActivity = (auditEvent) => {
            const activity = auditEvent.toJSON();
            let changeType, source;
            
            // 映射評論活動類型
            switch (activity.action) {
                case 'COMMENT_CREATE':
                    changeType = 'comment_create';
                    source = 'comment';
                    break;
                case 'COMMENT_UPDATE':
                    changeType = 'comment_update';
                    source = 'comment';
                    break;
                case 'COMMENT_DELETE':
                    changeType = 'comment_delete';
                    source = 'comment';
                    break;
                case 'PROJECT_COMMENT_CREATE':
                    changeType = 'project_comment_create';
                    source = 'project_comment';
                    break;
                case 'PROJECT_COMMENT_UPDATE':
                    changeType = 'project_comment_update';
                    source = 'project_comment';
                    break;
                case 'PROJECT_COMMENT_DELETE':
                    changeType = 'project_comment_delete';
                    source = 'project_comment';
                    break;
                default:
                    changeType = activity.action.toLowerCase();
                    source = 'comment';
            }

            return {
                id: activity.id,
                changeType,
                changedBy: activity.actorName || '未知用戶',
                createdAt: activity.timestamp,
                description: null, // 將由前端的 getActivityDescription 生成
                source,
                // 保存原始的 audit 資料以便前端使用
                targetType: activity.targetType,
                targetId: activity.targetId,
                metadata: activity.metadata,
                projectId: activity.projectId // Ensure this is passed
            };
        };

        // 合併並按時間排序
        const allActivities = [
            ...taskActivities.map(activity => ({ ...activity.toJSON(), source: 'task' })),
            ...columnActivities.map(activity => ({ ...activity.toJSON(), source: 'column' })),
            ...nodeActivities.map(activity => ({ ...activity.toJSON(), source: 'node' })),
            ...commentActivities.map(activity => formatCommentActivity(activity))
        ].sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
         .slice(parseInt(offset), parseInt(offset) + parseInt(limit)); // 應用分頁

        const activities = allActivities;
        
        // --- Batch Fetching Logic Starts Here ---

        const projectCommentIds = new Set();
        const commentIds = new Set();
        const taskUpdateInfo = []; // { taskId, createdAt }

        // Pass 1: Collect primary IDs
        for (const activity of activities) {
            if (activity.source === 'project_comment' && activity.targetId) {
                projectCommentIds.add(activity.targetId);
            }
            if (activity.source === 'comment' && activity.targetId) {
                commentIds.add(activity.targetId);
            }
            if (activity.source === 'task' && activity.changeType === 'update' && activity.taskId) {
                taskUpdateInfo.push({ taskId: activity.taskId, createdAt: new Date(activity.createdAt) });
            }
        }

        // Batch Fetch Round 1
        const [projectComments, comments, relatedTaskLogs] = await Promise.all([
            projectCommentIds.size > 0 ? ProjectComment.findAll({
                where: { id: { [Op.in]: [...projectCommentIds] } },
                include: [{ model: Project, attributes: ['id', 'name'], required: false }]
            }) : [],
            commentIds.size > 0 ? Comment.findAll({
                where: { id: { [Op.in]: [...commentIds] } },
                include: [{ model: Task, attributes: ['id', 'title'], required: false }]
            }) : [],
            taskUpdateInfo.length > 0 ? (async () => {
                // Optimize: Find min/max time for all updates to fetch in one go
                const times = taskUpdateInfo.map(i => i.createdAt.getTime());
                const minTime = new Date(Math.min(...times) - 30000);
                const maxTime = new Date(Math.max(...times) + 30000);
                const taskIds = [...new Set(taskUpdateInfo.map(i => i.taskId))];
                
                return TaskChangeLog.findAll({
                    where: {
                        taskId: { [Op.in]: taskIds },
                        changeType: 'update',
                        createdAt: { [Op.between]: [minTime, maxTime] }
                    },
                    order: [['createdAt', 'DESC']]
                });
            })() : []
        ]);

        const projectCommentMap = new Map(projectComments.map(pc => [pc.id, pc]));
        const commentMap = new Map(comments.map(c => [c.id, c]));
        
        // Group related logs by taskId
        const relatedLogsMap = new Map(); // taskId -> logs[]
        if (Array.isArray(relatedTaskLogs)) {
             relatedTaskLogs.forEach(log => {
                if (!relatedLogsMap.has(log.taskId)) relatedLogsMap.set(log.taskId, []);
                relatedLogsMap.get(log.taskId).push(log);
            });
        }

        const projectIds = new Set();
        const taskIds = new Set();

        // Pass 2: Resolve secondary IDs
        for (const activity of activities) {
            // Project resolution logic
            if (activity.source === 'project_comment') {
                let pid = null;
                // Strategy 1: From Metadata
                if (activity.metadata) {
                     try {
                        const meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                        pid = meta.projectId || meta.after?.projectId || meta.before?.projectId || meta.context?.projectId;
                     } catch(e) {}
                }
                // Strategy 2: From ProjectComment
                if (!pid && activity.targetId) {
                    const pc = projectCommentMap.get(activity.targetId);
                    if (pc) pid = pc.projectId;
                }
                // Strategy 3: From Activity itself
                if (!pid && activity.projectId) pid = activity.projectId;

                if (pid) projectIds.add(parseInt(pid));
            }

            // Task resolution logic
            if (activity.source === 'comment') {
                let tid = null;
                // Strategy 1: From Comment
                if (activity.targetId && activity.changeType !== 'comment_delete') {
                    const c = commentMap.get(activity.targetId);
                    if (c) {
                        if (c.Task) tid = c.Task.id;
                        else if (c.taskId) tid = c.taskId;
                    }
                }
                // Strategy 2: From Metadata
                if (!tid && activity.metadata) {
                    try {
                        const meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                        tid = meta.taskId || meta.before?.taskId || meta.after?.taskId || meta.context?.taskId || meta.taskSnapshot?.id;
                    } catch(e) {}
                }
                if (tid) taskIds.add(parseInt(tid));
            }
            
            // Move logic
             if (activity.changeType === 'move' && activity.taskId) {
                 taskIds.add(activity.taskId);
             }
        }

        // Batch Fetch Round 2
        const [projects, tasks] = await Promise.all([
            projectIds.size > 0 ? Project.findAll({ where: { id: { [Op.in]: [...projectIds] } }, attributes: ['id', 'name'] }) : [],
            taskIds.size > 0 ? Task.findAll({ where: { id: { [Op.in]: [...taskIds] } }, attributes: ['id', 'title'] }) : []
        ]);

        const projectMap = new Map(projects.map(p => [p.id, p]));
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        // Final Assembly
        const formattedActivities = activities.map(activity => {
            const baseActivity = {
                id: activity.id,
                changeType: activity.changeType,
                changedBy: activity.changedBy,
                createdAt: activity.createdAt,
                description: activity.description,
                source: activity.source
            };

            if (activity.source === 'task') {
                baseActivity.task = activity.Task ? { id: activity.Task.id, title: activity.Task.title } : null;
            } else if (activity.source === 'column') {
                baseActivity.column = activity.Column ? { id: activity.Column.id, name: activity.Column.name } : null;
            } else if (activity.source === 'node') {
                baseActivity.node = activity.Node ? { id: activity.Node.id, title: activity.Node.title, content: activity.Node.content } : { id: activity.nodeId || '已刪除', title: '節點已刪除' };
                if (activity.changeType === 'update' && activity.fieldName) {
                    baseActivity.changes = [{ fieldName: activity.fieldName, oldValue: activity.oldValue, newValue: activity.newValue, description: activity.description }];
                }
            } else if (activity.source === 'comment' || activity.source === 'project_comment') {
                baseActivity.comment = { id: activity.targetId, type: activity.targetType };
                
                if (activity.source === 'project_comment') {
                    // Re-implement project resolution using Maps
                    let projectName = '未知專案';
                    let projectId = activity.projectId;
                    let meta = null;
                    try { meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata; } catch(e) {}

                    // 1. Metadata
                    if (!projectId && meta) projectId = meta.projectId || meta.after?.projectId || meta.before?.projectId || meta.context?.projectId;
                    
                    // 2. ProjectComment
                    if (!projectId && activity.targetId) {
                        const pc = projectCommentMap.get(activity.targetId);
                        if (pc) {
                            projectId = pc.projectId;
                            if (pc.Project) projectName = pc.Project.name;
                        }
                    }

                    // 3. Project Map
                    if (projectId) {
                        const p = projectMap.get(parseInt(projectId));
                        if (p) projectName = p.name;
                    }
                    
                    // 4. Metadata Name Fallback
                    if (projectName === '未知專案' && meta) {
                         const mName = meta.projectName || meta.after?.projectName || meta.before?.projectName || meta.context?.projectName;
                         if (mName) projectName = mName;
                    }

                    baseActivity.project = { id: projectId, name: projectName };

                } else if (activity.source === 'comment') {
                    // Re-implement task resolution using Maps
                    let taskTitle = '未知任務';
                    let taskId = null;
                    let meta = null;
                    try { meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata; } catch(e) {}

                    // 1. Comment Map
                    if (activity.targetId && activity.changeType !== 'comment_delete') {
                        const c = commentMap.get(activity.targetId);
                        if (c) {
                            if (c.Task) { taskTitle = c.Task.title; taskId = c.Task.id; }
                            else if (c.task_title) { taskTitle = c.task_title; taskId = c.taskId; }
                            else if (c.taskId) taskId = c.taskId;
                        }
                    }

                    // 2. Metadata
                    if ((taskTitle === '未知任務' || activity.changeType === 'comment_delete') && meta) {
                         const mTitle = meta.taskTitle || meta.before?.taskTitle || meta.after?.taskTitle || meta.context?.taskTitle || meta.taskSnapshot?.title;
                         const mId = meta.taskId || meta.before?.taskId || meta.after?.taskId || meta.context?.taskId || meta.taskSnapshot?.id;
                         if (mTitle) { taskTitle = mTitle; taskId = mId; }
                         else if (mId) taskId = mId;
                    }

                    // 3. Task Map (if we have ID but no title)
                    if (taskId && taskTitle === '未知任務') {
                        const t = taskMap.get(parseInt(taskId));
                        if (t) taskTitle = t.title;
                    }

                    baseActivity.task = { id: taskId, title: taskTitle };
                }

                // Content Preview Logic (Keep mostly same, just cleaner)
                if (activity.metadata) {
                    try {
                        const metadata = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                        let afterContent = null, beforeContent = null;
                        
                        if (activity.source === 'project_comment') {
                             if (metadata.after) afterContent = metadata.after.content?.textPreview || metadata.after.content || (typeof metadata.after === 'string' ? metadata.after : null);
                             if (metadata.before) beforeContent = metadata.before.content?.textPreview || metadata.before.content || (typeof metadata.before === 'string' ? metadata.before : null);
                             if (!afterContent && metadata.content) afterContent = metadata.content.textPreview || metadata.content;
                             if (!afterContent && metadata.newValue) afterContent = metadata.newValue;
                             if (!beforeContent && metadata.oldValue) beforeContent = metadata.oldValue;
                        } else {
                             if (metadata.after?.content) afterContent = metadata.after.content.textPreview || metadata.after.content;
                             if (metadata.before?.content) beforeContent = metadata.before.content.textPreview || metadata.before.content;
                        }
                        
                        if (!afterContent && metadata.diff?.content) { afterContent = metadata.diff.content.after; beforeContent = metadata.diff.content.before; }
                        if (!afterContent && metadata.newValue) afterContent = metadata.newValue;
                        if (!beforeContent && metadata.oldValue) beforeContent = metadata.oldValue;
                        if (metadata.changed?.includes('content')) { if (metadata.after) afterContent = metadata.after; if (metadata.before) beforeContent = metadata.before; }

                        baseActivity.comment.contentPreview = afterContent && typeof afterContent === 'string' ? afterContent.trim() : null;
                        baseActivity.comment.beforeContentPreview = beforeContent && typeof beforeContent === 'string' ? beforeContent.trim() : null;
                    } catch (e) {}
                }
            }

            if (activity.changeType === 'move') {
                baseActivity.from = activity.oldValue;
                baseActivity.to = activity.newValue;
                if (!baseActivity.task && activity.description) {
                    const match = activity.description.match(/將任務「(.+?)」從/);
                    if (match) baseActivity.task = { id: activity.taskId, title: match[1] };
                }
                // Try to resolve task title from Map if we have ID
                if (activity.taskId && (!baseActivity.task || baseActivity.task.title === '未知任務')) {
                     const t = taskMap.get(activity.taskId);
                     if (t) baseActivity.task = { id: t.id, title: t.title };
                }
            }

            if (activity.changeType === 'update' && activity.source === 'task' && activity.taskId) {
                const logs = relatedLogsMap.get(activity.taskId) || [];
                // Filter logs within 30s window
                const activityTime = new Date(activity.createdAt).getTime();
                const relatedChanges = logs.filter(log => {
                    const logTime = new Date(log.createdAt).getTime();
                    return Math.abs(logTime - activityTime) <= 30000;
                });
                
                baseActivity.changes = relatedChanges.map(change => ({
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    description: change.description
                }));
            }

            if (activity.changeType === 'reorder' && activity.source === 'column') {
                try {
                    baseActivity.orderChange = { from: JSON.parse(activity.oldValue || '[]'), to: JSON.parse(activity.newValue || '[]') };
                } catch (e) {}
            }

            return baseActivity;
        });
        
        res.status(200).json(formattedActivities);
    } catch (error) {
        console.error('取得專案活動失敗:', error);
        res.status(500).json({ message: '取得專案活動失敗' });
    }
};

// 新增：手動清理數據的端點
exports.cleanupKanbanData = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        console.log(`開始清理專案 ${projectId} 的 Kanban 數據...`);
        
        // 獲取專案的 Kanban
        const kanbanData = await Kanban.findAll({
            attributes: ['id', 'column'],
            where: { projectId: projectId }
        });

        if (!kanbanData || kanbanData.length === 0) {
            return res.status(404).json({ message: '找不到 Kanban 數據' });
        }

        const { id: kanbanId, column } = kanbanData[0];
        
        // 獲取所有列
        const columns = await Column.findAll({
            attributes: ['id', 'name', 'task'],
            where: { kanbanId: kanbanId }
        });

        let totalCleaned = 0;
        
        // 清理每個列的任務
        for (const columnItem of columns) {
            const originalCount = columnItem.task ? columnItem.task.length : 0;
            await cleanupColumnTasks(columnItem);
            
            // 重新獲取更新後的數據
            const updatedColumn = await Column.findByPk(columnItem.id);
            const newCount = updatedColumn.task ? updatedColumn.task.length : 0;
            const cleaned = originalCount - newCount;
            totalCleaned += cleaned;
            
            if (cleaned > 0) {
                console.log(`列 "${columnItem.name}" 清理了 ${cleaned} 個無效任務 ID`);
            }
        }

        res.status(200).json({
            message: '數據清理完成',
            projectId: projectId,
            totalCleaned: totalCleaned,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('清理 Kanban 數據失敗:', error);
        res.status(500).json({ message: '清理數據時發生錯誤', error: error.message });
    }
};

exports.createKanban = async ( projectId ) => {
    const kanban = await Kanban.create({
        column:[], 
        projectId:projectId
    });
    const todo = await Column.create({
        name:"待處理", 
        task:[], 
        kanbanId:kanban.id
    });
    const inProgress = await Column.create({
        name:"進行中", 
        task:[], 
        kanbanId:kanban.id
    });
    const Completed = await Column.create({
        name:"完成", 
        task:[], 
        kanbanId:kanban.id
    });
    Kanban.findByPk(kanban.id)
    .then(kanban =>{
        kanban.column = [
            todo.id, 
            inProgress.id, 
            Completed.id 
        ];
        return kanban.save();
    })
}

exports.createKanban = async ( projectId ) => {
    const kanban = await Kanban.create({
        column:[], 
        projectId:projectId
    });
    const todo = await Column.create({
        name:"待處理", 
        task:[], 
        kanbanId:kanban.id
    });
    const inProgress = await Column.create({
        name:"進行中", 
        task:[], 
        kanbanId:kanban.id
    });
    const Completed = await Column.create({
        name:"完成", 
        task:[], 
        kanbanId:kanban.id
    });
    Kanban.findByPk(kanban.id)
    .then(kanban =>{
        kanban.column = [
            todo.id, 
            inProgress.id, 
            Completed.id 
        ];
        return kanban.save();
    })
}
