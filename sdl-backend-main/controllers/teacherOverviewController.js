const Project = require('../models/project');
const User = require('../models/user');
const Submit = require('../models/submit');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const { getProjectActivities } = require('../services/activityService');
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

    // 並行取得每個專案的附加資料
    const summaries = await Promise.all(projects.map(async (project) => {
      const p = project.toJSON();
      const projectId = p.id;
      const reached = getReachedSubStages(p.currentStage, p.currentSubStage);

      // 並行查詢三項資料
      const [submits, ideaWall, lastActivity] = await Promise.all([
        // 1. 提交記錄（只取必要欄位）
        Submit.findAll({
          where: { projectId },
          attributes: ['stage', 'userId', 'createdAt'],
          raw: true
        }),
        // 2. Idea Wall + node 數
        Idea_wall.findOne({
          where: { projectId },
          attributes: ['id'],
          include: [{
            model: Node,
            attributes: ['id', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 1
          }]
        }),
        // 3. Kanban 最後活動
        getProjectActivities(projectId, { limit: 1 }).catch(() => [])
      ]);

      // 計算提交狀態
      const submittedStages = [...new Set(
        filterStage5Data(submits).map(s => s.stage)
      )];
      const missing = reached.filter(s => !submittedStages.includes(s));

      // Idea Wall 統計
      let nodeCount = 0;
      let lastNodeAt = null;
      if (ideaWall) {
        nodeCount = await Node.count({ where: { ideaWallId: ideaWall.id } });
        if (ideaWall.nodes && ideaWall.nodes.length > 0) {
          lastNodeAt = ideaWall.nodes[0].createdAt;
        }
      }

      // Kanban 最後活動
      const kanbanLastActivity = lastActivity.length > 0
        ? lastActivity[0].createdAt || lastActivity[0].updatedAt
        : null;

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
          lastActivityAt: kanbanLastActivity
        },
        ideaWall: {
          nodeCount,
          lastNodeAt
        }
      };
    }));

    res.json({ projects: summaries });
  } catch (error) {
    console.error('❌ 教師總覽摘要取得失敗:', error);
    res.status(500).json({ message: '伺服器錯誤', error: error.message });
  }
};
