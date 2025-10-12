const { sign } = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('../config');
const RefreshToken = require('../models/refresh_token');
const User = require('../models/user');

/**
 * POST /auth/refresh
 * 刷新 Access Token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                code: 'MISSING_REFRESH_TOKEN',
                message: 'Refresh Token 是必需的'
            });
        }

        // 查找並驗證
        const tokenRecord = await RefreshToken.findOne({
            where: {
                token: refreshToken,
                expiresAt: { [Op.gt]: new Date() }
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'account', 'role']
            }]
        });

        if (!tokenRecord) {
            return res.status(401).json({
                code: 'REFRESH_TOKEN_EXPIRED',
                message: 'Refresh Token 已過期或無效'
            });
        }

        // 生成新 Access Token
        const accessToken = sign(
            {
                account: tokenRecord.user.account,
                id: tokenRecord.user.id,
                role: tokenRecord.user.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.status(200).json({
            accessToken,
            expiresIn: config.jwt.expiresIn
        });

    } catch (err) {
        console.error('[Refresh Token Error]', err);
        res.status(500).json({
            code: 'REFRESH_FAILED',
            message: '刷新 Token 失敗'
        });
    }
};

/**
 * POST /auth/logout
 * 撤銷 Refresh Token
 */
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await RefreshToken.destroy({ where: { token: refreshToken } });
        }

        res.status(200).json({ message: '登出成功' });
    } catch (err) {
        console.error('[Logout Error]', err);
        res.status(500).json({ message: '登出失敗' });
    }
};

/**
 * 撤銷用戶所有 Token (密碼重設後調用)
 */
exports.revokeAllTokens = async (userId) => {
    await RefreshToken.destroy({ where: { userId } });
};

/**
 * 清理過期 Token (定時任務)
 */
exports.cleanupExpiredTokens = async () => {
    const deleted = await RefreshToken.destroy({
        where: { expiresAt: { [Op.lt]: new Date() } }
    });
    console.log(`[Cleanup] Removed ${deleted} expired tokens`);
};
