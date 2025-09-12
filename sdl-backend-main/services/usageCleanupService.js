const UsageSession = require('../models/usage_session');
const { Op } = require('sequelize');

// Helper to clamp session duration  
const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
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
 * - totalSeconds 基於 endedAt - startedAt，確保與前端計算一致
 */
async function cleanupStaleSessions() {
  const staleThresholdMs = STALE_THRESHOLD_SEC * 1000;
  const staleThreshold = new Date(Date.now() - staleThresholdMs);

  try {
    // Find sessions that haven't been active for STALE_THRESHOLD_SEC
    const staleSessions = await UsageSession.findAll({
      where: {
        endedAt: null,
        lastActiveAt: {
          [Op.lt]: staleThreshold
        }
      }
    });

    if (staleSessions.length === 0) {
      return 0;
    }

    console.log(`Found ${staleSessions.length} stale sessions to cleanup`);
    
    let cleanedCount = 0;
    for (const session of staleSessions) {
      try {
        // 設定 endedAt 為 lastActiveAt - 這是用戶真正停止活動的時間點
        const endTime = session.lastActiveAt;
        const rawSeconds = Math.floor((endTime - session.startedAt) / 1000);
        const clampedSeconds = clamp(MIN_SESSION_SEC, MAX_SESSION_SEC, rawSeconds);
        
        session.totalSeconds = clampedSeconds;
        session.endedAt = endTime; // 使用 lastActiveAt 而非當前時間
        await session.save();
        
        cleanedCount++;
        console.log(`Cleaned stale session ${session.id}: userId=${session.userId}, projectId=${session.projectId}, duration=${clampedSeconds}s`);
      } catch (saveError) {
        console.error(`Failed to cleanup session ${session.id}:`, saveError);
      }
    }

    console.log(`Successfully cleaned ${cleanedCount}/${staleSessions.length} stale sessions`);
    return cleanedCount;
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
  
  console.log(`🧹 Starting usage session cleanup service`);
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
        console.log(`🧹 Cleanup cycle completed: ${cleanedCount} sessions cleaned`);
      }
    } catch (error) {
      console.error('Periodic cleanup error:', error);
    }
  }, CLEANUP_INTERVAL_MS);

  // Return function to stop cleanup
  return () => {
    console.log('🛑 Stopping usage session cleanup service');
    clearInterval(intervalId);
  };
}

module.exports = {
  cleanupStaleSessions,
  startPeriodicCleanup
};