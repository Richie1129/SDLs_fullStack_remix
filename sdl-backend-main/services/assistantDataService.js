/**
 * Assistant 資料服務模組
 * 
 * [Refactored] 從 controllers/assistant.js (1,301 行) 中提取出所有
 * 專案資料查詢相關的函數，遵循單一職責原則。
 * 
 * 職責：
 * - 查詢專案基本資料和使用者權限
 * - 取得階段結構和完成狀態
 * - 取得看板、想法牆、提交記錄的快照
 * - 取得聊天歷史和活動摘要
 * - LLM 分析和報告生成
 */

const { Op } = require("sequelize");
const logger = require("../config/logger");

const Project = require("../models/project");
const User = require("../models/user");
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

const { callGeminiAPI } = require("../services/llmGateway");
const ASSISTANT_CONFIG = require("../config/assistant");

// ============================================================================
// 工具函數
// ============================================================================

function truncateText(text, maxLength) {
    if (!text || typeof text !== "string") return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

/**
 * 估算 Token 數量
 * 簡化演算法：中文約 1.5-2 字元 = 1 token，英文約 4 字元 = 1 token
 */
function estimateTokenCount(text) {
    if (!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// ============================================================================
// 專案基礎資料
// ============================================================================

async function getProjectBasicsAndUserRole(projectId, userId) {
    const project = await Project.findByPk(projectId, {
        include: [{
            model: User,
            through: { attributes: [] },
            attributes: ["id", "username", "role"],
        }],
    });
    if (!project) return null;

    const user = await User.findByPk(userId, {
        attributes: ["id", "username", "role"],
    });
    if (!user) return null;

    return {
        project,
        user: { id: user.id, username: user.username, roles: user.role },
    };
}

// ============================================================================
// 階段資料
// ============================================================================

async function getStageMeta(project) {
    if (!project.currentStage || !project.currentSubStage) return null;

    const stage = await Stage.findByPk(project.currentStage, {
        include: [{
            model: Sub_stage,
            where: { id: project.currentSubStage },
            required: true,
        }],
    });

    if (!stage || !stage.sub_stages || stage.sub_stages.length === 0) return null;
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

async function getCompleteStageStructure(projectId) {
    try {
        const process = await Process.findOne({
            where: { projectId },
            include: [{
                model: Stage,
                include: [{
                    model: Sub_stage,
                    attributes: ['id', 'name', 'description', 'userSubmit'],
                }],
                attributes: ['id', 'name'],
            }],
        });

        if (!process || !process.stages || process.stages.length === 0) {
            logger.warn(`[Stage Structure] 專案 ${projectId} 沒有階段資料`);
            return null;
        }

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

        logger.info(`[Stage Structure] 成功載入 ${process.stages.length} 個階段`);
        return stageStructure;
    } catch (error) {
        logger.error({ err: error }, '[Stage Structure] 查詢失敗');
        return null;
    }
}

async function getStageCompletionStatus(projectId, currentStageId, currentSubStageId) {
    try {
        const process = await Process.findOne({
            where: { projectId },
            include: [{
                model: Stage,
                include: [{
                    model: Sub_stage,
                    attributes: ['id', 'name', 'description', 'userSubmit'],
                }],
                attributes: ['id', 'name'],
            }],
        });

        if (!process || !process.stages || process.stages.length === 0) {
            logger.warn(`[Stage Completion] 專案 ${projectId} 沒有階段資料`);
            return null;
        }

        const allSubmissions = await Submit.findAll({
            where: { projectId },
            attributes: ['id', 'stage', 'content', 'createdAt', 'userId'],
            order: [['createdAt', 'DESC']],
        });

        const submissionMap = new Map();
        allSubmissions.forEach(sub => {
            if (!submissionMap.has(sub.stage)) {
                submissionMap.set(sub.stage, sub);
            }
        });

        let totalSubStages = 0;
        let completedSubStages = 0;

        const stageCompletionData = process.stages.map((stage) => {
            const subStageStatusList = (stage.sub_stages || []).map((subStage) => {
                totalSubStages++;
                const stageKey = `${stage.id}-${subStage.id}`;
                const submission = submissionMap.get(stageKey);
                const requiredFields = Object.keys(subStage.userSubmit || {});

                if (submission) {
                    const submittedContent = submission.content || {};
                    const filledFields = requiredFields.filter(key => {
                        const value = submittedContent[key];
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string' && value.trim() === '') return false;
                        if (Array.isArray(value) && value.length === 0) return false;
                        return true;
                    });
                    const missingFields = requiredFields.filter(key => !filledFields.includes(key));
                    const completeness = requiredFields.length > 0
                        ? Math.round((filledFields.length / requiredFields.length) * 100) : 100;

                    if (completeness === 100) completedSubStages++;

                    return {
                        子階段ID: subStage.id, 子階段名稱: subStage.name,
                        需填寫欄位: subStage.userSubmit || {},
                        提交狀態: '已提交', 提交時間: submission.createdAt, 提交ID: submission.id,
                        欄位完整性: { 已填寫: filledFields, 遺漏: missingFields, 完整度: `${completeness}%` },
                    };
                } else {
                    const isCurrentStage = (stage.id === currentStageId && subStage.id === currentSubStageId);
                    return {
                        子階段ID: subStage.id, 子階段名稱: subStage.name,
                        需填寫欄位: subStage.userSubmit || {},
                        提交狀態: isCurrentStage ? '當前階段，進行中' : '未提交',
                        欄位完整性: { 已填寫: [], 遺漏: requiredFields, 完整度: '0%' },
                    };
                }
            });

            const stageTotal = subStageStatusList.length;
            const stageCompleted = subStageStatusList.filter(sub => sub.欄位完整性.完整度 === '100%').length;
            const stageCompleteness = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;

            return { 階段ID: stage.id, 階段名稱: stage.name, 階段完成度: `${stageCompleteness}%`, 子階段狀況: subStageStatusList };
        });

        const totalCompleteness = totalSubStages > 0 ? Math.round((completedSubStages / totalSubStages) * 100) : 0;

        logger.info(`[Stage Completion] 成功分析 ${process.stages.length} 個階段，總完成度: ${totalCompleteness}%`);
        return {
            hasData: true,
            當前階段: { 階段ID: currentStageId, 子階段ID: currentSubStageId },
            總完成度: `${totalCompleteness}%`,
            統計: { 總子階段數: totalSubStages, 已完成數: completedSubStages, 未完成數: totalSubStages - completedSubStages },
            各階段狀況: stageCompletionData,
        };
    } catch (error) {
        logger.error({ err: error }, '[Stage Completion] 查詢失敗');
        return null;
    }
}

// ============================================================================
// 快照資料
// ============================================================================

async function getKanbanSnapshot(projectId) {
    const kanban = await Kanban.findOne({
        where: { projectId },
        include: [{
            model: Column,
            include: [{
                model: Task,
                attributes: ["id", "title", "content", "labels", "assignees", "createdAt"],
                limit: ASSISTANT_CONFIG.DB_KANBAN_TASKS_LIMIT,
                order: [["createdAt", "DESC"]],
            }],
        }],
    });

    if (!kanban) return [];
    return kanban.columns.map((column) => ({
        id: column.id, name: column.name,
        tasks: column.tasks.map((task) => ({
            id: task.id,
            title: task.title ? truncateText(task.title, ASSISTANT_CONFIG.TRUNCATE_TASK_TITLE) : "",
            content: task.content ? truncateText(task.content, ASSISTANT_CONFIG.TRUNCATE_TASK_CONTENT) : "",
            labels: task.labels || [], assignees: task.assignees || [], createdAt: task.createdAt,
        })),
    }));
}

async function getIdeaWallSnapshot(projectId) {
    const ideaWall = await Idea_wall.findOne({
        where: { projectId },
        include: [{
            model: Node,
            where: { [Op.and]: [{ title: { [Op.ne]: null } }, { title: { [Op.ne]: "" } }] },
            attributes: ["id", "title", "content", "createdAt", "owner"],
            limit: ASSISTANT_CONFIG.DB_IDEA_WALL_NODES_LIMIT,
            order: [["createdAt", "DESC"]],
        }],
    });

    if (!ideaWall || !ideaWall.nodes) return { total: 0, nodes: [] };
    return {
        total: ideaWall.nodes.length,
        nodes: ideaWall.nodes.map((node) => ({
            id: node.id,
            title: node.title ? truncateText(node.title, ASSISTANT_CONFIG.TRUNCATE_NODE_TITLE) : "",
            content: node.content ? truncateText(node.content, ASSISTANT_CONFIG.TRUNCATE_NODE_CONTENT) : "",
            createdAt: node.createdAt, owner: node.owner,
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
        id: submit.id, stage: submit.stage,
        content: submit.content ? truncateText(JSON.stringify(submit.content), ASSISTANT_CONFIG.TRUNCATE_SUBMIT_CONTENT) : "",
        createdAt: submit.createdAt, userId: submit.userId,
    }));
}

async function getChatHistory(projectId) {
    const chatTurns = await ChatTurn.findAll({
        where: { projectId },
        attributes: ["userContent", "assistantContent", "username", "assistantUsername", "createdAt"],
        limit: ASSISTANT_CONFIG.DB_CHAT_HISTORY_LIMIT,
        order: [["createdAt", "DESC"]],
    });

    const history = [];
    chatTurns.reverse().forEach((turn) => {
        if (turn.userContent) {
            history.push({
                role: "user",
                content: truncateText(turn.userContent, ASSISTANT_CONFIG.TRUNCATE_CHAT_CONTENT),
                username: turn.username, createdAt: turn.createdAt,
            });
        }
        if (turn.assistantContent) {
            history.push({
                role: "assistant",
                content: truncateText(turn.assistantContent, ASSISTANT_CONFIG.TRUNCATE_CHAT_CONTENT),
                username: turn.assistantUsername, createdAt: turn.createdAt,
            });
        }
    });
    return history.slice(-ASSISTANT_CONFIG.CHAT_HISTORY_FINAL_LIMIT);
}

async function getActivitySummary(projectId) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - ASSISTANT_CONFIG.ACTIVITY_SUMMARY_DAYS);

    const taskChanges = await TaskChangeLog.findAll({
        where: { projectId, createdAt: { [Op.gte]: daysAgo } },
        limit: ASSISTANT_CONFIG.DB_TASK_CHANGES_LIMIT,
        order: [["createdAt", "DESC"]],
    });

    return {
        taskChanges: {
            total: taskChanges.length,
            byAction: taskChanges.reduce((acc, c) => { acc[c.changeType] = (acc[c.changeType] || 0) + 1; return acc; }, {}),
            byField: taskChanges.reduce((acc, c) => { if (c.fieldName) acc[c.fieldName] = (acc[c.fieldName] || 0) + 1; return acc; }, {}),
        },
        submitChanges: { total: 0 },
    };
}

// ============================================================================
// LLM 分析
// ============================================================================

async function analyzeProjectStateWithLLM({ kanban, ideaWall, submissions, stageMeta, projectBasics, activitySummary }) {
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
        let jsonContent = result.content.trim();
        if (jsonContent.startsWith('```json')) {
            jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
            jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return JSON.parse(jsonContent);
    } catch (error) {
        logger.error({ err: error }, 'LLM analysis failed, using fallback');
        if (result?.content) logger.error(`LLM raw response: ${result.content.substring(0, 500)}`);
        const basicSummary = generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta });
        return { ...basicSummary, degradedMode: true, degradedReason: 'LLM 服務暫時不可用' };
    }
}

function generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta }) {
    const allTaskTitles = kanban.flatMap(col => col.tasks.map(task => task.title).filter(Boolean));
    const dataQualityHints = [];
    if (ideaWall.total === 0) dataQualityHints.push("想法牆內容偏少，建議增加研究素材");
    if (kanban.every(col => col.tasks.length === 0)) dataQualityHints.push("看板無任務卡片，建議開始規劃工作項目");
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
        logger.error({ err: error }, 'Report generation failed');
        return `# 專案分析報告：${projectBasics.name}

## 整體狀況
${projectAnalysis.progressOverview}

## 任務流動分析  
${projectAnalysis.taskFlowAnalysis}

## 研究品質評估
${projectAnalysis.researchQuality}

## 階段符合度
${projectAnalysis.stageCompliance}

${projectAnalysis.riskFactors?.length > 0 ? `## 需要注意\n${projectAnalysis.riskFactors.map(risk => `- ${risk}`).join('\n')}` : ''}

${projectAnalysis.actionableInsights?.length > 0 ? `## 建議行動\n${projectAnalysis.actionableInsights.map(insight => `- ${insight}`).join('\n')}` : ''}`;
    }
}

// ============================================================================
// 匯出
// ============================================================================

module.exports = {
    // 工具
    truncateText,
    estimateTokenCount,
    // 基礎資料
    getProjectBasicsAndUserRole,
    // 階段
    getStageMeta,
    getCompleteStageStructure,
    getStageCompletionStatus,
    // 快照
    getKanbanSnapshot,
    getIdeaWallSnapshot,
    getSubmissions,
    getChatHistory,
    getActivitySummary,
    // LLM 分析
    analyzeProjectStateWithLLM,
    generateBasicSummaries,
    generateReportFromAnalysis,
};
