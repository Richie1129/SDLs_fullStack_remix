'use strict';

/**
 * 檔案授權查詢索引
 *
 * 背景：utils/fileAccess.js 依 fileName 反查檔案歸屬，submits / comment_attachments /
 * project_comment_attachments / daily_personals / daily_teams 的 fileName 欄位原本都沒有索引，
 * GET /api/file/image 是高頻端點，未命中快取時會對這五張表各做一次 seq scan。
 *
 * 做法與 20260902000000-add-foreign-key-indexes.js 相同：CONCURRENTLY IF NOT EXISTS，
 * 不鎖寫入、可重複執行；表或欄位不存在時略過。零資料風險。
 */
const INDEXES = [
  ['submits_fileName_idx', 'submits', ['fileName']],
  ['comment_attachments_fileName_idx', 'comment_attachments', ['fileName']],
  ['project_comment_attachments_fileName_idx', 'project_comment_attachments', ['fileName']],
  ['daily_personals_fileName_idx', 'daily_personals', ['fileName']],
  ['daily_teams_fileName_idx', 'daily_teams', ['fileName']],
];

const quote = (identifier) => `"${identifier}"`;

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    for (const [name, table, columns] of INDEXES) {
      try {
        await sequelize.query(
          `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${quote(name)} ON ${quote(table)} (${columns.map(quote).join(', ')});`
        );
      } catch (err) {
        if (/does not exist/i.test(err.message)) {
          console.warn(`[migration] 略過 ${name}：${err.message.split('\n')[0]}`);
          continue;
        }
        throw err;
      }
      // CONCURRENTLY 失敗會留下 INVALID 索引，補救一次
      const [rows] = await sequelize.query(
        `SELECT indisvalid FROM pg_index WHERE indexrelid = '${quote(name)}'::regclass;`
      );
      if (rows.length && rows[0].indisvalid === false) {
        await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${quote(name)};`);
        await sequelize.query(
          `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${quote(name)} ON ${quote(table)} (${columns.map(quote).join(', ')});`
        );
      }
      await sequelize.query(`ANALYZE ${quote(table)};`);
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    for (const [name] of INDEXES) {
      await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${quote(name)};`);
    }
  }
};
