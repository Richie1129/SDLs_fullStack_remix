export const ACTION_META = {
  PROJECT_CREATE:  { cat: '專案',     short: '建立專案' },
  PROJECT_UPDATE:  { cat: '專案',     short: '修改專案' },
  PROJECT_DELETE:  { cat: '專案',     short: '刪除專案' },

  NODE_CREATE:     { cat: '想法牆操作', short: '建立節點' },
  NODE_UPDATE:     { cat: '想法牆操作', short: '修改節點' },
  NODE_DELETE:     { cat: '想法牆操作', short: '刪除節點' },
  NODE_RELATION_CREATE: { cat: '想法牆操作', short: '建立關聯' },
  IDEAWALL_NODE_DRAG:   { cat: '想法牆操作', short: '拖曳節點' },
  IDEA_WALL_MESSAGE_CREATE: { cat: '協作', short: '想法牆留言' },

  TASK_CREATE: { cat: '任務', short: '建立任務' },
  TASK_UPDATE: { cat: '任務', short: '修改任務' },
  TASK_DELETE: { cat: '任務', short: '刪除任務' },
  KANBAN_TASK_CLICK: { cat: '任務', short: '點擊任務' },

  DAILY_PERSONAL_CREATE: { cat: '日誌', short: '個人日誌' },
  DAILY_PERSONAL_UPDATE: { cat: '日誌', short: '改個人日誌' },
  DAILY_PERSONAL_DELETE: { cat: '日誌', short: '刪個人日誌' },
  DAILY_TEAM_CREATE:     { cat: '日誌', short: '團隊日誌' },
  DAILY_TEAM_UPDATE:     { cat: '日誌', short: '改團隊日誌' },
  DAILY_TEAM_DELETE:     { cat: '日誌', short: '刪團隊日誌' },

  SUBMIT_CREATE: { cat: '提交', short: '提交作業' },
  SUBMIT_UPDATE: { cat: '提交', short: '修改提交' },
  SUBMIT_DELETE: { cat: '提交', short: '刪除提交' },

  FILE_UPLOAD: { cat: '檔案', short: '上傳檔案' },
  FILE_DOWNLOAD: { cat: '檔案', short: '下載檔案' },
  FILE_DELETE: { cat: '檔案', short: '刪除檔案' },

  ASSISTANT_SESSION_OPEN:   { cat: 'AI', short: 'AI 開啟' },
  ASSISTANT_SESSION_CREATE: { cat: 'AI', short: 'AI 建立' },
  ASSISTANT_COMPLETION:     { cat: 'AI', short: 'AI 對話' },
  ASSISTANT_5RS_VALIDATE:   { cat: 'AI', short: '5R 驗證' },
  ASSISTANT_SESSION_MESSAGES_DELETE: { cat: 'AI', short: 'AI 清除' },
  DAILY_PERSONAL_5RS_AI_ANALYSIS:    { cat: 'AI', short: '5R AI' },
  AI_TASK_ASSISTANT_REQUEST:         { cat: 'AI', short: 'AI 任務助手' },
  AI_TASK_ASSISTANT_HISTORY_VIEW:    { cat: 'AI', short: 'AI 歷史' },
  KB_COACH_GUIDANCE: { cat: 'AI', short: 'KB 指導' },
  SDL_COACH_ASK:     { cat: 'AI', short: 'SDL 諮詢' },
  ASSISTANT_GROUNDING_REQUEST: { cat: 'AI', short: '延伸閱讀' },

  COMMENT_CREATE: { cat: '協作', short: '留言' },
  COMMENT_UPDATE: { cat: '協作', short: '改留言' },
  COMMENT_DELETE: { cat: '協作', short: '刪留言' },
  PROJECT_COMMENT_CREATE: { cat: '協作', short: '專案留言' },
  PROJECT_COMMENT_DELETE: { cat: '協作', short: '刪專案留言' },
  PROJECT_COMMENT_ADD_ATTACHMENTS: { cat: '協作', short: '留言附件' },
  COMMENT_ADD_ATTACHMENTS: { cat: '協作', short: '留言附件' },
  CHATROOM_MESSAGE_SEND: { cat: '協作', short: '聊天室訊息' },
  CHATROOM_CREATE: { cat: '協作', short: '建立聊天室' },
  SOCKET_MESSAGE_SENT: { cat: '協作', short: '聊天訊息' },
  SOCKET_QUESTION_MESSAGE_SENT: { cat: '協作', short: '提問訊息' },
  SOCKET_RAG_MESSAGE_SENT: { cat: 'AI', short: 'AI 回答' },
  SOCKET_ANNOUNCEMENT_EMIT: { cat: '協作', short: '發送公告' },

  ANNOUNCEMENT_CREATE: { cat: '協作', short: '建立公告' },
  ANNOUNCEMENT_DELETE: { cat: '協作', short: '刪除公告' },

  ASSISTANT_5RS_ANALYZE: { cat: 'AI', short: '5R 分析' },
  ASSISTANT_IDEA_GENERATE: { cat: 'AI', short: 'AI 生想法' },
  ASSISTANT_SESSION_DELETE: { cat: 'AI', short: '刪除 AI 會話' },
  AI_FEEDBACK_SUBMITTED: { cat: 'AI', short: 'AI 回饋' },
  ORCHESTRATOR_DECISION: { cat: 'AI', short: '流程決策' },

  FILE_BATCH_DELETE: { cat: '檔案', short: '批次刪檔' },

  PROJECT_COMMENT_UPDATE: { cat: '協作', short: '改專案留言' },
  PROJECT_COMMENT_ATTACHMENT_DELETE: { cat: '協作', short: '刪留言附件' },

  PROJECT_MEMBER_ADD: { cat: '專案', short: '加入成員' },
  PROJECT_VIEWING_UPDATE: { cat: '專案', short: '改觀摩設定' },
  PROJECT_VIEWING_BATCH_UPDATE: { cat: '專案', short: '批次改觀摩' },

  // 檢視類（通常 projectId=null，但若帶上會進這裡）
  STUDENT_VIEW_DASHBOARD: { cat: '其他', short: '看儀表板' },
  TEACHER_VIEW_CLASS_LIST: { cat: '其他', short: '看班級清單' },
  TEACHER_VIEW_PROJECTS: { cat: '其他', short: '看專案列表' },
  TEACHER_VIEW_HELP_SEEKING_OVERVIEW: { cat: '其他', short: '看求助總覽' },
  TEACHER_VIEW_PROJECT_HELP_SEEKING: { cat: '其他', short: '看專案求助' },
  TEACHER_VIEW_STUDENT_HELP_SEEKING: { cat: '其他', short: '看學生求助' },
  USER_VIEW_PROFILE: { cat: '其他', short: '看個人檔案' },

  // 身份（通常 projectId=null，不會進本頁，但 fallback 時有意義）
  USER_LOGIN_SUCCESS: { cat: '其他', short: '登入成功' },
  USER_LOGIN_FAILED: { cat: '其他', short: '登入失敗' },
  USER_LOGOUT: { cat: '其他', short: '登出' },
  USER_REGISTER: { cat: '其他', short: '註冊' },
  PROFILE_UPDATE: { cat: '其他', short: '改個人資料' },
  PASSWORD_UPDATE: { cat: '其他', short: '改密碼' },
  TOKEN_REFRESH: { cat: '其他', short: '換 token' },
};

export const CAT_COLOR = {
  '想法牆操作': '#5BA491',
  'AI':       '#F97316',
  '協作':     '#3B82F6',
  '任務':     '#14B8A6',
  '日誌':     '#A78BFA',
  '提交':     '#EC4899',
  '檔案':     '#8B5CF6',
  '專案':     '#9CA3AF',
  '其他':     '#D1D5DB',
};

export const getActionMeta = (action) => ACTION_META[action] || { cat: '其他', short: action };

// Target 類型翻譯（audit_event.targetType → 中文）
export const TARGET_TYPE_LABELS = {
  task: '任務',
  project: '專案',
  submit: '提交作業',
  daily_personal: '個人日誌',
  daily_team: '團隊日誌',
  comment: '留言',
  project_comment: '專案留言',
  idea_wall: '想法牆',
  idea_wall_message: '想法牆留言',
  node: '想法節點',
  kanban: '看板',
  assistant_session: 'AI 會話',
  file: '檔案',
  chatroom: '聊天室',
  chatroom_message: '聊天訊息',
  user: '使用者',
  announcement: '公告',
  observation: '觀察紀錄',
  auth: '登入/登出',
  node_relation: '節點關聯',
  ai_feedback: 'AI 回饋',
  upload: '上傳',
  system: '系統',
  // 後端大寫型別（不同 controller 寫法不一致）
  Project: '專案',
  User: '使用者',
  File: '檔案',
  Announcement: '公告',
  RagMessage: 'AI 訊息',
  Message: '訊息',
  QuestionMessage: '提問訊息',
  SdlCoach: 'SDL 諮詢',
};

export const targetTypeLabel = (tt) => TARGET_TYPE_LABELS[tt] || tt;
