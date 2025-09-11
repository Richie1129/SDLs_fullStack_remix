"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 移除可能存在的錯誤約束（忽略錯誤）
    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'usage_sessions_active_user_project_unique'
          ) THEN
            ALTER TABLE usage_sessions DROP CONSTRAINT usage_sessions_active_user_project_unique;
          END IF;
        END$$;
      `);
    } catch (error) {
      console.log('Constraint removal (expected if not exists):', error.message);
    }

    // 移除可能存在的錯誤索引
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS usage_sessions_active_lookup_idx;`);

    // 建立正確的 partial unique index - 只允許一個未結束的 session per user/project
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_usage_open_session
      ON usage_sessions ("userId", "projectId")
      WHERE "endedAt" IS NULL;
    `);

    // 建立查詢優化索引
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ix_usage_user_project 
      ON usage_sessions ("userId", "projectId");
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ix_usage_endedat 
      ON usage_sessions ("endedAt");
    `);

    // 建立 lastActiveAt 索引，供清理服務使用
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ix_usage_last_active
      ON usage_sessions ("lastActiveAt")
      WHERE "endedAt" IS NULL;
    `);

    console.log('✅ Usage session constraints and indexes created successfully');
  },

  async down(queryInterface, Sequelize) {
    // 移除所有新建的索引
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ux_usage_open_session;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ix_usage_user_project;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ix_usage_endedat;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ix_usage_last_active;`);
    
    console.log('Usage session indexes removed');
  },
};