const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { validateToken } = require('../middlewares/AuthMiddleware');

const { clampMetadataSize } = require('../services/auditService');
const { Op } = require('sequelize');
const AuditEvent = require('../models/audit_event');
const User = require('../models/user');
const UserProject = require('../models/user_project');
const Project = require('../models/project');
const { ACTION_CLASSIFICATION, CONSENT_LEVELS, classifyAction } = require('../constants/retentionPolicy');

// ===== 客戶端事件淨化（2026-09-05 資安審查：稽核紀錄可被任意登入者偽造）=====
// 原則：身分（actorId / actorRole / actorName）、IP、UA、requestId 一律取自伺服器端的 req，
// 客戶端只能描述「發生了什麼」。時間戳保留客戶端值（學習分析需要事件之間的真實間隔），
// 但夾在合理窗口內，超出就改用伺服器時間並標記；metadata 一律附上 receivedAt 供事後比對。
// projectId 只接受 actor 實際能存取的專案；action 由客戶端決定，所以不得歸入永久保留等級。
const MAX_ACTION_LENGTH = 128;
const MAX_TARGET_TYPE_LENGTH = 64;
const MAX_TARGET_ID_LENGTH = 128;
const MAX_CLIENT_ID_LENGTH = 64;
const MAX_METADATA_BYTES = 10 * 1024;
const TIMESTAMP_PAST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;   // 背景分頁的佇列可能延後很久才 flush
const TIMESTAMP_FUTURE_WINDOW_MS = 5 * 60 * 1000;           // 容許客戶端時鐘誤差

// 每位使用者每分鐘最多 120 次：前端 TrackingProvider 每 5 秒 flush 一次、滿 20 筆立即送，正常用量遠低於此。
// 以 userId 計數而非 IP：整間教室共用同一個 NAT IP，按 IP 會誤傷（與 loginLimiter 的 per-account 同理）。
const clientAuditLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => (req.userId ? `audit:user:${req.userId}` : `audit:ip:${ipKeyGenerator(req.ip)}`),
  message: { error: 'Too many audit requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

function cleanString(value, maxLength) {
  if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

// projectId 欄位是 BIGINT：非正整數會讓整批 bulkCreate 失敗，這裡直接丟掉不合法的值。
// 只收字串／數字：Number(true) === 1、Number([]) === 0，boolean / 陣列一律視為沒有值。
function cleanProjectId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (value === '') return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
}

// clampMetadataSize 超過上限時是「整包換成 { truncated: true }」而不是截斷；
// 學習分析至少要保住 url / timestamp / projectId 三個欄位，其餘才丟。
function cleanMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clamped = clampMetadataSize(value, MAX_METADATA_BYTES);
  if (clamped === value) return value;
  const { url, timestamp, projectId } = value;
  return {
    truncated: true,
    ...(typeof url === 'string' ? { url: url.slice(0, 512) } : {}),
    ...(typeof timestamp === 'string' ? { timestamp: timestamp.slice(0, 64) } : {}),
    ...(projectId !== undefined ? { projectId: cleanProjectId(projectId) } : {}),
  };
}

function resolveTimestamp(clientTs, now) {
  if (clientTs === null || clientTs === undefined) return { timestamp: now, clientTsRejected: false };
  const parsed = new Date(typeof clientTs === 'number' ? clientTs : String(clientTs));
  const ms = parsed.getTime();
  if (!Number.isFinite(ms)
    || ms < now.getTime() - TIMESTAMP_PAST_WINDOW_MS
    || ms > now.getTime() + TIMESTAMP_FUTURE_WINDOW_MS) {
    return { timestamp: now, clientTsRejected: true };
  }
  return { timestamp: parsed, clientTsRejected: false };
}

/**
 * 客戶端來源的事件不得歸入 essential（永久保留）：action 完全由 client 決定，
 * 否則任何登入者都能灌入永不清除的列。essential 一律降為 functional（保留 1 年），其餘照原分類。
 */
function classifyClientAction(action) {
  const level = classifyAction(action);
  const consentLevel = level === CONSENT_LEVELS.ESSENTIAL ? CONSENT_LEVELS.FUNCTIONAL : level;
  const retentionDays = ACTION_CLASSIFICATION[consentLevel]?.retentionDays;
  if (retentionDays === null || retentionDays === undefined) {
    // functional 以上的等級都有天數；這裡只是防禦，萬一政策表改了也不會變成永久
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 365);
    return { consentLevel, expiresAt: fallback };
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return { consentLevel, expiresAt };
}

/**
 * 只回傳客戶端可控且已淨化的欄位；身分欄位由呼叫端從 req 補上。
 * 沒有 action 回傳 null。
 */
function sanitizeClientEvent(event, now = new Date()) {
  if (!event || typeof event !== 'object') return null;
  const action = cleanString(event.action, MAX_ACTION_LENGTH);
  if (!action) return null;

  const { timestamp, clientTsRejected } = resolveTimestamp(event._ts, now);
  const clientId = cleanString(event._clientId, MAX_CLIENT_ID_LENGTH);
  const metadata = {
    ...cleanMetadata(event.metadata),
    ...(clientId ? { _clientId: clientId } : {}),   // 客戶端去重用
    receivedAt: now.toISOString(),
    ...(clientTsRejected ? { clientTsRejected: true } : {}),
  };

  return {
    action,
    targetType: cleanString(event.targetType, MAX_TARGET_TYPE_LENGTH) || 'client',
    targetId: cleanString(event.targetId, MAX_TARGET_ID_LENGTH),
    projectId: cleanProjectId(event.projectId),
    timestamp,
    metadata,
  };
}

/**
 * 回傳 actor 實際能存取的專案 id 集合（字串）。最多兩次查詢，不隨事件數成長。
 * 規則與 middlewares/projectAccess.js 一致：專案成員或指導教師；admin／teacher 目前對所有專案放行（收斂見 future-list F021）。
 */
async function resolveAllowedProjectIds(userId, requestedIds) {
  const ids = [...new Set((requestedIds || []).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (!user) return new Set();
  if (user.role === 'admin' || user.role === 'teacher') return new Set(ids);

  const [memberships, mentored] = await Promise.all([
    UserProject.findAll({ where: { userId: user.id, projectId: { [Op.in]: ids } }, attributes: ['projectId'], raw: true }),
    Project.findAll({ where: { id: { [Op.in]: ids }, mentorId: user.id }, attributes: ['id'], raw: true }),
  ]);
  return new Set([
    ...memberships.map((m) => String(m.projectId)),
    ...mentored.map((p) => String(p.id)),
  ]);
}

/**
 * 把一批客戶端事件轉成 audit_events 的列：淨化 → 專案歸屬過濾 → 伺服器端注入身分與來源。
 * 回傳 { records, skipped }。
 */
async function buildClientRecords(req, events, now = new Date()) {
  const cleanedEvents = events.map((event) => sanitizeClientEvent(event, now));
  const allowedProjects = await resolveAllowedProjectIds(
    req.userId,
    cleanedEvents.filter(Boolean).map((cleaned) => cleaned.projectId),
  );

  const actorId = req.userId;
  const actorRole = req.user?.role || null;
  const actorName = req.user?.username || req.user?.name || null;
  const requestId = req.id || req.requestId || null;
  const ip = (req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || '').toString();
  const userAgent = req.headers?.['user-agent'] || null;

  let skipped = 0;
  const records = [];
  for (const cleaned of cleanedEvents) {
    if (!cleaned) {
      skipped += 1;
      continue;
    }
    const projectAllowed = cleaned.projectId !== null && allowedProjects.has(cleaned.projectId);
    const projectId = projectAllowed ? cleaned.projectId : null;
    // 掛不到專案的事件仍保留，但在 metadata 留下原值供鑑識
    const metadata = (cleaned.projectId !== null && !projectAllowed)
      ? { ...cleaned.metadata, projectIdRejected: cleaned.projectId }
      : cleaned.metadata;
    const { consentLevel, expiresAt } = classifyClientAction(cleaned.action);

    records.push({
      timestamp: cleaned.timestamp,
      actorId,
      actorRole,
      actorName,
      action: cleaned.action,
      targetType: cleaned.targetType,
      targetId: cleaned.targetId,
      projectId,
      requestId,
      ip,
      userAgent,
      source: 'client',
      metadata,
      // Phase 6: 保留政策（客戶端事件不得永久保留）
      consentLevel,
      expiresAt,
    });
  }
  return { records, skipped };
}

// Client-side audit ingestion（單筆；與 /batch 走同一條淨化與寫入路徑）
router.post('/client', validateToken, clientAuditLimiter, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !cleanString(req.body.action, MAX_ACTION_LENGTH)) {
      return res.status(400).json({ message: 'action is required' });
    }
    const { records } = await buildClientRecords(req, [req.body]);
    if (records.length > 0) {
      await AuditEvent.bulkCreate(records);
    }
    res.json({ ok: true });
  } catch (err) {
    req?.log?.error?.({ err }, 'client audit failed');
    res.status(500).json({ message: 'client audit failed' });
  }
});

// Batch audit ingestion (Phase 0 implementation)
router.post('/batch', validateToken, clientAuditLimiter, async (req, res) => {
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

    const { records, skipped } = await buildClientRecords(req, events);
    if (skipped > 0) {
      req?.log?.warn?.({ skipped }, 'Skipping events without action');
    }

    // 批量寫入資料庫
    if (records.length > 0) {
      await AuditEvent.bulkCreate(records);
      req?.log?.info?.({ count: records.length }, 'Batch audit events created');
    }

    res.json({
      ok: true,
      count: records.length,
      skipped
    });
  } catch (err) {
    req?.log?.error?.({ err }, 'batch audit failed');
    res.status(500).json({
      error: 'Batch audit failed',
      message: 'batch audit failed'
    });
  }
});

// Query audit events (teacher/admin: unrestricted, student: own records only)
router.get('/events', validateToken, async (req, res) => {
  try {
    const { action, targetType, targetId, projectId, source, actorId, limit = 20, offset = 0, before, after } = req.query;

    // 權限判斷：學生只能查詢自己的 audit 紀錄
    const user = await User.findByPk(req.userId);
    const isPrivileged = !!user && (user.role === 'teacher' || user.role === 'admin');

    const where = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = String(targetId);
    if (projectId) where.projectId = projectId;
    if (source) where.source = source;

    if (isPrivileged) {
      // 教師／admin 可自由指定 actorId 過濾
      if (actorId) where.actorId = actorId;
    } else {
      // 學生強制限制為自己的紀錄
      where.actorId = String(req.userId);
    }

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
// 供測試直接驗證淨化與歸屬邏輯
module.exports.sanitizeClientEvent = sanitizeClientEvent;
module.exports.classifyClientAction = classifyClientAction;
module.exports.resolveAllowedProjectIds = resolveAllowedProjectIds;
module.exports.buildClientRecords = buildClientRecords;
