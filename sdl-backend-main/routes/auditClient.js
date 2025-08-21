const express = require('express');
const router = express.Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { logAudit } = require('../services/auditService');
const { Op } = require('sequelize');

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

// Query audit events (admin/teacher scope assumed)
router.get('/events', validateToken, async (req, res) => {
  try {
    const { action, targetType, targetId, projectId, source, actorId, limit = 20, offset = 0, before, after } = req.query;
    const AuditEvent = require('../models/audit_event');
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
