require('dotenv').config();

/**
 * 智慧 SQL Logging - 只記錄慢查詢
 *
 * 為什麼這樣做：
 * 1. 避免 log 污染：正常查詢不輸出
 * 2. 找出瓶頸：> 100ms 的查詢會被標記
 * 3. 包含完整資訊：SQL + 執行時間
 *
 * 零破壞性：
 * - 不改變查詢行為，只加 logging
 * - 只在慢查詢時輸出
 */
const slowQueryLogger = (sql, timing) => {
  // timing 是 Sequelize 提供的執行時間（毫秒）
  if (timing > 100) {
    console.warn('\n' + '='.repeat(80));
    console.warn(`🐢 [SLOW QUERY] ${timing}ms - ${new Date().toISOString()}`);
    console.warn('─'.repeat(80));

    // 截取 SQL，避免太長
    const shortSql = sql.length > 500 ? sql.substring(0, 500) + '...' : sql;
    console.warn(`SQL: ${shortSql}`);
    console.warn('='.repeat(80) + '\n');
  }
};

module.exports = {
  development: {
    database: process.env.PG_NAME || 'postgres',
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    // ✅ 智慧 logging：只記錄慢查詢
    logging: slowQueryLogger,
    benchmark: true,  // 啟用 timing 測量
  },
  test: {
    database: process.env.PG_NAME || 'postgres',
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    database: process.env.PG_NAME || 'postgres',
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    // ✅ Production 也啟用慢查詢 logging（關鍵！）
    logging: slowQueryLogger,
    benchmark: true,
  }
}; 