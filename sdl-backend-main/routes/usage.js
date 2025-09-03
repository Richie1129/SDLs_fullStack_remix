const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/start', usageController.startSession);
router.post('/heartbeat', usageController.heartbeat);
router.post('/stop', usageController.stopSession);
router.get('/summary', usageController.getSummary);

// Observation click log (requires auth)
router.post('/record-observation', validateToken, usageController.recordObservationEvent);

module.exports = router;
