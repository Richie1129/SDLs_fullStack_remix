/**
 * 助理服務配置常數
 * 集中管理所有截斷限制和數據範圍，便於調整和維護
 */
const ASSISTANT_CONFIG = {
  // 資料庫查詢限制
  DB_KANBAN_TASKS_LIMIT: 30,          // 看板任務查詢限制
  DB_IDEA_WALL_NODES_LIMIT: 100,      // 想法牆節點查詢限制
  DB_SUBMISSIONS_LIMIT: 30,            // 提交記錄查詢限制
  DB_CHAT_HISTORY_LIMIT: 10,           // 對話歷史查詢限制
  DB_TASK_CHANGES_LIMIT: 200,          // 任務變更記錄限制

  // 文字截斷限制（資料庫層）
  TRUNCATE_TASK_TITLE: 200,            // 任務標題截斷長度
  TRUNCATE_TASK_CONTENT: 1500,         // 任務內容截斷長度
  TRUNCATE_NODE_TITLE: 200,            // 節點標題截斷長度
  TRUNCATE_NODE_CONTENT: 1500,         // 節點內容截斷長度
  TRUNCATE_SUBMIT_CONTENT: 2000,       // 提交內容截斷長度
  TRUNCATE_CHAT_CONTENT: 2000,         // 聊天內容截斷長度

  // Prompt 中的額外限制
  PROMPT_KANBAN_TASKS_LIMIT: 10,       // Prompt 中每個欄位的任務數
  PROMPT_TASK_CONTENT_LIMIT: 200,      // Prompt 中任務內容截斷
  PROMPT_IDEA_NODES_LIMIT: 20,         // Prompt 中想法節點數
  PROMPT_IDEA_CONTENT_LIMIT: 200,      // Prompt 中想法內容截斷
  PROMPT_SUBMISSIONS_LIMIT: 5,         // Prompt 中提交記錄數
  PROMPT_SUBMIT_CONTENT_LIMIT: 200,    // Prompt 中提交內容截斷
  PROMPT_CHAT_HISTORY_LIMIT: 10,       // Prompt 中對話歷史數

  // 對話歷史最終截斷
  CHAT_HISTORY_FINAL_LIMIT: 20,        // getChatHistory 最終返回的對話數

  // 活動摘要
  ACTIVITY_SUMMARY_DAYS: 30,           // 活動摘要天數

  // 基本統計
  BASIC_SUMMARY_TASK_TITLES_LIMIT: 200, // 基本統計中的任務標題數
};

module.exports = ASSISTANT_CONFIG;
