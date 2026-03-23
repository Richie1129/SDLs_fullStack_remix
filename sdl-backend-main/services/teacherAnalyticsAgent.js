/**
 * Teacher Analytics Agent Service
 *
 * 功能：收集班級學習數據快照，呼叫 AI 產生教師洞察報告
 * 模型優先順序：Gemini → GPT-OSS (vLLM) → Gemma (vLLM)
 * Gemini 冷卻機制：每個專案 30 分鐘一次；vLLM 無限制
 */

const { Op } = require('sequelize');
const logger = require('../config/logger');

const User = require('../models/user');
const UserProject = require('../models/user_project');
const Project = require('../models/project');
const Sub_stage = require('../models/sub_stage');
const Submit = require('../models/submit');
const Daily_personal = require('../models/daily_personal');
const Task = require('../models/task');
const Column = require('../models/column');
const Kanban = require('../models/kanban');
const UsageSession = require('../models/usage_session');
const HelpSeekingAvoidanceRisk = require('../models/help_seeking_avoidance_risk');

const { callWithFallback } = require('./llmGateway');

// ============================================================================
// 常數
// ============================================================================

const ANALYSIS_DAYS = 7;
const STALLED_TASK_DAYS = 5;
const INACTIVE_DAYS = 7;

const STAGE_NAMES = { 1: '定標', 2: '擇策', 3: '監評', 4: '調節' };

// ============================================================================
// Gemini 冷卻管理（每個專案 30 分鐘，存於資料庫）
// ============================================================================

const GEMINI_COOLDOWN_MS = 30 * 60 * 1000;

async function getGeminiCooldown(projectId) {
    const TeacherAnalysisReport = require('../models/teacher_analysis_report');
    const last = await TeacherAnalysisReport.findOne({
        where: {
            projectId,
            model: { [Op.iLike]: '%gemini%' },
        },
        attributes: ['createdAt'],
        order: [['createdAt', 'DESC']],
    });

    if (!last) return { onCooldown: false, remainingMs: 0, cooldownUntil: null };

    const lastTime = new Date(last.createdAt).getTime();
    const elapsed = Date.now() - lastTime;
    if (elapsed >= GEMINI_COOLDOWN_MS) return { onCooldown: false, remainingMs: 0, cooldownUntil: null };

    const remainingMs = GEMINI_COOLDOWN_MS - elapsed;
    return { onCooldown: true, remainingMs, cooldownUntil: lastTime + GEMINI_COOLDOWN_MS };
}

async function buildFallbackChain(projectId) {
    const { onCooldown } = await getGeminiCooldown(projectId);
    if (onCooldown) {
        logger.info(`[TeacherAgent] 專案 ${projectId} Gemini 冷卻中，使用 vLLM`);
        return [
            { type: 'vllm', key: 'gpt-oss', label: 'GPT-OSS-20B' },
            { type: 'vllm', key: 'gemma', label: 'Gemma-3-27B' },
        ];
    }
    return [
        { type: 'gemini', label: 'Gemini' },
        { type: 'vllm', key: 'gpt-oss', label: 'GPT-OSS-20B' },
        { type: 'vllm', key: 'gemma', label: 'Gemma-3-27B' },
    ];
}

// ============================================================================
// SSE 工具
// ============================================================================

function sendEvent(res, eventType, data) {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ============================================================================
// 資料收集
// ============================================================================

async function gatherClassSnapshot(projectId, res) {
    sendEvent(res, 'status', { message: '正在讀取班級名單...' });

    // 1. 取得專案資訊（含當前階段）
    const project = await Project.findByPk(projectId, {
        attributes: ['id', 'name', 'currentStage', 'currentSubStage'],
    });

    // 取得當前 sub_stage 的學習目標描述
    let subStageInfo = null;
    if (project?.currentStage && project?.currentSubStage) {
        const subStageDbId = (project.currentStage - 1) * 3 + project.currentSubStage;
        const subStage = await Sub_stage.findByPk(subStageDbId, {
            attributes: ['name', 'description'],
        }).catch(() => null);
        if (subStage) {
            subStageInfo = {
                stageName: STAGE_NAMES[project.currentStage] || `第 ${project.currentStage} 階段`,
                stageNum: project.currentStage,
                subStageNum: project.currentSubStage,
                subStageName: subStage.name,
                subStageDescription: subStage.description,
            };
        }
    }

    // 2. 取得專案成員
    const userProjects = await UserProject.findAll({
        where: { projectId },
        attributes: ['userId'],
    });
    const allUserIds = userProjects.map(up => up.userId);
    if (allUserIds.length === 0) return null;

    const students = await User.findAll({
        where: { id: allUserIds, role: 'student' },
        attributes: ['id', 'username'],
    });
    const studentIds = students.map(s => s.id);

    sendEvent(res, 'status', { message: `找到 ${studentIds.length} 位學生，正在讀取學習數據...` });

    const sinceDate = new Date(Date.now() - ANALYSIS_DAYS * 24 * 60 * 60 * 1000);
    const stalledSince = new Date(Date.now() - STALLED_TASK_DAYS * 24 * 60 * 60 * 1000);

    // 3. 近 7 天提交紀錄
    sendEvent(res, 'status', { message: '正在分析提交紀錄...' });
    const recentSubmits = await Submit.findAll({
        where: { userId: studentIds, createdAt: { [Op.gte]: sinceDate } },
        attributes: ['userId', 'createdAt'],
    });

    // 4. 近 7 天反思紀錄
    sendEvent(res, 'status', { message: '正在分析反思紀錄...' });
    const recentReflections = await Daily_personal.findAll({
        where: { userId: studentIds, projectId, createdAt: { [Op.gte]: sinceDate } },
        attributes: ['userId', 'createdAt'],
    }).catch(() => []);

    // 5. 卡頓任務（Project → Kanban → Column → Task）
    sendEvent(res, 'status', { message: '正在檢查任務進度...' });
    const stalledTasks = await Task.findAll({
        where: { updatedAt: { [Op.lte]: stalledSince } },
        attributes: ['id', 'title', 'assignees', 'updatedAt'],
        include: [{
            model: Column,
            attributes: [],
            required: true,
            include: [{
                model: Kanban,
                attributes: [],
                required: true,
                where: { projectId },
            }],
        }],
    }).catch(() => []);

    // 6. 最後活動時間
    sendEvent(res, 'status', { message: '正在計算學生活躍狀態...' });
    const sessions = await UsageSession.findAll({
        where: { userId: studentIds },
        attributes: ['userId', 'createdAt'],
        order: [['createdAt', 'DESC']],
    });

    // 7. 求助迴避風險
    sendEvent(res, 'status', { message: '正在讀取求助風險警示...' });
    const avoidanceRisks = await HelpSeekingAvoidanceRisk.findAll({
        where: { projectId, userId: studentIds, riskLevel: { [Op.in]: ['high', 'medium'] } },
        attributes: ['userId', 'riskLevel', 'struggleScore'],
        order: [['struggleScore', 'DESC']],
    }).catch(() => []);

    // -------------------------------------------------------------------------
    // 彙整
    // -------------------------------------------------------------------------
    const submitCountByUser = {};
    recentSubmits.forEach(s => { submitCountByUser[s.userId] = (submitCountByUser[s.userId] || 0) + 1; });

    const reflectionCountByUser = {};
    recentReflections.forEach(r => { reflectionCountByUser[r.userId] = (reflectionCountByUser[r.userId] || 0) + 1; });

    const lastSessionByUser = {};
    sessions.forEach(s => { if (!lastSessionByUser[s.userId]) lastSessionByUser[s.userId] = s.createdAt; });

    const avoidanceByUser = {};
    avoidanceRisks.forEach(r => { avoidanceByUser[r.userId] = { riskLevel: r.riskLevel, score: r.struggleScore }; });

    const studentSummaries = students.map(student => {
        const lastActive = lastSessionByUser[student.id];
        const daysSinceActive = lastActive
            ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
            : null;
        return {
            id: student.id,
            name: student.username,
            submitsThisWeek: submitCountByUser[student.id] || 0,
            reflectionsThisWeek: reflectionCountByUser[student.id] || 0,
            daysSinceActive,
            isInactive: daysSinceActive === null || daysSinceActive >= INACTIVE_DAYS,
            avoidanceRisk: avoidanceByUser[student.id] || null,
        };
    });

    const stalledTaskSummaries = stalledTasks.map(t => {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / 86400000);
        // assignees 是 JSONB array，每個元素可能是 { id, username } 物件
        let assigneeNames = '未指派';
        if (Array.isArray(t.assignees) && t.assignees.length > 0) {
            assigneeNames = t.assignees
                .map(a => (typeof a === 'object' && a.username) ? a.username : String(a))
                .join('、');
        }
        return { title: t.title, assigneeNames, daysSinceUpdate };
    });

    return {
        projectId,
        projectName: project?.name || `專案 ${projectId}`,
        subStageInfo,
        totalStudents: studentIds.length,
        activeStudents: studentSummaries.filter(s => !s.isInactive).length,
        totalSubmits: recentSubmits.length,
        totalReflections: recentReflections.length,
        highRiskCount: avoidanceRisks.filter(r => r.riskLevel === 'high').length,
        studentSummaries,
        stalledTasks: stalledTaskSummaries,
    };
}

// ============================================================================
// System Prompt（含 SDL 方法論背景）
// ============================================================================

const SYSTEM_PROMPT = `你是一位資深學習輔導顧問，協助教師觀察學生的自主學習行為，並提供具體可執行的支持建議。

## 你分析的課程背景

本課程採用四階段 SRL（自我調節學習）循環，又稱 SDL 自主學習框架：

- **定標階段**（Stage 1）：學生確定研究主題、研究目的與研究問題。這個階段常見困難：主題太廣、方向不清、組員間尚未達成共識。
- **擇策階段**（Stage 2）：學生訂定研究構想、設計記錄表格、規劃時程。這個階段常見困難：計畫過於理想化、低估時程、未能拆解任務。
- **監評階段**（Stage 3）：學生實際執行研究、分析資料、撰寫成果。這個階段常見困難：實驗結果不如預期、資料分析卡住、對數據詮釋沒把握。
- **調節階段**（Stage 4）：學生檢視進度、討論發現、撰寫結論。這個階段常見困難：結論過於表面、不知如何連結研究問題與結果、時間壓力大。

同樣是「本週沒有提交」，在定標階段（可能還在構思）與在監評階段（研究實作卡住）的緊急程度完全不同。請根據當前階段解讀數據。

## 你的行為準則

1. **只陳述數據，不評斷人**：報告中不對任何人的行為（包含教師）做道德或能力評判。
2. **建議必須具體**：每個行動建議必須是教師可以在課堂或課前課後落實的具體行動。禁止「多關心」「多鼓勵」「保持關注」等無法量化的廢話。
3. **可能原因保持開放**：困難推測必須基於階段特性，語氣用「可能」「或許」，絕不下定論。
4. **給教師的問題只是引導**：問題的目的是幫助教師自己判斷，問題本身不能暗示教師做錯了什麼或疏忽了什麼。
5. **使用繁體中文**，以 Markdown 格式回應。`;

// ============================================================================
// Prompt 建構
// ============================================================================

function buildPrompt(snapshot, platformSpecific = false) {
    const {
        projectName, subStageInfo,
        studentSummaries, stalledTasks,
        totalStudents, activeStudents,
    } = snapshot;

    const inactiveStudents = studentSummaries.filter(s => s.isInactive);
    const highRiskStudents = studentSummaries.filter(s => s.avoidanceRisk?.riskLevel === 'high');
    const mediumRiskStudents = studentSummaries.filter(s => s.avoidanceRisk?.riskLevel === 'medium');

    const lines = [
        `以下是「${projectName}」專案的班級學習數據（統計區間：過去 ${ANALYSIS_DAYS} 天）：`,
        '',
    ];

    // 當前學習階段脈絡
    if (subStageInfo) {
        lines.push('【當前學習階段】');
        lines.push(`階段：${subStageInfo.stageName}階段（${subStageInfo.stageNum}-${subStageInfo.subStageNum} ${subStageInfo.subStageName}）`);
        lines.push(`學習目標：${subStageInfo.subStageDescription}`);
        lines.push('');
    }

    // 班級概況
    lines.push('【班級概況】');
    lines.push(`共 ${totalStudents} 位學生，本週有活動 ${activeStudents} 位，無活動 ${inactiveStudents.length} 位`);
    lines.push('');

    // 各學生數據
    lines.push('【各學生本週數據】');
    studentSummaries.forEach(s => {
        const activityStr = s.daysSinceActive === null
            ? '從未登入'
            : s.daysSinceActive === 0 ? '今日有活動' : `${s.daysSinceActive} 天前有活動`;
        const riskStr = s.avoidanceRisk
            ? `、求助迴避${s.avoidanceRisk.riskLevel === 'high' ? '高' : '中'}風險（分數 ${s.avoidanceRisk.score}）`
            : '';
        lines.push(`- ${s.name}：提交 ${s.submitsThisWeek} 次、反思 ${s.reflectionsThisWeek} 篇、${activityStr}${riskStr}`);
    });

    if (stalledTasks.length > 0) {
        lines.push('');
        lines.push(`【任務卡頓（超過 ${STALLED_TASK_DAYS} 天未更新）】`);
        stalledTasks.slice(0, 5).forEach(t => {
            lines.push(`- 「${t.title}」— 負責人：${t.assigneeNames}，已 ${t.daysSinceUpdate} 天未更新`);
        });
    }

    if (highRiskStudents.length > 0 || mediumRiskStudents.length > 0) {
        lines.push('');
        lines.push('【求助迴避風險】');
        highRiskStudents.forEach(s => lines.push(`- ${s.name}（高風險，分數 ${s.avoidanceRisk.score}）`));
        mediumRiskStudents.forEach(s => lines.push(`- ${s.name}（中風險，分數 ${s.avoidanceRisk.score}）`));
    }

    // 輸出指令
    const actionInstruction = platformSpecific
        ? `具體結合以下平台功能（選擇最合適的一種）：
    - **看板任務卡**：幫學生新增或調整任務卡，讓待做事項可見
    - **想法牆**：留一則引導問題或回饋，讓學生在下次登入時看到
    - **反思日誌**：提示學生針對當前困難寫一篇短反思
   並附上 1 個學生在現實生活中可以做的具體行動（例如：查找資料、和組員討論某個問題）`
        : `提供 1 個教師可以在課堂或課前課後執行的具體行動，以及 1 個學生在現實生活中可以做的具體行動`;

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('請根據以上數據，嚴格按照下列 Markdown 格式輸出班級洞察報告：');
    lines.push('');
    lines.push('## 本週概況');
    lines.push('（1-2 句話描述班級整體狀況，只陳述數據事實）');
    lines.push('');
    lines.push('## 優先關注');
    lines.push('（依需要關注的程度排序，列出 2-3 位學生）');
    lines.push('');
    lines.push('### [學生姓名]');
    lines.push('- **狀況：** [根據數據的具體描述]');
    lines.push('- **可能遇到的困難：** [結合當前階段特性推測，語氣保持開放，用「可能」「或許」]');
    lines.push(`- **建議行動：** [${actionInstruction}]`);
    lines.push('');
    lines.push('## 全班觀察');
    lines.push('（1 點全班層面的模式性觀察，只陳述現象）');
    lines.push('');
    lines.push('## 可能的方向');
    lines.push('（1-2 個開放式問題，幫助教師自己判斷情況；問題語氣必須中性，絕不暗示批評或指責）');

    return lines.join('\n');
}

// ============================================================================
// 主入口：分析專案
// ============================================================================

/**
 * @param {number} projectId
 * @param {object} res - Express response（已設定 SSE headers）
 * @param {{ platformSpecific?: boolean }} options
 */
async function analyzeProject(projectId, res, options = {}) {
    const { platformSpecific = false } = options;

    const snapshot = await gatherClassSnapshot(projectId, res);

    if (!snapshot || snapshot.totalStudents === 0) {
        sendEvent(res, 'error', { message: '此專案沒有學生資料可分析' });
        return { model: null, geminiUsed: false };
    }

    const snapshotSummary = {
        totalStudents: snapshot.totalStudents,
        activeStudents: snapshot.activeStudents,
        totalSubmits: snapshot.totalSubmits,
        totalReflections: snapshot.totalReflections,
        stalledTaskCount: snapshot.stalledTasks.length,
        highRiskCount: snapshot.highRiskCount,
        subStageInfo: snapshot.subStageInfo,
    };

    sendEvent(res, 'snapshot', snapshotSummary);
    sendEvent(res, 'status', { message: '資料收集完成，正在生成分析報告...' });

    const fallbackChain = await buildFallbackChain(projectId);
    const userPrompt = buildPrompt(snapshot, platformSpecific);

    const result = await callWithFallback({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        fallbackChain,
        timeout: 60000,
    });

    sendEvent(res, 'report', { content: result.content, model: result.model });

    return { model: result.model, content: result.content, snapshot: snapshotSummary };
}

module.exports = {
    analyzeProject,
    getGeminiCooldown,
    GEMINI_COOLDOWN_MS,
};
