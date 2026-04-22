const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');
const controller = require('../controllers/knowledgeGraph');

router.get('/projects/:projectId', validateToken, checkProjectViewingPermission, controller.getProjectGraphData);

module.exports = router;
