const AuditEvent = require('../models/audit_event');
const crypto = require('crypto');
const { classifyAction, calculateExpiresAt } = require('../constants/retentionPolicy');

// Optional dependency; if not installed, fall back to simple diff
let jsondiffpatch = null;
try { jsondiffpatch = require('jsondiffpatch'); } catch (_) {}

function safeDiff(before, after) {
  try {
    if (jsondiffpatch) return jsondiffpatch.diff(before, after);
    // naive fallback
    const changed = {};
    const keys = new Set([...(Object.keys(before || {})), ...(Object.keys(after || {}))]);
    for (const k of keys) {
      if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) changed[k] = { before: before?.[k], after: after?.[k] };
    }
    return changed;
  } catch (e) {
    return { error: 'diff_failed' };
  }
}

// ===== Noise reduction & helpers =====
function summarizeText(str) {
  if (typeof str !== 'string') return null;
  const hash = crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  const slice = (s, n) => [...s].slice(0, n).join(''); // UTF-8 safe
  const len = [...str].length;
  const head = slice(str, 100);
  const tail = slice(str, 100).length < 100 ? '' : slice([...str].slice(Math.max(0, len - 100)).join(''), 100);
  const preview = tail ? `${head}…${tail}` : head;
  return { textHash: hash, textPreview: preview, length: len };
}

function summarizeAttachment(file) {
  if (!file) return null;
  return {
    name: file.name || file.fileName || file.originalName || null,
    size: file.size || file.fileSize || null,
    mimeType: file.mimeType || file.type || null,
  };
}

function clampMetadataSize(obj, limit = 10 * 1024) {
  try {
    const str = JSON.stringify(obj || {});
    if (Buffer.byteLength(str, 'utf8') <= limit) return obj;
  } catch (_) {}
  return { truncated: true };
}

// In-memory aggregation buffer for bursty actions (e.g., drag reorder)
const AGG_WINDOW_MS = parseInt(process.env.AUDIT_AGG_WINDOW_MS || '3000', 10);
const aggregateBuffer = new Map();

async function flushAggregate(key) {
  const item = aggregateBuffer.get(key);
  if (!item) return;
  aggregateBuffer.delete(key);
  // perform final write (no recursion)
  await AuditEvent.create(item.row);
}

function enqueueAggregate(row) {
  const key = `${row.actorId || 'na'}|${row.action}|${row.targetType}|${row.targetId || 'na'}`;
  const existing = aggregateBuffer.get(key);
  if (existing) {
    existing.row = row; // keep latest
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushAggregate(key), AGG_WINDOW_MS);
  } else {
    const timer = setTimeout(() => flushAggregate(key), AGG_WINDOW_MS);
    aggregateBuffer.set(key, { row, timer });
  }
}

async function flushAllAggregates() {
  const keys = Array.from(aggregateBuffer.keys());
  for (const k of keys) {
    try { await flushAggregate(k); } catch (_) {}
  }
}

let shutdownHandlersInstalled = false;
function installAuditShutdownHooks() {
  if (shutdownHandlersInstalled) return;
  shutdownHandlersInstalled = true;
  const safeFlush = async () => {
    try { await flushAllAggregates(); } catch (_) {}
  };
  try { process.on('SIGTERM', safeFlush); } catch (_) {}
  try { process.on('SIGINT', safeFlush); } catch (_) {}
  try { process.on('beforeExit', safeFlush); } catch (_) {}
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const clone = JSON.parse(JSON.stringify(metadata));
  // summarize known long text fields if present
  const longKeys = ['content', 'description', 'body'];
  for (const k of longKeys) {
    if (typeof clone[k] === 'string') clone[k] = summarizeText(clone[k]);
  }
  // summarize attachments arrays if found
  if (Array.isArray(clone.attachments)) clone.attachments = clone.attachments.map(summarizeAttachment).filter(Boolean);
  if (Array.isArray(clone.files)) clone.files = clone.files.map(summarizeAttachment).filter(Boolean);
  if (Array.isArray(clone.images)) clone.images = clone.images.map(summarizeAttachment).filter(Boolean);
  return clampMetadataSize(clone);
}

async function logAudit(req, payload) {
  const now = new Date();
  try {
    const {
      actorId = req?.userId || null,
      actorRole = req?.user?.role || null,
      action,
      targetType,
      targetId = null,
      projectId = null,
      source: src = 'server',
      metadata = null,
    } = payload || {};

    const requestId = req?.id || req?.requestId || null;
    const ip = (req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '').toString();
    const userAgent = req?.headers?.['user-agent'] || null;

    const source = (payload?.source === 'system') ? 'system' : src;
    // Resolve actorName (username)
    let actorName = payload?.actorName ?? req?.user?.username ?? req?.user?.name ?? null;
    if (!actorName && actorId) {
      try {
        const User = require('../models/user');
        const u = await User.findByPk(actorId);
        actorName = u?.username || u?.name || null;
      } catch (_) {}
    }
    const meta = sanitizeMetadata(metadata);

    const row = {
      timestamp: now,
      actorId,
      actorRole,
      actorName,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      projectId,
      requestId,
      ip,
      userAgent,
      source,
      metadata: meta,
      // Phase 6: 自動設定保留政策
      consentLevel: classifyAction(action),
      expiresAt: calculateExpiresAt(action),
    };

    // Drag reorder aggregation: coalesce bursty updates
    const shouldAggregate = action && action.includes('TASK_UPDATE');
    if (shouldAggregate && AGG_WINDOW_MS > 0) {
      enqueueAggregate(row);
    } else {
      await AuditEvent.create(row);
    }
  } catch (err) {
    // don't disrupt primary flow
    try { req?.log?.error?.({ err }, 'audit write failed'); } catch (_) {}
  }
}

module.exports = { logAudit, safeDiff, summarizeText, clampMetadataSize, summarizeAttachment, installAuditShutdownHooks };
