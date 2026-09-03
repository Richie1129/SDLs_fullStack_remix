const express = require('express');
const router = express.Router();
const aiTaskAssistantController = require('../controllers/aiTaskAssistantController');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');
const { getProjectIdFromTask } = require('../middlewares/projectAccess');

// Analyze task card
router.post('/analyze-card', validateToken, aiTaskAssistantController.analyzeCard);

// Generate AI suggestions
router.post('/generate-suggestions', validateToken, aiTaskAssistantController.generateSuggestions);

// Submit feedback
router.post('/feedback', validateToken, aiTaskAssistantController.submitFeedback);

// Get help-seeking stats
router.get('/help-seeking-stats/:userId', validateToken, aiTaskAssistantController.getHelpSeekingStats);

// Get task history（求助紀錄含後設認知資料，需與 comments.js 同款做專案權限檢查）
router.get('/task-history/:taskId', validateToken, getProjectIdFromTask, checkProjectViewingPermission, aiTaskAssistantController.getTaskHistory);

module.exports = router;
