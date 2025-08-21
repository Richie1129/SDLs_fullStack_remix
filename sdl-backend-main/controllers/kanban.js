const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Project = require('../models/project');
const TaskChangeLog = require('../models/task_change_log');
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
    const sortedColumnData = column.map(columnId => columnData.find(item => item.id === columnId));

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
        
        const activities = await TaskChangeLog.findAll({
            where: whereCondition,
            include: [{
                model: Task,
                attributes: ['id', 'title'],
                required: false
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // 組合活動資料，包含詳細的變更資訊
        const formattedActivities = await Promise.all(activities.map(async (activity) => {
            const baseActivity = {
                id: activity.id,
                changeType: activity.changeType,
                changedBy: activity.changedBy,
                createdAt: activity.createdAt,
                description: activity.description,
                task: activity.Task ? {
                    id: activity.Task.id,
                    title: activity.Task.title
                } : null
            };

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
            if (activity.changeType === 'update' && activity.taskId) {
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
