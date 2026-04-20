// SDL Coach Controller — 自主學習助手
//
// 用途：以「科學探究四階段 × 課綱」知識小抄為系統提示，提供學生學習方法論建議。
// 與既有 rag_message（科展 RAG）互補：
//   - rag_message → 查前人研究案例、具體實驗設計
//   - sdlCoach    → 學習方法論、探究鷹架、四階段引導
//
// 參考文件：docs/sdl-coach-knowledge-base.md
//         docs/sdl-coach-project-context-plan.md（snapshot 注入設計）

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { callWithFallback } = require('../services/llmGateway');
const { logAudit } = require('../services/auditService');
const { isAiEnabled } = require('../services/aiAccessService');
const {
    SUB_STAGE_TITLES,
    STAGE_TITLES,
} = require('../services/fourStageFilterService');

const UserProject = require('../models/user_project');
const Project = require('../models/project');
const Submit = require('../models/submit');
const User = require('../models/user');
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const SdlCoachMessage = require('../models/sdl_coach_message');

// ============================================
// 知識小抄（system prompt 主幹）
// ============================================

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'docs', 'sdl-coach-knowledge-base.md');
let KNOWLEDGE_BASE = '';
try {
    KNOWLEDGE_BASE = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8');
    console.log(`[SDL Coach] 知識小抄載入成功: ${KNOWLEDGE_BASE.length} chars`);
} catch (err) {
    console.error('[SDL Coach] 知識小抄載入失敗:', err.message);
}

// Option B：四階段（不含「學習歷程」，該功能改由獨立的匯出歷程檔案模組承擔）
const VALID_STAGES = ['定標', '擇策', '監評', '調節'];

// 單位：字元（非 token）。Gemma-4-26B-A4B-it 的 context window 是 256K tokens，
// 3000 字元（約 3-4k tokens）遠低於模型上限；選 3000 是為「signal/noise 合理」「控制成本」
// 而非 context window 限制。
const MAX_QUESTION_LEN = 2000;
const MAX_CONTEXT_LEN = 3000;
// Promise.race 不會 cancel 背景 query，timeout 不宜過寬；正常 query <100ms
const SNAPSHOT_TIMEOUT_MS = 2000;

// 多輪對話：最近 N 對（user+assistant pair）回灌給 LLM
// 3 對的理由：
// - 學生單次對話深度通常 2-4 輪，3 對足以涵蓋指涉場景
// - 再遠的脈絡由 snapshot 的 Submit/Kanban 補齊，不需歷史補
// - Token 保守原則（詳見 docs/sdl-coach-multi-turn-plan.md）
const MAX_HISTORY_TURNS = 3;
// 單則訊息字元上限（最終防線）：assistant 本來就有 250 字錨點 + 800 maxTokens 硬頂；
// user 有 MAX_QUESTION_LEN=2000 限制。1000 字 cap 只防極端舊資料。
const HISTORY_MESSAGE_CHAR_CAP = 1000;

// ============================================
// Prompt 組裝
// ============================================

// 清理輸入，移除常見 prompt injection 嘗試
function sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/(?:忽略|無視|跳過|覆蓋|override|ignore|disregard|forget).*(?:指令|規則|instructions?|rules?|above|以上|前面)/gi, '[已過濾]')
        .replace(/(?:system|系統|assistant|助手)\s*[:：]/gi, '[已過濾]')
        .trim();
}

function buildSystemInstruction() {
    if (!KNOWLEDGE_BASE) {
        return '你是自主學習助手，請以繁體中文回答學生的科學探究問題。';
    }
    return `${KNOWLEDGE_BASE}

---

【執行守則】
- 你是上方知識小抄所描述的「自主學習助手」。上方小抄是你的內部知識參考，**不可**在回應中複誦整段原文。
- 全程繁體中文。
- 語氣溫暖但務實，像一位經驗豐富的高中自然科老師。
- 單次回覆不超過 300 字（除非學生明確要求更詳細）。
- 回答格式建議：1) 幫學生定位階段 2) 1-3 個**抽象樣板、對照提問或下一步引導** 3) 結尾一句回饋問題。
- 禁止捏造文獻或研究結論。
- 禁止直接幫學生想題目 / 寫步驟 / 寫報告段落。
- 採認知師徒制：示範句型用**抽象樣板**（如「在 A 條件下，B 會不會 C」）、引用學生提交讓他對照（reflection）、要求學生用自己的話把思考講出來（articulation）、隨學生掌握度逐步撤除鷹架（fading）。禁止把學生專案的主題、變因、生物或化學現象填進示範句（即使加「例如」前綴）——那會取代學生應該做的 exploration。**即使是「把學生描述套進樣板」的示範也禁止**，套用本身就是學生該做的 articulation。
- 引用學生專案資訊（描述、提交、看板、想法牆）僅用於**定位與確認脈絡**，不要順勢延伸成具體實驗計畫或研究問題。
- 使用科學方法論術語（自變項、應變項、控制變因、假設、對照組、顯著差異、p 值、標準差等）時，**首次出現**在括號內附一句口語解釋（例：「自變項（你主動要改變的那個條件）」、「控制變因（實驗中保持不變的因素）」）；同一則回覆內再次出現則不必重複。若學生明顯不懂某個詞，優先用生活譬喻說明，再扣回正式定義。`;
}

/**
 * 組 user prompt。`context` 的 sanitize 政策分兩路：
 * - 後端 snapshot（trusted 結構 + 已在 formatter 過篩學生欄位）→ 直接用，不再 sanitize
 * - 前端傳入（untrusted）→ 套整包 sanitize
 * 這樣避免 sanitize 偽陽性砍到系統產的 markdown 標題或學生的合法中文。
 */
function buildUserPrompt({ question, currentStage, context, contextTrusted = false }) {
    const parts = [];

    if (currentStage && VALID_STAGES.includes(currentStage)) {
        parts.push(`【學生目前所在階段】${currentStage}`);
    }

    if (context) {
        const contextBody = contextTrusted ? context : sanitize(context);
        parts.push(`【當前任務脈絡】\n${contextBody.slice(0, MAX_CONTEXT_LEN)}`);
    }

    parts.push(`【學生問題】\n${sanitize(question).slice(0, MAX_QUESTION_LEN)}`);
    // 尾端強制提醒
    // 錨點策略：LLM 實測會略超錨點（說 250 實際寫 ~300），所以錨點設低於真正想要的上限
    // 搭配 maxTokens=800 硬封頂，留給 LLM 足夠空間寫完結尾句，不會在列點中途被砍
    parts.push(
        '\n請依執行守則回答。**務必遵守**：\n' +
        '1. 回應總長**嚴格不超過 250 字**（即使切換為英文或其他語言，上限等同 250 個漢字）\n' +
        '2. 一次只給一個最小下一步鷹架，不要羅列多項建議\n' +
        '3. 引用學生已提交的內容時，用「你們組」或提交者名字，不要用「你交了」\n' +
        '4. 結尾務必用完整一句話收尾（回饋問題或邀請），不要在列點或逗號中途結束'
    );

    return parts.join('\n\n');
}

// ============================================
// 學生內容過篩（四層架構中的 L2 品質 + L3 隱私）
// ============================================

// L2：品質過篩 — 判定內容是否為低品質（測試字串、重複字元、純符號）
// 注意：JavaScript 的 \W 不是 Unicode-aware，會把中日韓字元判為「非 word」，
// 因此用 \p{L}（Unicode letter 類別）判斷，才能正確對應中文語料。
function isLowQualityText(text) {
    if (!text || typeof text !== 'string') return true;
    const t = text.trim();
    if (t.length < 3) return true;
    if (!/\p{L}/u.test(t)) return true;                     // 不含任何字母（中英日韓皆算）→ 純符號/數字
    if (/^(.)\1{2,}$/u.test(t)) return true;                // 重複字元（「aaaa」「嗯嗯嗯嗯」）
    if (/^(test|測試|asdf|qwer|123|abc)$/i.test(t)) return true;  // 常見測試詞
    return false;
}

// L3：PII redaction — 遮蔽個資格式，避免學生輸入外洩到 LLM provider
// 涵蓋：身分證、手機（含國際碼 / 空格 / 點號分隔）、email
// 不涵蓋：中文姓名（缺乏穩定 pattern），交由 system prompt 約束 LLM 不複誦
function redactPII(text) {
    if (!text) return text;
    return text
        .replace(/[A-Z]\d{9}/g, '[身分證]')
        .replace(/(?:\+?886-?|0)9\d{2}[-.\s]?\d{3}[-.\s]?\d{3}/g, '[手機]')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');
}

// L4：針對學生輸入欄位的輕量注入過濾（比 sanitize 窄，只針對 role 指令與「忽略上面」類）
// 僅用在學生可自由輸入的欄位（Submit value、Node title、Task title），不對系統生成的 markdown 結構做
function stripInjection(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/(?:忽略|無視|跳過|覆蓋|override|ignore|disregard|forget).*(?:指令|規則|instructions?|rules?|above|以上|前面)/gi, '[已過濾]')
        .replace(/(?:system|系統|assistant|助手)\s*[:：]/gi, '[已過濾]');
}

// ============================================
// Snapshot 組裝（formatter）
// ============================================

// 固定用台灣時區顯示；docker 容器 TZ 常是 UTC，不能靠 getHours() 預設
function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const parts = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find(p => p.type === type)?.value || '';
    // zh-TW 在某些環境回「2月」「5日」帶單位，統一用 pick 後 pad
    const clean = (s) => s.replace(/\D/g, '').padStart(2, '0');
    return `${clean(get('month'))}-${clean(get('day'))} ${clean(get('hour'))}:${clean(get('minute'))}`;
}

function formatSubmitContent(submit) {
    // 檔案上傳類：content 常只是 label 或空物件，改顯示檔名
    if (submit.originalName) {
        return `[檔案] ${submit.originalName}`;
    }
    if (submit.content == null) return null;

    // Sequelize 對 DataTypes.JSON（非 JSONB）在本專案回字串，需自行 parse
    let value = submit.content;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try { value = JSON.parse(trimmed); } catch { /* 當純文字處理 */ }
        }
    }

    let raw;
    if (value && typeof value === 'object') {
        const parts = Object.entries(value)
            .filter(([, v]) => v != null && v !== '' && !isLowQualityText(String(v)))
            .map(([k, v]) => {
                const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                return `${k}：${val}`;
            });
        raw = parts.join(' / ');
    } else {
        raw = String(value);
    }

    if (isLowQualityText(raw)) return null;
    // L3 PII redaction + L4 injection strip（僅對學生輸入欄位）
    return stripInjection(redactPII(raw)).slice(0, 120);
}

function formatSubmitLine(submit, userNameMap) {
    const body = formatSubmitContent(submit);
    if (body == null) return null;
    const time = formatTime(submit.createdAt);
    const by = (submit.userId && userNameMap[submit.userId]) || '匿名';
    return `- [${time} 由 ${by}] ${body}`;
}

function formatSnapshotNoStage({ project }) {
    const lines = [
        '## 專案',
        `名稱：${project.name}`,
        project.describe ? `描述：${project.describe}` : null,
        '階段：尚未啟動任何階段',
        '',
        '> 註：此專案還沒進入定標階段。引導學生先從「我對什麼主題好奇」開始。',
    ].filter(Boolean);
    return lines.join('\n');
}

function formatSnapshot({ project, submits, userNameMap, kanban, ideaWall }) {
    const sections = [];

    // ① 專案
    const subStageKey = `${project.currentStage}-${project.currentSubStage}`;
    const stageTitle = STAGE_TITLES[project.currentStage] || '';
    const subStageTitle = SUB_STAGE_TITLES[subStageKey] || '';
    const stageLine = subStageTitle
        ? `${subStageKey}（${stageTitle} / ${subStageTitle}）`
        : `${subStageKey}（${stageTitle}）`;

    const projectLines = [
        '## 專案',
        `名稱：${project.name}`,
        project.describe ? `描述：${project.describe}` : null,
        `階段：${stageLine}`,
    ].filter(Boolean);
    sections.push(projectLines.join('\n'));

    // ② 專案提交進度（跨階段分組）
    // 每個子階段取最新 1 筆 + 當前階段取最新 2 筆
    const currentStageKey = subStageKey;
    const byStage = new Map();
    let filteredCount = 0;
    for (const s of submits || []) {
        if (!s.stage) continue;
        const line = formatSubmitLine(s, userNameMap);
        if (!line) { filteredCount++; continue; }
        if (!byStage.has(s.stage)) byStage.set(s.stage, []);
        const list = byStage.get(s.stage);
        const limit = s.stage === currentStageKey ? 2 : 1;
        if (list.length < limit) list.push(line);
    }

    if (byStage.size > 0) {
        const submitSection = ['## 專案提交進度（跨階段，每子階段最新一筆，當前階段取 2 筆）'];
        // 依 stage key 排序（"1-1" < "1-2" < ... < "3-2"）
        const sortedKeys = [...byStage.keys()].sort((a, b) => {
            const [aS, aSub] = a.split('-').map(Number);
            const [bS, bSub] = b.split('-').map(Number);
            return aS - bS || aSub - bSub;
        });
        for (const key of sortedKeys) {
            const title = SUB_STAGE_TITLES[key] || '';
            const marker = key === currentStageKey ? '（← 當前階段）' : '';
            submitSection.push(`### ${key} ${title} ${marker}`.trim());
            byStage.get(key).forEach(l => submitSection.push(l));
        }
        // 當前階段若沒提交，明確標示
        if (!byStage.has(currentStageKey)) {
            const title = SUB_STAGE_TITLES[currentStageKey] || '';
            submitSection.push(`### ${currentStageKey} ${title}（← 當前階段）`.trim());
            submitSection.push('- （本階段尚未提交）');
        }
        if (filteredCount > 0) {
            submitSection.push(`> 另有 ${filteredCount} 筆因內容過短或低品質被省略`);
        }
        sections.push(submitSection.join('\n'));
    } else {
        const title = SUB_STAGE_TITLES[currentStageKey] || '';
        sections.push(
            `## 專案提交進度\n### ${currentStageKey} ${title}（← 當前階段）\n- （尚未提交任何內容，或全數因過短被省略）`
        );
    }

    // ③ 看板任務（依 Kanban.column 陣列排序）
    if (kanban && Array.isArray(kanban.columns) && kanban.columns.length > 0) {
        const columnOrder = Array.isArray(kanban.column) ? kanban.column : [];
        const byId = new Map(kanban.columns.map(c => [c.id, c]));
        const orderedColumns = columnOrder.length > 0
            ? columnOrder.map(id => byId.get(id)).filter(Boolean)
            : kanban.columns;

        const kanbanLines = ['## 看板任務（依學生自訂列表分組）'];
        orderedColumns.forEach(col => {
            const tasks = Array.isArray(col.tasks) ? col.tasks : [];
            // Task 依 Column.task 陣列排序，再截前 3
            const taskOrder = Array.isArray(col.task) ? col.task : [];
            const taskById = new Map(tasks.map(t => [t.id, t]));
            const orderedTasks = taskOrder.length > 0
                ? taskOrder.map(id => taskById.get(id)).filter(Boolean)
                : tasks;
            const shown = orderedTasks.slice(0, 3);
            // Column.name 是學生自訂欄位名（如「想法發散」「卡住的」），也經過學生輸入
            const colName = stripInjection(redactPII(String(col.name || '').trim())).slice(0, 40) || '(未命名欄位)';
            kanbanLines.push(`### ${colName}（${orderedTasks.length} 張）`);
            // Task title 過濾：允許「1」「A」等簡記（length 1-2）
            // 但長度 >=3 的純數字/符號（如「1324」「567」測試資料）過濾，避免 LLM 誤當進度引用
            shown.forEach(t => {
                const raw = String(t.title || '').trim();
                if (!raw) return;
                if (raw.length >= 3 && !/\p{L}/u.test(raw)) return; // 純符號/數字且 ≥3 位
                const title = stripInjection(redactPII(raw)).slice(0, 60);
                if (title) kanbanLines.push(`- ${title}`);
            });
        });
        if (kanbanLines.length > 1) sections.push(kanbanLines.join('\n'));
    }

    // ④ 想法牆節點
    if (ideaWall && Array.isArray(ideaWall.nodes) && ideaWall.nodes.length > 0) {
        const total = ideaWall.nodes.length;
        const titles = ideaWall.nodes
            .map(n => stripInjection(redactPII(String(n.title || '').trim())))
            .filter(t => t && !isLowQualityText(t));
        const filtered = total - titles.length;
        if (titles.length > 0) {
            const tail = filtered > 0 ? `\n> 共 ${total} 個節點，其中 ${filtered} 個因內容過短被省略` : '';
            sections.push(`## 想法牆節點\n${titles.join('、')}${tail}`);
        }
    }

    return sections.join('\n\n');
}

// ============================================
// 並行查詢與 timeout
// ============================================

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        ),
    ]);
}

/**
 * 為當前專案組裝 LLM 可讀的脈絡 snapshot。
 * 任一步驟失敗都吞掉、回空字串，不影響主流程。
 *
 * @param {number} projectId
 * @param {number} userId    發問者
 * @returns {Promise<string>}
 */
async function buildProjectSnapshot(projectId, userId) {
    try {
        // 1. 權限 + Project 並行（兩者互不依賴）
        const [hasAccess, project] = await Promise.all([
            UserProject.findOne({ where: { userId, projectId } }),
            Project.findByPk(projectId, {
                attributes: ['id', 'name', 'describe', 'currentStage', 'currentSubStage', 'ProjectEnd'],
            }),
        ]);
        if (!hasAccess) return '';
        if (!project) return '';

        // 1.1 學生尚未啟動任何階段 → 僅回傳專案基本資訊
        if (project.currentStage == null) {
            return formatSnapshotNoStage({ project });
        }
        // 1.2 型別守衛：確保 currentStage 是整數，避免 LIKE 字元注入（未來型別漂移防線）
        if (!Number.isInteger(project.currentStage)) {
            console.warn(`[SDL Coach] currentStage 非整數 projectId=${projectId}`);
            return formatSnapshotNoStage({ project });
        }

        // 2. 三路並行：Submit、Kanban、Idea_wall+Node（各自局部 try/catch，局部降級而非整包降級）
        const stageInt = project.currentStage;
        const safe = (promise, label) => promise.catch(err => {
            console.warn(`[SDL Coach] ${label} 失敗 projectId=${projectId}:`, err.message);
            return null;
        });

        const [submits, kanban, ideaWall] = await withTimeout(
            Promise.all([
                safe(Submit.findAll({
                    where: {
                        projectId,
                        // Submit.stage 格式 "${stageInt}-${subStageInt}"
                        // 不限定 stage — 取跨階段全部，formatter 內再分組精簡（見 plan 第 4.2 節）
                        // 不限定 userId — 小組共用
                    },
                    attributes: ['stage', 'content', 'originalName', 'userId', 'createdAt'],
                    order: [['stage', 'ASC'], ['createdAt', 'DESC']],
                    // 每個子階段最多 3 筆已是上限（12 個子階段 × 3 = 36 筆），limit 不設硬上限
                    // 但用 40 做防線避免異常專案爆量
                    limit: 40,
                }), 'Submit.findAll'),
                safe(Kanban.findOne({
                    where: { projectId },
                    include: [{
                        model: Column,
                        attributes: ['id', 'name', 'task'],
                        include: [{
                            model: Task,
                            attributes: ['id', 'title', 'updatedAt'],
                        }],
                    }],
                }), 'Kanban.findOne'),
                safe((async () => {
                    const wall = await Idea_wall.findOne({
                        where: { projectId },
                        order: [['id', 'ASC']],
                        attributes: ['id'],
                    });
                    if (!wall) return null;
                    const nodes = await Node.findAll({
                        where: { ideaWallId: wall.id },
                        attributes: ['title'],
                        limit: 20,
                    });
                    return { wall, nodes };
                })(), 'Idea_wall+Node'),
            ]),
            SNAPSHOT_TIMEOUT_MS,
            'buildProjectSnapshot.queries'
        );

        // 3. 補查 Submit 提交者的 username（userId → name map）
        const submitterIds = [...new Set((submits || []).map(s => s.userId).filter(Boolean))];
        const userNameMap = {};
        if (submitterIds.length > 0) {
            const users = await User.findAll({
                where: { id: { [Op.in]: submitterIds } },
                attributes: ['id', 'username'],
            }).catch(err => {
                console.warn(`[SDL Coach] User.findAll 失敗 projectId=${projectId}:`, err.message);
                return [];
            });
            users.forEach(u => { userNameMap[u.id] = u.username; });
        }

        // 4. 組裝 markdown
        const snapshot = formatSnapshot({
            project,
            submits,
            userNameMap,
            kanban,
            ideaWall,
        });

        console.log(
            `[SDL Coach] snapshot built projectId=${projectId} ` +
            `submits=${(submits || []).length} nodes=${ideaWall?.nodes?.length ?? 0} chars=${snapshot.length}`
        );

        return snapshot.slice(0, MAX_CONTEXT_LEN);
    } catch (err) {
        console.warn(
            `[SDL Coach] buildProjectSnapshot 失敗 projectId=${projectId} userId=${userId}:`,
            err.message
        );
        return '';
    }
}

// ============================================
// 對話歷史載入（多輪對話）
// ============================================

/**
 * 撈指定 session 的最近 N 對完整對話，組成 LLM 可讀的 history array。
 * 只取「user+assistant 都完成」的 turn（assistantContent 非 null），避免把半截 streaming 送給 LLM。
 *
 * 任何失敗都吞掉回空陣列，退化為 stateless，不阻斷主流程。
 *
 * @param {number|string} projectId
 * @param {string} sessionId
 * @returns {Promise<Array<{role: 'user'|'assistant', content: string}>>}
 */
async function loadRecentHistory(projectId, sessionId) {
    if (!projectId || !sessionId) return [];
    try {
        const rows = await SdlCoachMessage.findAll({
            where: {
                projectId: parseInt(projectId, 10),
                sessionId,
                assistantContent: { [Op.ne]: null },
            },
            order: [['createdAt', 'DESC']],
            limit: MAX_HISTORY_TURNS,
            attributes: ['userContent', 'assistantContent'],
        });

        const history = [];
        // DESC 取最近 N → reverse 回 ASC 讓時間順序正確
        for (const r of rows.reverse()) {
            if (r.userContent) {
                history.push({
                    role: 'user',
                    content: String(r.userContent).slice(0, HISTORY_MESSAGE_CHAR_CAP),
                });
            }
            if (r.assistantContent) {
                history.push({
                    role: 'assistant',
                    content: String(r.assistantContent).slice(0, HISTORY_MESSAGE_CHAR_CAP),
                });
            }
        }
        return history;
    } catch (err) {
        console.warn(
            `[SDL Coach] loadRecentHistory 失敗 projectId=${projectId} sessionId=${sessionId}:`,
            err.message
        );
        return [];
    }
}

// 給單元測試與煙霧測試腳本用
exports._internals = {
    isLowQualityText,
    redactPII,
    stripInjection,
    formatSubmitContent,
    formatSnapshot,
    formatSnapshotNoStage,
    buildProjectSnapshot,
    buildSystemInstruction,
    buildUserPrompt,
    loadRecentHistory,
};

// ============================================
// Handlers
// ============================================

/**
 * POST /api/sdl-coach/ask
 * Body: { question, currentStage?, context?, projectId? }
 */
exports.askCoach = async (req, res) => {
    if (!(await isAiEnabled(req.userId))) {
        return res.status(403).json({ error: 'AI_DISABLED', message: 'AI 功能已停用，請聯絡管理員' });
    }

    const { question, currentStage, context, projectId, sessionId } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
            success: false,
            message: '請提供學生問題 (question)',
        });
    }

    if (question.length > MAX_QUESTION_LEN) {
        return res.status(400).json({
            success: false,
            message: `問題長度不得超過 ${MAX_QUESTION_LEN} 字`,
        });
    }

    if (currentStage && !VALID_STAGES.includes(currentStage)) {
        return res.status(400).json({
            success: false,
            message: `currentStage 必須為: ${VALID_STAGES.join('、')}`,
        });
    }

    // 後端主動組 snapshot；fallback 到前端傳的 context；最後才空字串
    let projectContext = '';
    if (projectId && req.userId) {
        projectContext = await buildProjectSnapshot(projectId, req.userId);
    }
    const finalContext = projectContext || context || '';
    // snapshot 是後端組的 + formatter 已對學生輸入欄位做過 L3/L4 過篩，視為 trusted
    const contextTrusted = !!projectContext;

    // 多輪對話歷史：sessionId 必須由前端傳入；未傳 → 不回灌（保留未來多 session 擴充空間，
    // 也避免後端自行猜 `sdl-coach-${projectId}` 若前端改動後讀到別人的歷史）
    const history = sessionId
        ? await loadRecentHistory(projectId, sessionId)
        : [];

    console.log(
        `[SDL Coach] ask built projectId=${projectId || 'none'} ` +
        `historyTurns=${history.length / 2} snapshotChars=${projectContext.length}`
    );

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt({
        question,
        currentStage,
        context: finalContext,
        contextTrusted,
    });

    try {
        // maxTokens=800 對應 400-500 中文字（中文 1 字≈1.5-2 token），為目標「250 字上限」留 1.5x 餘裕
        // 搭配 buildUserPrompt 尾端「嚴格 250 字」錨點，雙保險：
        //   - LLM 自律（錨點 250 → 實際 ~280-320）
        //   - maxTokens 硬封頂（800 tokens ≈ 450 中文字，足以容納完整收尾句）
        const result = await callWithFallback({ systemPrompt, userPrompt, history, maxTokens: 800 });

        // 若被 maxTokens 硬砍（finish_reason=length），記 warning 並在回答尾端標註
        // 讓學生知道，也讓運維看得到截斷比例
        let answer = result.content;
        const truncated = result.finishReason === 'length';
        if (truncated) {
            console.warn(
                `[SDL Coach] 回應被 maxTokens 截斷 provider=${result.model} ` +
                `questionLen=${question.length} answerLen=${answer.length}`
            );
            answer += '\n\n（上面回應超過長度上限被截斷，你可以再問我繼續哪個部分。）';
        }

        res.json({
            success: true,
            answer,
            provider: result.model,
            stage: currentStage || null,
            truncated,
        });

        logAudit(req, {
            action: 'SDL_COACH_ASK',
            targetType: 'SdlCoach',
            targetId: projectId || null,
            metadata: {
                questionLength: question.length,
                stage: currentStage || null,
                hasContext: !!finalContext,
                contextSource: projectContext
                    ? 'snapshot'
                    : (context ? 'frontend' : 'none'),
                snapshotChars: projectContext ? projectContext.length : 0,
                historyTurns: history.length / 2,
                provider: result.model,
                answerChars: answer.length,
                truncated,
            },
        }).catch(err => {
            console.error('[Audit] 記錄 SDL_COACH_ASK 失敗:', err.message);
        });
    } catch (err) {
        console.error('[SDL Coach] 呼叫 LLM 失敗:', err.message);
        res.status(500).json({
            success: false,
            message: '自主學習助手暫時無法回應，請稍後再試',
            error: err.message,
        });
    }
};

/**
 * GET /api/sdl-coach/health
 * 健康檢查：確認知識小抄已載入
 */
exports.health = (req, res) => {
    res.json({
        success: true,
        knowledgeBaseLoaded: KNOWLEDGE_BASE.length > 0,
        knowledgeBaseSize: KNOWLEDGE_BASE.length,
        validStages: VALID_STAGES,
    });
};
