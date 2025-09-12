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
    if(!kanbanData){
        res.status(500).send({message: 'NoRecord!'})
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
    // const sortedColumnData = [];
    // const arrone = columnData.findIndex( item => item.id === column[0]);
    // sortedColumnData.push(columnData[arrone]);
    // const arrtwo = columnData.findIndex( item => item.id === column[1]);
    // sortedColumnData.push(columnData[arrtwo]);
    // const arrthree = columnData.findIndex( item => item.id === column[2]);
    // sortedColumnData.push(columnData[arrthree]);
    // //task
    // const taskData1 = await Task.findAll({
    //     attributes:[
    //         'id', 
    //         'title', 
    //         'content', 
    //         'labels', 
    //         'assignees'
    //     ],
    //     where:{
    //         columnId : sortedColumnData[0].id
    //     }
    // })
    // const sortTaskData1 = [];
    // sortedColumnData[0].task.map( column => {
    //     taskData1.map((task, index) => {
    //         if(task.id === column){
    //             sortTaskData1.push(taskData1[index])
    //         }
    //     })
    // })
    // sortedColumnData[0].task = sortTaskData1;
    // const taskData2 = await Task.findAll({
    //     attributes:[
    //         'id', 
    //         'title', 
    //         'content', 
    //         'labels', 
    //         'assignees'
    //     ],
    //     where:{
    //         columnId : sortedColumnData[1].id
    //     }
    // })
    // const sortTaskData2 = [];
    // sortedColumnData[1].task.map(column => {
    //     taskData2.map((task, index) => {
    //         if(task.id === column){
    //             sortTaskData2.push(taskData2[index])
    //         }
    //     })
    // })
    // sortedColumnData[1].task = sortTaskData2;
    // const taskData3 = await Task.findAll({
    //     attributes:[
    //         'id', 
    //         'title', 
    //         'content', 
    //         'labels', 
    //         'assignees'
    //     ],
    //     where:{
    //         columnId : sortedColumnData[2].id
    //     }
    // })
    // const sortTaskData3 = [];
    // sortedColumnData[2].task.map(column => {
    //     taskData3.map((task, index) => {
    //         if(task.id === column){
    //             sortTaskData3.push(taskData3[index])
    //         }
    //     })
    // })
    // sortedColumnData[2].task = sortTaskData3;
    const sortedColumnData = column
    .map(columnId => columnData.find(item => item.id === columnId))
    .filter(item => item !== undefined); 

    // 對於每個排序後的列，取得並排序其任務
    await Promise.all(sortedColumnData.map(async (columnItem, columnIndex) => {
        // 清理無效的任務 ID
        const cleanedTaskIds = await cleanupColumnTasks(columnItem);
        columnItem.task = cleanedTaskIds;

        // 取得目前列的所有任務
        const taskData = await Task.findAll({
            attributes: ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'images', 'files', 'createdAt', 'updatedAt'],
            where: {
                columnId: columnItem.id
            }
        });
    
        // 根據列中的任務順序排序這些任務，並過濾掉不存在的任務
        const sortedTaskData = columnItem.task
            .map(taskId => taskData.find(task => task.id === taskId))
            .filter(task => task !== undefined); // 過濾掉 undefined 的任務
    
        // 更新目前列的任務數據
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
                metadata: activity.metadata
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
        
        // 組合活動資料，包含詳細的變更資訊
        const formattedActivities = await Promise.all(activities.map(async (activity) => {
            const baseActivity = {
                id: activity.id,
                changeType: activity.changeType,
                changedBy: activity.changedBy,
                createdAt: activity.createdAt,
                description: activity.description,
                source: activity.source
            };

            // 根據來源添加相應的資料
            if (activity.source === 'task') {
                baseActivity.task = activity.Task ? {
                    id: activity.Task.id,
                    title: activity.Task.title
                } : null;
            } else if (activity.source === 'column') {
                baseActivity.column = activity.Column ? {
                    id: activity.Column.id,
                    name: activity.Column.name
                } : null;
            } else if (activity.source === 'node') {
                baseActivity.node = activity.Node ? {
                    id: activity.Node.id,
                    title: activity.Node.title,
                    content: activity.Node.content
                } : {
                    id: activity.nodeId || '已刪除',  // 處理 nodeId 為 null 的情況
                    title: '節點已刪除' // 如果節點已被刪除
                };
                // 為節點活動添加更多資訊
                if (activity.changeType === 'update' && activity.fieldName) {
                    baseActivity.changes = [{
                        fieldName: activity.fieldName,
                        oldValue: activity.oldValue,
                        newValue: activity.newValue,
                        description: activity.description
                    }];
                }
            } else if (activity.source === 'comment' || activity.source === 'project_comment') {
                // 處理評論活動
                baseActivity.comment = {
                    id: activity.targetId,
                    type: activity.targetType
                };
                
                // 查詢專案名稱或任務標題 - 使用多重備用策略
                if (activity.source === 'project_comment') {
                    // 專案評論診斷：輸出完整資料結構
                    console.log('=== 專案評論資料結構診斷 ===');
                    console.log('完整 activity 物件:', JSON.stringify(activity, null, 2));
                    console.log('metadata 結構:', JSON.stringify(activity.metadata, null, 2));
                    console.log('targetId:', activity.targetId);
                    console.log('targetType:', activity.targetType);
                    console.log('=============================');
                    
                    // 專案評論：查詢專案名稱 - 多重策略
                    let projectName = '未知專案';
                    let projectId = activity.projectId;
                    
                    console.log('步驟1 - 原始 projectId:', projectId, 'type:', typeof projectId);
                    
                    try {
                        // 策略1: 從 metadata 中提取 projectId
                        if (!projectId && activity.metadata) {
                            try {
                                const metadata = typeof activity.metadata === 'string' 
                                    ? JSON.parse(activity.metadata) 
                                    : activity.metadata;
                                
                                // 檢查多種可能的專案 ID 位置
                                projectId = metadata.projectId || 
                                           metadata.after?.projectId || 
                                           metadata.before?.projectId ||
                                           metadata.context?.projectId;
                                           
                                console.log('步驟2 - 從 metadata 提取的 projectId:', projectId);
                            } catch (e) {
                                console.warn('metadata 解析失敗:', e.message);
                            }
                        }
                        
                        // 策略2: 從 ProjectComment 模型中查詢
                        if (!projectId && activity.targetId) {
                            try {
                                const ProjectComment = require('../models/project_comment');
                                const projectComment = await ProjectComment.findByPk(activity.targetId, {
                                    attributes: ['id', 'projectId'],
                                    include: [{
                                        model: Project,
                                        attributes: ['id', 'name'],
                                        required: false
                                    }]
                                });
                                
                                console.log('步驟3 - ProjectComment 查詢結果:', projectComment ? {
                                    id: projectComment.id,
                                    projectId: projectComment.projectId,
                                    project: projectComment.Project ? {
                                        id: projectComment.Project.id,
                                        name: projectComment.Project.name
                                    } : null
                                } : 'null');
                                
                                if (projectComment?.projectId) {
                                    projectId = projectComment.projectId;
                                    console.log('從 ProjectComment 獲取 projectId:', projectId);
                                    
                                    // 如果有關聯的專案資料，直接使用
                                    if (projectComment.Project?.name) {
                                        projectName = projectComment.Project.name;
                                        console.log('直接從 ProjectComment.Project 獲取專案名稱:', projectName);
                                    }
                                }
                            } catch (e) {
                                console.warn('ProjectComment 查詢失敗:', e.message);
                            }
                        }
                        
                        console.log('步驟4 - 最終確定的 projectId:', projectId, 'type:', typeof projectId);
                        
                        // 策略3: 查詢專案名稱（如果還沒有獲得）
                        if (projectName === '未知專案' && projectId) {
                            const numericProjectId = parseInt(projectId);
                            console.log('步驟5 - 查詢專案名稱，ID:', numericProjectId);
                            
                            const project = await Project.findByPk(numericProjectId, {
                                attributes: ['id', 'name']
                            });
                            
                            console.log('專案查詢結果:', project ? {id: project.id, name: project.name} : 'null');
                            
                            if (project?.name) {
                                projectName = project.name;
                                console.log('成功獲取專案名稱:', projectName);
                            }
                        }
                        
                        // 策略4: 從 metadata 中提取專案名稱（最終備用）
                        if (projectName === '未知專案' && activity.metadata) {
                            try {
                                const metadata = typeof activity.metadata === 'string' 
                                    ? JSON.parse(activity.metadata) 
                                    : activity.metadata;
                                
                                const metadataProjectName = metadata.projectName || 
                                                           metadata.after?.projectName || 
                                                           metadata.before?.projectName ||
                                                           metadata.context?.projectName;
                                                           
                                if (metadataProjectName) {
                                    projectName = metadataProjectName;
                                    console.log('步驟6 - 從 metadata 獲取專案名稱:', projectName);
                                }
                            } catch (e) {
                                console.warn('metadata 解析錯誤:', e.message);
                            }
                        }
                        
                    } catch (e) {
                        console.error('專案查詢失敗:', e);
                    }
                    
                    console.log('最終專案名稱:', projectName);
                    
                    baseActivity.project = {
                        id: projectId,
                        name: projectName
                    };
                    
                } else if (activity.source === 'comment') {
                    // 任務評論：查詢相關任務標題 - 支援已刪除評論
                    let taskTitle = '未知任務';
                    let taskId = null;
                    
                    console.log('=== 任務評論查詢診斷 ===');
                    console.log('targetId:', activity.targetId);
                    console.log('changeType:', activity.changeType);
                    
                    try {
                        // 策略1: 查詢評論關聯的任務（適用於未刪除的評論）
                        if (activity.targetId && activity.changeType !== 'comment_delete') {
                            const comment = await Comment.findByPk(activity.targetId, {
                                include: [{
                                    model: Task,
                                    attributes: ['id', 'title'],
                                    required: false
                                }]
                            });
                            
                            console.log('Comment 查詢結果:', comment ? {
                                id: comment.id,
                                taskId: comment.taskId,
                                task_title: comment.task_title,
                                hasTask: !!comment.Task
                            } : 'null');
                            
                            if (comment) {
                                // 優先使用關聯的 Task
                                if (comment.Task?.title) {
                                    taskTitle = comment.Task.title;
                                    taskId = comment.Task.id;
                                }
                                // 備用1: 使用 denormalized task_title
                                else if (comment.task_title) {
                                    taskTitle = comment.task_title;
                                    taskId = comment.taskId;
                                }
                                // 備用2: 使用 taskId 查詢
                                else if (comment.taskId) {
                                    const task = await Task.findByPk(comment.taskId, {
                                        attributes: ['id', 'title']
                                    });
                                    if (task?.title) {
                                        taskTitle = task.title;
                                        taskId = task.id;
                                    }
                                }
                            }
                        }
                        
                        // 策略2: 對於已刪除的評論，優先從 metadata 中提取任務資訊
                        if ((taskTitle === '未知任務' || activity.changeType === 'comment_delete') && activity.metadata) {
                            try {
                                const metadata = typeof activity.metadata === 'string' 
                                    ? JSON.parse(activity.metadata) 
                                    : activity.metadata;
                                
                                console.log('從 metadata 提取任務資訊:', {
                                    before: metadata.before,
                                    after: metadata.after,
                                    taskTitle: metadata.taskTitle,
                                    taskId: metadata.taskId
                                });
                                
                                // 檢查多種可能的任務資訊位置
                                const metadataTaskTitle = metadata.taskTitle || 
                                                         metadata.before?.taskTitle ||
                                                         metadata.after?.taskTitle ||
                                                         metadata.context?.taskTitle;
                                                         
                                const metadataTaskId = metadata.taskId || 
                                                      metadata.before?.taskId ||
                                                      metadata.after?.taskId ||
                                                      metadata.context?.taskId;
                                
                                if (metadataTaskTitle) {
                                    taskTitle = metadataTaskTitle;
                                    taskId = metadataTaskId;
                                    console.log('成功從 metadata 獲取任務資訊:', { taskTitle, taskId });
                                }
                                
                                // 備用：檢查是否有任務快照
                                if (taskTitle === '未知任務' && metadata.taskSnapshot) {
                                    taskTitle = metadata.taskSnapshot.title || taskTitle;
                                    taskId = metadata.taskSnapshot.id || taskId;
                                    console.log('從 taskSnapshot 獲取:', { taskTitle, taskId });
                                }
                                
                            } catch (e) {
                                console.warn('任務評論 metadata 解析錯誤:', e.message);
                            }
                        }
                        
                        console.log('最終任務查詢結果:', { taskTitle, taskId });
                        
                    } catch (e) {
                        console.warn('任務評論查詢失敗，使用備用顯示:', e.message);
                    }
                    
                    baseActivity.task = {
                        id: taskId,
                        title: taskTitle
                    };
                }
                
                // 從 metadata 中提取評論相關資訊 - 增強多格式支援
                if (activity.metadata) {
                    try {
                        const metadata = typeof activity.metadata === 'string' 
                            ? JSON.parse(activity.metadata) 
                            : activity.metadata;
                        
                        console.log('評論活動 metadata 解析:', JSON.stringify(metadata, null, 2));
                        
                        let afterContent = null;
                        let beforeContent = null;
                        
                        // 針對專案評論和任務評論使用不同的解析策略
                        if (activity.source === 'project_comment') {
                            console.log('=== 專案評論內容解析 ===');
                            
                            // 專案評論專用解析策略
                            // 策略1: 標準結構 - 針對專案評論的 audit log 格式
                            if (metadata.after && typeof metadata.after === 'object') {
                                if (metadata.after.content) {
                                    afterContent = metadata.after.content.textPreview || metadata.after.content;
                                } else if (typeof metadata.after === 'string') {
                                    afterContent = metadata.after;
                                }
                            }
                            
                            if (metadata.before && typeof metadata.before === 'object') {
                                if (metadata.before.content) {
                                    beforeContent = metadata.before.content.textPreview || metadata.before.content;
                                } else if (typeof metadata.before === 'string') {
                                    beforeContent = metadata.before;
                                }
                            }
                            
                            // 策略2: 檢查是否有直接的 content 欄位
                            if (!afterContent && metadata.content) {
                                afterContent = metadata.content.textPreview || metadata.content;
                            }
                            
                            // 策略3: 檢查是否使用 newValue/oldValue 格式
                            if (!afterContent && metadata.newValue) {
                                afterContent = metadata.newValue;
                            }
                            if (!beforeContent && metadata.oldValue) {
                                beforeContent = metadata.oldValue;
                            }
                            
                            console.log('專案評論內容解析結果:', {
                                before: beforeContent,
                                after: afterContent
                            });
                            
                        } else {
                            // 任務評論的原有邏輯
                            // 策略1: 標準的 before/after 結構
                            if (metadata.after && metadata.after.content) {
                                const contentInfo = metadata.after.content;
                                afterContent = contentInfo.textPreview || contentInfo;
                            }
                            
                            if (metadata.before && metadata.before.content) {
                                const beforeContentInfo = metadata.before.content;
                                beforeContent = beforeContentInfo.textPreview || beforeContentInfo;
                            }
                        }
                        
                        // 策略2: diff 結構
                        if (!afterContent && metadata.diff && metadata.diff.content) {
                            afterContent = metadata.diff.content.after || null;
                            beforeContent = metadata.diff.content.before || null;
                        }
                        
                        // 策略3: 簡單的 oldValue/newValue 結構
                        if (!afterContent && metadata.newValue) {
                            afterContent = metadata.newValue;
                        }
                        if (!beforeContent && metadata.oldValue) {
                            beforeContent = metadata.oldValue;
                        }
                        
                        // 策略4: changed 數組結構 (針對不同的 audit 格式)
                        if (metadata.changed && metadata.changed.includes('content')) {
                            // 可能需要根據實際的 audit 格式調整
                            if (metadata.after) afterContent = metadata.after;
                            if (metadata.before) beforeContent = metadata.before;
                        }
                        
                        // 統一的內容處理和驗證
                        const processedAfterContent = afterContent && typeof afterContent === 'string' ? afterContent.trim() : null;
                        const processedBeforeContent = beforeContent && typeof beforeContent === 'string' ? beforeContent.trim() : null;
                        
                        baseActivity.comment.contentPreview = processedAfterContent;
                        baseActivity.comment.beforeContentPreview = processedBeforeContent;
                        
                        console.log('最終評論內容處理結果:', {
                            source: activity.source,
                            before: processedBeforeContent,
                            after: processedAfterContent,
                            commentId: activity.targetId
                        });
                        
                    } catch (e) {
                        console.warn('無法解析評論 metadata:', e);
                    }
                }
            }

            // 如果是移動操作，添加 from 和 to 屬性
            if (activity.changeType === 'move') {
                baseActivity.from = activity.oldValue;  // sourceColumnName
                baseActivity.to = activity.newValue;    // destinationColumnName
                
                // 如果task為null但description中包含任務標題，嘗試從description中提取
                if (!baseActivity.task && activity.description) {
                    const titleMatch = activity.description.match(/將任務「(.+?)」從/);
                    if (titleMatch) {
                        baseActivity.task = {
                            id: activity.taskId,
                            title: titleMatch[1]
                        };
                    }
                }
            }

            // 如果是更新操作，獲取相關的所有變更記錄
            if (activity.changeType === 'update' && activity.source === 'task' && activity.taskId) {
                const relatedChanges = await TaskChangeLog.findAll({
                    where: { 
                        taskId: activity.taskId,
                        changeType: 'update',
                        createdAt: {
                            // 取得同一時間範圍內的變更（前後30秒）
                            [Op.between]: [
                                new Date(activity.createdAt.getTime() - 30000),
                                new Date(activity.createdAt.getTime() + 30000)
                            ]
                        }
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 5
                });

                baseActivity.changes = relatedChanges.map(change => ({
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    description: change.description
                }));
            }

            // 處理列表重新排序操作
            if (activity.changeType === 'reorder' && activity.source === 'column') {
                try {
                    const oldOrder = JSON.parse(activity.oldValue || '[]');
                    const newOrder = JSON.parse(activity.newValue || '[]');
                    baseActivity.orderChange = {
                        from: oldOrder,
                        to: newOrder
                    };
                } catch (e) {
                    // 如果解析失敗，忽略順序詳情
                }
            }

            return baseActivity;
        }));
        
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
