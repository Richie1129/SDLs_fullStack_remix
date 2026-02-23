/**
 * 個人學習歷程服務
 *
 * 依 userId 聚合學生在特定專案中的個人學習資料，
 * 包含：個人反思、正式提交、任務貢獻、想法牆節點。
 *
 * AI 敘事生成使用三層 fallback：
 *   1. vLLM Gemma-3-27b  (VLLM_BASE_URL)
 *   2. vLLM GPT-OSS-20b  (HSUEH_VLLM_BASE_URL)
 *   3. Gemini 2.5-flash  (fallback)
 */

const { Op } = require('sequelize');
const axios = require('axios');
const User = require('../models/user');
const Project = require('../models/project');
const Daily_personal = require('../models/daily_personal');
const Submit = require('../models/submit');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const TaskChangeLog = require('../models/task_change_log');
const HelpSeekingLog = require('../models/help_seeking_log');
const IdeaWallMessage = require('../models/idea_wall_message');
const Rag_message = require('../models/rag_message');

const STAGE_TITLES = {
  1: '定標階段',
  2: '擇策階段',
  3: '監評階段',
  4: '調節階段'
};

const SUB_STAGE_TITLES = {
  '1-1': '提出研究主題',
  '1-2': '提出研究目的',
  '1-3': '提出研究問題',
  '2-1': '訂定研究構想表',
  '2-2': '設計研究記錄表',
  '2-3': '規劃研究排程',
  '3-1': '進行嘗試性研究',
  '3-2': '分析資料與繪圖',
  '3-3': '撰寫研究結果',
  '4-1': '檢視研究進度',
  '4-2': '進行研究討論',
  '4-3': '撰寫研究結論'
};

const ALL_SUB_STAGES = Object.keys(SUB_STAGE_TITLES);

/**
 * 聚合學生個人學習歷程資料
 * @param {number} projectId
 * @param {number} userId
 * @returns {Object} 結構化的個人學習資料
 */
async function aggregateStudentPortfolioData(projectId, userId) {
  // 取得使用者資訊（需要 username 做字串比對）
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'account', 'class', 'seatNumber']
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  const project = await Project.findByPk(projectId, {
    attributes: ['id', 'name', 'describe', 'mentor', 'currentStage', 'currentSubStage', 'createdAt'],
    include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'username'] }]
  });
  if (!project) throw new Error('PROJECT_NOT_FOUND');

  // 確認學生有加入此專案
  const isMember = (project.users || []).some(u => u.id === userId);
  if (!isMember) throw new Error('NOT_PROJECT_MEMBER');

  // 並行查詢所有個人資料
  const [reflections, submits, taskLogs, ideaWalls, helpLogs, aiChatRows] = await Promise.all([
    // 個人反思（含自由反思，stage 可為 null）
    Daily_personal.findAll({
      where: { userId, projectId },
      attributes: ['id', 'title', 'content', 'stage', 'fileUrl', 'originalName', 'mimeType', 'createdAt'],
      order: [['createdAt', 'ASC']]
    }),

    // 個人正式提交（排除 Stage 5）
    Submit.findAll({
      where: {
        userId,
        projectId,
        stage: { [Op.notLike]: '5-%' }
      },
      attributes: ['id', 'stage', 'content', 'fileUrl', 'originalName', 'mimeType', 'fileSize', 'createdAt'],
      order: [['stage', 'ASC']]
    }),

    // 任務變更記錄（以姓名比對）
    TaskChangeLog.findAll({
      where: { changedBy: user.username, projectId },
      attributes: ['id', 'taskId', 'changeType', 'fieldName', 'oldValue', 'newValue', 'description', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 100
    }),

    // 想法牆節點 + 此學生的聊天訊息（以姓名比對節點、以 userId 比對訊息）
    Idea_wall.findAll({
      where: { projectId },
      attributes: ['id', 'name', 'stage'],
      include: [
        {
          model: Node,
          as: 'nodes',
          where: { owner: user.username },
          attributes: ['id', 'title', 'content', 'createdAt'],
          required: false
        },
        {
          model: IdeaWallMessage,
          where: { senderId: userId },
          attributes: ['id', 'content', 'isAiIntervention', 'createdAt'],
          required: false,
          separate: true,
          order: [['createdAt', 'ASC']],
          limit: 60
        }
      ]
    }),

    // 求助記錄（後設認知資料）
    HelpSeekingLog.findAll({
      where: { userId, projectId },
      attributes: ['id', 'metacognitiveState', 'helpSeekingType', 'effectivenessScore', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 50
    }),

    // 科學助手對話記錄（RAG 問答）
    Rag_message.findAll({
      where: { userId, project_id: projectId },
      attributes: ['id', 'input_message', 'response_message', 'sessionId', 'session_title', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 60
    })
  ]);

  // 整理想法牆節點（攤平）
  const ownedNodes = ideaWalls.flatMap(iw =>
    (iw.nodes || []).map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      ideaWallName: iw.name,
      ideaWallStage: iw.stage,
      createdAt: n.createdAt
    }))
  );

  // 整理想法牆（依 ideaWall 分組，同時包含此學生的節點與聊天訊息）
  const ideaWallChats = ideaWalls
    .filter(iw =>
      (iw.idea_wall_messages && iw.idea_wall_messages.length > 0) ||
      (iw.nodes && iw.nodes.length > 0)
    )
    .map(iw => ({
      ideaWallName: iw.name,
      ideaWallStage: iw.stage,
      nodes: (iw.nodes || []).map(n => ({
        title: n.title,
        content: n.content,
        createdAt: n.createdAt
      })),
      messages: (iw.idea_wall_messages || []).map(m => ({
        content: m.content,
        isAiIntervention: m.isAiIntervention,
        createdAt: m.createdAt
      }))
    }));

  // 整理科學助手對話（依 session 分組）
  const sessionMap = {};
  aiChatRows.forEach(msg => {
    const sid = msg.sessionId || `no-session-${msg.id}`;
    if (!sessionMap[sid]) {
      sessionMap[sid] = {
        sessionTitle: msg.session_title || null,
        exchanges: [],
        createdAt: msg.createdAt
      };
    }
    if (msg.input_message) {
      sessionMap[sid].exchanges.push({
        question: msg.input_message,
        answer: msg.response_message || '',
        createdAt: msg.createdAt
      });
    }
  });
  const aiAssistantSessions = Object.values(sessionMap)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 20);

  // 解析反思：分離「階段性反思」和「自由反思」
  const stageReflections = {};
  const freeReflections = [];

  for (let i = 1; i <= 4; i++) stageReflections[i] = [];

  reflections.forEach(r => {
    const parsed = parseReflectionContent(r);
    const stageNum = r.stage ? parseInt(r.stage) : null;
    if (stageNum && stageNum >= 1 && stageNum <= 4) {
      stageReflections[stageNum].push(parsed);
    } else {
      freeReflections.push(parsed);
    }
  });

  // 解析提交：按子階段分組
  const submitMap = {};
  submits.forEach(s => {
    let content = s.content;
    try { content = JSON.parse(s.content); } catch { /* keep raw */ }
    submitMap[s.stage] = {
      id: s.id,
      stage: s.stage,
      stageTitle: SUB_STAGE_TITLES[s.stage] || s.stage,
      content,
      fileUrl: s.fileUrl,
      originalName: s.originalName,
      createdAt: s.createdAt
    };
  });

  // 計算完整度
  const completeness = checkCompleteness(reflections, submitMap);

  return {
    student: {
      id: user.id,
      username: user.username,
      account: user.account,
      class: user.class,
      seatNumber: user.seatNumber
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.describe,
      mentor: project.mentor,
      currentStage: project.currentStage,
      currentSubStage: project.currentSubStage,
      startDate: project.createdAt,
      members: (project.users || []).map(u => u.username)
    },
    stages: buildStageData(stageReflections, submitMap, taskLogs, ownedNodes),
    freeReflections,
    ideaWallChats,
    aiAssistantSessions,
    helpLogs: helpLogs.map(h => ({
      metacognitiveState: h.metacognitiveState,
      helpSeekingType: h.helpSeekingType,
      effectivenessScore: h.effectivenessScore,
      createdAt: h.createdAt
    })),
    completeness,
    generatedAt: new Date().toISOString()
  };
}

/**
 * 將資料組織成按 SDL 四階段分節的結構
 */
function buildStageData(stageReflections, submitMap, taskLogs, ownedNodes) {
  const stages = [];

  for (let i = 1; i <= 4; i++) {
    // 此階段的子階段 submit
    const stageSubmits = Object.entries(submitMap)
      .filter(([key]) => key.startsWith(`${i}-`))
      .map(([, val]) => val);

    // 此階段的任務貢獻（簡化：只取 create/move 類型）
    const stageTasks = taskLogs
      .filter(log => {
        const logDate = new Date(log.createdAt);
        // 無法精確對應階段日期，先全部附上，由 AI 判斷
        return true;
      })
      .filter((_, idx) => idx < 20); // 防止過長

    // 此階段的想法牆節點
    const stageNodes = ownedNodes.filter(n =>
      n.ideaWallStage && n.ideaWallStage.startsWith(`${i}`)
    );

    stages.push({
      stageNumber: i,
      stageTitle: STAGE_TITLES[i],
      reflections: stageReflections[i] || [],
      submits: stageSubmits,
      taskContributions: stageTasks,
      nodes: stageNodes,
      hasContent:
        (stageReflections[i]?.length > 0) ||
        stageSubmits.length > 0 ||
        stageNodes.length > 0
    });
  }

  return stages;
}

/**
 * 解析反思內容（支援 5Rs JSON 和純文字）
 */
function parseReflectionContent(reflection) {
  let is5Rs = false;
  let data5Rs = null;
  let textContent = reflection.content || '';

  try {
    const parsed = JSON.parse(reflection.content);
    if (parsed && parsed.type === '5Rs_reflection' && parsed.data) {
      is5Rs = true;
      data5Rs = parsed.data;
      textContent = Object.values(parsed.data).filter(Boolean).join('\n');
    }
  } catch { /* 純文字反思 */ }

  return {
    id: reflection.id,
    title: reflection.title,
    stage: reflection.stage,
    is5Rs,
    data5Rs,
    textContent,
    fileUrl: reflection.fileUrl,
    originalName: reflection.originalName,
    createdAt: reflection.createdAt
  };
}

/**
 * 檢查學習歷程完整度
 */
function checkCompleteness(reflections, submitMap) {
  const hasAnyReflection = reflections.length > 0;

  const missingSubmits = ALL_SUB_STAGES.filter(
    subStage => !submitMap[subStage]
  );

  return {
    hasAnyReflection,
    totalReflections: reflections.length,
    missingSubmits,
    missingSubmitCount: missingSubmits.length,
    completedSubmitCount: ALL_SUB_STAGES.length - missingSubmits.length,
    totalSubStages: ALL_SUB_STAGES.length,
    // 是否需要匯出前提醒
    needsReminder: !hasAnyReflection || missingSubmits.length > 0
  };
}

/**
 * 建構 AI 敘事生成的 Prompt
 */
function buildNarrativePrompt(portfolioData) {
  const { student, project, stages, freeReflections, ideaWallChats, aiAssistantSessions } = portfolioData;

  const stageSection = stages.map(s => {
    const reflectionsText = s.reflections.length > 0
      ? s.reflections.map(r => {
          if (r.is5Rs && r.data5Rs) {
            return `[5Rs 反思]\n描述：${r.data5Rs.reporting || ''}\n反應：${r.data5Rs.responding || ''}\n關聯：${r.data5Rs.relating || ''}\n分析：${r.data5Rs.reasoning || ''}\n重建：${r.data5Rs.reconstructing || ''}`;
          }
          return `[反思] ${r.title}：${r.textContent}`;
        }).join('\n\n')
      : '（本階段無個人反思記錄）';

    const submitsText = s.submits.length > 0
      ? s.submits.map(sub => {
          const content = typeof sub.content === 'object'
            ? Object.entries(sub.content).map(([k, v]) => `${k}：${v}`).join('；')
            : (sub.content || '');
          return `子階段 ${sub.stage} ${sub.stageTitle}：${content.slice(0, 200)}`;
        }).join('\n')
      : '（本階段無正式提交）';

    const nodesText = s.nodes.length > 0
      ? s.nodes.map(n => `「${n.title}」`).join('、')
      : '（無）';

    return `## ${s.stageTitle}（第 ${s.stageNumber} 階段）
正式提交：
${submitsText}

個人反思：
${reflectionsText}

想法牆貢獻節點：${nodesText}`;
  }).join('\n\n---\n\n');

  const freeSection = freeReflections.length > 0
    ? `## 跨階段自由省思
${freeReflections.map(r => `- ${r.title}：${r.textContent.slice(0, 300)}`).join('\n')}`
    : '';

  const ideaWallChatSection = (ideaWallChats && ideaWallChats.length > 0)
    ? `## 想法牆記錄（節點與討論）
${ideaWallChats.map(iw => {
      const nodesText = iw.nodes.length > 0
        ? iw.nodes.map(n => `  節點「${n.title}」：${(n.content || '').slice(0, 100)}`).join('\n')
        : '';
      const msgPreview = iw.messages
        .filter(m => !m.isAiIntervention)
        .slice(0, 4)
        .map(m => `  · ${m.content.slice(0, 120)}`)
        .join('\n');
      return `【${iw.ideaWallName}】\n${nodesText}${nodesText && msgPreview ? '\n' : ''}${msgPreview || '  （無訊息記錄）'}`;
    }).join('\n\n')}`
    : '';

  const aiChatSection = (aiAssistantSessions && aiAssistantSessions.length > 0)
    ? `## 科學助手提問記錄（共 ${aiAssistantSessions.reduce((a, s) => a + s.exchanges.length, 0)} 個提問）
${aiAssistantSessions.flatMap(s => s.exchanges.map(e => e.question)).slice(0, 15).map((q, i) => `  ${i + 1}. ${q.slice(0, 120)}`).join('\n')}`
    : '';

  return `請根據以下學生的真實學習資料，生成一份個人學習歷程敘述。

【輸出規則，必須嚴格遵守】
1. 直接輸出正文，禁止任何前言、開頭語或確認句（例如「好的」「我將為您」「以下是」等一律不得出現）
2. 只能使用提供的資料，絕對不能憑空編造
3. 若某階段資料不足，以「本階段記錄較少，以下依據現有資料呈現」一句帶過，然後繼續
4. 全程使用第一人稱（我）
5. 每個有資料的階段約 150-250 字
6. 直接引用學生反思中的關鍵句（用引號標示）
7. 強調困難、轉變與成長，而非流水帳
8. 使用 Markdown 格式輸出：階段用 ### 標題，段落間用空行分隔

【學生資訊】
姓名：${student.username}
班級：${student.class || '—'}
專案名稱：${project.name}
指導教師：${project.mentor || '—'}

${stageSection}

${freeSection}

${ideaWallChatSection}

${aiChatSection}

依照「### 定標階段 → ### 擇策階段 → ### 監評階段 → ### 調節階段 → ### 學習總結（約 100 字）」格式輸出，直接從 ### 定標階段 開始。
若有想法牆討論或科學助手對話資料，請在對應階段或學習總結中自然帶入學生曾提出的問題與思考方向，不要另開段落列舉。`;
}

// ============================================================
// AI 敘事生成：vLLM streaming（三層 fallback）
// ============================================================

const SYSTEM_INSTRUCTION = '你是一位專業的學習歷程整理助手，擅長將學生的學習記錄轉化為流暢、真實的個人成長敘述。請全程使用繁體中文。絕對禁止以任何確認語、前言或開頭語（例如「好的」「我將」「以下是」）開始回應，必須直接輸出正文內容。';

/**
 * SSE 工具：向 client 送出一個文字 chunk
 */
function sseChunk(res, content) {
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
}

/**
 * SSE 工具：送出結束訊號
 */
function sseDone(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * 設定 SSE headers
 */
function setSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/**
 * vLLM Gemma-3-27b streaming（VLLM_BASE_URL）
 */
async function streamVLLMGemma(prompt, res) {
  const baseUrl = process.env.VLLM_BASE_URL;
  const model   = process.env.VLLM_MODEL_NAME;
  const apiKey  = process.env.VLLM_API_KEY;

  if (!baseUrl || !model) throw new Error('VLLM_BASE_URL 或 VLLM_MODEL_NAME 未設定');

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.75,
      max_tokens: 3000,
      stream: true
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || 'EMPTY'}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream',
      timeout: 120000
    }
  );

  return pipeVLLMStream(response.data, res, 'gemma-3-27b');
}

/**
 * vLLM GPT-OSS-20b streaming（HSUEH_VLLM_BASE_URL）
 */
async function streamVLLMHsueh(prompt, res) {
  const baseUrl = process.env.HSUEH_VLLM_BASE_URL;
  const model   = process.env.HSUEH_VLLM_MODEL_NAME;
  const apiKey  = process.env.HSUEH_VLLM_API_KEY;

  if (!baseUrl || !model) throw new Error('HSUEH_VLLM_BASE_URL 或 HSUEH_VLLM_MODEL_NAME 未設定');

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.75,
      max_tokens: 3000,
      stream: true
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || 'EMPTY'}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream',
      timeout: 120000
    }
  );

  return pipeVLLMStream(response.data, res, 'gpt-oss-20b');
}

/**
 * 將 vLLM OpenAI-compatible SSE 串流轉發給 client
 * vLLM 格式：data: {"choices":[{"delta":{"content":"..."},"finish_reason":null}]}
 */
function pipeVLLMStream(stream, res, modelName) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的最後一行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;

        try {
          const parsed = JSON.parse(raw);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) sseChunk(res, content);
        } catch { /* 非 JSON 片段，略過 */ }
      }
    });

    stream.on('end', () => {
      console.log(`✅ [Portfolio Narrative] ${modelName} 串流完成`);
      resolve();
    });

    stream.on('error', (err) => {
      console.error(`❌ [Portfolio Narrative] ${modelName} 串流錯誤:`, err.message);
      reject(err);
    });
  });
}

/**
 * 學習歷程 AI 敘事生成主入口
 * fallback 鏈：Gemma-3 → GPT-OSS-20b → Gemini
 *
 * @param {string} prompt  - buildNarrativePrompt() 的輸出
 * @param {object} res     - Express response（需已設 SSE headers）
 */
async function streamNarrative(prompt, res) {
  setSseHeaders(res);

  // 1. vLLM Gemma-3-27b
  try {
    console.log('🤖 [Portfolio] 嘗試 vLLM Gemma-3-27b...');
    await streamVLLMGemma(prompt, res);
    sseDone(res);
    return;
  } catch (err) {
    console.warn('⚠️  [Portfolio] Gemma-3 失敗，嘗試 GPT-OSS-20b:', err.message);
  }

  // 2. vLLM GPT-OSS-20b
  try {
    console.log('🤖 [Portfolio] 嘗試 vLLM GPT-OSS-20b...');
    await streamVLLMHsueh(prompt, res);
    sseDone(res);
    return;
  } catch (err) {
    console.warn('⚠️  [Portfolio] GPT-OSS-20b 失敗，fallback Gemini:', err.message);
  }

  // 3. Gemini fallback（使用現有 streamingService）
  console.log('🤖 [Portfolio] 使用 Gemini 2.5-flash fallback...');
  const { streamGeminiResponse } = require('./streamingService');
  await streamGeminiResponse(prompt, res, {
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION
  });
}

module.exports = {
  aggregateStudentPortfolioData,
  buildNarrativePrompt,
  streamNarrative,
  STAGE_TITLES,
  SUB_STAGE_TITLES
};
