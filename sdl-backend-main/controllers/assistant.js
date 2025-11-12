const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

const Project = require("../models/project");
const User = require("../models/user");
const UserProject = require("../models/user_project");
const Kanban = require("../models/kanban");
const Column = require("../models/column");
const Task = require("../models/task");
const Submit = require("../models/submit");
const TaskChangeLog = require("../models/task_change_log");
const Idea_wall = require("../models/idea_wall");
const Node = require("../models/node");
const Chatroom_message = require("../models/chatroom_message");
const Process = require("../models/process");
const Stage = require("../models/stage");
const Sub_stage = require("../models/sub_stage");
const ChatTurn = require("../models/chat_turn");

const { callGPTAPI } = require("../services/gpt");
const { callGeminiAPI, callGeminiGrounding } = require("../services/gemini");
const { streamOpenAIResponse, streamGeminiResponse } = require("../services/streamingService");
const { streamGeminiResponseStructured } = require("../services/structuredStreamingService");
const ASSISTANT_CONFIG = require("../config/assistant");
// v2.0 新版建構器（推薦，性能提升 ~40%）
// 已完全遷移至 PromptBuilder，移除舊函數導入（舊函數仍保留在 assistantPrompts.js 以保持向後相容）
const { PromptBuilder } = require("../config/assistantPrompts");

/**
 * 估算 Token 數量
 * 簡化演算法：中文約 1.5-2 字元 = 1 token，英文約 4 字元 = 1 token
 * @param {string} text - 要估算的文字
 * @returns {number} 估算的 token 數
 */
function estimateTokenCount(text) {
  if (!text) return 0;

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;

  // 中文：1.5 字元 ≈ 1 token，英文：4 字元 ≈ 1 token
  const estimatedTokens = Math.ceil(chineseChars / 1.5 + otherChars / 4);

  return estimatedTokens;
}

/**
 * ProjectContext 快取系統
 * Linus 原則：簡單的資料結構，消除重複計算
 *
 * 快取策略：
 * - TTL: 5 分鐘（連續對話期間不重複查詢）
 * - Key: projectId
 * - 自動清理過期條目
 */
const projectContextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

/**
 * 取得 ProjectContext（帶快取）
 *
 * @param {number} projectId - 專案 ID
 * @param {Object} projectData - 專案基本資料（含使用者資訊）
 * @param {boolean} forceRefresh - 強制重新查詢（預設 false）
 * @returns {Promise<Object>} projectContext
 */
async function getProjectContext(projectId, projectData, forceRefresh = false) {
  const cacheKey = `project_${projectId}`;
  const now = Date.now();

  // 快取命中且未過期
  if (!forceRefresh) {
    const cached = projectContextCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`🚀 [Cache Hit] ProjectContext 從快取載入 (${projectId})`);
      return cached.data;
    }
  }

  // 快取未命中或強制刷新，重新查詢資料庫
  console.log(`📊 [Cache Miss] 開始撈取 ProjectContext (${projectId})`);

  const [stageMeta, stageStructure, stageCompletion, kanban, ideaWall, submissions] = await Promise.all([
    getStageMeta(projectData.project),
    getCompleteStageStructure(projectId),
    getStageCompletionStatus(projectId, projectData.project.currentStage, projectData.project.currentSubStage),
    getKanbanSnapshot(projectId),
    getIdeaWallSnapshot(projectId),
    getSubmissions(projectId),
  ]);

  // 組裝 projectContext
  const projectContext = {
    專案名稱: projectData.project.name,
    專案描述: projectData.project.describe || '無描述',
    當前階段: `${projectData.project.currentStage || '未設定'}/${projectData.project.currentSubStage || '未設定'}`,

    階段要求: {
      hasData: !!stageMeta,
      階段名稱: stageMeta?.stageName || null,
      子階段名稱: stageMeta?.meta.name || null,
      子階段說明: stageMeta?.meta.description || null,
      需填寫欄位: stageMeta?.meta.requiredFields || []
    },

    完整階段結構: {
      hasData: !!stageStructure && stageStructure.length > 0,
      總階段數: stageStructure?.length || 0,
      所有階段: stageStructure || [],
      當前階段ID: projectData.project.currentStage,
      當前子階段ID: projectData.project.currentSubStage
    },

    階段完成狀態: stageCompletion || {
      hasData: false,
      message: "無階段完成資料"
    },

    看板狀況: {
      hasData: kanban.length > 0,
      總欄位數: kanban.length,
      總任務數: kanban.reduce((sum, col) => sum + col.tasks.length, 0),
      欄位詳情: kanban.map(col => ({
        欄位名稱: col.name,
        任務數量: col.tasks.length,
        任務列表: col.tasks.slice(0, ASSISTANT_CONFIG.PROMPT_KANBAN_TASKS_LIMIT).map(t => ({
          標題: t.title,
          內容: t.content ? t.content.substring(0, ASSISTANT_CONFIG.PROMPT_TASK_CONTENT_LIMIT) : '',
          負責人: t.assignees?.map(a => a.username).join(', ') || '未指派',
          標籤: t.labels?.join(', ') || '無',
        }))
      }))
    },

    想法牆: {
      hasData: ideaWall.total > 0,
      總節點數: ideaWall.total,
      想法列表: ideaWall.nodes.slice(0, ASSISTANT_CONFIG.PROMPT_IDEA_NODES_LIMIT).map(n => ({
        標題: n.title,
        內容: n.content ? n.content.substring(0, ASSISTANT_CONFIG.PROMPT_IDEA_CONTENT_LIMIT) : '',
        作者: n.owner,
        建立時間: n.createdAt,
      }))
    },

    最近提交記錄: {
      hasData: submissions.length > 0,
      總數: submissions.length,
      記錄列表: submissions.slice(0, ASSISTANT_CONFIG.PROMPT_SUBMISSIONS_LIMIT).map(s => ({
        階段: s.stage,
        內容摘要: typeof s.content === 'string'
          ? s.content.substring(0, ASSISTANT_CONFIG.PROMPT_SUBMIT_CONTENT_LIMIT)
          : JSON.stringify(s.content).substring(0, ASSISTANT_CONFIG.PROMPT_SUBMIT_CONTENT_LIMIT),
        提交時間: s.createdAt,
      }))
    },
  };

  // 存入快取
  projectContextCache.set(cacheKey, {
    data: projectContext,
    timestamp: now
  });

  console.log(`✅ [Cache Store] ProjectContext 已快取 (${projectId})`);

  // 定期清理過期快取（簡單策略：當快取超過 100 個時觸發清理）
  if (projectContextCache.size > 100) {
    cleanExpiredCache();
  }

  return projectContext;
}

/**
 * 清理過期的快取條目
 * Linus 原則：簡單實用，不過度設計
 */
function cleanExpiredCache() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of projectContextCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      projectContextCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 [Cache Clean] 清理 ${cleaned} 個過期快取條目`);
  }
}

/**
 * 手動清除特定專案的快取（供外部更新事件使用）
 * 例如：當看板、想法牆有變更時，呼叫此函數清除快取
 *
 * @param {number} projectId - 專案 ID
 */
function invalidateProjectCache(projectId) {
  const cacheKey = `project_${projectId}`;
  const deleted = projectContextCache.delete(cacheKey);
  if (deleted) {
    console.log(`🗑️ [Cache Invalidate] 已清除 ProjectContext 快取 (${projectId})`);
  }
}

// 匯出快取管理函數（供其他 controller 使用）
module.exports.invalidateProjectCache = invalidateProjectCache;

/**
 * 整合專案內容供 LLM 分析使用
 * GET /projects/:projectId/content
 */
// exports.getProjectContent = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ error: 'User authentication required' });
//     }

//     const projectData = await getProjectBasicsAndUserRole(projectId, userId);
//     if (!projectData) {
//       return res.status(404).json({ error: 'Project not found or access denied' });
//     }

//     // 2. 獲取階段和子階段資訊
//     const stageMeta = await getStageMeta(projectData.project);

//     // 3. 獲取看板快照
//     const kanbanSnapshot = await getKanbanSnapshot(projectId);

//     // 4. 獲取想法牆快照
//     const ideaWallSnapshot = await getIdeaWallSnapshot(projectId);

//     // 5. 獲取提交歷程
//     const submissions = await getSubmissions(projectId);

//     // 6. 獲取對話歷史
//     const chatHistory = await getChatHistory(projectId);

//     const activitySummary = await getActivitySummary(projectId);

//     const derived = await generateDerivedSummaries({
//       kanban: kanbanSnapshot,
//       ideaWall: ideaWallSnapshot,
//       submissions,
//       stageMeta
//     });

//     const response = {
//       projectBasics: {
//         id: projectData.project.id,
//         name: projectData.project.name,
//         description: projectData.project.describe,
//         currentStage: projectData.project.currentStage,
//         currentSubStage: projectData.project.currentSubStage
//       },
//       user: projectData.user,
//       stageMeta,
//       kanbanSnapshot,
//       ideaWallSnapshot,
//       submissions,
//       chatHistory,
//       activitySummary,
//       derived
//     };

//     res.status(200).json(response);

//   } catch (error) {
//     console.error('Error in getProjectContent:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

async function getProjectBasicsAndUserRole(projectId, userId) {
  const project = await Project.findByPk(projectId, {
    include: [
      {
        model: User,
        through: { attributes: [] },
        attributes: ["id", "username", "role"],
      },
    ],
  });

  if (!project) return null;

  const user = await User.findByPk(userId, {
    attributes: ["id", "username", "role"],
  });

  if (!user) return null;

  return {
    project,
    user: {
      id: user.id,
      username: user.username,
      roles: user.role,  
    },
  };
}

async function getStageMeta(project) {
  if (!project.currentStage || !project.currentSubStage) {
    return null;
  }

  const stage = await Stage.findByPk(project.currentStage, {
    include: [
      {
        model: Sub_stage,
        where: { id: project.currentSubStage },
        required: true,
      },
    ],
  });

  if (!stage || !stage.sub_stages || stage.sub_stages.length === 0) {
    return null;
  }

  const subStage = stage.sub_stages[0];

  return {
    stageNumber: stage.id,
    subStageNumber: subStage.id,
    stageName: stage.name,
    meta: {
      name: subStage.name,
      description: subStage.description,
      requiredFields: subStage.userSubmit || [],
    },
  };
}

/**
 * 取得完整階段結構（所有階段和子階段）
 *
 * Linus 設計哲學：
 * - 資料結構優先：讓 AI 能看到完整專案流程
 * - 簡單實用：一次查詢取得所有資料
 * - 消除特殊情況：所有階段使用相同格式
 *
 * @param {number} projectId - 專案 ID
 * @returns {Promise<Object|null>} 完整階段結構或 null
 */
async function getCompleteStageStructure(projectId) {
  try {
    // 查詢專案的 Process，包含所有 Stage 和 Sub_stage
    const process = await Process.findOne({
      where: { projectId },
      include: [
        {
          model: Stage,
          include: [
            {
              model: Sub_stage,
              attributes: ['id', 'name', 'description', 'userSubmit'],
            },
          ],
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!process || !process.stages || process.stages.length === 0) {
      console.log(`⚠️ [Stage Structure] 專案 ${projectId} 沒有階段資料`);
      return null;
    }

    // 轉換為 AI 友善的格式
    const stageStructure = process.stages.map((stage) => ({
      階段ID: stage.id,
      階段名稱: stage.name,
      子階段: (stage.sub_stages || []).map((subStage) => ({
        子階段ID: subStage.id,
        子階段名稱: subStage.name,
        子階段說明: subStage.description || '無說明',
        需填寫欄位: subStage.userSubmit || {},
      })),
    }));

    console.log(`✅ [Stage Structure] 成功載入 ${process.stages.length} 個階段`);
    return stageStructure;
  } catch (error) {
    console.error(`❌ [Stage Structure] 查詢失敗:`, error);
    return null;
  }
}

/**
 * 取得階段完成狀態（整合提交記錄）
 *
 * v2.3 新功能：
 * - 整合階段結構與提交記錄
 * - 檢查每個子階段的提交狀態
 * - 分析欄位完整性（已填寫 vs 遺漏）
 * - 計算完成度百分比
 *
 * Linus 設計哲學：
 * - 資料結構優先：一次查詢，清晰整合
 * - 消除特殊情況：所有子階段統一格式
 * - 簡單實用：邏輯清晰，無複雜分支
 *
 * @param {number} projectId - 專案 ID
 * @param {number} currentStageId - 當前階段 ID
 * @param {number} currentSubStageId - 當前子階段 ID
 * @returns {Promise<Object|null>} 階段完成狀態或 null
 */
async function getStageCompletionStatus(projectId, currentStageId, currentSubStageId) {
  try {
    // 第 1 步：查詢完整階段結構
    const process = await Process.findOne({
      where: { projectId },
      include: [
        {
          model: Stage,
          include: [
            {
              model: Sub_stage,
              attributes: ['id', 'name', 'description', 'userSubmit'],
            },
          ],
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!process || !process.stages || process.stages.length === 0) {
      console.log(`⚠️ [Stage Completion] 專案 ${projectId} 沒有階段資料`);
      return null;
    }

    // 第 2 步：查詢所有提交記錄（不限制數量）
    const allSubmissions = await Submit.findAll({
      where: { projectId },
      attributes: ['id', 'stage', 'content', 'createdAt', 'userId'],
      order: [['createdAt', 'DESC']],
    });

    // 建立提交記錄索引：stage -> submission
    const submissionMap = new Map();
    allSubmissions.forEach(sub => {
      // 每個階段可能有多次提交，取最新的
      if (!submissionMap.has(sub.stage)) {
        submissionMap.set(sub.stage, sub);
      }
    });

    // 第 3 步：遍歷階段，整合提交狀態
    let totalSubStages = 0;
    let completedSubStages = 0;

    const stageCompletionData = process.stages.map((stage) => {
      const subStageStatusList = (stage.sub_stages || []).map((subStage) => {
        totalSubStages++;
        const stageKey = `${stage.id}-${subStage.id}`;
        const submission = submissionMap.get(stageKey);

        // 取得需填寫欄位
        const requiredFields = Object.keys(subStage.userSubmit || {});

        let subStageStatus;
        if (submission) {
          // 有提交記錄：檢查欄位完整性
          const submittedContent = submission.content || {};
          const submittedFields = Object.keys(submittedContent);

          // 檢查哪些欄位已填寫（非空）
          const filledFields = requiredFields.filter(key => {
            const value = submittedContent[key];
            // 嚴格檢查：排除 null、undefined、空字串、空陣列
            if (value === null || value === undefined) return false;
            if (typeof value === 'string' && value.trim() === '') return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
          });

          const missingFields = requiredFields.filter(key => !filledFields.includes(key));
          const completeness = requiredFields.length > 0
            ? Math.round((filledFields.length / requiredFields.length) * 100)
            : 100;

          // 如果完成度 100%，計為完成
          if (completeness === 100) {
            completedSubStages++;
          }

          subStageStatus = {
            子階段ID: subStage.id,
            子階段名稱: subStage.name,
            需填寫欄位: subStage.userSubmit || {},
            提交狀態: '已提交',
            提交時間: submission.createdAt,
            提交ID: submission.id,
            欄位完整性: {
              已填寫: filledFields,
              遺漏: missingFields,
              完整度: `${completeness}%`,
            },
          };
        } else {
          // 無提交記錄
          const isCurrentStage = (stage.id === currentStageId && subStage.id === currentSubStageId);

          subStageStatus = {
            子階段ID: subStage.id,
            子階段名稱: subStage.name,
            需填寫欄位: subStage.userSubmit || {},
            提交狀態: isCurrentStage ? '當前階段，進行中' : '未提交',
            欄位完整性: {
              已填寫: [],
              遺漏: requiredFields,
              完整度: '0%',
            },
          };
        }

        return subStageStatus;
      });

      // 計算該階段的完成度
      const stageTotal = subStageStatusList.length;
      const stageCompleted = subStageStatusList.filter(
        sub => sub.欄位完整性.完整度 === '100%'
      ).length;
      const stageCompleteness = stageTotal > 0
        ? Math.round((stageCompleted / stageTotal) * 100)
        : 0;

      return {
        階段ID: stage.id,
        階段名稱: stage.name,
        階段完成度: `${stageCompleteness}%`,
        子階段狀況: subStageStatusList,
      };
    });

    // 計算總完成度
    const totalCompleteness = totalSubStages > 0
      ? Math.round((completedSubStages / totalSubStages) * 100)
      : 0;

    const result = {
      hasData: true,
      當前階段: { 階段ID: currentStageId, 子階段ID: currentSubStageId },
      總完成度: `${totalCompleteness}%`,
      統計: {
        總子階段數: totalSubStages,
        已完成數: completedSubStages,
        未完成數: totalSubStages - completedSubStages,
      },
      各階段狀況: stageCompletionData,
    };

    console.log(`✅ [Stage Completion] 成功分析 ${process.stages.length} 個階段，總完成度: ${totalCompleteness}%`);
    return result;
  } catch (error) {
    console.error(`❌ [Stage Completion] 查詢失敗:`, error);
    return null;
  }
}

async function getKanbanSnapshot(projectId) {
  const kanban = await Kanban.findOne({
    where: { projectId },
    include: [
      {
        model: Column,
        include: [
          {
            model: Task,
            attributes: [
              "id",
              "title",
              "content",
              "labels",
              "assignees",
              "createdAt",
            ],
            limit: ASSISTANT_CONFIG.DB_KANBAN_TASKS_LIMIT,
            order: [["createdAt", "DESC"]],
          },
        ],
      },
    ],
  });

  if (!kanban) return [];

  return kanban.columns.map((column) => ({
    id: column.id,
    name: column.name,
    tasks: column.tasks.map((task) => ({
      id: task.id,
      title: task.title ? truncateText(task.title, ASSISTANT_CONFIG.TRUNCATE_TASK_TITLE) : "",
      content: task.content ? truncateText(task.content, ASSISTANT_CONFIG.TRUNCATE_TASK_CONTENT) : "",
      labels: task.labels || [],
      assignees: task.assignees || [],
      createdAt: task.createdAt,
    })),
  }));
}

async function getIdeaWallSnapshot(projectId) {
  const ideaWall = await Idea_wall.findOne({
    where: { projectId },
    include: [
      {
        model: Node,
        where: {
          [Op.and]: [{ title: { [Op.ne]: null } }, { title: { [Op.ne]: "" } }],
        },
        attributes: ["id", "title", "content", "createdAt", "owner"],
        limit: ASSISTANT_CONFIG.DB_IDEA_WALL_NODES_LIMIT,
        order: [["createdAt", "DESC"]],
      },
    ],
  });

  if (!ideaWall || !ideaWall.nodes) {
    return { total: 0, nodes: [] };
  }

  return {
    total: ideaWall.nodes.length,
    nodes: ideaWall.nodes.map((node) => ({
      id: node.id,
      title: node.title ? truncateText(node.title, ASSISTANT_CONFIG.TRUNCATE_NODE_TITLE) : "",
      content: node.content ? truncateText(node.content, ASSISTANT_CONFIG.TRUNCATE_NODE_CONTENT) : "",
      createdAt: node.createdAt,
      owner: node.owner,
    })),
  };
}

async function getSubmissions(projectId) {
  const submissions = await Submit.findAll({
    where: { projectId },
    attributes: ["id", "stage", "content", "createdAt", "userId"],
    limit: ASSISTANT_CONFIG.DB_SUBMISSIONS_LIMIT,
    order: [["createdAt", "DESC"]],
  });

  return submissions.map((submit) => ({
    id: submit.id,
    stage: submit.stage,
    content: submit.content
      ? truncateText(JSON.stringify(submit.content), ASSISTANT_CONFIG.TRUNCATE_SUBMIT_CONTENT)
      : "",
    createdAt: submit.createdAt,
    userId: submit.userId,
  }));
}


async function getChatHistory(projectId) {
  const chatTurns = await ChatTurn.findAll({
    where: { projectId },
    attributes: [
      "userContent",
      "assistantContent",
      "username",
      "assistantUsername",
      "createdAt",
    ],
    limit: ASSISTANT_CONFIG.DB_CHAT_HISTORY_LIMIT,
    order: [["createdAt", "DESC"]],
  });

  const history = [];

  chatTurns.reverse().forEach((turn) => {
    if (turn.userContent) {
      history.push({
        role: "user",
        content: truncateText(turn.userContent, ASSISTANT_CONFIG.TRUNCATE_CHAT_CONTENT),
        username: turn.username,
        createdAt: turn.createdAt,
      });
    }

    if (turn.assistantContent) {
      history.push({
        role: "assistant",
        content: truncateText(turn.assistantContent, ASSISTANT_CONFIG.TRUNCATE_CHAT_CONTENT),
        username: turn.assistantUsername,
        createdAt: turn.createdAt,
      });
    }
  });

  return history.slice(-ASSISTANT_CONFIG.CHAT_HISTORY_FINAL_LIMIT);
}

/* 獲取最近活動摘要 */
async function getActivitySummary(projectId) {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - ASSISTANT_CONFIG.ACTIVITY_SUMMARY_DAYS);

  const taskChanges = await TaskChangeLog.findAll({
    where: {
      projectId,
      createdAt: { [Op.gte]: daysAgo },
    },
    limit: ASSISTANT_CONFIG.DB_TASK_CHANGES_LIMIT,
    order: [["createdAt", "DESC"]],
  });

  const taskChangeStats = {
    total: taskChanges.length,
    byAction: taskChanges.reduce((acc, change) => {
      acc[change.changeType] = (acc[change.changeType] || 0) + 1;
      return acc;
    }, {}),
    byField: taskChanges.reduce((acc, change) => {
      if (change.fieldName) {
        acc[change.fieldName] = (acc[change.fieldName] || 0) + 1;
      }
      return acc;
    }, {}),
  };

  return {
    taskChanges: taskChangeStats,
    submitChanges: { total: 0 }, 
  };
}

/**
 * 使用 LLM 智能分析專案狀態
 */
async function analyzeProjectStateWithLLM({
  kanban,
  ideaWall,
  submissions,
  stageMeta,
  projectBasics,
  activitySummary,
}) {
  const analysisPrompt = `分析以下專案學習數據，輸出 JSON 格式分析報告：

專案基本資訊：
${JSON.stringify(projectBasics, null, 2)}

當前階段要求：
${JSON.stringify(stageMeta, null, 2)}

看板狀況（${kanban.length} 個欄位）：
${JSON.stringify(kanban, null, 2)}

想法牆狀況（${ideaWall.total} 個節點）：
${JSON.stringify(ideaWall, null, 2)}

提交記錄（${submissions.length} 筆）：
${JSON.stringify(submissions, null, 2)}

活動摘要：
${JSON.stringify(activitySummary, null, 2)}

請分析並輸出嚴格的 JSON 格式，不要包含任何 Markdown 標記或額外說明：
{
  "progressOverview": "整體進度評估文字",
  "taskFlowAnalysis": "任務流動狀況分析",
  "researchQuality": "研究探索品質評估",
  "stageCompliance": "階段要求符合度檢查",
  "riskFactors": ["具體風險點1", "風險點2"],
  "actionableInsights": ["可執行洞察1", "洞察2"],
  "existingTaskTitles": ["現有任務標題列表"],
  "dataQualityHints": ["資料品質建議"]
}

重要：請直接回覆 JSON 物件，不要使用 \`\`\`json 代碼塊包裝。`;

  let result = null;
  try {
    result = await callGeminiAPI(analysisPrompt);

    // 處理可能包含 Markdown 代碼塊的回應
    let jsonContent = result.content.trim();

    // 移除 Markdown 代碼塊標記
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const analysis = JSON.parse(jsonContent);
    return analysis;
  } catch (error) {
    console.error('LLM analysis failed, using fallback | LLM 分析失敗，使用基本統計:', error);
    if (result?.content) {
      console.error('LLM raw response | 原始回應:', result.content.substring(0, 500));
    }
    // 降級到基本統計，並標記為降級模式
    const basicSummary = generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta });
    return {
      ...basicSummary,
      degradedMode: true,
      degradedReason: 'LLM 服務暫時不可用'
    };
  }
}

/**
 * 基本統計摘要（LLM 失敗時的降級方案）
 */
function generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta }) {
  const allTaskTitles = kanban.flatMap(col => 
    col.tasks.map(task => task.title).filter(Boolean)
  );

  const dataQualityHints = [];
  if (ideaWall.total === 0) {
    dataQualityHints.push("想法牆內容偏少，建議增加研究素材");
  }
  if (kanban.every(col => col.tasks.length === 0)) {
    dataQualityHints.push("看板無任務卡片，建議開始規劃工作項目");
  }

  return {
    progressOverview: "使用基本統計分析",
    taskFlowAnalysis: `看板有 ${kanban.length} 個欄位`,
    researchQuality: `想法牆有 ${ideaWall.total} 個節點`,
    stageCompliance: stageMeta ? "階段資訊完整" : "缺少階段資訊",
    riskFactors: dataQualityHints,
    actionableInsights: ["建議使用 LLM 獲得更深度分析"],
    existingTaskTitles: allTaskTitles.slice(0, ASSISTANT_CONFIG.BASIC_SUMMARY_TASK_TITLES_LIMIT),
    dataQualityHints,
  };
}

/**
 * 第二階段：將分析結果轉換成易讀報告
 */
async function generateReportFromAnalysis(projectAnalysis, projectBasics, userMessage) {
  const reportPrompt = `基於以下專案分析結果，生成一份易讀的中文報告：

**專案基本資訊：**
- 專案名稱：${projectBasics.name}
- 專案描述：${projectBasics.description || '無描述'}
- 當前階段：${projectBasics.currentStage}/${projectBasics.currentSubStage}

**智能分析結果：**
${JSON.stringify(projectAnalysis, null, 2)}

**用戶提問：**
${userMessage || '請提供目前狀況的建議'}

請生成一份包含以下內容的 Markdown 格式報告：
1. 專案整體狀況概述
2. 關鍵洞察和發現  
3. 需要注意的風險點
4. 具體可執行建議

要求：使用友善、專業的語調，內容要具體且可行動。`;

  try {
    const result = await callGeminiAPI(reportPrompt);
    return result.content;
  } catch (error) {
    console.error('Report generation failed | 報告生成失敗:', error);
    // 降級到基本報告
    return `# 專案分析報告：${projectBasics.name}

## 整體狀況
${projectAnalysis.progressOverview}

## 任務流動分析  
${projectAnalysis.taskFlowAnalysis}

## 研究品質評估
${projectAnalysis.researchQuality}

## 階段符合度
${projectAnalysis.stageCompliance}

${projectAnalysis.riskFactors?.length > 0 ? `## ⚠️ 需要注意
${projectAnalysis.riskFactors.map(risk => `- ${risk}`).join('\n')}` : ''}

${projectAnalysis.actionableInsights?.length > 0 ? `## 💡 建議行動
${projectAnalysis.actionableInsights.map(insight => `- ${insight}`).join('\n')}` : ''}`;
  }
}

function truncateText(text, maxLength) {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

/**
 * 生成 AI 指導建議
 * POST /assistant/guidance
 */
exports.getGuidance = async (req, res) => {
  try {
    const { projectId, userMessage } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required | 需要專案ID" });
    }

    // 需要用戶驗證來獲取詳細資料
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User authentication required | 需要使用者驗證" });
    }

    // 1. 獲取專案基本資訊和使用者權限
    const projectData = await getProjectBasicsAndUserRole(projectId, userId);

    if (!projectData) {
      return res
        .status(404)
        .json({ error: "Project not found or access denied | 專案不存在或無權限" });
    }

    // 2. 獲取階段和子階段資訊
    const stageMeta = await getStageMeta(projectData.project);

    // 3. 獲取看板快照
    const kanbanSnapshot = await getKanbanSnapshot(projectId);

    // 4. 獲取想法牆快照
    const ideaWallSnapshot = await getIdeaWallSnapshot(projectId);

    // 5. 獲取提交歷程
    const submissions = await getSubmissions(projectId);

    // 6. 獲取對話歷史
    const chatHistory = await getChatHistory(projectId);

    // 7. 獲取活動摘要
    const activitySummary = await getActivitySummary(projectId);

    // 8. LLM 智能分析專案狀態
    const projectAnalysis = await analyzeProjectStateWithLLM({
      kanban: kanbanSnapshot,
      ideaWall: ideaWallSnapshot,
      submissions,
      stageMeta,
      projectBasics: {
        name: projectData.project.name,
        description: projectData.project.describe,
        currentStage: projectData.project.currentStage,
        currentSubStage: projectData.project.currentSubStage,
      },
      activitySummary,
    });

    // 第二階段：生成易讀報告
    const projectBasics = {
      name: projectData.project.name,
      description: projectData.project.describe,
      currentStage: projectData.project.currentStage,
      currentSubStage: projectData.project.currentSubStage,
    };

    const detailedMessage = await generateReportFromAnalysis(
      projectAnalysis, 
      projectBasics, 
      userMessage
    );

    // 簡化的專案摘要（給前端使用）
    const projectSummary = {
      projectBasics,
      user: projectData.user,
      stageMeta,
      analysis: projectAnalysis,
      stats: {
        kanbanColumns: kanbanSnapshot.length,
        totalTasks: kanbanSnapshot.reduce((sum, col) => sum + col.tasks.length, 0),
        ideaNodes: ideaWallSnapshot.total,
        submissions: submissions.length,
        recentActivity: activitySummary.taskChanges.total,
      },
    };

    const response = {
      message: detailedMessage,
      projectData: projectSummary, // 給前端使用的結構化資料
      followup: {
        questions: [
          "需要我協助規劃下一步工作嗎？",
          "想討論看板中的任務安排嗎？",
          "需要我分析想法牆的內容嗎？",
        ],
      },
      // 如果是降級模式，通知前端
      ...(projectAnalysis.degradedMode && {
        warning: {
          type: 'DEGRADED_SERVICE',
          message: 'AI 服務暫時不可用，目前顯示基本統計資料',
          details: projectAnalysis.degradedReason
        }
      })
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Guidance generation failed | 指導建議生成失敗:", error);
    res.status(500).json({
      error: "Failed to generate guidance | 指導建議生成失敗",
      message: "抱歉，暫時無法回應，請稍後再試。",
    });
  }
};

/**
 * 聊天功能（支援 streaming）
 * POST /api/assistant/chat
 *
 * 功能說明：
 * 1. 接收使用者的問題
 * 2. 撈取專案的所有資料（看板、想法牆、提交記錄、對話歷史）
 * 3. 將資料和問題一起傳給 AI
 * 4. AI 以 streaming 方式回答（逐字傳回）
 */
exports.chatWithStreaming = async (req, res) => {
  try {
    const { projectId, message, provider = 'gemini', sessionId = 'default' } = req.body;
    const userId = req.user?.id;

    console.log('🤖 [Assistant Chat] 收到請求:', { projectId, message, provider, userId, sessionId });

    // === 第 1 步：驗證輸入 ===
    if (!userId) {
      console.log('❌ [Assistant Chat] 驗證失敗: 未登入');
      return res.status(401).json({ error: '請先登入' });
    }

    if (!projectId || !message) {
      console.log('❌ [Assistant Chat] 驗證失敗: 缺少參數');
      return res.status(400).json({ error: '需要 projectId 和 message' });
    }

    // === 第 2 步：取得專案資料和使用者權限 ===
    console.log('📂 [Assistant Chat] 開始取得專案資料...');
    const projectData = await getProjectBasicsAndUserRole(projectId, userId);

    if (!projectData) {
      console.log('❌ [Assistant Chat] 專案不存在或無權限');
      return res.status(404).json({ error: '找不到專案或沒有權限' });
    }

    console.log('✅ [Assistant Chat] 專案資料取得成功:', projectData.project.name);

    // === 第 3 步：取得專案資料（v2.0 帶快取優化）===
    // 取得使用者名字
    const userName = projectData.user.username || '同學';
    console.log('👤 [Assistant Chat] 使用者名字:', userName);

    // v2.0: 使用快取系統取得 projectContext（5 分鐘內的連續請求不重複查詢資料庫）
    // chatHistory 單獨查詢（因為它是動態變化的，不適合快取）
    const [projectContext, chatHistory] = await Promise.all([
      getProjectContext(projectId, projectData),
      getChatHistory(projectId),
    ]);

    console.log('✅ [Assistant Chat] 所有資料撈取完成');

    // === 第 5 步：初始化 PromptBuilder（v2.0 優化，資料預處理只執行一次）===
    const promptBuilder = new PromptBuilder({
      userName,
      projectContext,
      chatHistory,
      chatHistoryLimit: ASSISTANT_CONFIG.PROMPT_CHAT_HISTORY_LIMIT
    });

    // === 第 6 步：根據 provider 選擇使用 Gemini 或 OpenAI ===
    if (provider === 'gemini') {
      // 使用 Gemini（預設）
      console.log('🚀 [Assistant Chat] 使用 Gemini 開始串流...');

      // 檢查是否啟用 Structured Output（實驗性功能）
      const useStructuredOutput = process.env.USE_STRUCTURED_OUTPUT === 'true';
      let result;

      if (useStructuredOutput) {
        // 🧪 Experimental: 使用 Structured Output（消除 XML 解析，保證結構）
        console.log('🧪 [Assistant Chat] 啟用 Structured Output 模式');

        try {
          // 使用簡化 Prompt（不需要 XML 標籤指示）
          // v2.0: 使用 PromptBuilder（資料已預處理，性能提升）
          const structuredPrompt = promptBuilder.forStructured(message);

          // Token 計數監控
          const promptTokens = estimateTokenCount(structuredPrompt);
          const contextSize = JSON.stringify(projectContext).length;
          console.log(`📊 [Token Monitor] Prompt 大小: ${contextSize} 字元 (Structured)`);
          console.log(`📊 [Token Monitor] 估算 Token 數: ~${promptTokens} tokens`);
          console.log(`📊 [Token Monitor] 專案數據: 看板 ${projectContext.看板狀況.總欄位數} 欄/${projectContext.看板狀況.總任務數} 任務, 想法牆 ${projectContext.想法牆.總節點數} 節點, 提交 ${projectContext.最近提交記錄.總數} 筆`);

          // 嘗試使用 Structured Output
          result = await streamGeminiResponseStructured(structuredPrompt, res, { model: 'gemini-2.5-flash' });
          console.log('✅ [Assistant Chat] Structured Output 成功');

        } catch (structuredError) {
          // Fallback: Structured Output 失敗，使用傳統方法
          console.warn('⚠️ [Assistant Chat] Structured Output 失敗，fallback 到傳統方法');
          console.error('  錯誤詳情:', structuredError.message);

          // 使用傳統 Prompt（包含 XML 標籤指示）
          // v2.0: 使用 PromptBuilder（資料已預處理，性能提升）
          const prompt = promptBuilder.forGemini(message);

          result = await streamGeminiResponse(prompt, res, { model: 'gemini-2.5-flash' });
        }

      } else {
        // 預設：使用傳統方法（零破壞性）
        console.log('📝 [Assistant Chat] 使用傳統 XML 解析模式（預設）');

        // 使用傳統 Prompt（包含 XML 標籤指示）
        // v2.0: 使用 PromptBuilder（資料已預處理，性能提升）
        const prompt = promptBuilder.forGemini(message);

        // Token 計數監控
        const promptTokens = estimateTokenCount(prompt);
        const contextSize = JSON.stringify(projectContext).length;
        console.log(`📊 [Token Monitor] Prompt 大小: ${contextSize} 字元`);
        console.log(`📊 [Token Monitor] 估算 Token 數: ~${promptTokens} tokens`);
        console.log(`📊 [Token Monitor] 專案數據: 看板 ${projectContext.看板狀況.總欄位數} 欄/${projectContext.看板狀況.總任務數} 任務, 想法牆 ${projectContext.想法牆.總節點數} 節點, 提交 ${projectContext.最近提交記錄.總數} 筆`);

        // Stream response and get thinking + content
        result = await streamGeminiResponse(prompt, res, { model: 'gemini-2.5-flash' });
      }

      // Save to database (async, don't block response)
      if (result && (result.thinkingContent || result.assistantContent)) {
        ChatTurn.create({
          projectId: parseInt(projectId, 10),
          projectName: projectData.project.name,
          userId: parseInt(userId, 10),
          username: userName,
          userContent: message,
          assistantContent: result.assistantContent || '',
          thinkingContent: result.thinkingContent || null,
          assistantUsername: 'AI 導師',
          sessionId: sessionId || 'default'  // Include sessionId for session management
        }).catch(err => {
          console.error('❌ [Assistant Chat] 儲存對話失敗:', err);
        });
      }

    } else if (provider === 'openai') {
      // 使用 OpenAI（備選）
      console.log('🚀 [Assistant Chat] 使用 OpenAI 開始串流...');

      // 使用獨立配置生成 System Content（包含邊界約束）
      // v2.0: 使用 PromptBuilder（資料已預處理，性能提升）
      const systemContent = promptBuilder.forOpenAI();

      const messages = [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: message
        }
      ];

      // Token 計數監控
      const totalPromptText = systemContent + message;
      const promptTokens = estimateTokenCount(totalPromptText);
      const contextSize = JSON.stringify(projectContext).length;
      console.log(`📊 [Token Monitor] Prompt 大小: ${contextSize} 字元`);
      console.log(`📊 [Token Monitor] 估算 Token 數: ~${promptTokens} tokens`);
      console.log(`📊 [Token Monitor] 專案數據: 看板 ${projectContext.看板狀況.總欄位數} 欄/${projectContext.看板狀況.總任務數} 任務, 想法牆 ${projectContext.想法牆.總節點數} 節點, 提交 ${projectContext.最近提交記錄.總數} 筆`);

      // Stream response and get thinking + content
      const result = await streamOpenAIResponse(messages, res, {
        model: 'gpt-4o-mini',
        temperature: 0.7
      });

      // Save to database (async, don't block response)
      if (result && (result.thinkingContent || result.assistantContent)) {
        ChatTurn.create({
          projectId: parseInt(projectId, 10),
          projectName: projectData.project.name,
          userId: parseInt(userId, 10),
          username: userName,
          userContent: message,
          assistantContent: result.assistantContent || '',
          thinkingContent: result.thinkingContent || null,
          assistantUsername: 'AI 導師',
          sessionId: sessionId || 'default'  // Include sessionId for session management
        }).catch(err => {
          console.error('❌ [Assistant Chat] 儲存對話失敗:', err);
        });
      }

    } else {
      return res.status(400).json({ error: 'provider 必須是 "gemini" 或 "openai"' });
    }

  } catch (error) {
    console.error('Chat streaming error:', error);

    // 檢查 response 是否已經結束（避免重複寫入）
    if (res.writableEnded) {
      console.log('⚠️ Response already ended, skipping error write');
      return;
    }

    // 如果還沒開始傳送 SSE，用 JSON 回傳錯誤
    if (!res.headersSent) {
      res.status(500).json({
        error: '發生錯誤',
        message: '抱歉，AI 服務暫時無法回應，請稍後再試'
      });
    } else {
      // 如果已經開始 streaming，用 SSE 格式傳送錯誤
      try {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: '發生錯誤，請稍後再試'
        })}\n\n`);
        res.end();
      } catch (writeError) {
        console.error('❌ Error writing to already-ended stream:', writeError.message);
      }
    }
  }
};

/**
 * ✅ 取得外部延伸閱讀連結（使用 Gemini Grounding）
 * POST /api/assistant/grounding
 */
exports.getExternalLinks = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        error: 'question 參數必須是非空字串'
      });
    }

    console.log(`🔗 [External Links] 收到請求，問題: "${question}"`);

    // ✅ 呼叫 Gemini Grounding
    console.log(`[External Links Debug] 開始呼叫 callGeminiGrounding...`);
    const result = await callGeminiGrounding(question);

    console.log(`[External Links Debug] callGeminiGrounding 返回結果:`, JSON.stringify(result, null, 2));
    console.log(`✅ [External Links] 成功取得 ${result.externalLinks.length} 個連結`);

    const response = {
      success: true,
      externalLinks: result.externalLinks,
      webSearchQueries: result.webSearchQueries
    };

    console.log(`[External Links Debug] 準備返回給前端:`, JSON.stringify(response, null, 2));

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ [External Links] 錯誤:', error);
    console.error('❌ [External Links] 錯誤堆疊:', error.stack);

    // ✅ 失敗不影響主要功能，返回空陣列
    const errorResponse = {
      success: false,
      externalLinks: [],
      error: error.message
    };

    console.log(`[External Links Debug] 錯誤回應:`, JSON.stringify(errorResponse, null, 2));

    res.status(200).json(errorResponse);
  }
};
