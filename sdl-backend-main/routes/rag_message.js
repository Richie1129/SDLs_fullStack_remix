//backend routes for rag_message
const router = require('express').Router();
const controller = require('../controllers/rag_message');
const { validateToken } = require('../middlewares/AuthMiddleware');

/**
 * IDOR 保護：確認路由中的 userId 與 token 中的使用者一致
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

// 獲取用戶所有 RAG 訊息歷史
router.get('/history/:userId', ensureOwnData, controller.getRagMessageHistory);

// 根據 userId 和 sessionId 取得特定會話的訊息歷史
router.get('/session/:userId/:sessionId', ensureOwnData, controller.getRagMessageBySession);

// 根據 userId 和 sessionId 取得 RAGFlow session ID
router.get('/ragflow-session/:userId/:sessionId', ensureOwnData, controller.getRagflowSessionId);

// 根據 userId 取得所有會話列表
router.get('/sessions/:userId', ensureOwnData, controller.getUserSessions);

// 根據 userId 和 sessionId 刪除特定會話的所有訊息
router.delete('/session/:userId/:sessionId', ensureOwnData, controller.deleteSessionMessages);

// 創建新會話並保存開場白
router.post('/create-session', controller.createNewSession);

// 使用 Gemini 生成對話摘要標題
router.post('/generate-title/:sessionId', controller.generateSessionTitle);

module.exports = router;