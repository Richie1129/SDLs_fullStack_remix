const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llm');

router.post('/generate-idea', llmController.generateIdea);

module.exports = router; 