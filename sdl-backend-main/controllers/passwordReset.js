const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/user');
const PasswordResetToken = require('../models/password_reset_token');
const { sendPasswordResetEmail } = require('../services/emailService');
const { revokeAllTokens } = require('./auth');

// 設定模型關聯
PasswordResetToken.belongsTo(User, {
    as: "User",
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});

User.hasMany(PasswordResetToken, {
    foreignKey: 'userId'
});

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: '請提供有效的電子郵件地址'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            where: { email: normalizedEmail }
        });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: '如果該 email 存在於系統中，重設密碼郵件已發送'
            });
        }

        await PasswordResetToken.destroy({
            where: { userId: user.id }
        });

        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await PasswordResetToken.create({
            token: resetToken,
            userId: user.id,
            expiresAt: expiresAt
        });

        try {
            await sendPasswordResetEmail(user.email, resetToken);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            await PasswordResetToken.destroy({
                where: { token: resetToken }
            });

            return res.status(500).json({
                success: false,
                message: '郵件發送失敗，請稍後再試'
            });
        }

        res.status(200).json({
            success: true,
            message: '如果該 email 存在於系統中，重設密碼郵件已發送'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: '系統錯誤，請稍後再試'
        });
    }
};

const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: '缺少重設 token'
            });
        }

        const resetToken = await PasswordResetToken.findOne({
            where: {
                token: token,
                expiresAt: {
                    [Op.gt]: new Date()
                }
            },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'email']
            }]
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: '無效或已過期的重設連結'
            });
        }

        // 【Linus式檢查】- 檢查 User 關聯是否載入成功
        if (!resetToken.User) {
            console.error('Token found but User relation failed to load for token:', token);
            return res.status(500).json({
                success: false,
                message: '系統錯誤，請稍後再試'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token 有效',
            email: resetToken.User.email
        });

    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({
            success: false,
            message: '系統錯誤，請稍後再試'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的參數'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: '密碼至少需要 8 個字元'
            });
        }

        const resetToken = await PasswordResetToken.findOne({
            where: {
                token: token,
                expiresAt: {
                    [Op.gt]: new Date()
                }
            },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'email']
            }]
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: '無效或已過期的重設連結'
            });
        }

        // 【Linus式檢查】- 檢查 User 關聯是否載入成功
        if (!resetToken.User) {
            console.error('Token found but User relation failed to load for token:', token);
            return res.status(500).json({
                success: false,
                message: '系統錯誤，請稍後再試'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.update(
            { password: hashedPassword },
            { where: { id: resetToken.User.id } }
        );

        // 撤銷所有 Refresh Tokens (密碼重設後強制重新登入)
        await revokeAllTokens(resetToken.User.id);

        await PasswordResetToken.destroy({
            where: { userId: resetToken.User.id }
        });

        res.status(200).json({
            success: true,
            message: '密碼重設成功'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: '系統錯誤，請稍後再試'
        });
    }
};

const cleanupExpiredTokens = async () => {
    try {
        const deletedCount = await PasswordResetToken.destroy({
            where: {
                expiresAt: {
                    [Op.lt]: new Date()
                }
            }
        });

        if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
        }
    } catch (error) {
        console.error('Token cleanup error:', error);
    }
};

module.exports = {
    requestPasswordReset,
    validateResetToken,
    resetPassword,
    cleanupExpiredTokens
};