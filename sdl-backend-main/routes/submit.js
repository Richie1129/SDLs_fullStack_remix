const controller = require('../controllers/submit');
const router = require('express').Router();
const { uploadToMinio, uploadSingleToMinio } = require('../middlewares/minioUploadMiddleware');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission, checkWritePermission } = require('../middlewares/projectViewingMiddleware');
const { getProjectIdFromSubmit } = require('../middlewares/ideaWallProjectMiddleware');
// const { upload } = require('../middlewares/uploadMiddleware'); // 原版本 - 暫時註解

// 建立一個可選的權限檢查中間件
const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = req.header("accessToken");
        
        if (accessToken) {
            // 有 token 的情況下，進行身份驗證
            const { verify } = require("jsonwebtoken");
            const validToken = verify(accessToken, "importantsecret");
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

// 只讀路由 - 允許觀摩者存取（前端使用 query 參數傳遞 projectId）
router.get('/', optionalAuth, optionalProjectPermission, controller.getAllSubmit);
router.get('/:submitId', optionalAuth, getProjectIdFromSubmit, optionalProjectPermission, controller.getSubmit);
router.get('/:submitId/changes', optionalAuth, getProjectIdFromSubmit, optionalProjectPermission, controller.getSubmitChangeLogs);

// 寫入路由 - 需要完整權限，禁止觀摩者操作
router.post('/', 
  (req, _res, next) => { 
    console.log('=== POST /api/submit incoming ===');
    console.log('Has accessToken header:', !!req.header('accessToken'));
    next();
  },
  validateToken, 
  checkProjectViewingPermission, 
  checkWritePermission, 
  uploadToMinio('attachFile'), 
  controller.createSubmit
);
router.put('/:submitId', validateToken, getProjectIdFromSubmit, checkProjectViewingPermission, checkWritePermission, uploadSingleToMinio('attachFile'), controller.updateSubmit);
router.delete('/:submitId', validateToken, getProjectIdFromSubmit, checkProjectViewingPermission, checkWritePermission, controller.deleteSubmit);

module.exports = router;
