/**
 * Sequelize SQL logging 策略
 *
 * 背景：docs/reports/PERFORMANCE_REVIEW_2026-09-02.md 第 B1 節
 * 生產環境原本走 Sequelize 預設的 console.log，每句 SQL 都印進 Docker log，
 * 100 人上課時每秒數百到上千行，吃 CPU 與磁碟 I/O，stdout 為 pipe 時還可能 backpressure 卡 event loop。
 *
 * 模式（可由環境變數 SQL_LOGGING 覆寫）：
 * - all  ：每句 SQL 都印（開發預設）
 * - slow ：只印超過 SLOW_QUERY_MS 的慢查詢（生產預設）
 * - off  ：完全關閉（測試預設）
 */

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || 100;

/**
 * 只記錄慢查詢；需搭配 Sequelize 的 benchmark: true 才拿得到 timing
 * @param {string} sql
 * @param {number} timing 執行毫秒數
 */
const slowQueryLogger = (sql, timing) => {
  if (typeof timing !== 'number' || timing <= SLOW_QUERY_MS) return;
  const shortSql = sql.length > 500 ? `${sql.substring(0, 500)}...` : sql;
  console.warn(`[SLOW QUERY] ${timing}ms ${new Date().toISOString()} ${shortSql}`);
};

/**
 * 依環境決定 logging 模式
 * @param {string} [nodeEnv]
 * @returns {'all'|'slow'|'off'}
 */
const resolveSqlLoggingMode = (nodeEnv = process.env.NODE_ENV) => {
  const explicit = (process.env.SQL_LOGGING || '').toLowerCase();
  if (explicit === 'all' || explicit === 'slow' || explicit === 'off') return explicit;
  if (nodeEnv === 'production') return 'slow';
  if (nodeEnv === 'test') return 'off';
  return 'all';
};

/**
 * 產生可直接展開進 Sequelize options 的 logging 設定
 * @param {string} [nodeEnv]
 * @returns {{ logging: false|Function, benchmark: boolean }}
 */
const buildSequelizeLoggingOptions = (nodeEnv) => {
  const mode = resolveSqlLoggingMode(nodeEnv);
  if (mode === 'off') return { logging: false, benchmark: false };
  if (mode === 'slow') return { logging: slowQueryLogger, benchmark: true };
  return { logging: console.log, benchmark: false };
};

module.exports = {
  SLOW_QUERY_MS,
  slowQueryLogger,
  resolveSqlLoggingMode,
  buildSequelizeLoggingOptions,
};
