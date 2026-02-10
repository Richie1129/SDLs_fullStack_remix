const express = require('express');
const router = express.Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const UserConsent = require('../models/user_consent');
const AuditEvent = require('../models/audit_event');
const { logAudit } = require('../services/auditService');
const { purgeExpiredEvents, getExpiredStats, getRetentionStats } = require('../services/auditPurgeService');
const { CONSENT_LEVELS, CONSENT_LEVEL_VALUES } = require('../constants/retentionPolicy');
const { Op } = require('sequelize');

// ========== 使用者同意管理 ==========

/**
 * GET /api/consent - 查詢當前使用者的同意等級
 */
router.get('/', validateToken, async (req, res) => {
  try {
    const consent = await UserConsent.findOne({
      where: { userId: req.userId },
    });

    if (!consent) {
      // 學習平台預設全同意 - 尚未設定時回傳 full
      return res.json({
        consentLevel: CONSENT_LEVELS.FULL,
        consentedAt: null,
        isDefault: true,
      });
    }

    res.json({
      consentLevel: consent.consentLevel,
      consentedAt: consent.consentedAt,
      revokedAt: consent.revokedAt,
      isDefault: false,
    });
  } catch (error) {
    console.error('❌ 查詢同意等級失敗:', error);
    res.status(500).json({ error: '查詢失敗', message: error.message });
  }
});

/**
 * PUT /api/consent - 更新同意等級
 * Body: { consentLevel: 'essential' | 'functional' | 'analytics' | 'full' }
 */
router.put('/', validateToken, async (req, res) => {
  try {
    const { consentLevel } = req.body;

    // 驗證同意等級
    if (!consentLevel || !(consentLevel in CONSENT_LEVEL_VALUES)) {
      return res.status(400).json({
        error: '無效的同意等級',
        message: `允許的值: ${Object.keys(CONSENT_LEVEL_VALUES).join(', ')}`,
      });
    }

    const ip = (req.ip || req.headers?.['x-forwarded-for'] || '').toString();

    const [consent, created] = await UserConsent.upsert({
      userId: req.userId,
      consentLevel,
      consentedAt: new Date(),
      revokedAt: null,
      ipAtConsent: ip,
    });

    // 記錄審計
    await logAudit(req, {
      action: 'CONSENT_UPDATE',
      targetType: 'user_consent',
      targetId: String(req.userId),
      source: 'server',
      metadata: {
        previousLevel: created ? null : consent.consentLevel,
        newLevel: consentLevel,
      },
    });

    res.json({
      ok: true,
      consentLevel,
      consentedAt: consent.consentedAt || new Date(),
    });
  } catch (error) {
    console.error('❌ 更新同意等級失敗:', error);
    res.status(500).json({ error: '更新失敗', message: error.message });
  }
});

/**
 * DELETE /api/consent - 撤銷同意（降為 essential）
 */
router.delete('/', validateToken, async (req, res) => {
  try {
    const consent = await UserConsent.findOne({
      where: { userId: req.userId },
    });

    if (!consent) {
      return res.json({ ok: true, message: '尚未設定同意，無需撤銷' });
    }

    const previousLevel = consent.consentLevel;

    await consent.update({
      consentLevel: CONSENT_LEVELS.ESSENTIAL,
      revokedAt: new Date(),
    });

    // 記錄審計
    await logAudit(req, {
      action: 'CONSENT_REVOKE',
      targetType: 'user_consent',
      targetId: String(req.userId),
      source: 'server',
      metadata: { previousLevel },
    });

    res.json({
      ok: true,
      consentLevel: CONSENT_LEVELS.ESSENTIAL,
      revokedAt: new Date(),
    });
  } catch (error) {
    console.error('❌ 撤銷同意失敗:', error);
    res.status(500).json({ error: '撤銷失敗', message: error.message });
  }
});

// ========== 被遺忘權 (Right to be Forgotten) ==========

/**
 * DELETE /api/consent/my-data - 匿名化使用者的所有審計資料
 * 將 actorId, actorName, ip 置為 null
 */
router.delete('/my-data', validateToken, async (req, res) => {
  try {
    const [affectedRows] = await AuditEvent.update(
      {
        actorId: null,
        actorName: null,
        ip: null,
        userAgent: null,
        metadata: null,
      },
      {
        where: { actorId: req.userId },
      }
    );

    // 記錄匿名化行為（此紀錄本身不含個人資料）
    await logAudit(req, {
      action: 'DATA_ANONYMIZE',
      targetType: 'audit_event',
      targetId: null,
      source: 'server',
      metadata: { anonymizedCount: affectedRows },
    });

    // 同時撤銷同意
    await UserConsent.update(
      { consentLevel: CONSENT_LEVELS.ESSENTIAL, revokedAt: new Date() },
      { where: { userId: req.userId } }
    );

    res.json({
      ok: true,
      anonymizedCount: affectedRows,
      message: `已匿名化 ${affectedRows} 筆追蹤資料`,
    });
  } catch (error) {
    console.error('❌ 資料匿名化失敗:', error);
    res.status(500).json({ error: '匿名化失敗', message: error.message });
  }
});

// ========== 管理員：保留政策管理 ==========

/**
 * GET /api/consent/admin/stats - 取得保留政策統計
 * (需要 teacher/admin 角色)
 */
router.get('/admin/stats', validateToken, async (req, res) => {
  try {
    // 簡單角色檢查
    if (!['teacher', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: '權限不足' });
    }

    const [expired, retention] = await Promise.all([
      getExpiredStats(),
      getRetentionStats(),
    ]);

    res.json({ expired, retention });
  } catch (error) {
    console.error('❌ 取得統計失敗:', error);
    res.status(500).json({ error: '查詢失敗', message: error.message });
  }
});

/**
 * POST /api/consent/admin/purge - 手動觸發過期資料清理
 * (需要 teacher/admin 角色)
 */
router.post('/admin/purge', validateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: '權限不足' });
    }

    const result = await purgeExpiredEvents();

    // 記錄審計
    await logAudit(req, {
      action: 'AUDIT_PURGE_MANUAL',
      targetType: 'audit_event',
      source: 'system',
      metadata: result,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 手動清理失敗:', error);
    res.status(500).json({ error: '清理失敗', message: error.message });
  }
});

module.exports = router;
