const User = require('../models/user');
const logger = require('../config/logger');

// 查詢某 user 是否被允許使用 AI 功能
// 預設 true（欄位預設值），找不到用戶也回 true（避免誤擋，真正 401 由 validateToken 處理）
async function isAiEnabled(userId) {
    if (!userId) return true;
    try {
        const user = await User.findByPk(userId, { attributes: ['aiEnabled'] });
        if (!user) return true;
        return user.aiEnabled !== false;
    } catch (err) {
        logger.warn({ userId, err: err.message }, '[aiAccessService] 查詢 aiEnabled 失敗，預設放行');
        return true;
    }
}

// Express middleware 形式：用在 AI 相關路由上
async function requireAiEnabled(req, res, next) {
    const ok = await isAiEnabled(req.userId);
    if (!ok) {
        return res.status(403).json({
            error: 'AI_DISABLED',
            message: 'AI 功能已停用，請聯絡管理員'
        });
    }
    next();
}

module.exports = { isAiEnabled, requireAiEnabled };
