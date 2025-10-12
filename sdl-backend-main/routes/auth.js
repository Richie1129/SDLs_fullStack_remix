const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// POST /auth/refresh - 刷新 Access Token
router.post('/refresh', authController.refreshToken);

// POST /auth/logout - 登出並撤銷 Refresh Token
router.post('/logout', authController.logout);

module.exports = router;
