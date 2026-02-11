/**
 * Help-Seeking 排程任務配置
 * 
 * 定期執行的任務：
 * 1. 求助迴避風險偵測 - 每 6 小時
 * 2. 求助成效檢查 - 每 1 小時
 */

const helpSeekingAvoidanceService = require('../services/helpSeekingAvoidanceService');
const helpSeekingEffectivenessService = require('../services/helpSeekingEffectivenessService');

/**
 * 啟動所有 Help-Seeking 相關的排程任務
 */
function startHelpSeekingScheduledTasks() {
  console.log('🚀 Starting Help-Seeking scheduled tasks...');

  // 任務 1: 求助迴避風險偵測
  // 每 6 小時執行一次
  const avoidanceDetectionInterval = 6 * 60 * 60 * 1000; // 6 hours in ms
  
  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled avoidance risk detection (cross-session)...');
      const results = await helpSeekingAvoidanceService.detectAllActiveProjectsAvoidanceRisks();
      console.log('✅ Avoidance detection completed:', {
        projects: results.totalProjects,
        highRisk: results.highRisk,
        mediumRisk: results.mediumRisk
      });
    } catch (error) {
      console.error('❌ Scheduled avoidance detection failed:', error);
    }
  }, avoidanceDetectionInterval);

  // 首次執行（啟動後 5 分鐘）
  setTimeout(async () => {
    try {
      console.log('🔄 Initial avoidance risk detection (cross-session)...');
      await helpSeekingAvoidanceService.detectAllActiveProjectsAvoidanceRisks();
    } catch (error) {
      console.error('❌ Initial avoidance detection failed:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

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
  console.log('   - Avoidance detection (cross-session): every 6 hours');
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
  startHelpSeekingScheduledTasks,
  runAvoidanceDetectionNow,
  runEffectivenessCheckNow
};
