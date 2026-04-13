//backend routes for rag_message
const router = require('express').Router();
const controller = require('../controllers/rag_message');
const { validateToken } = require('../middlewares/AuthMiddleware');
const UserProject = require('../models/user_project');

/**
 * IDOR 保護：本人 OR 同專案成員可讀取。
 * studentDashboard 需顯示同組成員的 AI 互動紀錄作為互相參考。
 */
async function ensureOwnOrTeammate(req, res, next) {
    const paramUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(paramUserId)) {
        return res.status(400).json({ message: '無效的使用者 ID' });
    }
    if (paramUserId === req.userId) return next();

    try {
        const myProjects = await UserProject.findAll({
            where: { userId: req.userId },
            attributes: ['projectId']
        });
        const projectIds = myProjects.map(p => p.projectId);
        if (projectIds.length === 0) {
            return res.status(403).json({ message: '無權存取其他使用者的資料' });
        }
        const shared = await UserProject.findOne({
            where: { userId: paramUserId, projectId: projectIds }
        });
        if (!shared) {
            return res.status(403).json({ message: '無權存取其他使用者的資料' });
        }
        next();
    } catch (err) {
        console.error('ensureOwnOrTeammate 查詢失敗:', err.message);
        return res.status(500).json({ message: '權限驗證失敗' });
    }
}

/**
 * 嚴格 IDOR 保護：僅本人可寫入 / 刪除（用於 delete session）
 */
function ensureOwnData(req, res, next) {
    const paramUserId = parseInt(req.params.userId, 10);
    if (Number.isNaN(paramUserId) || paramUserId !== req.userId) {
        return res.status(403).json({ message: '無權存取其他使用者的資料' });
    }
    next();
}

// 所有路由都需要認證
router.use(validateToken);

// 測試 API 連接（前端健康檢查用）
router.get('/test/:userId', ensureOwnData, controller.testConnection);

// 獲取用戶所有 RAG 訊息歷史（同專案成員可讀，供 dashboard 互相參考）
router.get('/history/:userId', ensureOwnOrTeammate, controller.getRagMessageHistory);

// 根據 userId 和 sessionId 取得特定會話的訊息歷史（同專案成員可讀）
router.get('/session/:userId/:sessionId', ensureOwnOrTeammate, controller.getRagMessageBySession);

// 根據 userId 和 sessionId 取得 RAGFlow session ID（同專案成員可讀）
router.get('/ragflow-session/:userId/:sessionId', ensureOwnOrTeammate, controller.getRagflowSessionId);

// 根據 userId 取得所有會話列表（同專案成員可讀）
router.get('/sessions/:userId', ensureOwnOrTeammate, controller.getUserSessions);

// 根據 userId 和 sessionId 刪除特定會話的所有訊息（僅本人）
router.delete('/session/:userId/:sessionId', ensureOwnData, controller.deleteSessionMessages);

// 創建新會話並保存開場白
router.post('/create-session', controller.createNewSession);

// 使用 Gemini 生成對話摘要標題
router.post('/generate-title/:sessionId', controller.generateSessionTitle);

module.exports = router;