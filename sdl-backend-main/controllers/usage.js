const { QueryTypes } = require('sequelize');
const sequelize = require('../util/database');
const UsageSession = require('../models/usage_session');
const ObservationLog = require('../models/observation_log');
const User = require('../models/user');
const Project = require('../models/project');
const { Op } = require('sequelize');

// Helper to clamp session duration
const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
const envInt = (key, def) => {
  const v = process.env[key];
  const n = v != null ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

// Configuration constants
const MIN_SESSION_SEC = envInt('USAGE_MIN_SESSION_SEC', 10 * 60); // default 10m
const MAX_SESSION_SEC = envInt('USAGE_MAX_SESSION_SEC', 4 * 60 * 60); // default 4h
const MAX_ACTIVE_GAP_SEC = envInt('MAX_ACTIVE_GAP_SEC', 300); // default 5m
const HEARTBEAT_DEBOUNCE_SEC = envInt('HEARTBEAT_DEBOUNCE_SEC', 45); // default 45s

exports.startSession = async (req, res) => {
  try {
    const { projectId } = req.body;
    const userId = req.userId || req.user?.id;

    // P3: 明確驗證型別，區分 400（用戶端錯誤）與 500（伺服器錯誤）
    if (!userId) return res.status(401).json({ message: '未授權，請重新登入' });
    if (!projectId) return res.status(400).json({ message: '缺少 projectId' });

    const parsedProjectId = Number(projectId);
    if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
      return res.status(400).json({ message: 'projectId 格式不正確' });
    }

    // 先嘗試查找現有的未結束 session
    let session = await UsageSession.findOne({
      where: { userId, projectId: parsedProjectId, endedAt: null },
      attributes: ['id', 'startedAt', 'lastActiveAt', 'updatedAt']
    });
    
    const now = new Date();
    
    if (session) {
      // 更新現有 session 的 lastActiveAt
      session.lastActiveAt = now;
      await session.save();
      return res.json({ 
        sessionId: session.id, 
        startedAt: session.startedAt, 
        lastActiveAt: session.lastActiveAt 
      });
    }

    // 如果沒有現有 session，創建新的
    session = await UsageSession.create({
      userId,
      projectId: parsedProjectId,
      startedAt: now,
      lastActiveAt: now,
      endedAt: null,
      totalSeconds: 0,
    });

    return res.json({ 
      sessionId: session.id, 
      startedAt: session.startedAt, 
      lastActiveAt: session.lastActiveAt 
    });
  } catch (err) {
    console.error('startSession error:', err.message, { userId: req.userId, projectId: req.body?.projectId });
    res.status(500).json({ message: 'server error', detail: err.message });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { sessionId, projectId } = req.body;
    const userId = req.userId || req.user?.id;
    
    if (!sessionId || !userId || !projectId) return res.status(400).json({ message: '缺少參數' });
    
    const now = new Date();
    const debounceThreshold = new Date(now.getTime() - HEARTBEAT_DEBOUNCE_SEC * 1000);

    // 使用去抖更新：只在距上次更新超過 HEARTBEAT_DEBOUNCE_SEC 時才更新
    const [updatedRowsCount, updatedRows] = await UsageSession.update(
      { 
        lastActiveAt: now,
        updatedAt: now
      },
      {
        where: {
          id: sessionId,
          userId,
          projectId,
          endedAt: null,
          lastActiveAt: { [Op.lt]: debounceThreshold }
        },
        returning: true
      }
    );

    if (updatedRowsCount === 0) {
      // 檢查 session 是否存在但不需要更新（在去抖時間內）
      const session = await UsageSession.findOne({ 
        where: { id: sessionId, userId, projectId },
        attributes: ['id', 'endedAt', 'lastActiveAt']
      });
      
      if (!session) {
        return res.status(404).json({ message: 'session 不存在' });
      }
      
      if (session.endedAt) {
        return res.json({ ok: true, ended: true });
      }
      
      // Session exists but within debounce period - return existing lastActiveAt
      return res.json({ ok: true, lastActiveAt: session.lastActiveAt, debounced: true });
    }

    const updatedSession = updatedRows[0];
    res.json({ ok: true, lastActiveAt: updatedSession.lastActiveAt });
  } catch (err) {
    console.error('heartbeat error:', err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.stopSession = async (req, res) => {
  try {
    // 支持 JSON 和 FormData 格式（sendBeacon 使用 FormData）
    const sessionId = req.body.sessionId || req.body.get?.('sessionId');
    const projectId = req.body.projectId || req.body.get?.('projectId');
    const userId = req.userId || req.user?.id;
    
    if (!sessionId || !projectId) {
      return res.status(400).json({ message: '缺少 sessionId 或 projectId' });
    }

    // 如果沒有認證信息（sendBeacon 情況），嘗試通過 sessionId 找到對應的用戶
    let finalUserId = userId;
    if (!finalUserId) {
      const session = await UsageSession.findOne({ 
        where: { id: sessionId, endedAt: null },
        attributes: ['userId', 'projectId']
      });
      if (session && session.projectId == projectId) {
        finalUserId = session.userId;
        console.log(`Stop session via sendBeacon: sessionId=${sessionId}, userId=${finalUserId}`);
      }
    }
    
    if (!finalUserId) {
      return res.status(400).json({ message: '無法識別使用者' });
    }
    
    const session = await UsageSession.findOne({ 
      where: { id: sessionId, userId: finalUserId, projectId } 
    });
    
    if (!session) return res.status(404).json({ message: 'session 不存在' });
    if (session.endedAt) return res.json({ ok: true, ended: true, totalSeconds: session.totalSeconds });

    const now = new Date();
    const rawSeconds = Math.floor((now - session.startedAt) / 1000);
    const clampedSeconds = clamp(MIN_SESSION_SEC, MAX_SESSION_SEC, rawSeconds);
    
    session.totalSeconds = clampedSeconds;
    session.endedAt = now;
    session.lastActiveAt = now;
    await session.save();
    
    res.json({ ok: true, totalSeconds: session.totalSeconds });
  } catch (err) {
    console.error('stopSession error:', err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { projectId } = req.query;
    const userId = req.userId || req.user?.id;

    if (!userId || !projectId) return res.status(400).json({ message: '缺少 userId 或 projectId' });

    // B9：原本撈出該使用者在此專案的所有 session 在 JS 重算，改成一句 SQL 聚合。
    // 邏輯與原本完全相同：
    // - 已結束：totalSeconds，缺值時退回 endedAt - startedAt（不小於 0）
    // - 進行中：now - lastActiveAt，夾在 [0, MAX_ACTIVE_GAP_SEC]
    const [row] = await sequelize.query(
      `SELECT
         COUNT(*)::int AS "count",
         COUNT(*) FILTER (WHERE "endedAt" IS NOT NULL)::int AS "endedCount",
         COUNT(*) FILTER (WHERE "endedAt" IS NULL)::int AS "activeCount",
         COALESCE(SUM(CASE WHEN "endedAt" IS NOT NULL THEN
           COALESCE("totalSeconds", GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))))
         END), 0)::bigint AS "endedTotalSec",
         COALESCE(SUM(CASE WHEN "endedAt" IS NULL THEN
           LEAST(GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - "lastActiveAt")))), :maxGap)
         END), 0)::bigint AS "activeTotalSec"
       FROM usage_sessions
       WHERE "userId" = :userId AND "projectId" = :projectId`,
      {
        replacements: { userId, projectId, maxGap: MAX_ACTIVE_GAP_SEC },
        type: QueryTypes.SELECT,
      }
    );

    const endedTotalSec = Number(row?.endedTotalSec || 0);
    const activeTotalSec = Number(row?.activeTotalSec || 0);
    const count = Number(row?.count || 0);
    const totalSec = endedTotalSec + activeTotalSec;
    const averageSec = count > 0 ? Math.round(totalSec / count) : 0;

    res.json({
      totalSeconds: totalSec,
      sessionCount: count,
      averageSeconds: averageSec,
      activeSessions: Number(row?.activeCount || 0),
      endedSessions: Number(row?.endedCount || 0),
      debug: {
        endedTotalSec,
        activeTotalSec,
        maxActiveGapSec: MAX_ACTIVE_GAP_SEC
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ message: 'server error' });
  }
};

// Record a single observation click event
exports.recordObservationEvent = async (req, res) => {
  try {
    const { targetType, targetId, targetName, projectId } = req.body || {};
    if (!targetType || !targetId || !projectId) {
      return res.status(400).json({ message: '缺少必要參數: targetType/targetId/projectId' });
    }

    // User identity from AuthMiddleware
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: '未授權：缺少使用者資訊' });

    // Try to get username from token first, then DB fallback
    let username = req.user?.username;
    if (!username) {
      try {
        const u = await User.findByPk(userId, { attributes: ['username'] });
        username = u?.username || '';
      } catch (_) {
        username = '';
      }
    }

    // Resolve projectName (body override > DB > empty)
    let projectName = req.body?.projectName;
    if (!projectName && projectId) {
      try {
        const p = await Project.findByPk(projectId, { attributes: ['name'] });
        projectName = p?.name || null;
      } catch (_) {
        projectName = null;
      }
    }

    await ObservationLog.create({
      userId,
      username: username || String(userId),
      projectId,
      projectName,
      targetType,
      targetId: String(targetId),
      targetName: targetName || null,
    });

    // Respond quickly; do not block UI
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('recordObservationEvent error:', err);
    res.status(500).json({ message: 'server error' });
  }
};
