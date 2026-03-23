const express = require('express');
const router = express.Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkTeacherRole } = require('../middlewares/projectViewingMiddleware');
const { getCooldownStatus, getHistory, startAnalysis } = require('../controllers/teacherAgentController');

// GET /api/teacher-agent/status/:projectId — 查詢 Gemini 冷卻狀態
router.get('/status/:projectId', validateToken, checkTeacherRole, getCooldownStatus);

// GET /api/teacher-agent/history/:projectId — 取得過去分析紀錄
router.get('/history/:projectId', validateToken, checkTeacherRole, getHistory);

// POST /api/teacher-agent/analyze/:projectId — 啟動班級分析（SSE 串流）
router.post('/analyze/:projectId', validateToken, checkTeacherRole, startAnalysis);

module.exports = router;
