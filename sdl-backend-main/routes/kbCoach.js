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

// ============================================================================
// Phase 1 端點
// ============================================================================

// 主要端點：提供KB教練建議
router.post('/guidance', kbCoachController.provideGuidance);

// 輔助端點：取得KB原則列表
router.get('/principles', kbCoachController.getPrinciples);

// ============================================================================
// Phase 3 新增端點：回饋機制
// ============================================================================

// 儲存用戶回饋
router.post('/feedback', kbCoachController.saveFeedback);

// 取得回饋統計 (供管理者查看)
router.get('/feedback/stats', kbCoachController.getFeedbackStats);

// ============================================================================
// Phase 2 新增端點：查詢 Orchestrator 狀態
// ============================================================================

/**
 * GET /api/kb-coach/orchestrator/status/:ideaWallId
 * 
 * 讓前端查看 Orchestrator 的冷卻狀態
 */
router.get('/orchestrator/status/:ideaWallId', async (req, res) => {
    try {
        const { getCooldownManager } = require('../utils/cooldownManager');
        const Node = require('../models/node');
        
        const ideaWallId = parseInt(req.params.ideaWallId);
        
        // 取得貼文總數
        const nodeCount = await Node.count({ where: { ideaWallId } });
        
        // 檢查冷卻狀態
        const cooldown = getCooldownManager();
        const canIntervene = cooldown.canIntervene(ideaWallId, nodeCount);
        const status = cooldown.getStatus(ideaWallId);
        
        res.status(200).json({
            canIntervene,
            cooldownStatus: status,
            nodeCount,
            message: canIntervene ? 'Orchestrator 可以介入' : 'Orchestrator 冷卻中'
        });
    } catch (error) {
        console.error('Error getting orchestrator status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

/**
 * POST /api/kb-coach/orchestrator/analyze
 * 
 * 手動觸發 Orchestrator 分析（Debug 用）
 * Body: { "ideaWallId": 1, "projectId": 1 }
 */
router.post('/orchestrator/analyze', async (req, res) => {
    try {
        const { orchestrate } = require('../services/orchestrator');
        const { ideaWallId, projectId } = req.body;
        
        if (!ideaWallId || !projectId) {
            return res.status(400).json({ error: 'Missing ideaWallId or projectId' });
        }
        
        // 從 app 取得 io 實例，確保使用同一個 Socket.io 伺服器
        const io = req.app.get('io');
        const decision = await orchestrate(ideaWallId, projectId, { io });
        
        res.status(200).json(decision);
    } catch (error) {
        console.error('Error in manual orchestrator trigger:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
