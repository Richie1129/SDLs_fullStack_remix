const Task = require('../models/task');
const Column = require('../models/column');
const Node = require('../models/node');
const Project = require('../models/project');
const Comment = require('../models/comment');
const ProjectComment = require('../models/project_comment');
const TaskChangeLog = require('../models/task_change_log');
const ColumnChangeLog = require('../models/column_change_log');
const NodeChangeLog = require('../models/node_change_log');
const AuditEvent = require('../models/audit_event');
const { Op } = require('sequelize');

/**
 * 格式化評論活動的輔助函數
 */
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
        description: null,
        source,
        targetType: activity.targetType,
        targetId: activity.targetId,
        metadata: activity.metadata,
        projectId: activity.projectId
    };
};

/**
 * 獲取專案活動流資料
 */
const getProjectActivities = async (projectId, options = {}) => {
    const { limit = 20, offset = 0, before } = options;
    
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
            limit: parseInt(limit) * 2
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

    // 合併並按時間排序
    const allActivities = [
        ...taskActivities.map(activity => ({ ...activity.toJSON(), source: 'task' })),
        ...columnActivities.map(activity => ({ ...activity.toJSON(), source: 'column' })),
        ...nodeActivities.map(activity => ({ ...activity.toJSON(), source: 'node' })),
        ...commentActivities.map(activity => formatCommentActivity(activity))
    ].sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
     .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const activities = allActivities;
    
    // 批量獲取相關數據以填充活動資訊
    const projectCommentIds = new Set();
    const commentIds = new Set();
    const taskUpdateInfo = [];

    for (const activity of activities) {
        if (activity.source === 'project_comment' && activity.targetId) projectCommentIds.add(activity.targetId);
        if (activity.source === 'comment' && activity.targetId) commentIds.add(activity.targetId);
        if (activity.source === 'task' && activity.changeType === 'update' && activity.taskId) {
            taskUpdateInfo.push({ taskId: activity.taskId, createdAt: new Date(activity.createdAt) });
        }
    }

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
    const relatedLogsMap = new Map();
    if (Array.isArray(relatedTaskLogs)) {
        relatedTaskLogs.forEach(log => {
            if (!relatedLogsMap.has(log.taskId)) relatedLogsMap.set(log.taskId, []);
            relatedLogsMap.get(log.taskId).push(log);
        });
    }

    const projectIds = new Set();
    const taskIds = new Set();

    for (const activity of activities) {
        if (activity.source === 'project_comment') {
            let pid = activity.projectId;
            if (!pid && activity.metadata) {
                try {
                    const meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                    pid = meta.projectId || meta.after?.projectId || meta.before?.projectId;
                } catch(e) {}
            }
            if (!pid && activity.targetId) {
                const pc = projectCommentMap.get(activity.targetId);
                if (pc) pid = pc.projectId;
            }
            if (pid) projectIds.add(parseInt(pid));
        }

        if (activity.source === 'comment') {
            let tid = null;
            if (activity.targetId && activity.changeType !== 'comment_delete') {
                const c = commentMap.get(activity.targetId);
                if (c) tid = c.taskId;
            }
            if (!tid && activity.metadata) {
                try {
                    const meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                    tid = meta.taskId || meta.before?.taskId || meta.after?.taskId;
                } catch(e) {}
            }
            if (tid) taskIds.add(parseInt(tid));
        }
        
        if (activity.changeType === 'move' && activity.taskId) taskIds.add(activity.taskId);
    }

    const [projects, tasks] = await Promise.all([
        projectIds.size > 0 ? Project.findAll({ where: { id: { [Op.in]: [...projectIds] } }, attributes: ['id', 'name'] }) : [],
        taskIds.size > 0 ? Task.findAll({ where: { id: { [Op.in]: [...taskIds] } }, attributes: ['id', 'title'] }) : []
    ]);

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // 組裝最終結果
    return activities.map(activity => {
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
                let projectName = '未知專案';
                let pid = activity.projectId;
                const pc = projectCommentMap.get(activity.targetId);
                if (pc) {
                    pid = pc.projectId;
                    if (pc.Project) projectName = pc.Project.name;
                }
                if (pid && projectMap.has(parseInt(pid))) projectName = projectMap.get(parseInt(pid)).name;
                baseActivity.project = { id: pid, name: projectName };
            } else {
                let taskTitle = '未知任務';
                let tid = null;
                const c = commentMap.get(activity.targetId);
                if (c) {
                    tid = c.taskId;
                    if (c.Task) taskTitle = c.Task.title;
                }
                if (tid && taskMap.has(parseInt(tid))) taskTitle = taskMap.get(parseInt(tid)).title;
                baseActivity.task = { id: tid, title: taskTitle };
            }

            if (activity.metadata) {
                try {
                    const metadata = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                    let afterContent = null, beforeContent = null;
                    
                    if (activity.source === 'project_comment') {
                        afterContent = metadata.after?.content?.textPreview || metadata.after?.content || metadata.content?.textPreview || metadata.content || metadata.newValue;
                        beforeContent = metadata.before?.content?.textPreview || metadata.before?.content || metadata.oldValue;
                    } else {
                        afterContent = metadata.after?.content?.textPreview || metadata.after?.content || metadata.newValue;
                        beforeContent = metadata.before?.content?.textPreview || metadata.before?.content || metadata.oldValue;
                    }
                    
                    baseActivity.comment.contentPreview = (afterContent && typeof afterContent === 'string') ? afterContent.trim() : null;
                    baseActivity.comment.beforeContentPreview = (beforeContent && typeof beforeContent === 'string') ? beforeContent.trim() : null;
                } catch (e) {}
            }
        }

        if (activity.changeType === 'move') {
            baseActivity.from = activity.oldValue;
            baseActivity.to = activity.newValue;
            if (activity.taskId && taskMap.has(activity.taskId)) {
                baseActivity.task = { id: activity.taskId, title: taskMap.get(activity.taskId).title };
            }
        }

        if (activity.changeType === 'update' && activity.source === 'task' && activity.taskId) {
            const logs = relatedLogsMap.get(activity.taskId) || [];
            const activityTime = new Date(activity.createdAt).getTime();
            const relatedChanges = logs.filter(log => Math.abs(new Date(log.createdAt).getTime() - activityTime) <= 30000);
            
            baseActivity.changes = relatedChanges.map(change => ({
                fieldName: change.fieldName,
                oldValue: change.oldValue,
                newValue: change.newValue,
                description: change.description
            }));
        }

        return baseActivity;
    });
};

/**
 * 批次取得多個專案的最後活動時間（B10：教師總覽用）
 *
 * 原本每個專案各呼叫一次 getProjectActivities(projectId, { limit: 1 })，每次 4 支查詢；
 * 這裡對四種來源各做一次 GROUP BY projectId 的 MAX 聚合，總共 4 支查詢，再取各專案的最大值。
 *
 * @param {number[]} projectIds
 * @returns {Promise<Map<number, Date>>} projectId -> 最後活動時間（沒有任何活動的專案不會出現在 Map）
 */
const getProjectsLastActivityAt = async (projectIds) => {
    const ids = [...new Set((projectIds || []).map(id => parseInt(id)).filter(Number.isFinite))];
    const result = new Map();
    if (ids.length === 0) return result;

    const maxByProject = (Model, timeColumn, extraWhere = {}) => Model.findAll({
        attributes: [
            'projectId',
            [Model.sequelize.fn('MAX', Model.sequelize.col(timeColumn)), 'lastAt']
        ],
        where: { projectId: { [Op.in]: ids }, ...extraWhere },
        group: ['projectId'],
        raw: true
    });

    const [taskRows, columnRows, nodeRows, commentRows] = await Promise.all([
        maxByProject(TaskChangeLog, 'createdAt'),
        maxByProject(ColumnChangeLog, 'createdAt'),
        maxByProject(NodeChangeLog, 'createdAt'),
        maxByProject(AuditEvent, 'timestamp', {
            action: {
                [Op.in]: ['COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE',
                          'PROJECT_COMMENT_CREATE', 'PROJECT_COMMENT_UPDATE', 'PROJECT_COMMENT_DELETE']
            }
        })
    ]);

    for (const rows of [taskRows, columnRows, nodeRows, commentRows]) {
        for (const row of rows) {
            const pid = parseInt(row.projectId);
            const at = row.lastAt ? new Date(row.lastAt) : null;
            if (!pid || !at || Number.isNaN(at.getTime())) continue;
            const prev = result.get(pid);
            if (!prev || at > prev) result.set(pid, at);
        }
    }
    return result;
};

module.exports = {
    getProjectsLastActivityAt,
    getProjectActivities
};
