const Project = require('../models/project');
const User = require('../models/user');
const Submit = require('../models/submit');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const { getProjectsLastActivityAt } = require('../services/activityService');
const { Op } = require('sequelize');
const { filterStage5Data, FOUR_STAGE_CONFIG } = require('../services/fourStageFilterService');
const { getTaiwanSemester } = require('../utils/semesterUtils');

/**
 * 計算專案已到達的子階段列表（不含當前正在進行的）
 * 例如 currentStage=2, currentSubStage=2 → ["1-1","1-2","1-3","2-1"]
 */
function getReachedSubStages(currentStage, currentSubStage) {
  const reached = [];
  for (let s = 1; s <= currentStage; s++) {
    const maxSub = s < currentStage ? FOUR_STAGE_CONFIG.SUB_STAGE_MAX : currentSubStage - 1;
    for (let sub = 1; sub <= maxSub; sub++) {
      reached.push(`${s}-${sub}`);
    }
  }
  return reached;
}

/**
 * GET /api/teacher/overview/projects-summary?semester=
 * 一次回傳教師所有專案的狀態摘要
 */
exports.getProjectsSummary = async (req, res) => {
  try {
    const username = req.user.username;
    const semester = req.query.semester || 'all';

    // 查詢教師身份
    const mentorUser = await User.findOne({
      where: { username },
      attributes: ['id']
    });
    if (!mentorUser) {
      return res.status(404).json({ message: '找不到教師帳號' });
    }

    // 查詢所有專案
    const whereClause = { mentorId: mentorUser.id };
    if (semester !== 'all') {
      whereClause.semester = semester;
    }

    const projects = await Project.findAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'class'],
        through: { attributes: [] }
      }],
      order: [['createdAt', 'DESC']]
    });

    // B10：原本每個專案並行 3 支查詢加 getProjectActivities（本身 4 支），20 個專案就是 140 個並行查詢。
    // 改成跨專案一次聚合：submits 一次、idea_walls 一次、nodes GROUP BY 一次、最後活動 4 次，共 7 支查詢。
    const projectIds = projects.map(p => p.id);

    const [allSubmits, ideaWalls, lastActivityMap] = projectIds.length === 0
      ? [[], [], new Map()]
      : await Promise.all([
        Submit.findAll({
          where: { projectId: { [Op.in]: projectIds } },
          attributes: ['projectId', 'stage', 'userId', 'createdAt'],
          raw: true
        }),
        Idea_wall.findAll({
          where: { projectId: { [Op.in]: projectIds } },
          attributes: ['id', 'projectId'],
          raw: true
        }),
        getProjectsLastActivityAt(projectIds).catch(() => new Map())
      ]);

    // 每個專案只取第一面 idea wall（與原本 findOne 行為一致）
    const ideaWallByProject = new Map();
    for (const wall of ideaWalls) {
      if (!ideaWallByProject.has(wall.projectId)) ideaWallByProject.set(wall.projectId, wall);
    }

    const wallIds = [...ideaWallByProject.values()].map(w => w.id);
    const nodeStatsByWall = new Map();
    if (wallIds.length > 0) {
      const nodeRows = await Node.findAll({
        attributes: [
          'ideaWallId',
          [Node.sequelize.fn('COUNT', Node.sequelize.col('id')), 'nodeCount'],
          [Node.sequelize.fn('MAX', Node.sequelize.col('createdAt')), 'lastNodeAt']
        ],
        where: { ideaWallId: { [Op.in]: wallIds } },
        group: ['ideaWallId'],
        raw: true
      });
      for (const row of nodeRows) {
        nodeStatsByWall.set(row.ideaWallId, {
          nodeCount: parseInt(row.nodeCount, 10) || 0,
          lastNodeAt: row.lastNodeAt || null
        });
      }
    }

    const submitsByProject = new Map();
    for (const submit of allSubmits) {
      const list = submitsByProject.get(submit.projectId);
      if (list) list.push(submit); else submitsByProject.set(submit.projectId, [submit]);
    }

    const summaries = projects.map((project) => {
      const p = project.toJSON();
      const projectId = p.id;
      const reached = getReachedSubStages(p.currentStage, p.currentSubStage);

      // 計算提交狀態
      const submits = submitsByProject.get(projectId) || [];
      const submittedStages = [...new Set(
        filterStage5Data(submits).map(s => s.stage)
      )];
      const missing = reached.filter(s => !submittedStages.includes(s));

      // Idea Wall 統計
      const wall = ideaWallByProject.get(projectId);
      const nodeStats = wall ? (nodeStatsByWall.get(wall.id) || { nodeCount: 0, lastNodeAt: null }) : { nodeCount: 0, lastNodeAt: null };

      // Kanban 最後活動
      const lastActivityAt = lastActivityMap.get(projectId) || null;

      return {
        id: projectId,
        name: p.name,
        describe: p.describe,
        semester: p.semester,
        currentStage: p.currentStage,
        currentSubStage: p.currentSubStage,
        projectEnd: p.ProjectEnd || false,
        members: (p.users || []).map(u => ({
          id: u.id,
          username: u.username,
          class: u.class || null
        })),
        submitStatus: {
          reached,
          submitted: submittedStages.filter(s => reached.includes(s)),
          missing
        },
        kanban: {
          lastActivityAt
        },
        ideaWall: {
          nodeCount: nodeStats.nodeCount,
          lastNodeAt: nodeStats.lastNodeAt
        }
      };
    });

    res.json({ projects: summaries });
  } catch (error) {
    console.error('❌ 教師總覽摘要取得失敗:', error);
    res.status(500).json({ message: '伺服器錯誤', error: error.message });
  }
};
