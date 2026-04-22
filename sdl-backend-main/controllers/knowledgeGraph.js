const { Op } = require('sequelize');
const Project = require('../models/project');
const User = require('../models/user');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const NodeRelation = require('../models/node_relation');
const AuditEvent = require('../models/audit_event');

const DEFAULT_EVENT_LIMIT = 2000;

/**
 * 白名單：只有這些欄位能從 audit_events.metadata 回傳給前端。
 * 為避免意外把敏感欄位（例如 AI prompt 全文、reset token、email、hash）暴露給同專案成員，
 * 這裡採「明確列舉」策略；有新需求時明確加進來。
 */
const SAFE_METADATA_KEYS = new Set([
  // 通用統計
  'linkCount', 'queryCount', 'latencyMs', 'success',
  'attachmentCount', 'messageCount',
  // 想法牆 / 節點
  'wallId', 'ideaWallId', 'colorindex', 'relationType',
  // 看板
  'fromColumnId', 'toColumnId', 'fromStage', 'toStage',
  // 階段
  'stage', 'subStage',
  // 其他輕量統計
  'size', 'length', 'count',
]);

const pickSafeMetadata = (md) => {
  if (!md || typeof md !== 'object') return null;
  const out = {};
  let touched = false;
  for (const k of SAFE_METADATA_KEYS) {
    if (k in md) {
      out[k] = md[k];
      touched = true;
    }
  }
  return touched ? out : null;
};

/**
 * 要從「知識圖譜」視圖中排除的 actor role
 * admin 操作不屬於學生學習軌跡，無論如何不該進入同專案成員的瀏覽器。
 */
const EXCLUDED_ACTOR_ROLES = new Set(['admin']);

const getProjectGraphData = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId) {
      return res.status(400).json({ message: '缺少 projectId' });
    }

    const { start, end, limit } = req.query;
    const eventLimit = Math.min(parseInt(limit, 10) || DEFAULT_EVENT_LIMIT, 5000);

    const project = await Project.findByPk(projectId, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'role', 'class', 'seatNumber'],
        through: { attributes: [] },
      }],
    });
    if (!project) {
      return res.status(404).json({ message: '專案不存在' });
    }

    const walls = await Idea_wall.findAll({
      where: { projectId },
      attributes: ['id', 'name', 'type', 'stage'],
    });
    const wallIds = walls.map(w => w.id);

    const nodes = wallIds.length
      ? await Node.findAll({
          where: { ideaWallId: { [Op.in]: wallIds } },
          attributes: ['id', 'title', 'content', 'owner', 'colorindex', 'ideaWallId', 'createdAt', 'updatedAt'],
          order: [['createdAt', 'ASC']],
        })
      : [];
    const nodeIds = nodes.map(n => n.id);

    const relations = nodeIds.length
      ? await NodeRelation.findAll({
          where: {
            [Op.and]: [
              { from_id: { [Op.in]: nodeIds } },
              { to_id: { [Op.in]: nodeIds } },
            ],
          },
          attributes: ['from_id', 'to_id', 'createdAt'],
        })
      : [];

    const eventWhere = { projectId };
    if (start || end) {
      eventWhere.timestamp = {};
      if (start) eventWhere.timestamp[Op.gte] = new Date(start);
      if (end) eventWhere.timestamp[Op.lte] = new Date(end);
    }
    const rawEvents = await AuditEvent.findAll({
      where: eventWhere,
      attributes: ['id', 'timestamp', 'actorId', 'actorRole', 'actorName',
                   'action', 'targetType', 'targetId', 'source', 'metadata'],
      order: [['timestamp', 'DESC']],
      limit: eventLimit,
    });

    const membersMap = new Map();
    for (const u of (project.users || [])) {
      membersMap.set(u.id, {
        id: u.id,
        username: u.username,
        role: u.role,
        class: u.class,
        seatNumber: u.seatNumber,
      });
    }
    // 補 mentor：mentorId 不一定會在 user_projects 裡
    // 這裡容忍 DB 錯誤（例如 mentor user 已被刪），但要 log 出來，別靜默吞。
    if (project.mentorId && !membersMap.has(project.mentorId)) {
      try {
        const mentorUser = await User.findByPk(project.mentorId, {
          attributes: ['id', 'username', 'role', 'class', 'seatNumber'],
        });
        if (mentorUser) {
          membersMap.set(mentorUser.id, {
            id: mentorUser.id,
            username: mentorUser.username,
            role: mentorUser.role || 'teacher',
            class: mentorUser.class,
            seatNumber: mentorUser.seatNumber,
          });
        } else {
          console.warn(`[knowledgeGraph] mentor not found: project=${projectId} mentorId=${project.mentorId}`);
        }
      } catch (err) {
        console.warn(`[knowledgeGraph] mentor fetch failed: project=${projectId} mentorId=${project.mentorId}`, err?.message || err);
      }
    }
    const members = [...membersMap.values()];

    return res.json({
      project: {
        id: project.id,
        name: project.name,
        describe: project.describe,
        semester: project.semester,
        currentStage: project.currentStage,
        currentSubStage: project.currentSubStage,
      },
      members,
      walls,
      nodes: nodes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        owner: n.owner,
        wallId: n.ideaWallId,
        colorindex: n.colorindex,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      relations: relations.map(r => ({ from: r.from_id, to: r.to_id, createdAt: r.createdAt })),
      events: rawEvents
        .filter(e => !EXCLUDED_ACTOR_ROLES.has(e.actorRole))
        .map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          actorId: e.actorId,
          actorRole: e.actorRole,
          actorName: e.actorName,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId,
          source: e.source,
          metadata: pickSafeMetadata(e.metadata),
        })),
    });
  } catch (err) {
    console.error('getProjectGraphData error:', err);
    return res.status(500).json({ message: '載入知識圖譜資料失敗' });
  }
};

module.exports = {
  getProjectGraphData,
};
