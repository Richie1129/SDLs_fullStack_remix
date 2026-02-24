/**
 * 資料保留政策 (Data Retention Policy)
 * 
 * 定義各類審計事件的保留天數和同意等級分類
 * 
 * 同意等級:
 *   - essential  (Level 0): 必要資料，永遠保留（安全/認證相關）
 *   - functional (Level 1): 功能性資料（任務/專案操作），隱含同意
 *   - analytics  (Level 2): 分析性資料（頁面瀏覽/點擊追蹤），需明確同意
 *   - full       (Level 3): 完整追蹤（滑鼠/滾動等微互動），需 opt-in
 */

// 保留天數常數
const RETENTION_DAYS = {
  PERMANENT: null,        // 永久保留
  LONG: 365,              // 1 年
  MEDIUM: 180,            // 6 個月
  SHORT: 90,              // 3 個月
  VERY_SHORT: 30,         // 1 個月
};

// 同意等級定義
const CONSENT_LEVELS = {
  ESSENTIAL: 'essential',     // Level 0 - 永遠記錄
  FUNCTIONAL: 'functional',   // Level 1 - 隱含同意
  ANALYTICS: 'analytics',     // Level 2 - 需明確同意
  FULL: 'full',               // Level 3 - 需 opt-in
};

// 同意等級數值對應 (用於比較)
const CONSENT_LEVEL_VALUES = {
  essential: 0,
  functional: 1,
  analytics: 2,
  full: 3,
};

/**
 * 事件分類規則
 * 
 * 根據 action 前綴或精確匹配分類到對應的同意等級
 * 優先順序: 精確匹配 > 前綴匹配 > 預設值
 */
const ACTION_CLASSIFICATION = {
  // Level 0: Essential - 安全/認證相關
  essential: {
    prefixes: ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_', 'TOKEN_'],
    exact: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAIL', 'USER_LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'TOKEN_REFRESH'],
    retentionDays: RETENTION_DAYS.PERMANENT,
  },

  // Level 1: Functional - 核心功能操作
  functional: {
    prefixes: [
      'TASK_', 'PROJECT_', 'COMMENT_', 'FILE_',
      'KANBAN_COLUMN_', 'KANBAN_TASK_CREATE', 'KANBAN_TASK_DELETE', 'KANBAN_TASK_UPDATE',
      'IDEAWALL_NODE_CREATE', 'IDEAWALL_NODE_DELETE', 'IDEAWALL_NODE_UPDATE',
      'REFLECTION_', 'SUBMIT_', 'PORTFOLIO_',
      'ANNOUNCEMENT_', 'STAGE_',
    ],
    exact: [],
    retentionDays: RETENTION_DAYS.LONG,
  },

  // Level 2: Analytics - 瀏覽/點擊追蹤
  analytics: {
    prefixes: [
      'PAGE_VIEW', 'KANBAN_TASK_CLICK', 'KANBAN_COLUMN_CLICK',
      'IDEAWALL_NODE_CLICK', 'IDEAWALL_VIEW',
      'HOME_PROJECT_', 'HOME_SECTION_', 'HOME_INVITE_',
    ],
    exact: [],
    retentionDays: RETENTION_DAYS.MEDIUM,
  },

  // Level 3: Full - 微互動/完整追蹤
  full: {
    prefixes: [
      'SCROLL_', 'HOVER_', 'FOCUS_', 'BLUR_',
      'MOUSE_', 'VIEWPORT_', 'VISIBILITY_',
    ],
    exact: [],
    retentionDays: RETENTION_DAYS.SHORT,
  },
};

/**
 * 根據 action 判斷同意等級
 * @param {string} action - 動作碼
 * @returns {string} consent level (essential|functional|analytics|full)
 */
function classifyAction(action) {
  if (!action) return CONSENT_LEVELS.FUNCTIONAL;

  const upperAction = action.toUpperCase();

  // 按等級優先順序檢查 (essential 最先)
  for (const [level, rules] of Object.entries(ACTION_CLASSIFICATION)) {
    // 精確匹配
    if (rules.exact.includes(upperAction)) return level;
    // 前綴匹配
    if (rules.prefixes.some(prefix => upperAction.startsWith(prefix))) return level;
  }

  // 預設歸類為 functional
  return CONSENT_LEVELS.FUNCTIONAL;
}

/**
 * 根據 action 計算過期時間
 * @param {string} action - 動作碼
 * @returns {Date|null} 過期時間，null 表示永久
 */
function calculateExpiresAt(action) {
  const level = classifyAction(action);
  const retentionDays = ACTION_CLASSIFICATION[level]?.retentionDays;

  if (retentionDays === null || retentionDays === undefined) {
    return null; // 永久保留
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt;
}

/**
 * 檢查使用者同意等級是否允許記錄特定 action
 * @param {string} userConsentLevel - 使用者同意等級
 * @param {string} action - 動作碼
 * @returns {boolean} 是否允許記錄
 */
function isActionAllowed(userConsentLevel, action) {
  const requiredLevel = classifyAction(action);
  const userValue = CONSENT_LEVEL_VALUES[userConsentLevel] ?? 0;
  const requiredValue = CONSENT_LEVEL_VALUES[requiredLevel] ?? 0;

  // essential 永遠允許
  if (requiredValue === 0) return true;

  // 使用者同意等級 >= 所需等級才允許
  return userValue >= requiredValue;
}

module.exports = {
  RETENTION_DAYS,
  CONSENT_LEVELS,
  CONSENT_LEVEL_VALUES,
  ACTION_CLASSIFICATION,
  classifyAction,
  calculateExpiresAt,
  isActionAllowed,
};
