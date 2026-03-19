// 資料正規化工具函式

/**
 * 統一使用者資料格式
 * 消除多種使用者ID格式的混亂
 */
export const normalizeUserData = (item) => {
  if (!item) return null;

  // 統一使用者ID
  // userId / user_id 優先（外鍵），再從嵌套 User 物件取，最後才用記錄自身的 id
  const userId = item.userId || item.user_id || item.User?.id || item.id;

  // 統一使用者名稱，涵蓋所有已知欄位命名慣例：
  //   username / user_name / name       — 一般 API
  //   author                            — Chatroom_message 模型
  //   owner                             — Task / IdeaWall Node 模型
  //   User.username                     — Sequelize include 嵌套格式（reflection / daily）
  const username =
    item.username     ||
    item.user_name    ||
    item.name         ||
    item.author       ||
    item.owner        ||
    item.User?.username ||
    item.User?.name;

  return {
    ...item,
    userId,
    username,
    // 保留原始欄位以防後端依賴
    id: item.id,        // 保留記錄自身的 id，不覆蓋為 userId
    user_id: userId,
    user_name: username,
    name: username,
  };
};

/**
 * 標準化時間戳格式
 */
export const normalizeTimestamp = (item) => {
  if (!item) return null;

  const timestamp = item.createdAt || item.created_at || item.timestamp;
  
  return {
    ...item,
    createdAt: timestamp,
    created_at: timestamp
  };
};

/**
 * 統一任務資料格式
 */
export const normalizeTaskData = (task, columnInfo = {}) => {
  const normalized = normalizeUserData(task);
  const timestamped = normalizeTimestamp(normalized);
  
  return {
    ...timestamped,
    status: columnInfo.title || columnInfo.name || task.status,
    columnId: columnInfo.id || task.columnId,
    // 處理指派者資料
    assignees: Array.isArray(task.assignees) 
      ? task.assignees.map(normalizeUserData)
      : []
  };
};

/**
 * 統一想法節點資料格式
 */
export const normalizeNodeData = (node) => {
  const normalized = normalizeUserData(node);
  const timestamped = normalizeTimestamp(normalized);

  return {
    ...timestamped,
    // 統一創建者欄位 - 保留原始 owner，回退到 username
    owner: node.owner || normalized.username,
    creator: node.owner || normalized.username
  };
};

/**
 * 統一聊天訊息資料格式
 */
export const normalizeChatMessage = (message, chatroomInfo = {}) => {
  const normalized = normalizeUserData(message);
  const timestamped = normalizeTimestamp(normalized);
  
  return {
    ...timestamped,
    chatroomId: chatroomInfo.id || message.chatroomId,
    chatroomTitle: chatroomInfo.title || message.chatroomTitle
  };
};

/**
 * 統一反思記錄資料格式
 */
export const normalizeReflectionData = (reflection) => {
  const normalized = normalizeUserData(reflection);
  return normalizeTimestamp(normalized);
};

/**
 * 統一提交資料格式
 */
export const normalizeSubmissionData = (submission) => {
  const normalized = normalizeUserData(submission);
  return normalizeTimestamp(normalized);
};

/**
 * 批量正規化資料陣列
 */
export const normalizeDataArray = (items, normalizer) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizer).filter(Boolean);
};

/**
 * 建立使用者對照表
 * 用於快速查找使用者資料
 */
export const createUserLookup = (students) => {
  if (!Array.isArray(students)) return {};
  
  return students.reduce((lookup, student) => {
    const normalized = normalizeUserData(student);
    if (normalized.userId) {
      lookup[normalized.userId] = normalized;
    }
    return lookup;
  }, {});
};

/**
 * 使用使用者對照表增強資料
 */
export const enhanceWithUserInfo = (items, userLookup, userIdKey = 'userId') => {
  if (!Array.isArray(items)) return [];
  
  return items.map(item => {
    const normalized = normalizeUserData(item);
    const uid = normalized[userIdKey];
    const userInfo = uid ? userLookup[uid] : null;
    
    return {
      ...normalized,
      // 如果在對照表中找到更完整的使用者資訊，則使用它
      username: userInfo?.username || normalized.username,
      // 可以在此加入其他使用者相關欄位
      userRole: userInfo?.role || userInfo?.teamRole || '成員'
    };
  });
};

/**
 * 計算資料統計的輔助函式
 */
export const calculateUserActivityStats = (userId, username, dataCollections) => {
  const {
    reflections = [],
    nodes = [],
    tasks = [],
    chatHistory = [],
    submissions = []
  } = dataCollections;
  
  // 使用正規化後的統一查詢邏輯
  const userReflections = reflections.filter(r => 
    r.userId === userId || r.username === username
  ).length;
  
  const userNodes = nodes.filter(n => 
    n.userId === userId || n.username === username
  ).length;
  
  const userTasks = tasks.filter(t => 
    t.userId === userId || t.username === username ||
    (t.assignees && t.assignees.some(a => a.userId === userId))
  ).length;
  
  const userChatMessages = chatHistory.filter(msg => 
    msg.userId === userId || msg.username === username
  ).length;
  
  const userSubmissions = submissions.filter(s => 
    s.userId === userId || s.username === username
  ).length;
  
  return {
    reflections: userReflections,
    nodes: userNodes,
    tasks: userTasks,
    chatMessages: userChatMessages,
    submissions: userSubmissions,
    totalActivity: userReflections + userNodes + userTasks + userChatMessages
  };
};