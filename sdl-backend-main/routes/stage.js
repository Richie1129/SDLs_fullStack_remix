const controller = require('../controllers/stage');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/', validateToken, controller.getSubStage);
router.get('/', validateToken, controller.getWholeStage);
router.get('/templates/:projectId', validateToken, controller.getAllSubStageTemplates);

module.exports = router;
