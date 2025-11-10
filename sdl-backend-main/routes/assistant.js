const express = require('express');
const router = express.Router();
const controller = require('../controllers/assistant');
const { validateToken } = require('../middlewares/AuthMiddleware');

// 舊的 API（保留，向後相容）
router.post('/guidance', validateToken, controller.getGuidance);

// 新的 API（支援 streaming）
router.post('/chat', validateToken, controller.chatWithStreaming);

module.exports = router;

