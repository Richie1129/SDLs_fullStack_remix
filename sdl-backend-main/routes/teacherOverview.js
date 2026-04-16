const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const controller = require('../controllers/teacherOverviewController');

router.get('/projects-summary', validateToken, controller.getProjectsSummary);

module.exports = router;
