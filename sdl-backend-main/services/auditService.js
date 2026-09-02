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

// ===== 批次寫入緩衝（B3）=====
// 所有 audit row 先進 writeQueue，滿 AUDIT_BATCH_MAX_ROWS 筆或經過 AUDIT_BATCH_FLUSH_MS 就一次 bulkCreate。
// 任一參數設為 0（或 1 筆）即關閉批次，回到逐筆 create（供測試或除錯）。
const BATCH_MAX_ROWS = parseInt(process.env.AUDIT_BATCH_MAX_ROWS || '200', 10);
const BATCH_FLUSH_MS = parseInt(process.env.AUDIT_BATCH_FLUSH_MS || '2000', 10);
const batchingEnabled = Number.isFinite(BATCH_MAX_ROWS) && BATCH_MAX_ROWS > 1
  && Number.isFinite(BATCH_FLUSH_MS) && BATCH_FLUSH_MS > 0;

let writeQueue = [];
let flushTimer = null;
// 進行中的 flush，關機時要等它們完成
const inFlightFlushes = new Set();

function logAuditWriteError(message, err, extra) {
  // flush 失敗一定要留下痕跡，不可吞掉
  console.error(`[audit] ${message}`, err?.message || err, extra || '');
}

/**
 * 一次 bulkCreate；失敗時退回逐筆 create，讓單筆壞資料不會拖累整批
 * 欄位內容與原本 AuditEvent.create(row) 完全一致（同一個 row 物件，模型沒有 hook）
 */
async function writeRowsWithFallback(rows) {
  try {
    await AuditEvent.bulkCreate(rows);
    return;
  } catch (err) {
    logAuditWriteError(`批次寫入失敗（${rows.length} 筆），改逐筆重試:`, err);
  }
  for (const row of rows) {
    try {
      await AuditEvent.create(row);
    } catch (err) {
      logAuditWriteError('單筆寫入失敗，該筆遺失:', err, {
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        projectId: row.projectId,
      });
    }
  }
}

/**
 * 立刻把 writeQueue 寫進 DB；回傳的 promise 不會 reject
 */
function flushWriteQueue() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (writeQueue.length === 0) return Promise.resolve();

  const rows = writeQueue;
  writeQueue = [];
  const pending = writeRowsWithFallback(rows).finally(() => inFlightFlushes.delete(pending));
  inFlightFlushes.add(pending);
  return pending;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushWriteQueue();
  }, BATCH_FLUSH_MS);
  // 不讓 timer 阻止程序自然結束；beforeExit / SIGTERM 會補 flush
  if (typeof flushTimer.unref === 'function') flushTimer.unref();
}

/**
 * 把一筆 audit row 排進批次；批次關閉時等同直接 create
 */
function enqueueWrite(row) {
  if (!batchingEnabled) return AuditEvent.create(row);

  writeQueue.push(row);
  if (writeQueue.length >= BATCH_MAX_ROWS) return flushWriteQueue();
  scheduleFlush();
  return Promise.resolve();
}

// ===== 拖曳等連發動作的聚合緩衝（同一 actor/action/target 只留最後一筆）=====
const AGG_WINDOW_MS = parseInt(process.env.AUDIT_AGG_WINDOW_MS || '3000', 10);
const aggregateBuffer = new Map();

async function flushAggregate(key) {
  const item = aggregateBuffer.get(key);
  if (!item) return;
  aggregateBuffer.delete(key);
  clearTimeout(item.timer);
  // 最終寫入走批次緩衝（no recursion）
  await enqueueWrite(item.row);
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
    try { await flushAggregate(k); } catch (err) { logAuditWriteError('聚合緩衝 flush 失敗:', err, { key: k }); }
  }
}

/**
 * 關機或測試用：把聚合緩衝與批次緩衝全部寫進 DB，並等待進行中的 flush 結束
 */
async function flushAll() {
  await flushAllAggregates();
  await flushWriteQueue();
  await Promise.allSettled(Array.from(inFlightFlushes));
}

let shutdownHandlersInstalled = false;
function installAuditShutdownHooks() {
  if (shutdownHandlersInstalled) return;
  shutdownHandlersInstalled = true;
  const safeFlush = async () => {
    try { await flushAll(); } catch (err) { logAuditWriteError('關機 flush 失敗:', err); }
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
      await enqueueWrite(row);
    }
  } catch (err) {
    // don't disrupt primary flow
    try { req?.log?.error?.({ err }, 'audit write failed'); } catch (_) {}
  }
}

module.exports = {
  logAudit,
  safeDiff,
  summarizeText,
  clampMetadataSize,
  summarizeAttachment,
  installAuditShutdownHooks,
  flushAll,
  flushAuditWrites: flushWriteQueue,
};
