
const controller = require('../controllers/question');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');

router.get('/messages/:questionId', validateToken, controller.getMessages);
router.get('/:projectId', validateToken, checkProjectViewingPermission, controller.getAllChatrooms);
router.get('/:projectId/:userId', validateToken, checkProjectViewingPermission, controller.getUserChatrooms);
router.post('/createChatroom', validateToken, controller.createChatroom);
router.post('/createMessage', validateToken, controller.createMessage);
router.delete('/chatrooms/:questionId', validateToken, controller.deleteChatroom);

module.exports = router;
