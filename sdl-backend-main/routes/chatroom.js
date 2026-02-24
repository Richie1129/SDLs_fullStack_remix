const router = require('express').Router();
const controller = require('../controllers/chatroom');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.get('/history/:projectId', validateToken, controller.getChatroomHistory);

module.exports = router;
