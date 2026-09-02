const HelpSeekingLog = require('../models/help_seeking_log');
const HelpSeekingAvoidanceRisk = require('../models/help_seeking_avoidance_risk');
const Task = require('../models/task');
const User = require('../models/user');
const Project = require('../models/project');
const { Op } = require('sequelize');
const sequelize = require('../util/database');
const helpSeekingAvoidanceService = require('../services/helpSeekingAvoidanceService');
const helpSeekingEffectivenessService = require('../services/helpSeekingEffectivenessService');
const { logAudit } = require('../services/auditService');

/**
 * 計算 Help-Seeking 品質分數
 * 基於 Won (2024) 和 Li (2023) 的研究發現
 */
function calculateHelpSeekingQuality(stats) {
  if (stats.total === 0) return 0;

  const adaptiveRatio = stats.adaptive / stats.total;
  const expedientRatio = stats.expedient / stats.total;
  const peerHelpRatio = stats.askedPeers / stats.total;
  const teacherHelpRatio = stats.askedTeacher / stats.total;

  // 加權計算：adaptive(50%) + peer help(30%) - expedient(20%)
  const score = (
    adaptiveRatio * 0.5 + 
    peerHelpRatio * 0.3 + 
    teacherHelpRatio * 0.1 - 
    expedientRatio * 0.2
  ) * 100;

  return Math.max(0, Math.min(100, score));
}

/**
 * 計算時間區間的開始日期
 */
function calculateStartDate(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'semester':
      // 假設學期從 4 個月前開始
      return new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

/**
 * 獲取專案的 Help-Seeking 統計數據（教師視角）
 * GET /api/teacher/help-seeking/project/:projectId
 */
async function getProjectHelpSeekingStats(req, res) {
  try {
    const { projectId } = req.params;
    const { timeRange = '30d' } = req.query;
    const teacherId = req.user.id;

    // 驗證教師權限
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 確認是該專案的導師
    if (project.mentorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this project' });
    }

    const startDate = calculateStartDate(timeRange);

    // 獲取專案內所有 Help-Seeking 記錄（排除教師角色）
    const logs = await HelpSeekingLog.findAll({
      where: {
        projectId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email', 'role'],
          required: true,
          where: {
            role: { [Op.ne]: 'teacher' } // 排除教師
          }
        },
        {
          model: Task,
          attributes: ['id', 'title', 'columnId'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 計算整體統計
    const overallStats = {
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
      askedResources: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('查資料');
      }).length,
      askedNone: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('還沒問任何人');
      }).length
    };

    // 計算成效追蹤統計
    const effectivenessStats = {
      checked: logs.filter(l => l.effectivenessCheckedAt !== null).length,
      statusChanged: logs.filter(l => l.statusChanged === true).length,
      needFollowUp: logs.filter(l => l.followUpNeeded === true).length,
      avgEffectivenessScore: 0
    };

    const logsWithScore = logs.filter(l => l.effectivenessScore !== null);
    if (logsWithScore.length > 0) {
      const totalScore = logsWithScore.reduce((sum, l) => sum + l.effectivenessScore, 0);
      effectivenessStats.avgEffectivenessScore = Math.round(totalScore / logsWithScore.length);
    }

    // 計算品質分數
    const qualityScore = calculateHelpSeekingQuality(overallStats);

    // 按學生分組統計
    const studentStats = {};
    logs.forEach(log => {
      const userId = log.userId;
      if (!studentStats[userId]) {
        studentStats[userId] = {
          userId,
          username: log.user.username,
          email: log.user.email,
          total: 0,
          adaptive: 0,
          expedient: 0,
          mixed: 0,
          askedPeers: 0,
          askedTeacher: 0,
          askedNone: 0,
          lastSeekingDate: null
        };
      }

      const student = studentStats[userId];
      student.total++;
      student[log.helpSeekingType]++;

      const sources = log.askedSources || [];
      if (sources.includes('同學')) student.askedPeers++;
      if (sources.includes('老師')) student.askedTeacher++;
      if (sources.includes('還沒問任何人')) student.askedNone++;

      if (!student.lastSeekingDate || new Date(log.createdAt) > new Date(student.lastSeekingDate)) {
        student.lastSeekingDate = log.createdAt;
      }
    });

    // B10：原本每位學生各 findOne 一次；改成一次 findAll（detectedAt DESC）建 Map，每人取最新一筆
    const statUserIds = Object.values(studentStats).map(s => s.userId);
    const latestRiskByUser = new Map();
    if (statUserIds.length > 0) {
      const unresolvedRisks = await HelpSeekingAvoidanceRisk.findAll({
        where: {
          userId: { [Op.in]: statUserIds },
          projectId,
          resolved: false
        },
        order: [['detectedAt', 'DESC']]
      });
      for (const risk of unresolvedRisks) {
        if (!latestRiskByUser.has(risk.userId)) latestRiskByUser.set(risk.userId, risk);
      }
    }

    // 轉換為陣列並計算個人品質分數
    const studentList = Object.values(studentStats).map((student) => {
      // 查詢學生的迴避風險（Map 命中即為最新未解決的一筆，與原本 findOne + detectedAt DESC 相同）
      const avoidanceRisk = latestRiskByUser.get(student.userId) || null;

      // 計算學生的平均成效分數
      const studentLogsWithScore = logs.filter(
        l => l.userId === student.userId && l.effectivenessScore !== null
      );
      const avgEffectivenessScore = studentLogsWithScore.length > 0
        ? studentLogsWithScore.reduce((sum, l) => sum + l.effectivenessScore, 0) / studentLogsWithScore.length
        : null;

      return {
        ...student,
        studentName: student.username,
        helpSeekingCount: student.total,
        avgQualityScore: calculateHelpSeekingQuality(student),
        qualityScore: calculateHelpSeekingQuality(student),
        avgEffectivenessScore,
        avoidanceRiskLevel: avoidanceRisk ? avoidanceRisk.riskLevel : null
      };
    });

    // 按品質分數排序（低到高，突顯需要關注的學生）
    studentList.sort((a, b) => a.avgQualityScore - b.avgQualityScore);

    // 按後設認知狀態分組統計
    const metacognitiveDistribution = {
      notStarted: logs.filter(l => l.metacognitiveState === 'not_started').length,
      uncertain: logs.filter(l => l.metacognitiveState === 'uncertain').length,
      hasIdea: logs.filter(l => l.metacognitiveState === 'has_idea').length,
      hasSpecificProblem: logs.filter(l => l.metacognitiveState === 'specific_problem').length,
      seekingSecondOpinion: logs.filter(l => l.metacognitiveState === 'second_opinion').length
    };

    // 時間分布（按週統計）
    const weeklyDistribution = {};
    logs.forEach(log => {
      const date = new Date(log.createdAt);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate()) / 7)}`;
      weeklyDistribution[weekKey] = (weeklyDistribution[weekKey] || 0) + 1;
    });

    // 計算迴避風險學生數量
    const avoidanceRisks = await HelpSeekingAvoidanceRisk.count({
      where: {
        projectId,
        riskLevel: 'high',
        resolved: false
      }
    });

    res.json({
      success: true,
      projectId: parseInt(projectId),
      timeRange,
      totalHelpSeekingCount: overallStats.total,
      avgQualityScore: qualityScore,
      highRiskCount: avoidanceRisks,
      overallStats,
      effectivenessStats: {
        ...effectivenessStats,
        avgScore: effectivenessStats.avgEffectivenessScore
      },
      qualityScore,
      studentStats: studentList,
      studentList,
      metacognitiveDistribution,
      weeklyDistribution,
      recentLogs: logs.slice(0, 20).map(log => ({
        id: log.id,
        userId: log.userId,
        username: log.user.username,
        taskId: log.taskId,
        taskTitle: log.task ? log.task.title : null,
        metacognitiveState: log.metacognitiveState,
        helpSeekingType: log.helpSeekingType,
        askedSources: log.askedSources,
        effectivenessScore: log.effectivenessScore, // 新增
        statusChanged: log.statusChanged, // 新增
        followUpNeeded: log.followUpNeeded, // 新增
        createdAt: log.createdAt
      }))
    });
    // 記錄教師查看專案 help-seeking 統計
    logAudit(req, {
      action: 'TEACHER_VIEW_PROJECT_HELP_SEEKING',
      targetType: 'project',
      targetId: projectId,
      actorId: teacherId,
      metadata: { 
        projectId, 
        timeRange, 
        totalCount: overallStats.total, 
        studentCount: studentList.length 
      }
    }).catch(err => console.error('Audit log error:', err));
  } catch (error) {
    console.error('Error getting project help-seeking stats:', error);
    res.status(500).json({ 
      error: 'Failed to get project help-seeking statistics', 
      details: error.message 
    });
  }
}

/**
 * 獲取教師所有專案的 Help-Seeking 概覽
 * GET /api/teacher/help-seeking/overview
 */
async function getTeacherHelpSeekingOverview(req, res) {
  try {
    const { timeRange = '30d' } = req.query;
    const teacherUsername = req.user.username;
    const teacherId = req.user.id;

    // 獲取教師的所有專案
    const projects = await Project.findAll({
      where: { mentorId: teacherId },
      attributes: ['id', 'name', 'semester']
    });

    if (projects.length === 0) {
      return res.json({
        success: true,
        projects: [],
        totalStats: {
          total: 0,
          adaptive: 0,
          expedient: 0,
          mixed: 0
        }
      });
    }

    const projectIds = projects.map(p => p.id);
    const startDate = calculateStartDate(timeRange);

    // 獲取所有專案的 Help-Seeking 記錄（排除教師）
    const logs = await HelpSeekingLog.findAll({
      where: {
        projectId: { [Op.in]: projectIds },
        createdAt: { [Op.gte]: startDate }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
          required: true,
          where: {
            role: { [Op.ne]: 'teacher' } // Exclude teachers from student analysis
          }
        }
      ]
    });

    // 計算總體統計
    const totalStats = {
      total: logs.length,
      adaptive: logs.filter(l => l.helpSeekingType === 'adaptive').length,
      expedient: logs.filter(l => l.helpSeekingType === 'expedient').length,
      mixed: logs.filter(l => l.helpSeekingType === 'mixed').length,
      askedTeacher: logs.filter(l => {
        const sources = l.askedSources || [];
        return sources.includes('老師');
      }).length
    };

    // 按專案分組統計
    const projectStats = {};
    logs.forEach(log => {
      const pid = log.projectId;
      if (!projectStats[pid]) {
        projectStats[pid] = {
          total: 0,
          adaptive: 0,
          expedient: 0,
          mixed: 0,
          uniqueStudents: new Set()
        };
      }
      projectStats[pid].total++;
      projectStats[pid][log.helpSeekingType]++;
      projectStats[pid].uniqueStudents.add(log.userId);
    });

    // 組合專案資訊與統計
    const projectList = projects.map(project => {
      const stats = projectStats[project.id] || { 
        total: 0, adaptive: 0, expedient: 0, mixed: 0, uniqueStudents: new Set() 
      };
      return {
        id: project.id,
        name: project.name,
        semester: project.semester,
        helpSeekingCount: stats.total,
        adaptiveCount: stats.adaptive,
        expedientCount: stats.expedient,
        mixedCount: stats.mixed,
        activeStudents: stats.uniqueStudents.size,
        qualityScore: calculateHelpSeekingQuality(stats)
      };
    });

    // 按求助次數排序
    projectList.sort((a, b) => b.helpSeekingCount - a.helpSeekingCount);

    // 記錄教師查看 help-seeking 概覽
    logAudit(req, {
      action: 'TEACHER_VIEW_HELP_SEEKING_OVERVIEW',
      targetType: 'system',
      targetId: null,
      actorId: req.user.id,
      metadata: { 
        timeRange, 
        projectCount: projects.length, 
        totalHelpSeekingCount: totalStats.total 
      }
    }).catch(err => console.error('Audit log error:', err));

    res.json({
      success: true,
      timeRange,
      totalStats,
      projects: projectList
    });

  } catch (error) {
    console.error('Error getting teacher help-seeking overview:', error);
    res.status(500).json({ 
      error: 'Failed to get teacher help-seeking overview', 
      details: error.message 
    });
  }
}

/**
 * 獲取特定學生的 Help-Seeking 詳細記錄
 * GET /api/teacher/help-seeking/student/:userId
 */
async function getStudentHelpSeekingDetails(req, res) {
  try {
    const { userId } = req.params;
    const { projectId, timeRange = '30d' } = req.query;
    const teacherUsername = req.user.username;
    const teacherId = req.user.id;

    // 驗證權限：確認學生在教師的專案中
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project || project.mentorId !== teacherId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const startDate = calculateStartDate(timeRange);

    const whereClause = {
      userId,
      createdAt: { [Op.gte]: startDate }
    };

    if (projectId) {
      whereClause.projectId = projectId;
    } else {
      // 如果沒有指定專案，只查詢教師的專案
      const teacherProjects = await Project.findAll({
        where: { mentorId: teacherId },
        attributes: ['id']
      });
      whereClause.projectId = { [Op.in]: teacherProjects.map(p => p.id) };
    }

    // 獲取學生資訊
    const student = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email']
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 獲取 Help-Seeking 記錄
    const logs = await HelpSeekingLog.findAll({
      where: whereClause,
      include: [
        {
          model: Task,
          attributes: ['id', 'title', 'content', 'columnId'],
          required: false
        },
        {
          model: Project,
          attributes: ['id', 'name'],
          required: true
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 計算統計
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

    const qualityScore = calculateHelpSeekingQuality(stats);

    // 計算平均成效分數
    const logsWithEffectiveness = logs.filter(l => l.effectivenessScore !== null);
    const avgEffectivenessScore = logsWithEffectiveness.length > 0
      ? logsWithEffectiveness.reduce((sum, l) => sum + l.effectivenessScore, 0) / logsWithEffectiveness.length
      : null;

    // 詳細記錄
    const detailedLogs = logs.map(log => ({
      id: log.id,
      projectId: log.projectId,
      projectName: log.project.name,
      taskId: log.taskId,
      taskTitle: log.task ? log.task.title : null,
      metacognitiveState: log.metacognitiveState,
      helpSeekingType: log.helpSeekingType,
      askedSources: log.askedSources,
      answers: log.answers,
      suggestions: log.suggestions,
      skippedThinking: log.skippedThinking,
      effectivenessScore: log.effectivenessScore,
      createdAt: log.createdAt
    }));

    res.json({
      success: true,
      username: student.username,
      email: student.email,
      totalHelpSeeking: stats.total,
      qualityScore,
      avgEffectivenessScore,
      helpSeekingTypeDistribution: {
        adaptive: stats.adaptive,
        expedient: stats.expedient,
        mixed: stats.mixed
      },
      sourceDistribution: {
        peers: stats.askedPeers,
        teacher: stats.askedTeacher,
        none: stats.askedNone
      },
      recentLogs: detailedLogs,
      student: {
        id: student.id,
        username: student.username,
        email: student.email
      },
      stats,
      logs: detailedLogs
    });

    // 記錄教師查看學生 help-seeking 詳情
    logAudit(req, {
      action: 'TEACHER_VIEW_STUDENT_HELP_SEEKING',
      targetType: 'user',
      targetId: userId,
      actorId: req.user.id,
      metadata: { 
        studentId: userId, 
        projectId: projectId || 'all', 
        timeRange, 
        helpSeekingCount: stats.total 
      }
    }).catch(err => console.error('Audit log error:', err));

  } catch (error) {
    console.error('Error getting student help-seeking details:', error);
    res.status(500).json({ 
      error: 'Failed to get student help-seeking details', 
      details: error.message 
    });
  }
}

/**
 * 獲取專案的求助迴避風險預警清單
 * GET /api/teacher/help-seeking/avoidance-risks/:projectId
 */
async function getProjectAvoidanceRisks(req, res) {
  try {
    const { projectId } = req.params;
    const { includeResolved = 'false', riskLevel = null } = req.query;
    const teacherId = req.user.id;

    // 驗證教師權限
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.mentorId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to view this project' });
    }

    // 使用新的服務方法
    const result = await helpSeekingAvoidanceService.getProjectAvoidanceRisks(projectId, {
      includeResolved: includeResolved === 'true',
      riskLevel
    });

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    // 統計
    const stats = {
      total: result.risks.length,
      high: result.risks.filter(r => r.riskLevel === 'high').length,
      medium: result.risks.filter(r => r.riskLevel === 'medium').length,
      unconfirmed: result.risks.filter(r => !r.teacherConfirmed).length,
      resolved: result.risks.filter(r => r.resolved).length
    };

    res.json({
      success: true,
      projectId: parseInt(projectId),
      stats,
      risks: result.risks
    });

  } catch (error) {
    console.error('Error getting project avoidance risks:', error);
    res.status(500).json({ 
      error: 'Failed to get avoidance risks', 
      details: error.message 
    });
  }
}

/**
 * 手動觸發專案的求助迴避風險檢測
 * POST /api/teacher/help-seeking/detect-avoidance/:projectId
 */
async function triggerAvoidanceDetection(req, res) {
  try {
    const { projectId } = req.params;
    const teacherUsername = req.user.username;
    const teacherId = req.user.id;

    // 驗證教師權限
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.mentorId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // 執行檢測
    console.log(`Manual avoidance detection triggered for project ${projectId} by ${teacherUsername}`);
    const result = await helpSeekingAvoidanceService.detectProjectAvoidanceRisks(projectId);

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    res.json({
      success: true,
      message: result.message || 'Avoidance detection completed',
      projectId: parseInt(projectId),
      results: {
        total: result.risks.length,
        high: result.risks.filter(r => r.riskLevel === 'high').length,
        medium: result.risks.filter(r => r.riskLevel === 'medium').length
      },
     courseConfig: result.courseConfig || null
    });

  } catch (error) {
    console.error('Error triggering avoidance detection:', error);
    res.status(500).json({ 
      error: 'Failed to trigger avoidance detection', 
      details: error.message 
    });
  }
}

/**
 * 更新風險記錄（標記為已查看、新增備註、標記為已解決）
 * PATCH /api/teacher/help-seeking/avoidance-risks/:riskId
 */
async function updateAvoidanceRisk(req, res) {
  try {
    const { riskId } = req.params;
    const { teacherViewed, teacherNotes, resolved } = req.body;
    const teacherId = req.user.id;

    // 查詢風險記錄和驗證權限
    const risk = await HelpSeekingAvoidanceRisk.findByPk(riskId, {
      include: [{
        model: Project,
        attributes: ['mentorId']
      }]
    });

    if (!risk) {
      return res.status(404).json({ error: 'Risk record not found' });
    }

    if (risk.project.mentorId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // 更新欄位
    const updates = {};
    if (typeof teacherViewed === 'boolean') {
      updates.teacherViewed = teacherViewed;
    }
    if (teacherNotes !== undefined) {
      updates.teacherNotes = teacherNotes;
    }
    if (typeof resolved === 'boolean') {
      updates.resolved = resolved;
      if (resolved) {
        updates.resolvedAt = new Date();
      }
    }

    await risk.update(updates);

    res.json({
      success: true,
      message: 'Risk record updated',
      risk: {
        id: risk.id,
        teacherViewed: risk.teacherViewed,
        teacherNotes: risk.teacherNotes,
        resolved: risk.resolved,
        resolvedAt: risk.resolvedAt
      }
    });

  } catch (error) {
    console.error('Error updating avoidance risk:', error);
    res.status(500).json({ 
      error: 'Failed to update risk record', 
      details: error.message 
    });
  }
}

/**
 * 獲取需要後續追蹤的求助案例（低成效案例）
 * GET /api/teacher/help-seeking/follow-up-needed/:projectId
 */
async function getFollowUpNeededCases(req, res) {
  try {
    const { projectId } = req.params;
    const { limit = 50 } = req.query;
    const teacherId = req.user.id;

    // 驗證教師權限
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.mentorId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // 獲取需要後續追蹤的案例
    const cases = await helpSeekingEffectivenessService.getFollowUpNeededCases(
      projectId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      projectId: parseInt(projectId),
      total: cases.length,
      cases
    });

  } catch (error) {
    console.error('Error getting follow-up needed cases:', error);
    res.status(500).json({ 
      error: 'Failed to get follow-up needed cases', 
      details: error.message 
    });
  }
}

/**
 * 手動觸發求助成效檢查（針對特定 log）
 * POST /api/teacher/help-seeking/check-effectiveness/:logId
 */
async function triggerEffectivenessCheck(req, res) {
  try {
    const { logId } = req.params;
    const teacherId = req.user.id;

    // 查詢並驗證權限
    const log = await HelpSeekingLog.findByPk(logId, {
      include: [{
        model: Project,
        attributes: ['mentorId']
      }]
    });

    if (!log) {
      return res.status(404).json({ error: 'Help-seeking log not found' });
    }

    if (log.project.mentorId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // 執行成效檢查
    const updatedLog = await helpSeekingEffectivenessService.checkHelpSeekingEffectiveness(logId);

    if (!updatedLog) {
      return res.status(500).json({ error: 'Failed to check effectiveness' });
    }

    res.json({
      success: true,
      message: 'Effectiveness check completed',
      result: {
        logId: updatedLog.id,
        taskStatusBefore: updatedLog.taskStatusBefore,
        taskStatusAfter24h: updatedLog.taskStatusAfter24h,
        statusChanged: updatedLog.statusChanged,
        effectivenessScore: updatedLog.effectivenessScore,
        followUpNeeded: updatedLog.followUpNeeded,
        effectivenessCheckedAt: updatedLog.effectivenessCheckedAt
      }
    });

  } catch (error) {
    console.error('Error triggering effectiveness check:', error);
    res.status(500).json({ 
      error: 'Failed to trigger effectiveness check', 
      details: error.message 
    });
  }
}

module.exports = {
  getProjectHelpSeekingStats,
  getTeacherHelpSeekingOverview,
  getStudentHelpSeekingDetails,
  getProjectAvoidanceRisks,
  triggerAvoidanceDetection,
  updateAvoidanceRisk,
  getFollowUpNeededCases,
  triggerEffectivenessCheck
};
