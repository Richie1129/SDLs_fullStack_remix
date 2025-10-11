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
const { callGeminiAPI } = require("../services/gemini");

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
            limit: 30, 
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
      title: task.title ? truncateText(task.title, 200) : "",
      content: task.content ? truncateText(task.content, 1500) : "",
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
        limit: 100,
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
      title: node.title ? truncateText(node.title, 200) : "",
      content: node.content ? truncateText(node.content, 1500) : "",
      createdAt: node.createdAt,
      owner: node.owner,
    })),
  };
}

async function getSubmissions(projectId) {
  const submissions = await Submit.findAll({
    where: { projectId },
    attributes: ["id", "stage", "content", "createdAt", "userId"],
    limit: 30,
    order: [["createdAt", "DESC"]],
  });

  return submissions.map((submit) => ({
    id: submit.id,
    stage: submit.stage,
    content: submit.content
      ? truncateText(JSON.stringify(submit.content), 2000)
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
    limit: 10,
    order: [["createdAt", "DESC"]],
  });

  const history = [];

  chatTurns.reverse().forEach((turn) => {
    if (turn.userContent) {
      history.push({
        role: "user",
        content: truncateText(turn.userContent, 2000),
        username: turn.username,
        createdAt: turn.createdAt,
      });
    }

    if (turn.assistantContent) {
      history.push({
        role: "assistant",
        content: truncateText(turn.assistantContent, 2000),
        username: turn.assistantUsername,
        createdAt: turn.createdAt,
      });
    }
  });

  return history.slice(-20); 
}

/* 獲取 30 天內 動作 */
async function getActivitySummary(projectId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const taskChanges = await TaskChangeLog.findAll({
    where: {
      projectId,
      createdAt: { [Op.gte]: thirtyDaysAgo },
    },
    limit: 200,
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
    existingTaskTitles: allTaskTitles.slice(0, 200),
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
