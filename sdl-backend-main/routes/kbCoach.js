/**
 * KB Coach Routes
 * 
 * 零破壞性設計：
 * - 獨立路由檔案，不修改現有llm.js
 * - 新的API端點 /api/kb-coach/*
 */

const express = require('express');
const router = express.Router();
const kbCoachController = require('../controllers/kbCoach');

// 主要端點：提供KB教練建議
router.post('/guidance', kbCoachController.provideGuidance);

// 輔助端點：取得KB原則列表
router.get('/principles', kbCoachController.getPrinciples);

module.exports = router;
