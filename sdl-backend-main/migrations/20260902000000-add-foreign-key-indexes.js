'use strict';

/**
 * 效能索引 migration（第二批）
 *
 * 背景：docs/reports/PERFORMANCE_REVIEW_2026-09-02.md 第 B2 節
 * 生產 DB 以 pg_constraint 對 pg_index 比對後，有 38 個外鍵欄位沒有索引，
 * 看板活動流、聊天室、權限 JOIN 等課堂熱路徑全是 seq scan。
 *
 * 做法：
 * - 全部用 CREATE INDEX CONCURRENTLY IF NOT EXISTS，不鎖寫入、可重複執行
 * - CONCURRENTLY 建立失敗會留下 INVALID 索引，建完逐一檢查 pg_index.indisvalid，
 *   無效者 drop 後重建一次
 * - 建完對相關表跑 ANALYZE，讓 planner 立刻拿到新統計
 * - 零資料風險：只加索引，不動任何資料列
 *
 * 注意：sequelize-cli 不會把 migration 包在 transaction 內，CONCURRENTLY 才能使用。
 */

// [索引名稱, 表名, 欄位陣列]
// 欄位名以 DB 實際大小寫為準（camelCase 欄位需加雙引號，下方統一加）
const INDEXES = [
  // 看板活動流（services/activityService.js）
  ['task_change_logs_projectId_createdAt_idx', 'task_change_logs', ['projectId', 'createdAt']],
  ['task_change_logs_taskId_idx', 'task_change_logs', ['taskId']],
  ['node_change_logs_projectId_createdAt_idx', 'node_change_logs', ['projectId', 'createdAt']],
  ['node_change_logs_nodeId_idx', 'node_change_logs', ['nodeId']],
  ['submit_change_logs_projectId_createdAt_idx', 'submit_change_logs', ['projectId', 'createdAt']],
  ['submit_change_logs_submitId_idx', 'submit_change_logs', ['submitId']],

  // 聊天室（controllers/chatroom.js）
  ['chatroom_messages_projectId_createdAt_idx', 'chatroom_messages', ['projectId', 'createdAt']],
  ['chatroom_messages_userId_idx', 'chatroom_messages', ['userId']],

  // 看板結構（utils/kanbanHelper.js，每次拖曳）
  ['columns_kanbanId_idx', 'columns', ['kanbanId']],
  ['card_tags_tagId_idx', 'card_tags', ['tagId']],
  ['tags_projectId_idx', 'tags', ['projectId']],

  // RAG 與 SDL Coach 對話史
  ['rag_messages_userId_createdAt_idx', 'rag_messages', ['userId', 'createdAt']],
  ['rag_messages_project_id_idx', 'rag_messages', ['project_id']],
  ['sdl_coach_messages_userId_idx', 'sdl_coach_messages', ['userId']],

  // 問題討論
  ['question_messages_questionId_idx', 'question_messages', ['questionId']],
  ['questions_projectId_idx', 'questions', ['projectId']],
  ['questions_userId_idx', 'questions', ['userId']],

  // 權限 JOIN（auth/PermissionGuard.js：Project 與 User 的 many-to-many）
  ['user_projects_projectId_idx', 'user_projects', ['projectId']],

  // 想法牆
  ['node_relations_to_id_idx', 'node_relations', ['to_id']],
  ['idea_walls_projectId_idx', 'idea_walls', ['projectId']],
  ['idea_wall_messages_senderId_idx', 'idea_wall_messages', ['senderId']],

  // 反思
  ['daily_teams_userId_idx', 'daily_teams', ['userId']],

  // 任務留言與專案留言（三層 include）
  ['comments_taskId_idx', 'comments', ['taskId']],
  ['comments_parentId_idx', 'comments', ['parentId']],
  ['comments_userId_idx', 'comments', ['userId']],
  ['comment_attachments_commentId_idx', 'comment_attachments', ['commentId']],
  ['comment_likes_userId_idx', 'comment_likes', ['userId']],
  ['project_comments_projectId_createdAt_idx', 'project_comments', ['projectId', 'createdAt']],
  ['project_comments_parentId_idx', 'project_comments', ['parentId']],
  ['project_comments_userId_idx', 'project_comments', ['userId']],
  ['project_comment_attachments_commentId_idx', 'project_comment_attachments', ['commentId']],
  ['project_comment_likes_userId_idx', 'project_comment_likes', ['userId']],

  // 探究流程結構
  ['processes_projectId_idx', 'processes', ['projectId']],
  ['stages_processId_idx', 'stages', ['processId']],
  ['sub_stages_stageId_idx', 'sub_stages', ['stageId']],

  // 討論串
  ['threads_userId_idx', 'threads', ['userId']],
  ['messages_threadId_idx', 'messages', ['threadId']],
  ['messages_userId_idx', 'messages', ['userId']],

  // AI 回饋與教師分析
  ['ai_task_feedbacks_projectId_idx', 'ai_task_feedbacks', ['projectId']],
  ['help_seeking_avoidance_risks_taskId_idx', 'help_seeking_avoidance_risks', ['taskId']],
  ['teacher_analysis_reports_userId_idx', 'teacher_analysis_reports', ['userId']],

  // audit_events（routes/auditClient.js 依 action + 時間範圍查詢；source 用於過濾來源）
  ['audit_events_action_ts_idx', 'audit_events', ['action', 'timestamp']],
  ['audit_events_source_idx', 'audit_events', ['source']],
];

const quote = (identifier) => `"${identifier}"`;

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    const createIndex = async ([name, table, columns]) => {
      const cols = columns.map(quote).join(', ');
      await sequelize.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${quote(name)} ON ${quote(table)} (${cols});`
      );
    };

    for (const spec of INDEXES) {
      const [name] = spec;
      try {
        await createIndex(spec);
      } catch (err) {
        // 表或欄位不存在（例如尚未建立的舊環境）時略過，不讓整支 migration 失敗
        if (/does not exist/i.test(err.message)) {
          console.warn(`[migration] 略過 ${name}：${err.message.split('\n')[0]}`);
          continue;
        }
        throw err;
      }

      // CONCURRENTLY 失敗會留下 INVALID 索引，IF NOT EXISTS 之後會直接跳過它，這裡補救一次
      const [rows] = await sequelize.query(
        `SELECT i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = :name;`,
        { replacements: { name } }
      );
      if (rows.length > 0 && rows[0].indisvalid === false) {
        console.warn(`[migration] ${name} 為 INVALID，重建中`);
        await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${quote(name)};`);
        await createIndex(spec);
      }
    }

    // 更新統計資訊，讓 planner 立刻採用新索引
    const tables = [...new Set(INDEXES.map(([, table]) => table))];
    for (const table of tables) {
      try {
        await sequelize.query(`ANALYZE ${quote(table)};`);
      } catch (err) {
        if (!/does not exist/i.test(err.message)) throw err;
      }
    }

    console.log(`[migration] 外鍵索引建立完成，共 ${INDEXES.length} 個`);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    for (const [name] of INDEXES) {
      await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${quote(name)};`);
    }
    console.log('[migration] 外鍵索引已回滾');
  },
};
