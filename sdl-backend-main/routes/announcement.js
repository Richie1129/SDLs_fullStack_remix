// routes/announcement.js
const router = require('express').Router();
const controller = require('../controllers/announcement');
const { validateToken } = require('../middlewares/AuthMiddleware');
const {
    canDeleteAnnouncement,
    canCreateAnnouncement
} = require('../middlewares/announcementPermission');

// 發佈公告（需要認證 + 教師/管理員權限）
router.post('/create', validateToken, canCreateAnnouncement, controller.createAnnouncement);

// 獲取公告（需要認證；查詢範圍依角色與所屬專案限制，見 controller）
router.get('/', validateToken, controller.getAnnouncements);

// 刪除公告（需要認證 + 教師/管理員權限）
router.delete('/:id', validateToken, canDeleteAnnouncement, controller.deleteAnnouncement);

module.exports = router;