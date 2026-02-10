/**
 * auditPurgeService - 審計事件自動清理排程
 * 
 * 功能:
 * - 定期刪除已過期的審計事件 (expiresAt < NOW())
 * - 可配置清理間隔和批量大小
 * - 提供手動清理 API
 * - 清理統計和日誌
 */

const { Op } = require('sequelize');
const AuditEvent = require('../models/audit_event');

// 配置
const PURGE_INTERVAL_MS = parseInt(process.env.AUDIT_PURGE_INTERVAL_MS || '3600000', 10); // 預設每小時
const PURGE_BATCH_SIZE = parseInt(process.env.AUDIT_PURGE_BATCH_SIZE || '1000', 10);       // 每批刪除上限

let purgeTimer = null;
let isRunning = false;

/**
 * 執行一次清理
 * @returns {{ deleted: number, duration: number }} 清理結果
 */
async function purgeExpiredEvents() {
  if (isRunning) {
    console.log('⏳ [AuditPurge] 上一次清理尚未完成，跳過');
    return { deleted: 0, duration: 0, skipped: true };
  }

  isRunning = true;
  const start = Date.now();
  let totalDeleted = 0;

  try {
    // 分批刪除，避免長事務鎖定
    let deletedInBatch;
    do {
      deletedInBatch = await AuditEvent.destroy({
        where: {
          expiresAt: {
            [Op.ne]: null,
            [Op.lt]: new Date(),
          },
        },
        limit: PURGE_BATCH_SIZE,
      });
      totalDeleted += deletedInBatch;
    } while (deletedInBatch >= PURGE_BATCH_SIZE);

    const duration = Date.now() - start;

    if (totalDeleted > 0) {
      console.log(`🧹 [AuditPurge] 清理完成: 刪除 ${totalDeleted} 筆過期資料 (${duration}ms)`);
    }

    return { deleted: totalDeleted, duration };
  } catch (error) {
    console.error('❌ [AuditPurge] 清理失敗:', error.message);
    return { deleted: totalDeleted, duration: Date.now() - start, error: error.message };
  } finally {
    isRunning = false;
  }
}

/**
 * 取得過期統計 (不刪除)
 * @returns {{ expiredCount: number, oldestExpired: Date|null }}
 */
async function getExpiredStats() {
  try {
    const expiredCount = await AuditEvent.count({
      where: {
        expiresAt: {
          [Op.ne]: null,
          [Op.lt]: new Date(),
        },
      },
    });

    const oldest = await AuditEvent.findOne({
      where: {
        expiresAt: {
          [Op.ne]: null,
          [Op.lt]: new Date(),
        },
      },
      order: [['expiresAt', 'ASC']],
      attributes: ['expiresAt'],
    });

    return {
      expiredCount,
      oldestExpired: oldest?.expiresAt || null,
    };
  } catch (error) {
    return { expiredCount: 0, oldestExpired: null, error: error.message };
  }
}

/**
 * 取得保留政策統計
 * @returns {Object} 各同意等級的事件數量分佈
 */
async function getRetentionStats() {
  try {
    const total = await AuditEvent.count();

    const byLevel = await AuditEvent.findAll({
      attributes: [
        'consentLevel',
        [require('sequelize').fn('COUNT', '*'), 'count'],
      ],
      group: ['consentLevel'],
      raw: true,
    });

    const permanent = await AuditEvent.count({
      where: { expiresAt: null },
    });

    const willExpire = await AuditEvent.count({
      where: {
        expiresAt: { [Op.ne]: null },
      },
    });

    return {
      total,
      permanent,
      willExpire,
      byLevel: byLevel.reduce((acc, row) => {
        acc[row.consentLevel || 'unknown'] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  } catch (error) {
    return { total: 0, error: error.message };
  }
}

/**
 * 啟動自動清理排程
 */
function startPurgeSchedule() {
  if (purgeTimer) {
    console.warn('⚠️ [AuditPurge] 排程已經在執行');
    return;
  }

  console.log(`🕐 [AuditPurge] 啟動自動清理排程 (間隔: ${PURGE_INTERVAL_MS / 1000}s)`);

  // 啟動時立即執行一次清理
  setTimeout(() => purgeExpiredEvents(), 10000); // 延遲 10 秒避免啟動衝突

  // 定時清理
  purgeTimer = setInterval(purgeExpiredEvents, PURGE_INTERVAL_MS);
}

/**
 * 停止自動清理排程
 */
function stopPurgeSchedule() {
  if (purgeTimer) {
    clearInterval(purgeTimer);
    purgeTimer = null;
    console.log('🛑 [AuditPurge] 自動清理排程已停止');
  }
}

module.exports = {
  purgeExpiredEvents,
  getExpiredStats,
  getRetentionStats,
  startPurgeSchedule,
  stopPurgeSchedule,
};
