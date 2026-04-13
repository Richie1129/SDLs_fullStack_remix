const express = require('express');
const router = express.Router();
const controller = require('../controllers/assistant');
const { validateToken } = require('../middlewares/AuthMiddleware');

// 外部連結 API（Gemini Grounding，科學助手使用）
router.post('/grounding', validateToken, controller.getExternalLinks);

module.exports = router;
