const controller = require('../controllers/daily');
const router = require('express').Router();
const { uploadToMinio, uploadSingleToMinio } = require('../middlewares/minioUploadMiddleware');
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

// 建立一個獲取 projectId 的中間件，從 daily 記錄中獲取 projectId
const getProjectIdFromDaily = async (req, res, next) => {
    try {
        const DailyPersonal = require('../models/daily_personal');
        const DailyTeam = require('../models/daily_team');
        const dailyId = req.params.id;

        if (!dailyId) {
            return res.status(400).json({ message: '缺少 daily ID 參數' });
        }

        // 根據路由路徑決定查哪個表（不要猜測）
        const isTeamRoute = req.path.includes('/team');
        const Model = isTeamRoute ? DailyTeam : DailyPersonal;
        const daily = await Model.findByPk(dailyId);

        if (!daily) {
            return res.status(404).json({
                message: `${isTeamRoute ? '團隊' : '個人'}日誌記錄不存在`
            });
        }

        req.params.projectId = daily.projectId;
        req.body.projectId = daily.projectId;
        req.query.projectId = daily.projectId;

        // 儲存 daily 記錄供後續中間件使用
        req.dailyRecord = daily;

        next();
    } catch (error) {
        console.error('從 daily ID 獲取 projectId 錯誤:', error);
        return res.status(500).json({
            message: '獲取專案資訊時發生錯誤',
            error: error.message
        });
    }
};

// 只讀路由 - 允許觀摩者存取（需要在 query 或 body 中包含 projectId）
router.get('/', optionalAuth, optionalProjectPermission, controller.getPersonalDaily);
router.get('/team', optionalAuth, optionalProjectPermission, controller.getTeamDaily);

// 班級反思匿名聚合統計（只回傳數字，不含個人資料）
router.get('/class-summary', validateToken, checkProjectViewingPermission, controller.getClassSummary);

// 寫入路由 - 需要完整權限，禁止觀摩者操作
router.post('/', validateToken, checkProjectViewingPermission, checkWritePermission, uploadToMinio('attachFile'), controller.createPersonalDaily);
router.post('/team', validateToken, checkProjectViewingPermission, checkWritePermission, uploadToMinio('attachFile'), controller.createTeamDaily);
router.put('/personal/:id', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, uploadSingleToMinio('attachFile'), controller.updatePersonalDaily);
router.put('/team/:id', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, uploadSingleToMinio('attachFile'), controller.updateTeamDaily);
router.delete('/personal/:id', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, controller.deletePersonalDaily);
router.delete('/team/:id', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, controller.deleteTeamDaily);

// 單獨刪除附件
router.delete('/personal/:id/attachment', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, controller.removePersonalAttachment);
router.delete('/team/:id/attachment', validateToken, getProjectIdFromDaily, checkProjectViewingPermission, checkWritePermission, controller.removeTeamAttachment);

module.exports = router;
