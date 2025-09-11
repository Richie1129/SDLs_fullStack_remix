const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage');
const { validateToken } = require('../middlewares/AuthMiddleware');

// 可選認證中間件 - 嘗試解析 token，但不強制要求
const optionalAuth = (req, res, next) => {
  try {
    validateToken(req, res, next);
  } catch (error) {
    // 認證失敗時繼續，但不設置用戶信息
    next();
  }
};

// All usage tracking requires authentication
router.post('/start', validateToken, usageController.startSession);
router.post('/heartbeat', validateToken, usageController.heartbeat);
// stopSession 使用可選認證（支援 sendBeacon 無認證調用）
router.post('/stop', optionalAuth, usageController.stopSession);
router.get('/summary', validateToken, usageController.getSummary);

// Observation click log (requires auth)
router.post('/record-observation', validateToken, usageController.recordObservationEvent);

module.exports = router;
