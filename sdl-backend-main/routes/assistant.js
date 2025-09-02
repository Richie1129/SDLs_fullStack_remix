const express = require('express');
const router = express.Router();
const controller = require('../controllers/assistant');

// Content aggregation can be re-used by frontend, but also expose guidance generator
router.post('/guidance', controller.getGuidance);

module.exports = router;

