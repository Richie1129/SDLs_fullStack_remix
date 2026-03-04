const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const { Op } = require('sequelize');
const sequelize = require('../util/database');

/**
 * 清理函數：移除 Column 中不存在的任務 ID
 */
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

/**
 * 獲取並處理專案的 Kanban 資料
 */
const getKanbanData = async (projectId) => {
    const kanbanData = await Kanban.findAll({
        attributes: ['id', 'column'],
        where: { projectId: projectId },
    });

    if (!kanbanData || kanbanData.length === 0) {
        return null;
    }

    const { id: kanbanId, column: columnOrder } = kanbanData[0];

    // 獲取所有列
    const columns = await Column.findAll({
        attributes: ['id', 'name', 'task'],
        where: { kanbanId: kanbanId }
    });

    // 依照看板中的順序排序列
    const sortedColumnData = columnOrder
        .map(columnId => columns.find(item => item.id === columnId))
        .filter(item => item !== undefined);

    // 批量獲取所有列的任務
    const columnIds = sortedColumnData.map(c => c.id);
    const allTasks = await Task.findAll({
        attributes: ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'images', 'files', 'createdAt', 'updatedAt', 'columnId'],
        where: {
            columnId: { [Op.in]: columnIds }
        }
    });

    // 將任務依 columnId 分組
    const tasksByColumn = new Map();
    allTasks.forEach(task => {
        if (!tasksByColumn.has(task.columnId)) {
            tasksByColumn.set(task.columnId, []);
        }
        tasksByColumn.get(task.columnId).push(task);
    });

    // 處理每一列：清理無效 ID 並排序任務
    await Promise.all(sortedColumnData.map(async (columnItem) => {
        const columnTasks = tasksByColumn.get(columnItem.id) || [];
        const existingTaskIds = new Set(columnTasks.map(t => t.id));
        
        let currentTaskIds = columnItem.task || [];
        if (!Array.isArray(currentTaskIds)) currentTaskIds = [];
        
        const cleanedTaskIds = currentTaskIds.filter(taskId => existingTaskIds.has(taskId));
        
        // 如果有變化，更新資料庫 (rare case)
        if (cleanedTaskIds.length !== currentTaskIds.length) {
            console.log(`清理 Column ${columnItem.id}: 移除了 ${currentTaskIds.length - cleanedTaskIds.length} 個無效的任務 ID`);
            await Column.update(
                { task: cleanedTaskIds },
                { where: { id: columnItem.id }, individualHooks: true }
            );
            columnItem.task = cleanedTaskIds;
        }

        // 依照 columnItem.task 中的順序對任務進行排序
        const taskMap = new Map(columnTasks.map(t => [t.id, t]));
        columnItem.task = cleanedTaskIds
            .map(taskId => taskMap.get(taskId))
            .filter(task => task !== undefined);
    }));

    return sortedColumnData;
};

/**
 * 創建專案的初始 Kanban
 */
const createInitialKanban = async (projectId) => {
    return await sequelize.transaction(async (t) => {
        const kanban = await Kanban.create({
            column: [],
            projectId: projectId
        }, { transaction: t });

        const todo = await Column.create({
            name: "待處理",
            task: [],
            kanbanId: kanban.id
        }, { transaction: t });

        const inProgress = await Column.create({
            name: "進行中",
            task: [],
            kanbanId: kanban.id
        }, { transaction: t });

        const completed = await Column.create({
            name: "完成",
            task: [],
            kanbanId: kanban.id
        }, { transaction: t });

        kanban.column = [todo.id, inProgress.id, completed.id];
        await kanban.save({ transaction: t });

        return kanban;
    });
};

module.exports = {
    cleanupColumnTasks,
    getKanbanData,
    createInitialKanban
};
