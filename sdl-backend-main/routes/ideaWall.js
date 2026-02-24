const controller = require('../controllers/ideaWall');
const messageController = require('../controllers/ideaWallMessage');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
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

// IdeaWall Message Routes (Specific routes first)
router.post('/:wallId/messages', validateToken, messageController.createMessage);
router.get('/:wallId/messages', validateToken, messageController.getMessages);
router.get('/:wallId/context', validateToken, controller.getWallContext); // New Context Route

// 只讀路由 - 允許觀摩者存取
router.get('/:projectId/:stage', optionalAuth, optionalProjectPermission, controller.getIdeaWall); // 向後相容
router.get('/:projectId', optionalAuth, optionalProjectPermission, controller.getIdeaWall); // 新的簡化路由
router.get('/', optionalAuth, optionalProjectPermission, controller.getAllIdeaWall);

// 寫入路由 - 需要完整權限，禁止觀摩者操作
router.post('/', validateToken, checkProjectViewingPermission, checkWritePermission, controller.createIdeaWall);

module.exports = router;