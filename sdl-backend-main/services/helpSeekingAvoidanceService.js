const HelpSeekingLog = require('../models/help_seeking_log');
const HelpSeekingAvoidanceRisk = require('../models/help_seeking_avoidance_risk');
const Task = require('../models/task');
const User = require('../models/user');
const Project = require('../models/project');
const Column = require('../models/column');
const Kanban = require('../models/kanban');
const Daily_personal = require('../models/daily_personal');
const Chatroom_message = require('../models/chatroom_message');
const Idea_wall_message = require('../models/idea_wall_message');
const Idea_wall = require('../models/idea_wall');
const RAGMessage = require('../models/rag_message');
const { Op } = require('sequelize');
const sequelize = require('../util/database');

/**
 * 求助迴避偵測服務 v2.0
 * 
 * 基於兩層偵測架構：
 * 1. 課堂內即時偵測（分鐘級）- 透過 Socket.IO 追蹤（見 inSessionDetection.js）
 * 2. 跨課堂趨勢偵測（堂課級）- 排程任務分析（本檔案）
 * 
 * 理論基礎：
 * - Won (2024): 求助迴避正向預測混亂學習行為
 * - Karabenick (2004): 求助迴避是獨立的破壞性行為模式
 * 
 * 核心改進：
 * - 使用相對比較取代絕對時間門檻
 * - 基於「堂課」而非「小時/天數」
 * - 整合科學助手（RAGFlow）數據
 * - 與小組平均比較
 */

/**
 * 獲取專案的課程設定
 */
async function getCourseConfig(projectId) {
  try {
    const project = await Project.findByPk(projectId, {
      attributes: ['course_config']
    });

    if (!project || !project.course_config) {
      // 預設值：一週兩堂課
      return {
        sessions_per_week: 2,
        has_homework: false,
        stage_duration_weeks: 2,
        analysis_window_sessions: 2
      };
    }

    return project.course_config;
  } catch (error) {
    console.error('Error getting course config:', error);
    return {
      sessions_per_week: 2,
      has_homework: false,
      stage_duration_weeks: 2,
      analysis_window_sessions: 2
    };
  }
}

/**
 * 計算分析時間窗口（基於堂課數）
 * 
 * @param {Object} courseConfig - 課程設定
 * @returns {Date} - 分析起始時間
 */
function calculateAnalysisWindow(courseConfig) {
  const { sessions_per_week = 2, analysis_window_sessions = 2 } = courseConfig;
  
  // 計算需要往回看多少天
  // 例如：一週2堂課，分析最近2堂課 = 大約7天
  const daysPerSession = 7 / sessions_per_week;
  const daysToLookBack = Math.ceil(daysPerSession * analysis_window_sessions);
  
  // 加上緩衝（考慮節假日等）
  const bufferDays = 2;
  const totalDays = daysToLookBack + bufferDays;

  const now = new Date();
  return new Date(now.getTime() - totalDays * 24 * 60 * 60 * 1000);
}

/**
 * 計算學生的困難信號分數（跨課堂趨勢）
 * 
 * 信號：
 * 1. 連續 N 堂課任務無進展（與自己之前比較）
 * 2. 任務在 Blocked 欄位且未處理
 * 3. 反思品質下降（與自己之前比較）
 * 4. 在線時間足夠但無產出
 * 5. 階段截止壓力
 */
async function calculateStruggleScore(userId, projectId, courseConfig) {
  let score = 0;
  const signals = [];

  try {
    const analysisStartDate = calculateAnalysisWindow(courseConfig);

    // 信號 1: 連續無任務進展（+3 分）
    const recentTasks = await Task.findAll({
      include: [{
        model: Column,
        required: true,
        include: [{
          model: Kanban,
          required: true,
          where: { projectId }
        }]
      }],
      where: {
        owner: { [Op.iLike]: `%${userId}%` },
        updatedAt: { [Op.gte]: analysisStartDate }
      },
      order: [['updatedAt', 'ASC']]
    });

    // 檢查是否有任何任務在分析窗口內有更新
    const hasRecentProgress = recentTasks.some(task => {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(task.updatedAt) > lastWeek;
    });

    if (!hasRecentProgress && recentTasks.length > 0) {
      score += 3;
      signals.push('task_stagnation');
    }

    // 信號 2: 任務被阻塞（+3 分）
    const currentTasks = await Task.findAll({
      include: [{
        model: Column,
        required: true,
        include: [{
          model: Kanban,
          required: true,
          where: { projectId }
        }]
      }],
      where: {
        owner: { [Op.iLike]: `%${userId}%` }
      }
    });

    const hasBlockedTask = currentTasks.some(task => {
      const columnName = task.column.name.toLowerCase();
      return columnName.includes('阻擋') || 
             columnName.includes('block') || 
             columnName.includes('stuck');
    });

    if (hasBlockedTask) {
      score += 3;
      signals.push('blocked_tasks');
    }

    // 信號 3: 反思品質下降（+2 分）
    const recentReflections = await Daily_personal.findAll({
      where: {
        userId,
        projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const olderReflections = await Daily_personal.findAll({
      where: {
        userId,
        projectId,
        createdAt: {
          [Op.lt]: analysisStartDate,
          [Op.gte]: new Date(analysisStartDate.getTime() - 14 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (recentReflections.length > 0 && olderReflections.length > 0) {
      const recentAvgLength = recentReflections.reduce((sum, r) => 
        sum + (r.content?.length || 0), 0) / recentReflections.length;
      const olderAvgLength = olderReflections.reduce((sum, r) => 
        sum + (r.content?.length || 0), 0) / olderReflections.length;

      // 如果最近的反思長度明顯少於之前（減少超過 40%）
      if (recentAvgLength < olderAvgLength * 0.6) {
        score += 2;
        signals.push('reflection_quality_drop');
      }
    }

    // 信號 4: 階段截止壓力（+2 分）
    const project = await Project.findByPk(projectId, {
      attributes: ['currentStage', 'currentSubStage', 'course_config']
    });

    if (project && project.course_config) {
      const { stage_duration_weeks = 2, sessions_per_week = 2 } = project.course_config;
      const sessionsPerStage = stage_duration_weeks * sessions_per_week;
      
      // 如果接近階段結束（最後 2 堂課）但完成率低
      const incompleteTasksCount = currentTasks.filter(task => {
        const columnName = task.column.name.toLowerCase();
        return !columnName.includes('完成') && !columnName.includes('done');
      }).length;

      if (incompleteTasksCount > 2) {
        score += 2;
        signals.push('deadline_pressure');
      }
    }

    return { score, signals };

  } catch (error) {
    console.error('Error calculating struggle score:', error);
    return { score: 0, signals: [] };
  }
}

/**
 * 計算學生的求助活躍度分數（包含科學助手）
 * 
 * 來源：
 * 1. AI Task Assistant 使用次數
 * 2. 科學助手對話次數（RAGFlow）
 * 3. 小組討論發言次數（與小組平均比較）
 * 4. 想法牆互動次數
 */
async function calculateHelpSeekingActivity(userId, projectId, courseConfig) {
  let activityScore = 0;
  const details = {
    aiTaskAssistant: 0,
    scienceAssistant: 0,
    groupDiscussion: 0,
    ideaWall: 0
  };

  try {
    const analysisStartDate = calculateAnalysisWindow(courseConfig);

    // 1. AI Task Assistant 使用次數
    const aiTaskAssistantCount = await HelpSeekingLog.count({
      where: {
        userId,
        projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      }
    });
    details.aiTaskAssistant = aiTaskAssistantCount;
    activityScore += aiTaskAssistantCount;

    // 2. 科學助手對話次數（新增！）
    const scienceAssistantCount = await RAGMessage.count({
      where: {
        userId: userId,
        project_id: projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      }
    });
    details.scienceAssistant = scienceAssistantCount;
    activityScore += scienceAssistantCount;

    // 3. 小組討論發言次數（相對於小組平均）
    const studentMessages = await Chatroom_message.count({
      where: {
        userId,
        projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      }
    });

    // 計算小組平均
    const projectMembers = await User.findAll({
      include: [{
        model: Project,
        where: { id: projectId },
        through: { attributes: [] }
      }]
    });

    const memberIds = projectMembers.map(m => m.id);
    const totalGroupMessages = await Chatroom_message.count({
      where: {
        userId: { [Op.in]: memberIds },
        projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      }
    });

    const groupAverage = totalGroupMessages / Math.max(memberIds.length, 1);
    
    // 如果學生發言數達到或超過小組平均，加分
    if (studentMessages >= groupAverage) {
      details.groupDiscussion = studentMessages;
      activityScore += Math.min(2, Math.floor(studentMessages / groupAverage));
    }

    // 4. 想法牆互動次數（透過 idea_wall join 取得 projectId）
    const ideaWallCount = await Idea_wall_message.count({
      where: {
        senderId: userId,
        createdAt: { [Op.gte]: analysisStartDate }
      },
      include: [{
        model: Idea_wall,
        where: { projectId },
        attributes: []
      }]
    });
    details.ideaWall = ideaWallCount;
    activityScore += Math.min(1, ideaWallCount); // 最多加 1 分

    return { activityScore, details };

  } catch (error) {
    console.error('Error calculating help seeking activity:', error);
    return { activityScore: 0, details };
  }
}

/**
 * 檢測行為突變（之前活躍但最近突然沈默）
 */
async function detectBehaviorChange(userId, projectId, courseConfig) {
  try {
    const analysisStartDate = calculateAnalysisWindow(courseConfig);
    
    // 「之前」的時間窗口（分析窗口之前的相同時長）
    const { analysis_window_sessions = 2, sessions_per_week = 2 } = courseConfig;
    const daysPerSession = 7 / sessions_per_week;
    const windowDays = Math.ceil(daysPerSession * analysis_window_sessions);
    
    const previousWindowStart = new Date(analysisStartDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const previousWindowEnd = analysisStartDate;

    // 計算「之前」的求助活躍度
    const previousActivity = await HelpSeekingLog.count({
      where: {
        userId,
        projectId,
        createdAt: {
          [Op.gte]: previousWindowStart,
          [Op.lt]: previousWindowEnd
        }
      }
    });

    // 計算「最近」的求助活躍度
    const recentActivity = await HelpSeekingLog.count({
      where: {
        userId,
        projectId,
        createdAt: { [Op.gte]: analysisStartDate }
      }
    });

    // 如果之前活躍（>=2次）但最近歸零，視為突變
    const hasSuddenSilence = previousActivity >= 2 && recentActivity === 0;

    return {
      hasSuddenSilence,
      previousActivity,
      recentActivity
    };

  } catch (error) {
    console.error('Error detecting behavior change:', error);
    return {
      hasSuddenSilence: false,
      previousActivity: 0,
      recentActivity: 0
    };
  }
}

/**
 * 跨課堂趨勢偵測（主函式）
 * 
 * 風險判定：
 * 🔴 High Risk: 困難分數 ≥ 5 且求助活躍度 = 0
 * 🟡 Medium Risk: 困難分數 ≥ 3 且求助活躍度 ≤ 1
 * 🟢 Low Risk: 其他
 */
async function detectProjectAvoidanceRisks(projectId) {
  try {
    // 獲取課程設定
    const courseConfig = await getCourseConfig(projectId);

    // 獲取專案所有成員
    const project = await Project.findByPk(projectId, {
      include: [{
        model: User,
        through: { attributes: [] }
      }]
    });

    if (!project || !project.users || project.users.length === 0) {
      return {
        success: true,
        message: '專案無成員',
        risks: []
      };
    }

    const risks = [];

    // 對每個學生進行分析
    for (const user of project.users) {
      const userId = user.id;

      // 1. 計算困難信號分數
      const { score: struggleScore, signals: struggleSignals } = 
        await calculateStruggleScore(userId, projectId, courseConfig);

      // 2. 計算求助活躍度分數
      const { activityScore: helpSeekingActivity, details: activityDetails } = 
        await calculateHelpSeekingActivity(userId, projectId, courseConfig);

      // 3. 檢測行為突變
      const behaviorChange = await detectBehaviorChange(userId, projectId, courseConfig);

      // 4. 風險判定
      let riskLevel = 'low';
      let riskScore = struggleScore;

      // 如果有行為突變，困難分數加權
      if (behaviorChange.hasSuddenSilence) {
        riskScore += 2;
        struggleSignals.push('sudden_silence');
      }

      if (riskScore >= 5 && helpSeekingActivity === 0) {
        riskLevel = 'high';
      } else if (riskScore >= 3 && helpSeekingActivity <= 1) {
        riskLevel = 'medium';
      }

      // 只記錄中高風險案例
      if (riskLevel !== 'low') {
        // 檢查是否已存在未解決的風險記錄
        const existingRisk = await HelpSeekingAvoidanceRisk.findOne({
          where: {
            userId,
            projectId,
            resolved: false
          },
          order: [['detectedAt', 'DESC']]
        });

        const riskData = {
          userId,
          projectId,
          taskId: null, // 跨課堂偵測不針對特定任務
          riskLevel,
          struggleSignals,
          riskDetails: {
            struggleScore: riskScore,
            helpSeekingActivity,
            activityDetails,
            behaviorChange,
            courseConfig
          },
          detectedAt: new Date()
        };

        if (existingRisk) {
          // 更新現有記錄
          await existingRisk.update({
            riskLevel,
            struggleSignals,
            riskDetails: riskData.riskDetails,
            detectedAt: new Date()
          });
          risks.push(existingRisk);
        } else {
          // 創建新記錄
          const newRisk = await HelpSeekingAvoidanceRisk.create(riskData);
          risks.push(newRisk);
        }
      }
    }

    return {
      success: true,
      message: `偵測完成，發現 ${risks.length} 個風險案例`,
      risks,
      courseConfig
    };

  } catch (error) {
    console.error('Error detecting project avoidance risks:', error);
    return {
      success: false,
      message: error.message,
      risks: []
    };
  }
}

/**
 * 獲取專案的迴避風險清單
 */
async function getProjectAvoidanceRisks(projectId, options = {}) {
  try {
    const { includeResolved = false, riskLevel = null } = options;

    const whereClause = {
      projectId
    };

    if (!includeResolved) {
      whereClause.resolved = false;
    }

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    const risks = await HelpSeekingAvoidanceRisk.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'role']
        },
        {
          model: Task,
          required: false,
          attributes: ['id', 'title']
        }
      ],
      order: [
        ['riskLevel', 'DESC'], // high -> medium -> low
        ['detectedAt', 'DESC']
      ]
    });

    return {
      success: true,
      risks: risks.map(risk => ({
        id: risk.id,
        userId: risk.userId,
        studentName: risk.user?.username || 'Unknown',
        taskId: risk.taskId,
        taskTitle: risk.task?.title || null,
        riskLevel: risk.riskLevel,
        struggleSignals: risk.struggleSignals,
        riskDetails: risk.riskDetails,
        teacherConfirmed: risk.teacherConfirmed,
        teacherNotes: risk.teacherNotes,
        resolved: risk.resolved,
        resolvedAt: risk.resolvedAt,
        detectedAt: risk.detectedAt,
        createdAt: risk.createdAt
      }))
    };

  } catch (error) {
    console.error('Error getting project avoidance risks:', error);
    return {
      success: false,
      message: error.message,
      risks: []
    };
  }
}

/**
 * 更新風險記錄
 */
async function updateAvoidanceRisk(riskId, updateData) {
  try {
    const risk = await HelpSeekingAvoidanceRisk.findByPk(riskId);

    if (!risk) {
      return {
        success: false,
        message: '風險記錄不存在'
      };
    }

    await risk.update(updateData);

    return {
      success: true,
      message: '更新成功',
      risk
    };

  } catch (error) {
    console.error('Error updating avoidance risk:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 排程任務：檢測所有活躍專案的求助迴避風險
 * 建議每堂課後執行
 */
async function detectAllActiveProjectsAvoidanceRisks() {
  try {
    console.log('🔍 Starting cross-session avoidance risk detection for all active projects...');

    // 獲取所有尚未結束的專案
    const activeProjects = await Project.findAll({
      where: {
        [Op.or]: [
          { ProjectEnd: false },
          { ProjectEnd: null }
        ]
      },
      attributes: ['id', 'name', 'mentor']
    });

    console.log(`Found ${activeProjects.length} active projects`);

    const allResults = [];
    let totalHighRisk = 0;
    let totalMediumRisk = 0;

    for (const project of activeProjects) {
      const result = await detectProjectAvoidanceRisks(project.id);
      
      if (result.success) {
        result.risks.forEach(risk => {
          if (risk.riskLevel === 'high') totalHighRisk++;
          if (risk.riskLevel === 'medium') totalMediumRisk++;
        });

        allResults.push({
          projectId: project.id,
          projectName: project.name,
          mentor: project.mentor,
          risks: result.risks
        });
      }
    }

    console.log(`✅ Detection completed: ${totalHighRisk} high risk, ${totalMediumRisk} medium risk students found`);

    return {
      success: true,
      totalProjects: activeProjects.length,
      highRisk: totalHighRisk,
      mediumRisk: totalMediumRisk,
      results: allResults
    };

  } catch (error) {
    console.error('Error in detectAllActiveProjectsAvoidanceRisks:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getCourseConfig,
  calculateAnalysisWindow,
  calculateStruggleScore,
  calculateHelpSeekingActivity,
  detectBehaviorChange,
  detectProjectAvoidanceRisks,
  getProjectAvoidanceRisks,
  updateAvoidanceRisk,
  detectAllActiveProjectsAvoidanceRisks
};
