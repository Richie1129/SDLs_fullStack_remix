// SDL Coach 路由 — 自主學習助手
//
// POST /api/sdl-coach/ask   提問
// GET  /api/sdl-coach/health 健康檢查

const router = require('express').Router();
const controller = require('../controllers/sdlCoach');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.use(validateToken);

router.post('/ask', controller.askCoach);
router.get('/health', controller.health);

module.exports = router;
