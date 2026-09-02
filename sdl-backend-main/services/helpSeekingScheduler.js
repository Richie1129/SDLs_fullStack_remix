/**
 * Help-Seeking 排程任務配置
 * 
 * 定期執行的任務：
 * 1. 求助迴避風險偵測 - 每 6 小時
 * 2. 求助成效檢查 - 每 1 小時
 */

const helpSeekingAvoidanceService = require('../services/helpSeekingAvoidanceService');
const helpSeekingEffectivenessService = require('../services/helpSeekingEffectivenessService');

// ===== 排程參數（B8：避開上課時段）=====
// HELP_SEEKING_RUN_HOURS：允許執行跨專案迴避偵測的台灣時間時段，格式 "起-迄"（迄為不含），預設 0-6
// HELP_SEEKING_INITIAL_DELAY_MS：啟動後首次嘗試執行的延遲，預設 5 分鐘
const RUN_HOURS = parseRunHours(process.env.HELP_SEEKING_RUN_HOURS || '0-6');
const INITIAL_DELAY_MS = (() => {
  const n = parseInt(process.env.HELP_SEEKING_INITIAL_DELAY_MS || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 5 * 60 * 1000;
})();
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseRunHours(text) {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(String(text).trim());
  if (!m) return { start: 0, end: 6 };
  const start = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const end = Math.min(24, Math.max(0, parseInt(m[2], 10)));
  return { start, end };
}

/** 現在的台灣時間小時數（0 到 23） */
function taipeiHour(now = new Date()) {
  return new Date(now.getTime() + TAIPEI_OFFSET_MS).getUTCHours();
}

/** 目前是否在允許執行的時段內 */
function isWithinRunWindow(now = new Date()) {
  const hour = taipeiHour(now);
  const { start, end } = RUN_HOURS;
  if (start === end) return true; // 例如 "0-0" 代表全天允許
  return start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
}

/** 距離下一個允許時段開始還有幾毫秒（已在時段內回 0） */
function msUntilRunWindow(now = new Date()) {
  if (isWithinRunWindow(now)) return 0;
  const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  const next = new Date(Date.UTC(taipeiNow.getUTCFullYear(), taipeiNow.getUTCMonth(), taipeiNow.getUTCDate(), RUN_HOURS.start, 0, 0, 0));
  if (next.getTime() <= taipeiNow.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - taipeiNow.getTime();
}

let avoidanceRunning = false;
let deferredAvoidanceTimer = null;

/**
 * 跨專案迴避偵測：只在允許時段執行，不在時段內就延後到下一個時段的開始
 */
async function runAvoidanceDetectionInWindow(label) {
  if (avoidanceRunning) {
    console.log(`[help-seeking] ${label}: 上一輪偵測仍在執行，略過`);
    return;
  }
  const waitMs = msUntilRunWindow();
  if (waitMs > 0) {
    if (!deferredAvoidanceTimer) {
      console.log(`[help-seeking] ${label}: 不在允許時段（台灣時間 ${RUN_HOURS.start}-${RUN_HOURS.end} 點），延後 ${Math.round(waitMs / 60000)} 分鐘`);
      deferredAvoidanceTimer = setTimeout(() => {
        deferredAvoidanceTimer = null;
        runAvoidanceDetectionInWindow('deferred').catch(() => {});
      }, waitMs);
      if (typeof deferredAvoidanceTimer.unref === 'function') deferredAvoidanceTimer.unref();
    }
    return;
  }

  avoidanceRunning = true;
  const startedAt = Date.now();
  try {
    console.log(`[help-seeking] ${label}: 開始跨專案迴避風險偵測`);
    const results = await helpSeekingAvoidanceService.detectAllActiveProjectsAvoidanceRisks();
    console.log(`[help-seeking] ${label}: 完成，耗時 ${Date.now() - startedAt}ms`, {
      projects: results.totalProjects,
      highRisk: results.highRisk,
      mediumRisk: results.mediumRisk
    });
  } catch (error) {
    console.error(`[help-seeking] ${label}: 偵測失敗`, error);
  } finally {
    avoidanceRunning = false;
  }
}

/**
 * 啟動所有 Help-Seeking 相關的排程任務
 */
function startHelpSeekingScheduledTasks() {
  console.log('🚀 Starting Help-Seeking scheduled tasks...');

  // 任務 1: 求助迴避風險偵測
  // 每 6 小時執行一次
  const avoidanceDetectionInterval = 6 * 60 * 60 * 1000; // 6 hours in ms
  
  setInterval(() => {
    runAvoidanceDetectionInWindow('scheduled').catch(() => {});
  }, avoidanceDetectionInterval);

  // 首次執行：啟動後 INITIAL_DELAY_MS，且同樣受允許時段限制（上課時重啟服務不會撞上）
  setTimeout(() => {
    runAvoidanceDetectionInWindow('initial').catch(() => {});
  }, INITIAL_DELAY_MS);

  // 任務 2: 求助成效檢查
  // 每 1 小時執行一次
  const effectivenessCheckInterval = 60 * 60 * 1000; // 1 hour in ms

  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled effectiveness check...');
      const results = await helpSeekingEffectivenessService.checkDueHelpSeekingLogs();
      console.log('✅ Effectiveness check completed:', {
        total: results.total,
        checked: results.checked,
        needFollowUp: results.needFollowUp,
        failed: results.failed
      });
    } catch (error) {
      console.error('❌ Scheduled effectiveness check failed:', error);
    }
  }, effectivenessCheckInterval);

  // 首次執行（啟動後 10 分鐘）
  setTimeout(async () => {
    try {
      console.log('🔄 Initial effectiveness check...');
      await helpSeekingEffectivenessService.checkDueHelpSeekingLogs();
    } catch (error) {
      console.error('❌ Initial effectiveness check failed:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  console.log('✅ Help-Seeking scheduled tasks started successfully');
  console.log(`   - Avoidance detection (cross-session): every 6 hours, only within Taipei ${RUN_HOURS.start}-${RUN_HOURS.end} h, first attempt after ${Math.round(INITIAL_DELAY_MS / 1000)}s`);
  console.log('   - Effectiveness check: every 1 hour');
  console.log('   - In-session detection: handled by Socket.IO events');
}

/**
 * 手動執行求助迴避風險偵測
 */
async function runAvoidanceDetectionNow() {
  console.log('🔧 Manual avoidance detection triggered');
  return await helpSeekingAvoidanceService.detectAllActiveProjectsAvoidanceRisks();
}

/**
 * 手動執行求助成效檢查
 */
async function runEffectivenessCheckNow() {
  console.log('🔧 Manual effectiveness check triggered');
  return await helpSeekingEffectivenessService.checkDueHelpSeekingLogs();
}

module.exports = {
  isWithinRunWindow,
  msUntilRunWindow,
  startHelpSeekingScheduledTasks,
  runAvoidanceDetectionNow,
  runEffectivenessCheckNow
};
