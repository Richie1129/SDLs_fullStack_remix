const express = require('express');
const router = express.Router();
const controller = require('../controllers/assistant');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Content aggregation can be re-used by frontend, but also expose guidance generator
router.post('/guidance', validateToken, controller.getGuidance);

module.exports = router;

