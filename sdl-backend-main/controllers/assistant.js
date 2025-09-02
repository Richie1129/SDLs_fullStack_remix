const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const Project = require('../models/project');
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Submit = require('../models/submit');
const TaskChangeLog = require('../models/task_change_log');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const Chatroom_message = require('../models/chatroom_message');
const Process = require('../models/process');
const Stage = require('../models/stage');
const Sub_stage = require('../models/sub_stage');
const { callGPTAPI } = require('../services/gpt');
const { callGeminiAPI } = require('../services/gemini');

// Helper: build latest kanban data for a project (ordered columns and tasks)
async function buildKanbanData(projectId) {
  const kanbanRows = await Kanban.findAll({
    attributes: ['id', 'column'],
    where: { projectId }
  });
  if (!kanbanRows || kanbanRows.length === 0) return [];
  const { id: kanbanId, column: columnOrder } = kanbanRows[0];

  const columns = await Column.findAll({
    attributes: ['id', 'name', 'task'],
    where: { kanbanId }
  });

  const colMap = new Map(columns.map(c => [c.id, c.toJSON ? c.toJSON() : c]));
  const orderedColumns = (Array.isArray(columnOrder) ? columnOrder : [])
    .map(colId => colMap.get(colId))
    .filter(Boolean);

  for (let i = 0; i < orderedColumns.length; i++) {
    const col = orderedColumns[i];
    const taskIds = Array.isArray(col.task) ? col.task : [];
    if (taskIds.length === 0) {
      col.task = [];
      continue;
    }
    const tasks = await Task.findAll({
      attributes: ['id','title','content','labels','owner','assignees','images','files','createdAt','updatedAt', 'columnId'],
      where: { columnId: col.id }
    });
    const taskMap = new Map(tasks.map(t => [t.id, t.toJSON ? t.toJSON() : t]));
    col.task = taskIds.map(id => taskMap.get(id)).filter(Boolean);
  }

  return orderedColumns;
}

function safeJson(v) {
  try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; }
}

function loadRubricMarkdown() {
  try {
    const rubricPath = path.join(__dirname, '../../markdown/專案學習歷程五階段 Rubric.md');
    const raw = fs.readFileSync(rubricPath, 'utf8');
    return raw;
  } catch (e) {
    return '';
  }
}

async function getStageMeta(projectId, stageNumber, subStageNumber) {
  // Resolve Stage/Sub_stage via Process ordering
  const process = await Process.findOne({ where: { projectId } });
  if (!process) return {};
  const stageIds = Array.isArray(process.stage) ? process.stage : [];
  const stageId = stageIds[Number(stageNumber) - 1];
  if (!stageId) return {};
  const stage = await Stage.findByPk(stageId);
  if (!stage) return {};
  const subStageIds = Array.isArray(stage.sub_stage) ? stage.sub_stage : [];
  const subStageId = subStageIds[Number(subStageNumber) - 1];
  if (!subStageId) return { stageName: stage.name };
  const subStage = await Sub_stage.findByPk(subStageId);
  return {
    stageName: stage.name,
    subStageName: subStage?.name,
    subStageDescription: subStage?.description,
    requiredFields: subStage?.userSubmit || {}
  };
}

function analyzeRequiredFields(requiredFields = {}, submitRecord) {
  const missing = [];
  const present = [];
  if (!requiredFields || Object.keys(requiredFields).length === 0) return { missing, present };

  const content = submitRecord?.content || {};
  const hasFile = !!(submitRecord?.fileUrl || submitRecord?.fileName || submitRecord?.originalName);

  for (const [label, type] of Object.entries(requiredFields)) {
    if (type === 'file') {
      if (hasFile) present.push(label); else missing.push(label);
    } else {
      const v = content[label];
      if (v == null || String(v).trim() === '') missing.push(label); else present.push(label);
    }
  }
  return { missing, present };
}

exports.getProjectContent = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) return res.status(400).json({ message: '缺少 projectId' });

    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ message: '專案不存在' });

    // Forms/Submits
    const submits = await Submit.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']]
    });

    // Kanban
    const kanban = await buildKanbanData(projectId);

    // Idea Wall + Nodes
    const ideaWalls = await Idea_wall.findAll({
      where: { projectId },
      include: [{ model: Node }]
    });

    // Chat messages (recent 50)
    const chat = await Chatroom_message.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Aggregated files from submits and tasks
    const submitFiles = submits
      .filter(s => s.fileUrl || s.fileName || s.originalName)
      .map(s => ({
        source: 'submit',
        submitId: s.id,
        stage: s.stage,
        fileUrl: s.fileUrl || null,
        fileName: s.fileName || s.originalName || null,
        mimeType: s.mimeType || null,
        createdAt: s.createdAt
      }));

    const taskFiles = [];
    for (const col of kanban) {
      for (const t of (col.task || [])) {
        const files = Array.isArray(t.files) ? t.files : [];
        for (const f of files) {
          taskFiles.push({
            source: 'task',
            taskId: t.id,
            columnId: t.columnId,
            fileUrl: f?.url || f?.fileUrl || null,
            fileName: f?.name || f?.fileName || null,
            mimeType: f?.mimeType || null,
            createdAt: t.updatedAt
          });
        }
      }
    }

    return res.json({
      project: safeJson(project),
      forms: safeJson(submits),
      kanban: safeJson(kanban),
      ideaWall: safeJson(ideaWalls),
      chat: safeJson(chat.reverse()), // chronological
      files: [...submitFiles, ...taskFiles]
    });
  } catch (err) {
    console.error('getProjectContent error:', err);
    return res.status(500).json({ message: '取得專案內容時發生錯誤', error: err.message });
  }
};

function buildPraise(prevMeta, prevSubmit) {
  if (!prevMeta?.subStageName) return '';
  if (prevSubmit) {
    return `恭喜你們完成「${prevMeta.subStageName}」，我有看到你們的提交，做得很好！`;
  }
  return `上一個子階段「${prevMeta.subStageName}」若已完成，記得同步上傳成果，我可以幫你們快速回顧。`;
}

function socraticQuestionsForMessyData() {
  return [
    '你們最想透過數據展示的一個核心發現是什麼？',
    '你們的數據較像是「類別」比較（例如：不同組別的差異）還是「趨勢」變化（例如：隨時間的改變）？'
  ];
}

function suggestionsFromMissing(missing, stageName, subStageName) {
  const tips = [];
  if (missing.length === 0) {
    tips.push('你們的關鍵欄位看起來都已齊備，可以著手整理格式與視覺化，確保讀者一眼看懂重點。');
  } else {
    tips.push(`依據本子階段需求，尚缺：${missing.join('、')}。`);
    tips.push('建議在 Kanban 上新增「補齊缺少欄位/檔案」與「設計資料分析圖表草稿」兩張卡片，並各指派一位組員負責。');
  }
  tips.push('若不確定從哪開始，可以先列出你們已經有的資料型態（數值、類別、時間序列），我再幫你們對應合適圖表。');
  return tips;
}

// 依子階段給出情境化的建議任務（做為 deterministic 基線）
function stageSpecificSuggestedTasks({ s, ss, stageMeta, missing }) {
  const tasks = [];
  const name = (stageMeta?.subStageName || '').trim();

  // 移除通用「缺失補齊」任務卡，改由 suggestions 呈現缺失提醒

  const add = (title, content) => tasks.push({ title, content, labels: ['AI導師'] });

  switch (name) {
    case '提出研究主題':
      add('彙整主題資料來源', '蒐集並列出參考的文章、網站或觀察紀錄，各成員負責至少一則，簡述關鍵發現與研究價值。');
      add('撰寫主題提案草稿', '以200-300字描述研究主題範圍、動機與可能貢獻，準備小組討論版本。');
      break;
    case '提出研究目的':
      add('定義研究目標清單', '列出1-3個具可檢驗性的研究目標，對齊研究動機並避免過於寬泛。');
      add('對齊貢獻與可行性檢核', '逐一檢查每個目標的可行性、所需資源與預期輸出。');
      break;
    case '提出研究問題':
      add('萃取研究變因與假設', '列出自變因/依變因與潛在干擾變因，撰寫對應假設，確認可操作性與可量化。');
      add('對應量測方式', '針對每個變因指定量測工具與單位，避免模糊描述。');
      break;
    case '訂定研究構想表': // 2-1
      add('整理研究材料與工具清單', '列出所需器材/材料之規格與數量，確認可取得與替代方案。');
      add('撰寫研究步驟草案', '逐步條列操作流程，標記關鍵控制點與安全注意事項。');
      add('規劃記錄方式', '決定記錄表單欄位與頻率，預想可能的異常情境與備註欄。');
      break;
    case '設計研究記錄表格': // 2-2
      add('設計紀錄表草稿', '建立欄位（時間、條件、觀測值、備註），並加入單位與填寫範例。');
      add('小規模試填', '用歷程或模擬數據試填3-5筆，檢查欄位是否足夠與易懂。');
      add('蒐集回饋修正表格', '邀請1-2位同學試用並回饋，據此調整欄位與說明文字。');
      break;
    case '規劃研究排程': // 2-3
      add('建立甘特圖/排程表', '標出每個工作項與預估時間、負責人與依賴順序。');
      add('風險緩衝與備案', '為關鍵路徑加入緩衝與備案，避免單點延誤整體時程。');
      break;
    case '進行嘗試性研究': // 3-1
      add('安排嘗試性研究時程', '鎖定日期與場地，明確分工準備器材與紀錄表。');
      add('試行與修正紀錄', '完成一次小規模試行並記錄問題，更新步驟與安全提醒。');
      break;
    case '分析資料與繪圖': // 3-2
      add('清整與驗證資料集', '整理欄位與單位，處理遺漏/異常值，確認資料可用性。');
      add('設計資料分析圖表草稿', '選擇合適圖表（長條/折線/散佈/盒鬚等），標註變數、刻度與圖例。');
      add('撰寫初步結果解讀', '以2-3段描述圖表重點與可能解釋，列出需要再驗證的疑點。');
      break;
    case '撰寫研究成果': // 3-3
      add('整理結果與討論架構', '依「方法-結果-討論」撰寫提綱，併入關鍵圖表與參考文獻。');
      add('撰寫結論草稿', '以要點列出主要發現、限制與未來建議，對齊研究目的。');
      break;
    case '檢視研究進度': // 4-1
      add('製作進度盤點清單', '列出已完成/未完成項與阻礙因素，提出具體調整建議。');
      break;
    case '進行研究討論': // 4-2
      add('整理討論素材', '彙整圖表與關鍵數據，準備3個討論問題，引導同儕/導師回饋。');
      break;
    case '撰寫研究結論': // 4-3
      add('完善結論段落', '對齊研究問題與目的，撰寫可被驗證的結論與限制說明。');
      break;
    case '封面製作': // 5-1
      add('封面設計草圖', '設計題名、作者、學校、日期與主視覺，確保一致性。');
      break;
    case '摘要撰寫': // 5-2
      add('撰寫摘要初稿', '以200-300字涵蓋目的、方法、結果與結論，避免新資訊。');
      break;
    case '目錄編制': // 5-3
      add('自動/手動目錄校正', '檢查層級與頁碼是否一致，章節命名是否清楚一致。');
      break;
    case '內容撰寫': // 5-4
      add('完善各章節內容', '逐章補齊「引言/背景/方法/結果/討論/結論」，統一圖表與引用格式。');
      break;
    case '反思撰寫': // 5-5
      add('完成反思問答', '針對挑戰、學到的能力與未來應用逐題撰寫，對齊 5Rs 框架。');
      break;
    default:
      // 若未匹配，提供一般性推進任務
      add('整理本子階段待辦清單', '將本子階段需要完成的項目拆解為可指派的卡片，設定期限與負責人。');
      break;
  }

  return tasks;
}

function buildCitations({ rubric, stageMeta, latestThisSubmit }) {
  const cites = [];
  // Rubric citation: try to find section around subStageName
  if (rubric && stageMeta?.subStageName) {
    const idx = rubric.indexOf(stageMeta.subStageName);
    if (idx !== -1) {
      const start = Math.max(0, idx - 150);
      const end = Math.min(rubric.length, idx + 300);
      const quote = rubric.slice(start, end);
      cites.push({ type: 'rubric', title: `Rubric - ${stageMeta.subStageName}`, quote });
    }
  }
  // Submit citation: show a compact snapshot of present fields
  if (latestThisSubmit?.content) {
    const keys = Object.keys(latestThisSubmit.content).slice(0, 5);
    if (keys.length) {
      const snippet = keys.reduce((acc, k) => { acc[k] = latestThisSubmit.content[k]; return acc; }, {});
      cites.push({ type: 'submit', title: `提交內容節選 (${latestThisSubmit.stage})`, quote: JSON.stringify(snippet).slice(0, 500) });
    }
  }
  return cites;
}

function intentReply({ userMessage, subStageName }) {
  const text = (userMessage || '').toLowerCase();
  if (!text) return null;
  // very light intent handling
  if (text.includes('亂') || text.includes('不確定') || text.includes('怎麼開始')) {
    return {
      type: 'clarify',
      message: '沒問題，這很常見！我們先從目標與資料型態釐清開始：',
      questions: socraticQuestionsForMessyData()
    };
  }
  if (text.includes('圖') || text.includes('chart')) {
    return {
      type: 'hint',
      message: '根據常見情境：類別比較可用長條圖；趨勢可用折線圖；比例可用圓餅/堆疊長條；分佈可用直方圖/盒鬚圖。想先嘗試哪一種？'
    };
  }
  if (text.includes('卡') || text.includes('kanban')) {
    return {
      type: 'kanban',
      message: '可以建立一張「設計資料分析圖表草稿」與一張「撰寫結果解釋草稿」卡片，分別指派不同組員，設定 2 天內完成的子任務。'
    };
  }
  return {
    type: 'generic',
    message: `我會依照本子階段「${subStageName || ''}」協助你們聚焦。想從資料清整、圖表選型，還是撰寫說明開始呢？`
  };
}

exports.getGuidance = async (req, res) => {
  try {
    const { projectId, currentStage, currentSubStage, userMessage, useLLM } = req.body || {};
    if (!projectId) return res.status(400).json({ message: '缺少 projectId' });

    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ message: '專案不存在' });

    const s = Number(currentStage || project.currentStage || 1);
    const ss = Number(currentSubStage || project.currentSubStage || 1);

    const rubric = loadRubricMarkdown();
    const stageMeta = await getStageMeta(projectId, s, ss);
    const prevMeta = ss > 1 ? await getStageMeta(projectId, s, ss - 1) : {};

    const thisStageTag = `${s}-${ss}`;
    const prevStageTag = ss > 1 ? `${s}-${ss - 1}` : null;

    const latestThisSubmit = await Submit.findOne({
      where: { projectId, stage: thisStageTag },
      order: [['createdAt', 'DESC']]
    });
    const latestPrevSubmit = prevStageTag ? await Submit.findOne({
      where: { projectId, stage: prevStageTag },
      order: [['createdAt', 'DESC']]
    }) : null;

    const { missing, present } = analyzeRequiredFields(stageMeta.requiredFields, latestThisSubmit);

    // Kanban snapshot for LLM personalization
    const kanbanOrdered = await buildKanbanData(projectId);
    const kanbanSnapshot = Array.isArray(kanbanOrdered) ? kanbanOrdered.slice(0, 4).map(col => {
      const tasks = Array.isArray(col.task) ? col.task : [];
      const titles = tasks.map(t => t?.title).filter(Boolean);
      const assignees = Array.from(new Set(tasks.flatMap(t => Array.isArray(t?.assignees) ? t.assignees : [])));
      const labels = Array.from(new Set(tasks.flatMap(t => Array.isArray(t?.labels) ? t.labels : [])));
      return {
        id: col.id,
        name: col.name,
        count: tasks.length,
        topTitles: titles.slice(0, 3),
        topAssignees: assignees.slice(0, 3),
        topLabels: labels.slice(0, 3)
      };
    }) : [];
    const existingTaskTitles = Array.isArray(kanbanOrdered)
      ? Array.from(new Set(kanbanOrdered.flatMap(c => (c.task || []).map(t => t?.title).filter(Boolean)))).slice(0, 24)
      : [];

    // Idea Wall snapshot for LLM personalization
    let ideaWallSnapshot = { walls: 0, nodes: 0, topTitles: [] };
    try {
      const ideaWalls = await Idea_wall.findAll({
        where: { projectId },
        include: [{ model: Node }]
      });
      const allNodes = ideaWalls.flatMap(w => Array.isArray(w.nodes) ? w.nodes : (w.Nodes || []));
      const nodeTitles = allNodes.map(n => n?.title).filter(Boolean);
      ideaWallSnapshot = {
        walls: ideaWalls.length,
        nodes: allNodes.length,
        topTitles: nodeTitles.slice(0, 8)
      };
    } catch (_) {}

    // Recent activity signals from task change logs
    let recentActivity = { totals: { create: 0, update: 0, move: 0, delete: 0 }, columns: [] };
    try {
      const logs = await TaskChangeLog.findAll({
        where: { projectId },
        include: [{ model: Task, attributes: ['id', 'title', 'columnId'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 200
      });
      // Totals by type
      for (const l of logs) {
        if (recentActivity.totals[l.changeType] != null) recentActivity.totals[l.changeType] += 1;
      }
      // Per-column last activity and recent counts (7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const byColumn = new Map();
      for (const col of (kanbanOrdered || [])) {
        byColumn.set(col.id, { columnId: col.id, columnName: col.name, lastActiveAt: null, recentCount: 0 });
      }
      for (const l of logs) {
        const colId = l.Task?.columnId;
        if (!colId || !byColumn.has(colId)) continue;
        const entry = byColumn.get(colId);
        const ts = new Date(l.createdAt);
        if (!entry.lastActiveAt || ts > entry.lastActiveAt) entry.lastActiveAt = ts;
        if (ts >= sevenDaysAgo) entry.recentCount += 1;
      }
      recentActivity.columns = Array.from(byColumn.values());
    } catch (_) {
      // best-effort; ignore errors
    }

    // Optional quick intent reply for follow-ups
    const followup = intentReply({ userMessage, subStageName: stageMeta.subStageName });

    const praise = buildPraise(prevMeta, latestPrevSubmit);
    const currentGoal = stageMeta.subStageDescription || '本子階段目標：依 Rubric 完成規劃與提交。';
    const suggestions = suggestionsFromMissing(missing, stageMeta.stageName, stageMeta.subStageName);
    const citations = buildCitations({ rubric, stageMeta, latestThisSubmit });

    // Default deterministic message
    let message = [
      `嗨，${project.name}！${praise}`,
      `現在我們進入了「${s}-${ss} ${stageMeta.subStageName || ''}」階段。`,
      `目標：${currentGoal}`,
      missing.length ? `我檢查到這個階段尚缺：${missing.join('、')}。` : '你們的欄位看起來齊全，接下來專注於圖表品質與敘事即可。',
      ...suggestions
    ].filter(Boolean).join('\n\n');

    // Suggested tasks for one-click creation (deterministic baseline)
    // 依子階段產生情境化建議任務
    const suggestedTasks = stageSpecificSuggestedTasks({ s, ss, stageMeta, missing });

    // Optional: call LLM if requested (Gemini/OpenAI)
    const wantLLM = (useLLM || req.query.useLLM === 'true');
    const preferProvider = (req.body?.provider || req.query.provider || process.env.LLM_PROVIDER || '').toLowerCase();
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (wantLLM && (hasGemini || hasOpenAI)) {
      try {
        const context = {
          project: { id: project.id, name: project.name },
          stage: { s, ss, stageName: stageMeta.stageName, subStageName: stageMeta.subStageName },
          goal: currentGoal,
          missing,
          present,
          prevPraise: praise,
          rubricExcerpt: rubric ? rubric.slice(0, 1600) : '',
          kanbanSnapshot,
          existingTaskTitles,
          recentActivity,
          ideaWallSnapshot
        };
        const llmPrompt = `請根據以下上下文，輸出 JSON 物件：{"message": string, "suggestions": string[], "suggestedTasks": [{"title": string, "content": string, "labels"?: string[]}], "citations": [{"type": "rubric"|"submit", "title": string, "quote": string}] }。上下文：${JSON.stringify(context)}；規則補充：1) 參考 kanbanSnapshot、existingTaskTitles 與 ideaWallSnapshot，避免重複現有卡片，並善用想法牆的節點來拆解具體工作；2) 任務應可直接落地，並對齊當前子階段目標；3) 參考 recentActivity（特別是最近較少活動的列表），提出能解卡/推進的任務；4) 缺失以 suggestions 列示即可，不要建立「補齊缺少欄位/檔案」類卡片。若使用者訊息存在，將其視為追問並融入回覆：${userMessage || ''}`;

        let result = null;
        if (preferProvider === 'gemini' && hasGemini) {
          result = await callGeminiAPI(llmPrompt);
        } else if (preferProvider === 'openai' && hasOpenAI) {
          result = await callGPTAPI(llmPrompt);
        } else if (hasGemini) {
          result = await callGeminiAPI(llmPrompt);
        } else if (hasOpenAI) {
          result = await callGPTAPI(llmPrompt);
        }
        if (result?.success && typeof result.content === 'string' && result.content.trim().length) {
          let parsed = null;
          const raw = result.content.trim();
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            // 寬鬆解析：嘗試從文字中擷取第一段 JSON 物件
            try {
              const m = raw.match(/\{[\s\S]*\}/);
              if (m) parsed = JSON.parse(m[0]);
            } catch (_) {}
          }
          if (parsed) {
            if (parsed.message) message = parsed.message;
            if (Array.isArray(parsed.suggestions)) parsed.suggestions.forEach(s => suggestions.push(s));
            if (Array.isArray(parsed.suggestedTasks) && parsed.suggestedTasks.length) {
              const map = new Map();
              const isGenericMissingTask = (title = '') => {
                const t = String(title);
                return t.includes('補齊') && (t.includes('欄位') || t.includes('檔案'));
              };
              [...suggestedTasks, ...parsed.suggestedTasks]
                .filter(t => !isGenericMissingTask(t?.title))
                .forEach(t => {
                  const key = (t.title || '').trim();
                  if (key && !map.has(key)) map.set(key, t);
                });
              const merged = Array.from(map.values()).slice(0, 4);
              suggestedTasks.splice(0, suggestedTasks.length, ...merged);
            }
            if (Array.isArray(parsed.citations) && parsed.citations.length) {
              citations.splice(0, citations.length, ...parsed.citations);
            }
          } else {
            // 若非 JSON，直接使用生成文本作為訊息，提升彈性
            message = raw;
          }
        }
      } catch (e) {
        // Fallback silently
      }
    }

    const responsePayload = {
      project: { id: project.id, name: project.name },
      stage: { currentStage: s, currentSubStage: ss, stageName: stageMeta.stageName, subStageName: stageMeta.subStageName },
      praise,
      currentGoal,
      missing,
      present,
      suggestions,
      suggestedTasks,
      citations,
      followup,
      rubricExcerpt: rubric ? rubric.slice(0, 800) : '',
      message
    };
    // Annotate data sources used for transparency in UI
    const dataSources = [];
    if (Array.isArray(kanbanSnapshot) && kanbanSnapshot.length) dataSources.push('kanban');
    if (ideaWallSnapshot?.nodes > 0 || ideaWallSnapshot?.walls > 0) dataSources.push('ideaWall');
    if (Array.isArray(citations) && citations.some(c => c.type === 'submit')) dataSources.push('submit');
    if (Array.isArray(citations) && citations.some(c => c.type === 'rubric')) dataSources.push('rubric');
    if (recentActivity && (recentActivity.totals?.create || recentActivity.totals?.update || recentActivity.totals?.move || recentActivity.totals?.delete)) dataSources.push('activity');
    responsePayload.dataSources = dataSources;
    // optional debug: return snapshot to caller
    if (req.query?.debug === 'true' || req.body?.debug === true) {
      responsePayload.kanbanSnapshot = kanbanSnapshot;
      responsePayload.existingTaskTitles = existingTaskTitles;
      responsePayload.recentActivity = recentActivity;
      responsePayload.ideaWallSnapshot = ideaWallSnapshot;
    }
    return res.json(responsePayload);
  } catch (err) {
    console.error('getGuidance error:', err);
    return res.status(500).json({ message: '產生導引時發生錯誤', error: err.message });
  }
};
