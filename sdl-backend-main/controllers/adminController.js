const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const User = require('../models/user');
const { logAudit } = require('../services/auditService');
const logger = require('../config/logger');

const SALT_ROUNDS = 10;
const ALLOWED_PAGE_SIZES = [1, 10, 20, 50, 100];

// GET /api/admin/users
// Query: keyword, role (student|teacher|admin|all), page, pageSize
exports.listUsers = async (req, res) => {
    try {
        const keyword = (req.query.keyword || '').trim();
        const roleFilter = req.query.role || 'all';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        let pageSize = parseInt(req.query.pageSize, 10) || 20;
        if (!ALLOWED_PAGE_SIZES.includes(pageSize)) pageSize = 20;

        const where = {};
        if (keyword) {
            where[Op.or] = [
                { account: { [Op.iLike]: `%${keyword}%` } },
                { username: { [Op.iLike]: `%${keyword}%` } }
            ];
        }
        if (roleFilter && roleFilter !== 'all') {
            where.role = roleFilter;
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'account', 'username', 'email', 'role', 'class', 'seatNumber', 'aiEnabled', 'passwordResetAt', 'createdAt'],
            order: [['id', 'ASC']],
            offset: (page - 1) * pageSize,
            limit: pageSize
        });

        logAudit(req, {
            action: 'ADMIN_DASHBOARD_VIEW',
            targetType: 'system',
            metadata: { keyword, roleFilter, page, pageSize, total: count }
        }).catch(() => {});

        return res.json({
            users: rows,
            total: count,
            page,
            pageSize
        });
    } catch (err) {
        logger.error({ err: err.message }, '[admin] listUsers 失敗');
        return res.status(500).json({ message: '取得用戶列表失敗', error: err.message });
    }
};

// PUT /api/admin/users/:userId/reset-password
// 產生臨時密碼並回傳（不受班級限制）
exports.resetUserPassword = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const targetUser = await User.findByPk(targetUserId, {
            attributes: ['id', 'account', 'username', 'role']
        });

        if (!targetUser) {
            return res.status(404).json({ message: '找不到該使用者' });
        }

        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const tempPassword = `SDL${randomDigits}`;
        const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

        await User.update(
            { password: hashedPassword, passwordResetAt: new Date() },
            { where: { id: targetUserId } }
        );

        logAudit(req, {
            action: 'ADMIN_PASSWORD_RESET_BY_ADMIN',
            targetType: 'user',
            targetId: String(targetUserId),
            metadata: {
                targetAccount: targetUser.account,
                targetRole: targetUser.role,
                resetBy: req.userId
            }
        }).catch(() => {});

        return res.json({
            message: '密碼重設成功',
            tempPassword,
            username: targetUser.username,
            account: targetUser.account
        });
    } catch (err) {
        logger.error({ err: err.message }, '[admin] resetUserPassword 失敗');
        return res.status(500).json({ message: '重設密碼失敗', error: err.message });
    }
};

// PATCH /api/admin/users/:userId/ai-access
// Body: { aiEnabled: boolean }
exports.toggleAiAccess = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const { aiEnabled } = req.body || {};

        if (typeof aiEnabled !== 'boolean') {
            return res.status(400).json({ message: 'aiEnabled 必須為 boolean' });
        }

        const targetUser = await User.findByPk(targetUserId, {
            attributes: ['id', 'account', 'role', 'aiEnabled']
        });

        if (!targetUser) {
            return res.status(404).json({ message: '找不到該使用者' });
        }

        const before = targetUser.aiEnabled;
        await targetUser.update({ aiEnabled });

        logAudit(req, {
            action: 'ADMIN_AI_ACCESS_TOGGLE',
            targetType: 'user',
            targetId: String(targetUserId),
            metadata: {
                targetAccount: targetUser.account,
                before,
                after: aiEnabled,
                toggledBy: req.userId
            }
        }).catch(() => {});

        return res.json({
            message: 'AI 功能狀態已更新',
            userId: targetUser.id,
            aiEnabled
        });
    } catch (err) {
        logger.error({ err: err.message }, '[admin] toggleAiAccess 失敗');
        return res.status(500).json({ message: '更新 AI 權限失敗', error: err.message });
    }
};
