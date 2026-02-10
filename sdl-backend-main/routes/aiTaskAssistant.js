const express = require('express');
const router = express.Router();
const aiTaskAssistantController = require('../controllers/aiTaskAssistantController');
const { validateToken } = require('../middlewares/AuthMiddleware');

// Analyze task card
router.post('/analyze-card', validateToken, aiTaskAssistantController.analyzeCard);

// Generate AI suggestions
router.post('/generate-suggestions', validateToken, aiTaskAssistantController.generateSuggestions);

// Submit feedback
router.post('/feedback', validateToken, aiTaskAssistantController.submitFeedback);

// Get help-seeking stats
router.get('/help-seeking-stats/:userId', validateToken, aiTaskAssistantController.getHelpSeekingStats);

// Get task history
router.get('/task-history/:taskId', validateToken, aiTaskAssistantController.getTaskHistory);

module.exports = router;
