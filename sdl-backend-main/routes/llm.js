const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llm');
const llm5RController = require('../controllers/llm_5R');

router.post('/generate-idea', llmController.generateIdea);

// 5Rs 反思相關路由
router.post('/analyze-5rs', llm5RController.analyze5RsReflection);
router.get('/5rs-framework', llm5RController.get5RsFramework);
router.post('/validate-5rs', llm5RController.validate5RsContent);

module.exports = router; 