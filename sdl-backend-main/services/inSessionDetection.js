/**
 * 課堂內即時偵測服務
 * 
 * 在學生實際使用平台的時段內進行，分析單位是【分鐘】
 * 透過 Socket.IO 追蹤學生行為並即時觸發柔性提示
 * 
 * 信號：
 * 1. 任務瀏覽但無動作 - 學生打開任務卡片 > 3 次但未編輯、未求助、未移動
 * 2. 欄位阻塞無後續 - 任務被移到 Blocked 欄位後，同一堂課內未發起任何求助
 * 3. AI 助手打開但未送出 - 打開 AI Task Assistant modal 但關閉未送出問題
 * 4. 同儕都在互動但該生沈默 - 同一堂課中，小組其他成員有發言/編輯，但該生 > 20 分鐘無任何操作
 */

const HelpSeekingLog = require('../models/help_seeking_log');
const Task = require('../models/task');
const Chatroom_message = require('../models/chatroom_message');
const { Op } = require('sequelize');

// 會話狀態管理（記憶體中）
// 結構：{ userId: { projectId: { sessionStart, lastActivity, taskViews: {}, aiAssistantOpened, ... } } }
const sessionStates = new Map();

// 柔性提示冷卻時間（同一堂課內最多提示一次）
const promptCooldowns = new Map();

/**
 * 初始化或獲取學生的會話狀態
 */
function getSessionState(userId, projectId) {
  if (!sessionStates.has(userId)) {
    sessionStates.set(userId, new Map());
  }

  const userSessions = sessionStates.get(userId);
  
  if (!userSessions.has(projectId)) {
    userSessions.set(projectId, {
      sessionStart: new Date(),
      lastActivity: new Date(),
      taskViews: new Map(), // taskId -> viewCount
      taskEdits: new Set(), // taskId set
      aiAssistantOpened: 0,
      aiAssistantClosed: 0,
      aiAssistantSubmitted: 0,
      groupMessages: 0,
      taskMoves: 0,
      blockedTaskDetected: false,
      blockedTaskId: null
    });
  }

  return userSessions.get(projectId);
}

/**
 * 更新最後活動時間
 */
function updateLastActivity(userId, projectId) {
  const state = getSessionState(userId, projectId);
  state.lastActivity = new Date();
}

/**
 * 檢查是否可以顯示提示（冷卻機制）
 */
function canShowPrompt(userId, projectId, promptType) {
  const key = `${userId}-${projectId}-${promptType}`;
  
  if (promptCooldowns.has(key)) {
    const lastPrompt = promptCooldowns.get(key);
    const timeSince = Date.now() - lastPrompt;
    // 30 分鐘冷卻
    if (timeSince < 30 * 60 * 1000) {
      return false;
    }
  }

  return true;
}

/**
 * 標記已顯示提示
 */
function markPromptShown(userId, projectId, promptType) {
  const key = `${userId}-${projectId}-${promptType}`;
  promptCooldowns.set(key, Date.now());
}

/**
 * 追蹤事件：任務被查看
 */
async function trackTaskViewed(userId, projectId, taskId, socketManager) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);

  // 增加查看次數
  const currentViews = state.taskViews.get(taskId) || 0;
  state.taskViews.set(taskId, currentViews + 1);

  // 信號 1: 任務瀏覽但無動作（查看 > 3 次但沒有編輯或求助）
  if (currentViews + 1 > 3 && 
      !state.taskEdits.has(taskId) &&
      canShowPrompt(userId, projectId, 'task-browsing')) {
    
    // 檢查是否有求助記錄
    const hasHelped = await HelpSeekingLog.count({
      where: {
        userId,
        taskId,
        createdAt: { [Op.gte]: state.sessionStart }
      }
    }) > 0;

    if (!hasHelped) {
      // 發送柔性提示
      socketManager.emitToUser(userId, 'help-seeking:gentle-prompt', {
        type: 'task-browsing',
        taskId,
        message: '💬 需要幫忙嗎？',
        actions: [
          { label: '問問 AI 助手', action: 'open-ai-assistant' },
          { label: '找同學聊聊', action: 'open-chatroom' },
          { label: '先不用，謝謝', action: 'dismiss' }
        ]
      });

      markPromptShown(userId, projectId, 'task-browsing');
    }
  }
}

/**
 * 追蹤事件：任務被編輯
 */
function trackTaskEdited(userId, projectId, taskId) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.taskEdits.add(taskId);
}

/**
 * 追蹤事件：任務被移動
 */
async function trackTaskMoved(userId, projectId, taskId, newColumnName, socketManager) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.taskMoves++;

  // 信號 2: 任務被移到 Blocked 欄位
  const columnNameLower = newColumnName.toLowerCase();
  if (columnNameLower.includes('block') || 
      columnNameLower.includes('阻擋') || 
      columnNameLower.includes('stuck')) {
    
    state.blockedTaskDetected = true;
    state.blockedTaskId = taskId;

    // 等待 10 分鐘，如果還沒有求助，發送提示
    setTimeout(async () => {
      if (state.blockedTaskDetected && state.blockedTaskId === taskId) {
        // 檢查是否有求助記錄
        const hasHelped = await HelpSeekingLog.count({
          where: {
            userId,
            taskId,
            createdAt: { [Op.gte]: state.sessionStart }
          }
        }) > 0;

        if (!hasHelped && canShowPrompt(userId, projectId, 'blocked-task')) {
          socketManager.emitToUser(userId, 'help-seeking:gentle-prompt', {
            type: 'blocked-task',
            taskId,
            message: '📌 遇到卡關了嗎？需要一些幫助嗎？',
            actions: [
              { label: '查看任務', action: 'view-task' },
              { label: '問問 AI 助手', action: 'open-ai-assistant' },
              { label: '不用了', action: 'dismiss' }
            ]
          });

          markPromptShown(userId, projectId, 'blocked-task');
        }
      }
    }, 10 * 60 * 1000); // 10 分鐘後檢查
  }
}

/**
 * 追蹤事件：AI 助手被打開
 */
function trackAIAssistantOpened(userId, projectId) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.aiAssistantOpened++;
}

/**
 * 追蹤事件：AI 助手被關閉（未送出問題）
 */
async function trackAIAssistantClosed(userId, projectId, taskId, socketManager) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.aiAssistantClosed++;

  // 信號 3: AI 助手打開但未送出（可能猶豫是否該求助）
  if (state.aiAssistantOpened > state.aiAssistantSubmitted &&
      canShowPrompt(userId, projectId, 'ai-assistant-hesitation')) {
    
    // 稍微延遲發送，避免剛關閉就彈出
    setTimeout(() => {
      socketManager.emitToUser(userId, 'help-seeking:gentle-prompt', {
        type: 'ai-assistant-hesitation',
        taskId,
        message: '💭 還在想要怎麼問嗎？',
        subMessage: '不用擔心，提問本身就是學習的一部分',
        actions: [
          { label: '重新試試看', action: 'open-ai-assistant' },
          { label: '找同學聊聊', action: 'open-chatroom' },
          { label: '我再想想', action: 'dismiss' }
        ]
      });

      markPromptShown(userId, projectId, 'ai-assistant-hesitation');
    }, 2000); // 2 秒後
  }
}

/**
 * 追蹤事件：AI 助手問題已送出
 */
function trackAIAssistantSubmitted(userId, projectId, taskId) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.aiAssistantSubmitted++;

  // 清除 blocked 狀態（因為已經求助了）
  if (state.blockedTaskId === taskId) {
    state.blockedTaskDetected = false;
    state.blockedTaskId = null;
  }
}

/**
 * 追蹤事件：小組討論發言
 */
function trackGroupMessage(userId, projectId) {
  const state = getSessionState(userId, projectId);
  updateLastActivity(userId, projectId);
  state.groupMessages++;
}

/**
 * 檢測信號 4：同儕都在互動但該生沈默
 * 每 5 分鐘檢查一次
 */
async function checkPeerActivityComparison(projectId, socketManager) {
  try {
    // 獲取專案所有在線成員
    const onlineMembers = [];
    for (const [userId, projects] of sessionStates.entries()) {
      if (projects.has(projectId)) {
        const state = projects.get(projectId);
        const timeSinceLastActivity = Date.now() - state.lastActivity.getTime();
        
        onlineMembers.push({
          userId,
          state,
          timeSinceLastActivity
        });
      }
    }

    if (onlineMembers.length < 2) {
      return; // 至少需要 2 個成員才能比較
    }

    // 計算小組平均活躍度
    const avgGroupMessages = onlineMembers.reduce((sum, m) => sum + m.state.groupMessages, 0) / onlineMembers.length;
    const avgTaskMoves = onlineMembers.reduce((sum, m) => sum + m.state.taskMoves, 0) / onlineMembers.length;

    // 檢查沈默的學生
    for (const member of onlineMembers) {
      const { userId, state, timeSinceLastActivity } = member;

      // 條件：> 20 分鐘無活動 且 活躍度明顯低於小組平均
      if (timeSinceLastActivity > 20 * 60 * 1000 &&
          state.groupMessages < avgGroupMessages * 0.5 &&
          state.taskMoves < avgTaskMoves * 0.5 &&
          canShowPrompt(userId, projectId, 'peer-silence')) {
        
        socketManager.emitToUser(userId, 'help-seeking:gentle-prompt', {
          type: 'peer-silence',
          message: '📋 你有 2 個任務進行中了，需要一些幫助嗎？',
          subMessage: '你的小組同學們都在積極討論喔',
          actions: [
            { label: '查看任務', action: 'view-tasks' },
            { label: '問問 AI 助手', action: 'open-ai-assistant' },
            { label: '不用了', action: 'dismiss' }
          ]
        });

        markPromptShown(userId, projectId, 'peer-silence');
      }
    }

  } catch (error) {
    console.error('Error checking peer activity comparison:', error);
  }
}

/**
 * 清理會話狀態（學生離線時調用）
 */
function cleanupSession(userId, projectId) {
  if (sessionStates.has(userId)) {
    const userSessions = sessionStates.get(userId);
    userSessions.delete(projectId);

    if (userSessions.size === 0) {
      sessionStates.delete(userId);
    }
  }

  // 清理冷卻記錄
  const prefix = `${userId}-${projectId}-`;
  for (const [key] of promptCooldowns.entries()) {
    if (key.startsWith(prefix)) {
      promptCooldowns.delete(key);
    }
  }
}

/**
 * 清理已過期的會話狀態（每小時執行一次）
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  const threshold = 2 * 60 * 60 * 1000; // 2 小時無活動視為過期

  for (const [userId, projects] of sessionStates.entries()) {
    for (const [projectId, state] of projects.entries()) {
      const timeSinceLastActivity = now - state.lastActivity.getTime();
      
      if (timeSinceLastActivity > threshold) {
        projects.delete(projectId);
      }
    }

    if (projects.size === 0) {
      sessionStates.delete(userId);
    }
  }
}

// 每小時清理一次
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  trackTaskViewed,
  trackTaskEdited,
  trackTaskMoved,
  trackAIAssistantOpened,
  trackAIAssistantClosed,
  trackAIAssistantSubmitted,
  trackGroupMessage,
  checkPeerActivityComparison,
  cleanupSession,
  getSessionState
};
