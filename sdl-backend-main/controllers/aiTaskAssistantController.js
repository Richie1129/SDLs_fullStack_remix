const aiTaskAssistantService = require('../services/aiTaskAssistantService');
const HelpSeekingLog = require('../models/help_seeking_log');
const AITaskFeedback = require('../models/ai_task_feedback');
const Task = require('../models/task');
const Project = require('../models/project');
const User = require('../models/user');
const Comment = require('../models/comment');
const { Op } = require('sequelize');
const { logAudit } = require('../services/auditService');
const helpSeekingEffectivenessService = require('../services/helpSeekingEffectivenessService');
const { isAiEnabled } = require('../services/aiAccessService');

// Helper functions
function calculateStartDate(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function calculateHelpSeekingQuality(stats) {
  if (stats.total === 0) return 0;

  const adaptiveRatio = stats.adaptive / stats.total;
  const expedientRatio = stats.expedient / stats.total;
  const peerHelpRatio = stats.askedPeers / stats.total;

  const score = (adaptiveRatio * 0.5 + peerHelpRatio * 0.3 - expedientRatio * 0.2) * 100;

  return Math.max(0, Math.min(100, score));
}

function generateInsights(stats, qualityScore) {
  const insights = [];

  if (qualityScore >= 70) {
    insights.push({
      type: 'positive',
      message: '你的求助策略很好，研究顯示這能有效提升學習成效。'
    });
  }

  if (stats.expedient > stats.adaptive) {
    insights.push({
      type: 'warning',
      message: '你傾向直接尋求解答。建議先思考 5 分鐘再求助，學習效果會更好。',
      reference: 'Won (2024) 研究指出，跳過自我思考的求助方式會降低學習成效。'
    });
  }

  if (stats.total > 0 && stats.askedNone / stats.total > 0.5) {
    insights.push({
      type: 'suggestion',
      message: '建議多向同學或老師討論。研究顯示同儕互動是最有效的學習方式。',
      reference: 'Li (2023) 研究指出，同儕是最常使用且最有效的求助對象。'
    });
  }

  return insights;
}

/**
 * Analyze a task card to detect issues
 * POST /api/ai-task-assistant/analyze-card
 */
async function analyzeCard(req, res) {
  try {
    const { taskId, projectId } = req.body;
    const userId = req.user.id;

    if (!taskId || !projectId) {
      return res.status(400).json({ error: 'Missing taskId or projectId' });
    }

    const models = { Task, Project, User, Comment };
    const context = await aiTaskAssistantService.collectTaskContext(taskId, projectId, models);
    const issues = aiTaskAssistantService.detectTaskIssues(context);

    res.json({
      taskId,
      issuesCount: issues.length,
      issues: issues.map(i => ({
        type: i.type,
        severity: i.severity,
        message: i.message
      }))
    });

  } catch (error) {
    console.error('Error analyzing card:', error);
    res.status(500).json({ error: 'Failed to analyze card', details: error.message });
  }
}

/**
 * Generate AI suggestions for a task
 * POST /api/ai-task-assistant/generate-suggestions
 */
async function generateSuggestions(req, res) {
  try {
    if (!(await isAiEnabled(req.userId))) {
      return res.status(403).json({ error: 'AI_DISABLED', message: 'AI 功能已停用，請聯絡管理員' });
    }

    const {
      taskId,
      projectId,
      selectedState,
      answers,
      askedSources,
      skippedThinking
    } = req.body;
    const userId = req.user.id;

    if (!taskId || !projectId || !selectedState) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Collect context
    const models = { Task, Project, User, Comment };
    const context = await aiTaskAssistantService.collectTaskContext(taskId, projectId, models);

    // Generate suggestions
    const { helpSeekingType, suggestions, isRelevant } = await aiTaskAssistantService.generateSuggestions(
      context,
      selectedState,
      answers || {},
      askedSources || [],
      skippedThinking || false
    );

    // 如果 AI 判斷卡片內容不相關，直接回傳，不寫 log
    if (isRelevant === false) {
      return res.json({
        success: false,
        isRelevant: false,
        irrelevantReason: suggestions.irrelevantReason || '這張卡片的內容無法提供有效的學習引導。'
      });
    }

    // 捕捉求助前的任務狀態（用於成效追蹤）
    const taskStatusBefore = await helpSeekingEffectivenessService.captureTaskStatusBefore(taskId);

    // Log help-seeking behavior WITH suggestions AND task status
    const log = await HelpSeekingLog.create({
      userId,
      projectId,
      taskId,
      metacognitiveState: selectedState,
      helpSeekingType,
      askedSources: askedSources || [],
      answers: answers || {},
      skippedThinking: skippedThinking || false,
      suggestions,
      taskStatusBefore // 新增：記錄求助前狀態
    });

    // Audit: Record AI Task Assistant usage
    await logAudit(req, {
      action: 'AI_TASK_ASSISTANT_REQUEST',
      targetType: 'task',
      targetId: taskId,
      projectId,
      metadata: {
        helpSeekingType,
        metacognitiveState: selectedState,
        askedSources: askedSources || [],
        skippedThinking: skippedThinking || false
      }
    }).catch(() => {}); // Non-blocking

    res.json({
      success: true,
      helpSeekingType,
      suggestions,
      logId: log.id
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions', details: error.message });
  }
}

/**
 * Submit feedback for AI suggestions
 * POST /api/ai-task-assistant/feedback
 */
async function submitFeedback(req, res) {
  try {
    const {
      taskId,
      projectId,
      helpSeekingLogId,
      feedbackType,
      feedbackDetail
    } = req.body;
    const userId = req.user.id;

    if (!taskId || !projectId || !feedbackType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await AITaskFeedback.create({
      userId,
      projectId,
      taskId,
      helpSeekingLogId: helpSeekingLogId || null,
      feedbackType,
      feedbackDetail: feedbackDetail || null
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback', details: error.message });
  }
}

/**
 * Get help-seeking stats for a user
 * GET /api/ai-task-assistant/help-seeking-stats/:userId
 */
async function getHelpSeekingStats(req, res) {
  try {
    const { userId } = req.params;
    const { timeRange = '7d', projectId } = req.query;

    // 授權檢查：只能查自己，或教師角色
    if (parseInt(userId) !== req.user.id && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to view this data' });
    }

    // Calculate start date
    const startDate = calculateStartDate(timeRange);

    // 建立查詢條件（可選 projectId 過濾）
    const where = {
      userId,
      createdAt: { [Op.gte]: startDate }
    };
    if (projectId) where.projectId = projectId;

    // Query logs
    const logs = await HelpSeekingLog.findAll({ where });

    // Calculate stats
    const stats = {
      total: logs.length,
      adaptive: logs.filter(l => l.helpSeekingType === 'adaptive').length,
      expedient: logs.filter(l => l.helpSeekingType === 'expedient').length,
      mixed: logs.filter(l => l.helpSeekingType === 'mixed').length,
      askedPeers: logs.filter(l => (l.askedSources || []).includes('同學')).length,
      askedTeacher: logs.filter(l => (l.askedSources || []).includes('老師')).length,
      askedResources: logs.filter(l => (l.askedSources || []).includes('查資料')).length,
      askedNone: logs.filter(l => (l.askedSources || []).includes('還沒問任何人')).length
    };

    // 求助成效統計
    const logsWithScore = logs.filter(l => l.effectivenessScore !== null);
    const effectivenessStats = {
      checked: logsWithScore.length,
      resolved: logs.filter(l => l.statusChanged === true).length,
      avgScore: logsWithScore.length > 0
        ? Math.round(logsWithScore.reduce((sum, l) => sum + l.effectivenessScore, 0) / logsWithScore.length)
        : null
    };

    // Calculate quality score
    const qualityScore = calculateHelpSeekingQuality(stats);

    // Generate insights
    const insights = generateInsights(stats, qualityScore);

    res.json({
      stats,
      qualityScore,
      effectivenessStats,
      insights
    });

  } catch (error) {
    console.error('Error getting help-seeking stats:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
}

/**
 * Get help-seeking history for a specific task
 * GET /api/ai-task-assistant/task-history/:taskId
 */
async function getTaskHistory(req, res) {
  try {
    const { taskId } = req.params;
    const { projectId } = req.query;

    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }

    const whereClause = { taskId };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Query with User information
    const logs = await HelpSeekingLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
          required: true
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const history = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user.username,
      metacognitiveState: log.metacognitiveState,
      helpSeekingType: log.helpSeekingType,
      askedSources: log.askedSources,
      skippedThinking: log.skippedThinking,
      suggestions: log.suggestions,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    // Audit: Record help-seeking history view
    await logAudit(req, {
      action: 'AI_TASK_ASSISTANT_HISTORY_VIEW',
      targetType: 'task',
      targetId: parseInt(taskId),
      projectId: projectId ? parseInt(projectId) : null,
      metadata: {
        historyCount: history.length
      }
    }).catch(() => {}); // Non-blocking

    res.json({
      success: true,
      taskId: parseInt(taskId),
      count: history.length,
      history
    });

  } catch (error) {
    console.error('Error getting task history:', error);
    res.status(500).json({ error: 'Failed to get task history', details: error.message });
  }
}

module.exports = {
  analyzeCard,
  generateSuggestions,
  submitFeedback,
  getHelpSeekingStats,
  getTaskHistory
};
