const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');

const User = require('../models/user');
const RefreshToken = require('../models/refresh_token');
const sequelize = require('../util/database');
const apiCache = require('../services/apiCache');
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

        // crypto.randomInt：Math.random 可預測，不可用於臨時密碼
        const randomDigits = crypto.randomInt(100000, 1000000);
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

// PATCH /api/admin/users/:userId/role
// Body: { role: 'student' | 'teacher' }
// 教師身分只能由 admin 在此開通（註冊 API 一律給 student）。
// admin 角色不可透過 API 指派或變更，只能由 scripts/seed-admin.js 建立。
const ASSIGNABLE_ROLES = ['student', 'teacher'];

exports.updateUserRole = async (req, res) => {
    try {
        const targetUserId = Number(req.params.userId);
        const { role } = req.body || {};

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return res.status(400).json({ message: 'userId 必須是正整數' });
        }

        if (!ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({ message: 'role 只能是 student 或 teacher' });
        }

        const targetUser = await User.findByPk(targetUserId, {
            attributes: ['id', 'account', 'username', 'role']
        });

        if (!targetUser) {
            return res.status(404).json({ message: '找不到該使用者' });
        }

        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: '管理員角色不可透過此端點變更' });
        }

        const before = targetUser.role;
        if (before === role) {
            return res.json({ message: '角色未變更', role, account: targetUser.account, username: targetUser.username });
        }

        // 角色變更與 refresh token 撤銷放在同一交易：舊角色的長效 token 不得延續到新角色生效之後
        await sequelize.transaction(async (t) => {
            await targetUser.update({ role }, { transaction: t });
            await RefreshToken.destroy({ where: { userId: targetUser.id }, transaction: t });
        });
        apiCache.del(`me:${targetUser.id}`);

        logAudit(req, {
            action: 'ADMIN_ROLE_CHANGE',
            targetType: 'user',
            targetId: String(targetUserId),
            metadata: {
                targetAccount: targetUser.account,
                before,
                after: role,
                changedBy: req.userId
            }
        }).catch(() => {});

        return res.json({
            message: '角色更新成功，該使用者需重新登入後生效',
            role,
            account: targetUser.account,
            username: targetUser.username
        });
    } catch (err) {
        logger.error({ err: err.message }, '[admin] updateUserRole 失敗');
        return res.status(500).json({ message: '更新角色失敗' });
    }
};
