const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llm');
const llm5RController = require('../controllers/llm_5R');
const { validateToken } = require('../middlewares/AuthMiddleware');

router.post('/generate-idea', validateToken, llmController.generateIdea);

// 5Rs 反思相關路由
router.post('/analyze-5rs', validateToken, llm5RController.analyze5RsReflection);
router.get('/5rs-framework', validateToken, llm5RController.get5RsFramework);
router.post('/validate-5rs', validateToken, llm5RController.validate5RsContent);

module.exports = router;
