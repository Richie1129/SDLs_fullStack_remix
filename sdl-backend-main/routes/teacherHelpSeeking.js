const express = require('express');
const router = express.Router();
const teacherHelpSeekingController = require('../controllers/teacherHelpSeekingController');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkTeacherRole } = require('../middlewares/projectViewingMiddleware');

// 教師 Help-Seeking 分析路由

// GET /api/teacher/help-seeking/overview - 獲取教師所有專案的 Help-Seeking 概覽
router.get('/overview', validateToken, checkTeacherRole, teacherHelpSeekingController.getTeacherHelpSeekingOverview);

// GET /api/teacher/help-seeking/project/:projectId - 獲取專案的 Help-Seeking 統計
router.get('/project/:projectId', validateToken, checkTeacherRole, teacherHelpSeekingController.getProjectHelpSeekingStats);

// GET /api/teacher/help-seeking/student/:userId - 獲取特定學生的 Help-Seeking 詳細記錄
router.get('/student/:userId', validateToken, checkTeacherRole, teacherHelpSeekingController.getStudentHelpSeekingDetails);

// === 求助迴避偵測相關路由 ===

// GET /api/teacher/help-seeking/avoidance-risks/:projectId - 獲取專案的求助迴避風險預警清單
router.get('/avoidance-risks/:projectId', validateToken, checkTeacherRole, teacherHelpSeekingController.getProjectAvoidanceRisks);

// POST /api/teacher/help-seeking/detect-avoidance/:projectId - 手動觸發求助迴避風險檢測
router.post('/detect-avoidance/:projectId', validateToken, checkTeacherRole, teacherHelpSeekingController.triggerAvoidanceDetection);

// PATCH /api/teacher/help-seeking/avoidance-risks/:riskId - 更新風險記錄
router.patch('/avoidance-risks/:riskId', validateToken, checkTeacherRole, teacherHelpSeekingController.updateAvoidanceRisk);

// === 求助成效追蹤相關路由 ===

// GET /api/teacher/help-seeking/follow-up-needed/:projectId - 獲取需要後續追蹤的案例
router.get('/follow-up-needed/:projectId', validateToken, checkTeacherRole, teacherHelpSeekingController.getFollowUpNeededCases);

// POST /api/teacher/help-seeking/check-effectiveness/:logId - 手動觸發成效檢查
router.post('/check-effectiveness/:logId', validateToken, checkTeacherRole, teacherHelpSeekingController.triggerEffectivenessCheck);

module.exports = router;
