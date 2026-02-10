const aiTaskAssistantService = require('../services/aiTaskAssistantService');
const HelpSeekingLog = require('../models/help_seeking_log');
const AITaskFeedback = require('../models/ai_task_feedback');
const Task = require('../models/task');
const Project = require('../models/project');
const User = require('../models/user');
const Comment = require('../models/comment');
const { Op } = require('sequelize');

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
      message: '你傾向直接要答案。建議先思考 5 分鐘再求助，學習效果會更好。',
      reference: 'Won (2024) 研究指出，便宜行事型求助會負向預測學習成效。'
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
    const { helpSeekingType, suggestions } = await aiTaskAssistantService.generateSuggestions(
      context,
      selectedState,
      answers || {},
      askedSources || [],
      skippedThinking || false
    );

    // Log help-seeking behavior
    const log = await HelpSeekingLog.create({
      userId,
      projectId,
      taskId,
      metacognitiveState: selectedState,
      helpSeekingType,
      askedSources: askedSources || [],
      answers: answers || {},
      skippedThinking: skippedThinking || false
    });

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
    const { timeRange = '7d' } = req.query;

    // Calculate start date
    const startDate = calculateStartDate(timeRange);

    // Query logs
    const logs = await HelpSeekingLog.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      }
    });

    // Calculate stats
    const stats = {
      total: logs.length,
      adaptive: logs.filter(l => l.helpSeekingType === 'adaptive').length,
      expedient: logs.filter(l => l.helpSeekingType === 'expedient').length,
      mixed: logs.filter(l => l.helpSeekingType === 'mixed').length,
      askedPeers: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('同學');
      }).length,
      askedTeacher: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('老師');
      }).length,
      askedNone: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('還沒問任何人');
      }).length
    };

    // Calculate quality score
    const qualityScore = calculateHelpSeekingQuality(stats);

    // Generate insights
    const insights = generateInsights(stats, qualityScore);

    res.json({
      stats,
      qualityScore,
      insights
    });

  } catch (error) {
    console.error('Error getting help-seeking stats:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
}

module.exports = {
  analyzeCard,
  generateSuggestions,
  submitFeedback,
  getHelpSeekingStats
};
