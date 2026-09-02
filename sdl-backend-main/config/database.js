require('dotenv').config();
const { buildSequelizeLoggingOptions } = require('../util/sqlLogger');

/**
 * sequelize-cli 專用設定（.sequelizerc 指向此檔）
 *
 * 執行期的 API 連線在 util/database.js，兩邊共用 util/sqlLogger.js 的策略：
 * 開發全印、生產只印超過 100ms 的慢查詢、測試關閉。
 * 零破壞性：只影響 logging，不改變查詢行為。
 */
const base = (env) => ({
  database: process.env.PG_NAME || 'postgres',
  username: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  dialect: 'postgres',
  ...buildSequelizeLoggingOptions(env),
});

module.exports = {
  development: base('development'),
  test: base('test'),
  production: base('production'),
};
