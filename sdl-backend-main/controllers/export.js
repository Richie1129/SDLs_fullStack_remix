/**
 * 學習歷程匯出控制器
 *
 * 提供專案資料匯出功能，用於生成備審資料
 */

const Project = require('../models/project');
const User = require('../models/user');
const Submit = require('../models/submit');
const Daily_personal = require('../models/daily_personal');
const Daily_team = require('../models/daily_team');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const NodeRelation = require('../models/node_relation');
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Process = require('../models/process');
const Stage = require('../models/stage');
const Sub_stage = require('../models/sub_stage');

const {
  formatStageName,
  parse5RsContent,
  formatDate,
  formatDateTime,
  groupSubmitsByStage,
  calculateStatistics,
  safeJSONParse,
  truncateText
} = require('../utils/dataFormatter');

/**
 * 獲取專案完整資料（用於匯出）
 * GET /api/projects/:projectId/export-data
 */
exports.getExportData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // 來自 validateToken 中介軟體

    console.log(`📊 開始查詢專案 ${projectId} 的匯出資料（使用者：${userId}）`);

    // 查詢專案的 process、stages 和 sub_stages
    const process = await Process.findOne({
      where: { projectId },
      attributes: ['stage']
    });

    let stageNames = {};
    let subStageMap = {}; // stage -> sub_stage 對應表

    if (process && process.stage) {
      const stages = await Stage.findAll({
        where: { id: process.stage },
        attributes: ['id', 'name', 'sub_stage'],
        order: [['id', 'ASC']]
      });

      // 建立階段名稱對應表和子階段ID對應表
      stages.forEach((stage, index) => {
        const stageIndex = index + 1; // 1-based index
        stageNames[stageIndex] = stage.name;
        subStageMap[stageIndex] = stage.sub_stage || [];
      });

      // 查詢所有子階段並建立對應表
      const allSubStageIds = stages.flatMap(stage => stage.sub_stage || []);
      const subStageNames = {};

      if (allSubStageIds.length > 0) {
        const subStages = await Sub_stage.findAll({
          where: { id: allSubStageIds },
          attributes: ['id', 'name', 'stageId']
        });

        subStages.forEach(subStage => {
          subStageNames[subStage.id] = subStage.name;
        });
      }

      console.log(`📊 Stage Names:`, stageNames);
      console.log(`📊 SubStage Map:`, subStageMap);
      console.log(`📊 SubStage Names:`, subStageNames);

      // 將子階段資訊傳遞給格式化函數
      stageNames._subStageMap = subStageMap;
      stageNames._subStageNames = subStageNames;
    }

    // 一次性查詢所有資料（避免 N+1 問題）
    const project = await Project.findByPk(projectId, {
      include: [
        // 專案成員
        {
          model: User,
          through: { attributes: [] }, // 不需要中間表的欄位
          attributes: ['id', 'username', 'account', 'class', 'seatNumber', 'role']
        },
        // 五階段提交
        {
          model: Submit,
          as: 'submits',
          attributes: ['id', 'stage', 'content', 'fileName', 'originalName', 'fileUrl', 'mimeType', 'fileSize', 'createdAt'],
          separate: true, // 使用獨立查詢以支援排序
          order: [['createdAt', 'ASC']]
        },
        // 個人反思
        {
          model: Daily_personal,
          as: 'daily_personals',
          attributes: ['id', 'title', 'content', 'fileName', 'originalName', 'fileUrl', 'createdAt', 'userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'account']
            }
          ],
          separate: true, // 使用獨立查詢以支援排序和限制
          order: [['createdAt', 'DESC']],
          limit: 50 // 限制最多 50 筆，避免資料過大
        },
        // 團隊反思
        {
          model: Daily_team,
          as: 'daily_teams',
          attributes: ['id', 'title', 'content', 'creator', 'fileName', 'originalName', 'fileUrl', 'createdAt', 'userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'account']
            }
          ],
          separate: true, // 使用獨立查詢以支援排序和限制
          order: [['createdAt', 'DESC']],
          limit: 30 // 限制最多 30 筆
        },
        // 想法牆
        {
          model: Idea_wall,
          as: 'idea_walls',
          attributes: ['id', 'name', 'type', 'stage'],
          include: [
            {
              model: Node,
              as: 'nodes',
              attributes: ['id', 'title', 'content', 'owner', 'colorindex'],
              include: [
                {
                  model: Node,
                  as: 'successors',
                  through: { attributes: [] },
                  attributes: ['id', 'title']
                },
                {
                  model: Node,
                  as: 'predecessors',
                  through: { attributes: [] },
                  attributes: ['id', 'title']
                }
              ]
            }
          ]
        },
        // 看板系統
        {
          model: Kanban,
          as: 'kanban',
          attributes: ['id', 'column'],
          include: [
            {
              model: Column,
              as: 'columns',
              attributes: ['id', 'name'],
              include: [
                {
                  model: Task,
                  as: 'tasks',
                  attributes: ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'createdAt']
                }
              ]
            }
          ]
        }
      ]
    });

    // 檢查專案是否存在
    if (!project) {
      console.log(`❌ 專案 ${projectId} 不存在`);
      return res.status(404).json({
        error: 'PROJECT_NOT_FOUND',
        message: '專案不存在'
      });
    }

    console.log(`✅ 成功查詢專案資料`);

    // 格式化資料
    const exportData = formatExportData(project, userId, stageNames);

    res.status(200).json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('❌ 查詢匯出資料失敗:', error);
    res.status(500).json({
      error: 'QUERY_FAILED',
      message: '查詢資料失敗',
      details: error.message
    });
  }
};

/**
 * 格式化匯出資料
 * @param {object} project - Sequelize 專案物件
 * @param {number} userId - 當前使用者 ID
 * @param {object} stageNames - 階段名稱對應表 (從資料庫查詢)
 * @returns {object} - 格式化後的匯出資料
 */
function formatExportData(project, userId, stageNames = {}) {
  // 基本資訊
  const basicInfo = {
    id: project.id,
    name: project.name,
    description: project.describe || '',
    mentor: project.mentor || '',
    currentStage: project.currentStage,
    currentSubStage: project.currentSubStage,
    createdAt: formatDate(project.createdAt),
    exportedAt: formatDateTime(new Date()),
    exportedBy: userId
  };

  // 當前階段資訊
  const currentStageInfo = formatStageName(
    `${project.currentStage}-${project.currentSubStage || 1}`
  );

  // 專案成員
  const members = (project.users || []).map(user => ({
    id: user.id,
    username: user.username,
    account: user.account,
    class: user.class || '',
    seatNumber: user.seatNumber || '',
    role: user.role
  }));

  // 格式化五階段提交
  const submitsRaw = project.submits || [];
  const subStageMap = stageNames._subStageMap || {};
  const subStageNames = stageNames._subStageNames || {};

  console.log(`📊 Submits Raw Data - Count: ${submitsRaw.length}`);
  if (submitsRaw.length > 0) {
    console.log(`📊 First submit example:`, {
      id: submitsRaw[0].id,
      stage: submitsRaw[0].stage,
      content: submitsRaw[0].content,
      createdAt: submitsRaw[0].createdAt
    });
  }

  const submitsFormatted = submitsRaw.map(submit => {
    // 解析 stage 格式 "1-1", "2-3" 等
    const stageParts = submit.stage ? submit.stage.split('-') : [null, null];
    const stageNumber = stageParts[0] ? parseInt(stageParts[0]) : null;
    const subStageNumber = stageParts[1] ? parseInt(stageParts[1]) : null;

    // 取得大階段名稱
    const mainStageName = stageNumber && stageNames[stageNumber]
      ? stageNames[stageNumber]
      : '未知階段';

    // 取得子階段名稱
    let subStageName = submit.stage || '未知';
    if (stageNumber && subStageNumber && subStageMap[stageNumber]) {
      const subStageId = subStageMap[stageNumber][subStageNumber - 1]; // 0-based array
      if (subStageId && subStageNames[subStageId]) {
        subStageName = `${submit.stage} ${subStageNames[subStageId]}`;
      }
    }

    // 解析內容或處理檔案
    const parsedContent = safeJSONParse(submit.content);
    const hasContent = parsedContent && Object.keys(parsedContent).length > 0;
    const hasFile = submit.fileName && submit.fileName.trim() !== '';

    return {
      id: submit.id,
      stage: submit.stage,
      stageNumber: stageNumber,
      mainStageName: mainStageName,
      subStageName: subStageName,
      content: parsedContent,
      hasContent: hasContent,
      hasFile: hasFile,
      fileName: submit.fileName,
      originalName: submit.originalName,
      fileUrl: submit.fileUrl,
      mimeType: submit.mimeType,
      fileSize: submit.fileSize,
      createdAt: formatDateTime(submit.createdAt),
      createdAtShort: formatDate(submit.createdAt)
    };
  });

  // 按階段分組 - 使用格式化後的資料
  const submitsByStage = groupSubmitsByStage(submitsFormatted);
  console.log(`📊 Submits Formatted - Count: ${submitsFormatted.length}`);
  console.log(`📊 Submits By Stage:`, Object.keys(submitsByStage).map(k => `${k}: ${submitsByStage[k].length} items`));

  // 格式化個人反思
  const personalReflections = (project.daily_personals || []).map(daily => {
    const parsed5Rs = parse5RsContent(daily.content);

    return {
      id: daily.id,
      title: daily.title,
      content: daily.content,
      is5Rs: parsed5Rs.is5Rs,
      data5Rs: parsed5Rs.data || null,
      textContent: parsed5Rs.text || '',
      fileName: daily.fileName,
      originalName: daily.originalName,
      fileUrl: daily.fileUrl,
      createdAt: formatDateTime(daily.createdAt),
      createdAtShort: formatDate(daily.createdAt),
      author: daily.user ? {
        id: daily.user.id,
        username: daily.user.username,
        account: daily.user.account
      } : null
    };
  });

  // 格式化團隊反思
  const teamReflections = (project.daily_teams || []).map(daily => {
    const parsed5Rs = parse5RsContent(daily.content);

    return {
      id: daily.id,
      title: daily.title,
      content: daily.content,
      is5Rs: parsed5Rs.is5Rs,
      data5Rs: parsed5Rs.data || null,
      textContent: parsed5Rs.text || '',
      creator: daily.creator,
      fileName: daily.fileName,
      originalName: daily.originalName,
      fileUrl: daily.fileUrl,
      createdAt: formatDateTime(daily.createdAt),
      createdAtShort: formatDate(daily.createdAt),
      author: daily.user ? {
        id: daily.user.id,
        username: daily.user.username,
        account: daily.user.account
      } : null
    };
  });

  // 格式化想法牆
  const ideaWalls = (project.idea_walls || []).map(ideaWall => {
    const nodes = (ideaWall.nodes || []).map(node => ({
      id: node.id,
      title: node.title,
      content: node.content,
      owner: node.owner,
      colorindex: node.colorindex,
      successors: (node.successors || []).map(s => ({ id: s.id, title: s.title })),
      predecessors: (node.predecessors || []).map(p => ({ id: p.id, title: p.title }))
    }));

    return {
      id: ideaWall.id,
      name: ideaWall.name,
      type: ideaWall.type,
      stage: ideaWall.stage,
      stageName: ideaWall.stage ? formatStageName(ideaWall.stage).displayName : 'N/A',
      nodes,
      totalNodes: nodes.length
    };
  });

  // 格式化看板
  let kanbanData = null;
  if (project.kanban) {
    const columns = (project.kanban.columns || []).map(column => {
      const tasks = (column.tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        content: task.content,
        labels: safeJSONParse(task.labels) || task.labels || [],
        owner: task.owner,
        assignees: safeJSONParse(task.assignees) || task.assignees || [],
        createdAt: formatDateTime(task.createdAt),
        createdAtShort: formatDate(task.createdAt)
      }));

      return {
        id: column.id,
        name: column.name,
        tasks,
        taskCount: tasks.length
      };
    });

    kanbanData = {
      id: project.kanban.id,
      columns,
      totalColumns: columns.length
    };
  }

  // 計算統計資料
  const statistics = calculateStatistics({
    submits: submitsRaw,
    daily_personals: project.daily_personals || [],
    daily_teams: project.daily_teams || [],
    idea_walls: project.idea_walls || [],
    kanban: project.kanban,
    currentStage: project.currentStage,
    currentSubStage: project.currentSubStage
  });

  // 組合最終資料
  return {
    basicInfo,
    currentStageInfo,
    members,
    submits: {
      all: submitsFormatted,
      byStage: submitsByStage,
      total: submitsFormatted.length
    },
    reflections: {
      personal: personalReflections,
      team: teamReflections,
      totalPersonal: personalReflections.length,
      totalTeam: teamReflections.length
    },
    ideaWalls: {
      all: ideaWalls,
      total: ideaWalls.length,
      totalNodes: ideaWalls.reduce((sum, iw) => sum + iw.totalNodes, 0)
    },
    kanban: kanbanData,
    statistics,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      exportType: 'learning_portfolio'
    }
  };
}
