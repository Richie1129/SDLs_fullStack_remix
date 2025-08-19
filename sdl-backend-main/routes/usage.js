const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage');

router.post('/start', usageController.startSession);
router.post('/heartbeat', usageController.heartbeat);
router.post('/stop', usageController.stopSession);
router.get('/summary', usageController.getSummary);

module.exports = router;

