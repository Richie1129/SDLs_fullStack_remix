const Task = require('../models/task');
const TaskChangeLog = require('../models/task_change_log');
const kanbanService = require('../services/kanbanService');
const activityService = require('../services/activityService');

/**
 * 獲取專案的 Kanban 資料
 * GET /kanban/:projectId
 */
exports.getKanban = async (req, res) => {
    try {
        const { projectId } = req.params;
        const sortedColumnData = await kanbanService.getKanbanData(projectId);
        
        if (!sortedColumnData) {
            return res.status(404).json({ message: 'No Kanban record found for this project!' });
        }
        
        res.status(200).json(sortedColumnData);
    } catch (error) {
        console.error('Error fetching kanban:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * 獲取列中的所有任務
 * GET /kanban/tasks/:columnId
 */
exports.getKanbanTask = async (req, res) => {
    try {
        const { columnId } = req.params;
        const tasks = await Task.findAll({
            attributes: ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'images', 'files', 'createdAt', 'updatedAt'],
            where: { columnId }
        });
        res.status(200).json(tasks);
    } catch (err) {
        console.error('Error fetching kanban tasks:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * 取得任務變更記錄
 * GET /kanban/task-logs/:taskId
 */
exports.getTaskChangeLogs = async (req, res) => {
    try {
        const { taskId } = req.params;
        const changeLogs = await TaskChangeLog.findAll({
            where: { taskId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.status(200).json(changeLogs);
    } catch (error) {
        console.error('取得變更記錄失敗:', error);
        res.status(500).json({ message: '取得變更記錄失敗' });
    }
};

/**
 * 取得專案活動流
 * GET /kanban/activity/:projectId
 */
exports.getProjectActivity = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 20, offset = 0, before } = req.query;
        
        const activities = await activityService.getProjectActivities(projectId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            before
        });
        
        res.status(200).json(activities);
    } catch (error) {
        console.error('取得專案活動失敗:', error);
        res.status(500).json({ message: '取得專案活動失敗' });
    }
};

/**
 * 手動清理數據的端點
 * POST /kanban/cleanup/:projectId
 */
exports.cleanupKanbanData = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await kanbanService.getKanbanData(projectId); // 內部已包含清理邏輯
        
        res.status(200).json({
            message: '數據清理完成',
            projectId: projectId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('清理 Kanban 數據失敗:', error);
        res.status(500).json({ message: '清理數據時發生錯誤', error: error.message });
    }
};

/**
 * 創建專案的初始 Kanban (供專案創建時調用)
 */
exports.createKanban = async (projectId) => {
    try {
        return await kanbanService.createInitialKanban(projectId);
    } catch (error) {
        console.error('Error creating kanban:', error);
        throw error;
    }
};
