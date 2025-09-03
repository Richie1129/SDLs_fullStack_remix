const UsageSession = require('../models/usage_session');
const ObservationLog = require('../models/observation_log');
const User = require('../models/user');
const Project = require('../models/project');

// Helper to clamp session duration
const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
const envInt = (key, def) => {
  const v = process.env[key];
  const n = v != null ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

exports.startSession = async (req, res) => {
  try {
    const { userId, projectId } = req.body;
    if (!userId || !projectId) return res.status(400).json({ message: '缺少 userId 或 projectId' });

    // 查找未結束的 session
    let session = await UsageSession.findOne({ where: { userId, projectId, endedAt: null } });
    const now = new Date();
    if (session) {
      session.lastActiveAt = now;
      await session.save();
      return res.json({ sessionId: session.id, startedAt: session.startedAt, lastActiveAt: session.lastActiveAt });
    }

    session = await UsageSession.create({
      userId,
      projectId,
      startedAt: now,
      lastActiveAt: now,
      endedAt: null,
      totalSeconds: 0,
    });
    return res.json({ sessionId: session.id, startedAt: session.startedAt, lastActiveAt: session.lastActiveAt });
  } catch (err) {
    console.error('startSession error:', err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { sessionId, userId, projectId } = req.body;
    if (!sessionId || !userId || !projectId) return res.status(400).json({ message: '缺少參數' });
    const session = await UsageSession.findOne({ where: { id: sessionId, userId, projectId } });
    if (!session) return res.status(404).json({ message: 'session 不存在' });
    if (session.endedAt) return res.json({ ok: true, ended: true });

    const now = new Date();
    // 更新最近活躍時間
    session.lastActiveAt = now;
    await session.save();
    res.json({ ok: true, lastActiveAt: session.lastActiveAt });
  } catch (err) {
    console.error('heartbeat error:', err);
    res.status(500).json({ message: 'server error' });
  }
};

exports.stopSession = async (req, res) => {
  try {
    const { sessionId, userId, projectId } = req.body;
    if (!sessionId || !userId || !projectId) return res.status(400).json({ message: '缺少參數' });
    const session = await UsageSession.findOne({ where: { id: sessionId, userId, projectId } });
    if (!session) return res.status(404).json({ message: 'session 不存在' });
    if (session.endedAt) return res.json({ ok: true, ended: true });

    const now = new Date();
    const rawSeconds = Math.floor((now - session.startedAt) / 1000);
    // 夾限每場最小/最大時長（與前端估算一致，可日後改環境變數）
    const MIN_SESSION_SEC = envInt('USAGE_MIN_SESSION_SEC', 10 * 60); // default 10m
    const MAX_SESSION_SEC = envInt('USAGE_MAX_SESSION_SEC', 4 * 60 * 60); // default 4h
    session.totalSeconds = clamp(MIN_SESSION_SEC, MAX_SESSION_SEC, rawSeconds);
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
    const { userId, projectId } = req.query;
    if (!userId || !projectId) return res.status(400).json({ message: '缺少 userId 或 projectId' });
    const sessions = await UsageSession.findAll({ where: { userId, projectId } });
    const now = new Date();
    let totalSec = 0;
    let count = 0;
    sessions.forEach(s => {
      if (s.endedAt) {
        totalSec += s.totalSeconds || Math.max(0, Math.floor((s.endedAt - s.startedAt) / 1000));
        count += 1;
      } else {
        // 進行中的場次以目前時間近似
        const raw = Math.floor((now - s.startedAt) / 1000);
        totalSec += raw;
        count += 1;
      }
    });
    const averageSec = count > 0 ? Math.round(totalSec / count) : 0;
    res.json({ totalSeconds: totalSec, sessionCount: count, averageSeconds: averageSec });
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
    return res.json({ ok: true });
  } catch (err) {
    console.error('recordObservationEvent error:', err);
    res.status(500).json({ message: 'server error' });
  }
};
