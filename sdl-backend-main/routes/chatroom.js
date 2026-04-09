const router = require('express').Router();
const controller = require('../controllers/chatroom');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');

router.get('/history/:projectId', validateToken, checkProjectViewingPermission, controller.getChatroomHistory);

module.exports = router;
