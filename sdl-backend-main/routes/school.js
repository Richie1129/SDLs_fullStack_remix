const express = require('express');
const router = express.Router();
const controller = require('../controllers/school');

// 不需要 validateToken（註冊前就要用）
router.get('/', controller.getSchools);

module.exports = router;
