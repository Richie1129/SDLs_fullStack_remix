const UsageSession = require('../models/usage_session');

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
