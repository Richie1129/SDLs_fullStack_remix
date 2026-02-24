const express = require('express');
const router = express.Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkTeacherRole } = require('../middlewares/projectViewingMiddleware');
const { logAudit } = require('../services/auditService');
const { Op } = require('sequelize');
const AuditEvent = require('../models/audit_event');
const { classifyAction, calculateExpiresAt } = require('../constants/retentionPolicy');

// Client-side audit ingestion
router.post('/client', validateToken, async (req, res) => {
  try {
    const { action, targetType = 'client', targetId = null, projectId = null, metadata = {} } = req.body || {};
    if (!action) return res.status(400).json({ message: 'action is required' });
    await logAudit(req, { action, targetType, targetId, projectId, source: 'client', metadata });
    res.json({ ok: true });
  } catch (err) {
    req?.log?.error?.({ err }, 'client audit failed');
    res.status(500).json({ message: 'client audit failed' });
  }
});

// Batch audit ingestion (Phase 0 implementation)
router.post('/batch', validateToken, async (req, res) => {
  try {
    const { events } = req.body || {};
    
    // 驗證輸入
    if (!Array.isArray(events)) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'events must be an array' 
      });
    }
    
    // 限制批量大小 (最多 100 個/請求)
    if (events.length === 0) {
      return res.json({ ok: true, count: 0 });
    }
    
    if (events.length > 100) {
      return res.status(400).json({ 
        error: 'Batch too large', 
        message: 'Maximum 100 events per batch' 
      });
    }
    
    // 準備批量記錄 (自動注入認證資訊)
    const now = new Date();

    const records = events.map(event => {
      const { 
        action, 
        targetType = 'client', 
        targetId = null, 
        projectId = null, 
        metadata = {},
        userId = null,
        _ts = null,
        _clientId = null
      } = event;
      
      // 基本驗證
      if (!action) {
        req?.log?.warn?.({ event }, 'Skipping event without action');
        return null;
      }

      return {
        timestamp: _ts ? new Date(_ts) : now,
        actorId: req.userId,
        actorRole: req.user?.role || null,
        actorName: req.user?.username || req.user?.name || null,
        action,
        targetType,
        targetId: targetId != null ? String(targetId) : null,
        projectId: projectId != null ? String(projectId) : null,
        requestId: req.id || req.requestId || null,
        ip: (req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || '').toString(),
        userAgent: req.headers?.['user-agent'] || null,
        source: 'client',
        metadata: {
          ...metadata,
          _clientId, // 用於客戶端去重
        },
        // Phase 6: 保留政策
        consentLevel: classifyAction(action),
        expiresAt: calculateExpiresAt(action),
      };
    }).filter(Boolean); // 過濾掉無效記錄
    
    // 批量寫入資料庫
    if (records.length > 0) {
      await AuditEvent.bulkCreate(records);
      req?.log?.info?.({ count: records.length }, 'Batch audit events created');
    }
    
    res.json({ 
      ok: true, 
      count: records.length,
      skipped: events.length - records.length 
    });
  } catch (err) {
    req?.log?.error?.({ err }, 'batch audit failed');
    res.status(500).json({ 
      error: 'Batch audit failed', 
      message: err.message 
    });
  }
});

// Query audit events (teacher/admin only)
router.get('/events', validateToken, checkTeacherRole, async (req, res) => {
  try {
    const { action, targetType, targetId, projectId, source, actorId, limit = 20, offset = 0, before, after } = req.query;
    const where = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = String(targetId);
    if (projectId) where.projectId = projectId;
    if (source) where.source = source;
    if (actorId) where.actorId = actorId;
    if (before || after) {
      where.timestamp = {};
      if (after) where.timestamp[Op.gte] = new Date(after);
      if (before) where.timestamp[Op.lte] = new Date(before);
    }
    const items = await AuditEvent.findAll({ where, order: [['timestamp', 'DESC']], limit: Math.min(parseInt(limit, 10) || 20, 100), offset: parseInt(offset, 10) || 0 });
    res.json({ items });
  } catch (err) {
    req?.log?.error?.({ err }, 'audit query failed');
    res.status(500).json({ message: 'audit query failed' });
  }
});

module.exports = router;
