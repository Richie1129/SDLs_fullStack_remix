const UsageSession = require('../models/usage_session');
const sequelize = require('../util/database');
const { Op } = require('sequelize');

const envInt = (key, def) => {
  const v = process.env[key];
  const n = v != null ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

// 統一配置常數，與控制器保持一致
const MIN_SESSION_SEC = envInt('USAGE_MIN_SESSION_SEC', 10 * 60); // default 10m
const MAX_SESSION_SEC = envInt('USAGE_MAX_SESSION_SEC', 4 * 60 * 60); // default 4h
const MAX_ACTIVE_GAP_SEC = envInt('MAX_ACTIVE_GAP_SEC', 300); // default 5m
const STALE_THRESHOLD_SEC = envInt('USAGE_STALE_THRESHOLD_SEC', MAX_ACTIVE_GAP_SEC * 2); // default 10m

/**
 * Clean up stale sessions that haven't received heartbeat for too long
 * This handles cases where browser/app crashed without proper session termination
 *
 * 清理策略：
 * - 如果 lastActiveAt 超過 STALE_THRESHOLD_SEC，認為是異常終止
 * - endedAt 設為 lastActiveAt（用戶真正停止活動的時間點）
 * - totalSeconds 基於 endedAt - startedAt 並夾在 [MIN, MAX] 之間，與前端計算一致
 *
 * 效能（B11）：原本 findAll 再逐列 save，下課瞬間上百個 session 同時 stale 就是上百次 UPDATE；
 * 改成單句 UPDATE 在 SQL 內算 totalSeconds，走既有的部分索引
 * ix_usage_last_active ("lastActiveAt") WHERE "endedAt" IS NULL。
 */
async function cleanupStaleSessions() {
  const staleThresholdMs = STALE_THRESHOLD_SEC * 1000;
  const staleThreshold = new Date(Date.now() - staleThresholdMs);

  try {
    const [affectedCount] = await UsageSession.update(
      {
        endedAt: sequelize.literal('"lastActiveAt"'),
        totalSeconds: sequelize.literal(
          `LEAST(${MAX_SESSION_SEC}, GREATEST(${MIN_SESSION_SEC}, ` +
          `FLOOR(EXTRACT(EPOCH FROM ("lastActiveAt" - "startedAt")))))::integer`
        ),
      },
      {
        where: {
          endedAt: null,
          lastActiveAt: { [Op.lt]: staleThreshold },
        },
      }
    );

    if (affectedCount > 0) {
      console.log(`Cleaned ${affectedCount} stale usage sessions (lastActiveAt < ${staleThreshold.toISOString()})`);
    }
    return affectedCount;
  } catch (error) {
    console.error('Error cleaning up stale sessions:', error);
    throw error;
  }
}

/**
 * Start periodic cleanup of stale sessions
 */
function startPeriodicCleanup() {
  const CLEANUP_INTERVAL_MS = envInt('USAGE_CLEANUP_INTERVAL_MS', 60 * 1000); // default 1 minute

  console.log('Starting usage session cleanup service');
  console.log(`   Cleanup interval: ${CLEANUP_INTERVAL_MS / 1000}s`);
  console.log(`   Stale threshold: ${STALE_THRESHOLD_SEC}s`);
  console.log(`   Max active gap: ${MAX_ACTIVE_GAP_SEC}s`);

  // 立即執行一次清理
  cleanupStaleSessions().catch(error => {
    console.error('Initial cleanup error:', error);
  });

  const intervalId = setInterval(async () => {
    try {
      const cleanedCount = await cleanupStaleSessions();
      if (cleanedCount > 0) {
        console.log(`Cleanup cycle completed: ${cleanedCount} sessions cleaned`);
      }
    } catch (error) {
      console.error('Periodic cleanup error:', error);
    }
  }, CLEANUP_INTERVAL_MS);

  // Return function to stop cleanup
  return () => {
    console.log('Stopping usage session cleanup service');
    clearInterval(intervalId);
  };
}

module.exports = {
  cleanupStaleSessions,
  startPeriodicCleanup
};
