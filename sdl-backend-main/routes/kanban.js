const express = require('express');
const router = express.Router();
const controller = require('../controllers/kanban');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { getProjectIdFromTask } = require('../middlewares/projectAccess');
const { checkProjectViewingPermission, checkWritePermission } = require('../middlewares/projectViewingMiddleware');
const config = require('../config');

// 建立一個可選的權限檢查中間件
const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = req.header("accessToken");

        if (accessToken) {
            // 有 token 的情況下，進行身份驗證
            const { verify } = require("jsonwebtoken");
            const validToken = verify(accessToken, config.jwt.secret);
            req.user = validToken;
            req.userId = validToken.id;
        }
        // 沒有 token 也允許繼續，但 userId 會是 undefined
        next();
    } catch (err) {
        // token 無效時也允許繼續，但 userId 會是 undefined
        next();
    }
};

// 建立一個可選的項目權限檢查中間件
const optionalProjectPermission = async (req, res, next) => {
    try {
        if (!req.userId) {
            // 如果沒有用戶ID，設置為訪客模式
            req.readOnly = true;
            req.hasViewingPermission = false;
            return next();
        }
        
        // 如果有用戶ID，進行正常的權限檢查
        return checkProjectViewingPermission(req, res, next);
    } catch (error) {
        console.error('可選權限檢查錯誤:', error);
        // 出錯時設置為訪客模式
        req.readOnly = true;
        req.hasViewingPermission = false;
        next();
    }
};

// 建立一個獲取 projectId 的中間件，用於從 columnId 或 taskId 獲取 projectId
const getProjectIdFromColumn = async (req, res, next) => {
    try {
        const Column = require('../models/column');
        const Kanban = require('../models/kanban');
        const columnId = req.params.columnId;
        
        if (!columnId) {
            return res.status(400).json({ message: '缺少 columnId 參數' });
        }

        const column = await Column.findByPk(columnId, {
            include: [{ model: Kanban, attributes: ['projectId'] }]
        });
        
        if (!column || !column.kanban) {
            return res.status(404).json({ message: '列表或相關專案不存在' });
        }

        req.params.projectId = column.kanban.projectId;
        req.body.projectId = column.kanban.projectId;
        req.query.projectId = column.kanban.projectId;
        
        next();
    } catch (error) {
        console.error('從 columnId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ 
            message: '獲取專案資訊時發生錯誤',
            error: error.message 
        });
    }
};


// 只讀路由 - 允許觀摩者和訪客存取
router.get('/:projectId', optionalAuth, optionalProjectPermission, controller.getKanban);
router.get('/columns/:columnId', optionalAuth, getProjectIdFromColumn, optionalProjectPermission, controller.getKanbanTask);
router.get('/tasks/:taskId/changes', optionalAuth, getProjectIdFromTask, optionalProjectPermission, controller.getTaskChangeLogs);
router.get('/projects/:projectId/activity', optionalAuth, optionalProjectPermission, controller.getProjectActivity);

// 寫入路由 - 需要完整權限，禁止觀摩者操作
router.post('/cleanup/:projectId', validateToken, checkProjectViewingPermission, checkWritePermission, controller.cleanupKanbanData);
//router.post('/', validateToken, checkProjectViewingPermission, checkWritePermission, controller.createKanban);
// router.put('/:projectId', validateToken, checkProjectViewingPermission, checkWritePermission, controller.updateKanban);
// router.delete('/:projectId', validateToken, checkProjectViewingPermission, checkWritePermission, controller.deleteKanban);

module.exports = router;