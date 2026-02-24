const HelpSeekingLog = require('../models/help_seeking_log');
const Task = require('../models/task');
const Column = require('../models/column');
const User = require('../models/user');
const { Op } = require('sequelize');
const sequelize = require('../util/database');

/**
 * 求助成效追蹤服務
 * 
 * 功能：
 * 1. 在創建 help-seeking log 時記錄任務狀態
 * 2. 24小時後自動檢查任務狀態變化
 * 3. 計算求助成效分數
 * 4. 標記需要教師介入的案例
 */

/**
 * 獲取任務的當前狀態（通過 columnId 判斷）
 */
async function getTaskStatus(taskId) {
  try {
    const task = await Task.findByPk(taskId, {
      include: [{
        model: Column,
        attributes: ['id', 'name']
      }]
    });

    if (!task || !task.column) {
      return 'unknown';
    }

    const columnName = task.column.name.toLowerCase();

    // 根據看板欄位名稱判斷狀態
    if (columnName.includes('待辦') || columnName.includes('todo') || columnName.includes('backlog')) {
      return 'todo';
    } else if (columnName.includes('進行') || columnName.includes('in progress') || columnName.includes('doing')) {
      return 'in_progress';
    } else if (columnName.includes('完成') || columnName.includes('done') || columnName.includes('finished')) {
      return 'done';
    } else if (columnName.includes('測試') || columnName.includes('review') || columnName.includes('testing')) {
      return 'review';
    } else if (columnName.includes('阻擋') || columnName.includes('block') || columnName.includes('stuck')) {
      return 'blocked';
    }

    return 'other';
  } catch (error) {
    console.error('Error getting task status:', error);
    return 'unknown';
  }
}

/**
 * 在創建 help-seeking log 時記錄任務狀態
 * 這個函數應該在 aiTaskAssistantController.generateSuggestions 中調用
 */
async function captureTaskStatusBefore(taskId) {
  const status = await getTaskStatus(taskId);
  return status;
}

/**
 * 計算求助成效分數
 * 根據狀態變化、求助類型等因素評分
 */
function calculateEffectivenessScore(log, statusBefore, statusAfter) {
  let score = 50; // 基礎分數

  // 1. 狀態進展評分 (40分)
  if (statusBefore === 'todo' && statusAfter === 'in_progress') {
    score += 20; // 開始執行
  } else if (statusBefore === 'todo' && statusAfter === 'done') {
    score += 40; // 直接完成
  } else if (statusBefore === 'in_progress' && statusAfter === 'done') {
    score += 30; // 完成任務
  } else if (statusBefore === 'blocked' && statusAfter !== 'blocked') {
    score += 35; // 解除阻塞
  } else if (statusAfter === statusBefore) {
    score -= 20; // 沒有進展
  } else if (statusAfter === 'blocked') {
    score -= 30; // 變成阻塞
  }

  // 2. 求助類型評分 (10分)
  if (log.helpSeekingType === 'adaptive') {
    score += 10; // 工具型求助通常更有效
  } else if (log.helpSeekingType === 'expedient') {
    score += 5; // 執行型求助效果通常較差
  }

  // 3. 後設認知狀態評分 (10分)
  if (log.metacognitiveState === 'specific_problem' || log.metacognitiveState === 'has_idea') {
    score += 10; // 有明確問題的求助更有效
  } else if (log.metacognitiveState === 'not_started') {
    score -= 5; // 還沒思考就求助效果較差
  }

  // 確保分數在 0-100 之間
  return Math.max(0, Math.min(100, score));
}

/**
 * 檢查求助成效（24小時後執行）
 */
async function checkHelpSeekingEffectiveness(logId) {
  try {
    const log = await HelpSeekingLog.findByPk(logId);

    if (!log) {
      console.error(`Help-seeking log ${logId} not found`);
      return null;
    }

    // 如果已經檢查過，跳過
    if (log.effectivenessCheckedAt) {
      console.log(`Log ${logId} already checked at ${log.effectivenessCheckedAt}`);
      return log;
    }

    // 獲取當前任務狀態
    const statusAfter = await getTaskStatus(log.taskId);

    // 計算成效分數
    const effectivenessScore = calculateEffectivenessScore(
      log,
      log.taskStatusBefore,
      statusAfter
    );

    // 判斷是否需要後續追蹤
    const followUpNeeded = (
      effectivenessScore < 40 || // 低成效
      statusAfter === 'blocked' || // 卡住
      (log.taskStatusBefore === statusAfter && statusAfter !== 'done') // 沒進展且未完成
    );

    // 更新記錄
    await log.update({
      taskStatusAfter24h: statusAfter,
      statusChanged: log.taskStatusBefore !== statusAfter,
      effectivenessScore,
      followUpNeeded,
      effectivenessCheckedAt: new Date()
    });

    console.log(`✅ Effectiveness check completed for log ${logId}: score=${effectivenessScore}, followUp=${followUpNeeded}`);

    return log;

  } catch (error) {
    console.error('Error checking help-seeking effectiveness:', error);
    return null;
  }
}

/**
 * 批量檢查到期的 help-seeking logs
 * 這個函數應該被排程任務定期調用（例如每小時一次）
 */
async function checkDueHelpSeekingLogs() {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 找出 24 小時前創建、尚未檢查成效的記錄
    const dueLogs = await HelpSeekingLog.findAll({
      where: {
        createdAt: {
          [Op.lte]: twentyFourHoursAgo
        },
        effectivenessCheckedAt: null,
        taskStatusBefore: {
          [Op.ne]: null // 只檢查有記錄初始狀態的
        }
      },
      limit: 100 // 一次最多處理 100 筆
    });

    console.log(`🔍 Found ${dueLogs.length} help-seeking logs due for effectiveness check`);

    const results = {
      total: dueLogs.length,
      checked: 0,
      failed: 0,
      needFollowUp: 0
    };

    for (const log of dueLogs) {
      try {
        const updatedLog = await checkHelpSeekingEffectiveness(log.id);
        if (updatedLog) {
          results.checked++;
          if (updatedLog.followUpNeeded) {
            results.needFollowUp++;
          }
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to check log ${log.id}:`, error);
        results.failed++;
      }
    }

    console.log('📊 Help-seeking effectiveness check results:', results);

    return results;

  } catch (error) {
    console.error('Error in checkDueHelpSeekingLogs:', error);
    throw error;
  }
}

/**
 * 獲取需要後續追蹤的案例（給教師看）
 */
async function getFollowUpNeededCases(projectId = null, limit = 50) {
  try {
    const whereClause = {
      followUpNeeded: true,
      effectivenessScore: {
        [Op.lt]: 50 // 成效分數低於 50
      }
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    const cases = await HelpSeekingLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: Task,
          attributes: ['id', 'title', 'content']
        }
      ],
      order: [
        ['effectivenessScore', 'ASC'], // 分數最低的優先
        ['createdAt', 'DESC']
      ],
      limit
    });

    return cases.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user.username,
      email: log.user.email,
      taskId: log.taskId,
      taskTitle: log.task ? log.task.title : null,
      metacognitiveState: log.metacognitiveState,
      helpSeekingType: log.helpSeekingType,
      taskStatusBefore: log.taskStatusBefore,
      taskStatusAfter24h: log.taskStatusAfter24h,
      effectivenessScore: log.effectivenessScore,
      createdAt: log.createdAt,
      effectivenessCheckedAt: log.effectivenessCheckedAt
    }));

  } catch (error) {
    console.error('Error getting follow-up needed cases:', error);
    throw error;
  }
}

module.exports = {
  getTaskStatus,
  captureTaskStatusBefore,
  checkHelpSeekingEffectiveness,
  checkDueHelpSeekingLogs,
  getFollowUpNeededCases
};
