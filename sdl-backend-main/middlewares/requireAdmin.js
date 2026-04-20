const User = require('../models/user');
const logger = require('../config/logger');

// 必須在 validateToken 之後使用；僅允許 role === 'admin' 的帳號通過
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.userId;
        let userRole = req.user?.role;

        if (!userRole) {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'role', 'username']
            });

            if (!user) {
                logger.error({ userId }, '[requireAdmin] 找不到用戶');
                return res.status(401).json({
                    message: '用戶身份驗證失敗',
                    code: 'USER_NOT_FOUND'
                });
            }

            userRole = user.role;
            req.user = { ...req.user, role: user.role, username: user.username };
        }

        if (userRole !== 'admin') {
            logger.warn({ userId, userRole, url: req.url }, '[requireAdmin] 非管理員拒絕存取');
            return res.status(403).json({
                message: '需要管理員權限',
                code: 'ADMIN_REQUIRED'
            });
        }

        next();
    } catch (error) {
        logger.error({ error: error.message, userId: req.userId }, '[requireAdmin] 權限檢查錯誤');
        return res.status(500).json({
            message: '權限檢查失敗',
            code: 'PERMISSION_CHECK_ERROR'
        });
    }
};

module.exports = { requireAdmin };
