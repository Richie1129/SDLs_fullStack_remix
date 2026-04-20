# SDL Coach 多輪對話上下文 Plan

## 背景

目前 `POST /api/sdl-coach/ask` 是 **stateless** 的：每次請求只丟 `systemPrompt`（知識小抄）+ `userPrompt`（當前問題 + 專案 snapshot）給 LLM，**不回灌過去對話紀錄**。

已儲存於 `sdl_coach_messages` 表的歷史訊息目前僅用於：
- 前端 UI 顯示（`SdlCoachChat.jsx` 載入渲染）
- 審計（`listSessions` / `deleteSession`）

**影響**：學生問「剛剛那個建議要怎麼延伸？」時，LLM 無從得知「剛剛」指什麼，回應會偏離語境或重新出題。

## 現況確認

- `controllers/sdlCoach.js:547` 呼叫 `callWithFallback({ systemPrompt, userPrompt, maxTokens })`
- `services/llmGateway.js:167` 組 messages 固定為 `[system, user]` 兩則
- 前端 `SdlCoachChat.jsx:74` 用 `sessionId = \`sdl-coach-${projectId}\``
  - **每 project 一個 session，小組成員共用**
  - 沒有「切換對話 / 新對話」，訊息只累積不分支
  - 清空整個 session 才是唯一「重置」方式
- `sdl_coach_messages` 欄位已備妥 `userContent` / `assistantContent` / `sessionId` / `createdAt`
- `userContent` 存的是**學生原始訊息**（不含 snapshot，snapshot 是後端組好直接傳 LLM，不落地）→ 歷史回灌不會重複 snapshot

## Token 預算

| 段落 | 預估字元 | 預估 tokens |
|------|---------|------------|
| 知識小抄 system prompt | ~35,000 | ~12,000 |
| 專案 snapshot (userPrompt 內) | ≤3,000 | ~1,000 |
| 當前 question | ≤2,000 | ~700 |
| **多輪歷史（3 對 = 6 則）** | **≤4,800** | **~1,600** |
| 合計 | ~44,800 | ~15,300 |

Gemma 256K context 綽綽有餘；Gemini fallback 亦遠低於其 1M 上限。

## 目標

讓 `askCoach` 能把最近 3 輪對話回灌給 LLM，達成：
1. 代詞指涉（「那個」「剛剛」）能正確解析
2. 建議可延續（前一輪提的鷹架，後續可 follow-up）
3. 不破壞既有 `rag_message` 等 gateway caller

## 非目標

- 多 session 切換、個人 vs 小組分離、歷史摘要壓縮 — 詳見 `future-list.md`

## 設計

### 1. `llmGateway.callWithFallback` 擴充 `history` 參數

**變更點**：`services/llmGateway.js`

```js
const {
    systemPrompt = '',
    userPrompt = '',
    history = [],   // [{ role: 'user' | 'assistant', content: string }, ...]
    timeout = 30000,
    temperature = 0.7,
    maxTokens = 2000,
    jsonMode = false,
} = options;

const messages = [{ role: 'system', content: systemPrompt }];
for (const m of history) {
    if (m && (m.role === 'user' || m.role === 'assistant')
        && typeof m.content === 'string' && m.content.trim()) {
        messages.push({ role: m.role, content: m.content });
    }
}
messages.push({ role: 'user', content: userPrompt });
```

**相容性**：history 預設空陣列，其他 caller 不傳就維持舊行為，**零破壞**。

### 2. `askCoach` 撈最近 3 輪並組 history

**變更點**：`controllers/sdlCoach.js`

#### 2.1 常數

```js
// 多輪對話參數
// 3 對的理由：
// - 學生單次對話深度通常 2-4 輪，3 對足以涵蓋指涉場景
// - 再遠的脈絡，snapshot 的 Submit/Kanban 會補齊，不需歷史補
// - Token 保守原則（見 plan 中 Token 預算表）
const MAX_HISTORY_TURNS = 3;
// 單則訊息上限：assistant 本來就有 250 字錨點 + 800 maxTokens 硬頂；
// 學生 user 訊息有 MAX_QUESTION_LEN=2000 限制。
// 1000 字 cap 只是最終防線（對應極端舊資料），不需複雜的頭尾切法。
const HISTORY_MESSAGE_CHAR_CAP = 1000;
```

#### 2.2 `loadRecentHistory(projectId, sessionId)`

```js
async function loadRecentHistory(projectId, sessionId) {
    if (!projectId || !sessionId) return [];
    try {
        const rows = await SdlCoachMessage.findAll({
            where: {
                projectId: parseInt(projectId, 10),
                sessionId,
                // 只取「user + assistant 都完成」的 turn
                // 前端流程：先 create（userContent）→ LLM 回覆後 update（assistantContent）
                // 中間 assistantContent=null 的 turn 若回灌會讓 LLM 看到半截對話
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
                history.push({ role: 'user', content: String(r.userContent).slice(0, HISTORY_MESSAGE_CHAR_CAP) });
            }
            if (r.assistantContent) {
                history.push({ role: 'assistant', content: String(r.assistantContent).slice(0, HISTORY_MESSAGE_CHAR_CAP) });
            }
        }
        return history;
    } catch (err) {
        console.warn(`[SDL Coach] loadRecentHistory 失敗 projectId=${projectId} sessionId=${sessionId}:`, err.message);
        return [];
    }
}
```

#### 2.3 `askCoach` 接入

```js
exports.askCoach = async (req, res) => {
    const { question, currentStage, context, projectId, sessionId } = req.body || {};
    // ... 既有驗證 ...

    // Snapshot（既有）
    let projectContext = '';
    if (projectId && req.userId) {
        projectContext = await buildProjectSnapshot(projectId, req.userId);
    }
    const finalContext = projectContext || context || '';
    const contextTrusted = !!projectContext;

    // 新增：對話歷史
    // sessionId 必須由前端傳入；未傳 → 不回灌歷史（保留未來多 session 擴充空間）
    const history = sessionId
        ? await loadRecentHistory(projectId, sessionId)
        : [];

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt({
        question, currentStage, context: finalContext, contextTrusted,
    });

    try {
        const result = await callWithFallback({
            systemPrompt, userPrompt, history, maxTokens: 800,
        });
        // ... 既有回傳 ...

        logAudit(req, {
            // ... 既有 metadata ...
            metadata: {
                // ...
                historyTurns: history.length / 2,  // 新增
            },
        });
    } catch (err) { /* 既有錯誤處理 */ }
};
```

**sessionId 策略（簡化版）**：
- **前端傳 → 用；沒傳 → `history=[]`**
- 後端不做 `sdl-coach-${projectId}` fallback 猜測（猜錯會誤讀別人的歷史）
- 前端目前寫死 `sdl-coach-${projectId}`，改動只是多塞一個欄位進 request body

### 3. 前端同步

**變更點 1**：`sdl-frontend-main/src/api/assistant.js` 的 `askSdlCoach` 函式接 sessionId 並傳給後端

**變更點 2**：`sdl-frontend-main/src/components/SdlCoachChat.jsx:159` 呼叫 `askSdlCoach` 時帶 sessionId

```js
const data = await askSdlCoach({
    question: text,
    currentStage,
    projectId,
    sessionId,     // ← 新增
});
```

（sessionId 變數在 line 74 已存在：`sdl-coach-${projectId}`）

### 4. Snapshot 擺放位置（不改）

繼續放 `userPrompt` 內（`buildUserPrompt` 不變）。

**理由**：snapshot 每次請求都會重算（學生可能在對話之間新增 Submit / 移動 Task），放 system prompt 會讓 LLM 誤為永久背景。放當前 user turn 是「現在的狀態」語意最精確。

**重要**：歷史只撈 `userContent`（學生原始問題）與 `assistantContent`（LLM 回覆），**不含當時注入的 snapshot**，因此歷史不會重複堆疊 snapshot。

### 5. 審計與觀測

`logAudit` metadata 新增：
- `historyTurns`: 實際回灌的 turn 數（0 = 首輪或剛清空）

Console log：
```js
console.log(
    `[SDL Coach] built projectId=${projectId} ` +
    `historyTurns=${history.length / 2} snapshotChars=${projectContext.length}`
);
```

### 6. 防禦清單

- **Error path**：`loadRecentHistory` 任何 DB 錯誤 → 回 `[]` → 退化為 stateless，不阻斷主流程
- **跨層邊界**：歷史訊息**不做 sanitize / stripInjection** — 過去已經過 LLM 一次，再次放入不會更危險；做反而會誤傷 LLM 回應中出現的合法技術詞彙（如 "system prompt" 作為教學內容）
- **assistantContent 為 null**：在 SQL where 直接過濾（效能優於應用層 filter）
- **小組共用 session**：與 snapshot 跨成員設計一致，不分裂

### 7. 實作後自我審查

- 前端所有 `askSdlCoach` 呼叫處都帶 sessionId（目前僅 1 處）
- `callWithFallback` 其他 caller（rag_message、project 生成、四階段過濾）**完全沒受影響**（未傳 history → 走預設空陣列）
- LLM provider messages array 相容性（OpenAI chat format → Gemini / Gemma / OpenAI 皆支援）

## 測試計畫

### 7.1 Smoke 腳本擴充

擴充 `scripts/sdl-coach-smoke-50.js`，加一個多輪情境：

1. 第 1 問：「我想研究學校附近的水質」
2. 第 2 問：「延伸這個方向可以怎麼做？」
3. 驗證第 2 問的回應包含「水質」「附近」相關詞彙，證明 LLM 有看到歷史

### 7.2 人工驗證

瀏覽器中：
- 新對話輸入「我想研究水質」→ 收到回覆
- 接著輸入「那要怎麼開始？」→ 回覆應延續水質主題
- 清空對話後再問「那要怎麼開始？」→ 回覆應是通用引導（因為沒歷史）

## Rollout

1. `llmGateway` 加 `history` 參數
2. `sdlCoach.js` 加 `loadRecentHistory` + `askCoach` 接入
3. 前端 `askSdlCoach` 傳 sessionId
4. Smoke 腳本 + 瀏覽器手動驗證

不做「觀察一週」或 A/B；MAX_HISTORY_TURNS 參數若後續發現需調整再改。

## 風險與降級

| 風險 | 降級策略 |
|------|---------|
| `loadRecentHistory` DB 失敗 | catch → 回 `[]` → 退化為 stateless |
| 歷史內容過長 | `MAX_HISTORY_TURNS=3` + 每則 1000 字 cap；即使極端亦遠低於 Gemma context |
| LLM provider 不支援 messages array | 標準 OpenAI chat format，Gemini / Gemma / OpenAI 全支援 |
| 階段從「定標」跳「擇策」後，舊階段歷史是否誤導 LLM | 不特別處理：system prompt 已強調「學生目前所在階段」，舊歷史仍有連續性價值 |

## 變更檔案清單

| 檔案 | 變更 |
|------|------|
| `services/llmGateway.js` | 新增可選 `history` 參數 |
| `controllers/sdlCoach.js` | 新增 `loadRecentHistory`；`askCoach` 接入 sessionId 與 history；`logAudit` metadata 加 `historyTurns` |
| `sdl-frontend-main/src/api/assistant.js` | `askSdlCoach` 函式新增 sessionId 參數 |
| `sdl-frontend-main/src/components/SdlCoachChat.jsx` | 呼叫 `askSdlCoach` 時帶 sessionId |
| `scripts/sdl-coach-smoke-50.js` | 新增多輪情境驗證 |

## Migration

不需要 DB schema 變更 — `sdl_coach_messages` 欄位已齊備。

若 `loadRecentHistory` 實測變慢（專案訊息累積大）才補 index，不預先加：

```js
await queryInterface.addIndex('sdl_coach_messages', ['projectId', 'sessionId', 'createdAt']);
```
