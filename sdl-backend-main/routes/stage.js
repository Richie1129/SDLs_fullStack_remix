const controller = require('../controllers/stage');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/', validateToken, controller.getSubStage);
router.get('/', validateToken, controller.getWholeStage);

module.exports = router;
