
const controller = require('../controllers/question');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');
const { getProjectIdFromQuestion } = require('../middlewares/projectAccess');

// 問答室是學生向老師的私訊：本人／teacher/admin／該專案 mentor 才能看訊息與刪除。
// 授權判斷在 controller 的 canAccessQuestionRecord；不掛 checkProjectViewingPermission，
// 因為它只認成員／mentor／觀摩者（非 mentor 的教師會被擋），且舊資料 projectId 可能為 null。
router.get('/messages/:questionId', validateToken, getProjectIdFromQuestion, controller.getMessages);
router.get('/:projectId', validateToken, checkProjectViewingPermission, controller.getAllChatrooms);
router.get('/:projectId/:userId', validateToken, checkProjectViewingPermission, controller.getUserChatrooms);
router.post('/createChatroom', validateToken, controller.createChatroom);
router.post('/createMessage', validateToken, controller.createMessage);
router.delete('/chatrooms/:questionId', validateToken, getProjectIdFromQuestion, controller.deleteChatroom);

module.exports = router;
