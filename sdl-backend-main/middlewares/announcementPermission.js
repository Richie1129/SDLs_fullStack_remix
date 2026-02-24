/**
 * 公告權限檢查中間件
 * 用於驗證用戶是否有權限操作公告
 */

const Announcement = require('../models/announcement');
const User = require('../models/user');
const logger = require('../config/logger');

/**
 * 檢查用戶是否有權限刪除公告
 *
 * 權限規則：
 * 1. 教師（teacher）和管理員（admin）可以刪除所有公告
 * 2. 學生（student）不能刪除公告
 *
 * 注意：由於 Announcement 模型目前沒有 creatorId 欄位，
 * 暫時無法驗證「只有作者可以刪除自己的公告」。
 * 建議未來新增 creatorId 欄位以實現更精確的權限控制。
 */
const canDeleteAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const currentUser = req.user;

        // 驗證公告是否存在
        const announcement = await Announcement.findByPk(id);
        if (!announcement) {
            logger.warn({ announcementId: id, userId }, '嘗試刪除不存在的公告');
            return res.status(404).json({
                message: '找不到指定的公告',
                code: 'ANNOUNCEMENT_NOT_FOUND'
            });
        }

        // 獲取完整的用戶資訊（包含角色）
        let userRole = currentUser?.role;

        // 如果 JWT token 中沒有 role，從資料庫查詢
        if (!userRole) {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'role', 'username']
            });

            if (!user) {
                logger.error({ userId }, '找不到用戶資訊');
                return res.status(401).json({
                    message: '用戶身份驗證失敗',
                    code: 'USER_NOT_FOUND'
                });
            }

            userRole = user.role;
            req.user = { ...currentUser, role: user.role, username: user.username };
        }

        // 權限檢查：只有教師和管理員可以刪除公告
        const allowedRoles = ['teacher', 'admin'];
        if (!allowedRoles.includes(userRole)) {
            logger.warn({
                userId,
                userRole,
                announcementId: id,
                announcementTitle: announcement.title
            }, '用戶無權限刪除公告');

            return res.status(403).json({
                message: '您沒有權限刪除公告',
                code: 'PERMISSION_DENIED',
                requiredRole: '教師或管理員'
            });
        }

        // 將公告附加到 request 中，避免後續重複查詢
        req.announcementToDelete = announcement;

        logger.info({
            userId,
            userRole,
            announcementId: id,
            announcementTitle: announcement.title
        }, '公告刪除權限驗證通過');

        next();

    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
            announcementId: req.params.id,
            userId: req.userId
        }, '權限檢查過程發生錯誤');

        return res.status(500).json({
            message: '權限檢查失敗',
            code: 'PERMISSION_CHECK_ERROR',
            error: error.message
        });
    }
};

/**
 * 檢查用戶是否有權限建立公告
 *
 * 權限規則：
 * 1. 教師（teacher）和管理員（admin）可以建立公告
 * 2. 學生（student）不能建立公告
 */
const canCreateAnnouncement = async (req, res, next) => {
    try {
        const userId = req.userId;
        const currentUser = req.user;

        // 獲取用戶角色
        let userRole = currentUser?.role;

        if (!userRole) {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'role', 'username']
            });

            if (!user) {
                logger.error({ userId }, '找不到用戶資訊');
                return res.status(401).json({
                    message: '用戶身份驗證失敗',
                    code: 'USER_NOT_FOUND'
                });
            }

            userRole = user.role;
            req.user = { ...currentUser, role: user.role, username: user.username };
        }

        // 權限檢查
        const allowedRoles = ['teacher', 'admin'];
        if (!allowedRoles.includes(userRole)) {
            logger.warn({
                userId,
                userRole
            }, '用戶無權限建立公告');

            return res.status(403).json({
                message: '您沒有權限建立公告',
                code: 'PERMISSION_DENIED',
                requiredRole: '教師或管理員'
            });
        }

        logger.info({ userId, userRole }, '公告建立權限驗證通過');
        next();

    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
            userId: req.userId
        }, '權限檢查過程發生錯誤');

        return res.status(500).json({
            message: '權限檢查失敗',
            code: 'PERMISSION_CHECK_ERROR',
            error: error.message
        });
    }
};

module.exports = {
    canDeleteAnnouncement,
    canCreateAnnouncement
};
