# SDL Coach — 串接專案資料實作計畫

> **狀態**：規劃中（尚未實作）
> **前置條件**：SdlCoach 基礎整合已完成（commit `140551d`）
> **預計 commit**：`feat: 自主學習助手串接專案資料（階段、提交、看板、想法牆）`

---

## 1. 目標

讓學生在看板開啟自主學習助手時，LLM 能看到**當前專案、階段、已繳交內容、看板進度、想法牆**，據此提供貼合情境的蘇格拉底式引導。

**核心原則**（避免重蹈「專案助理」覆轍）：

- **即時查詢**：每次對話現查 DB，不預先處理、不建快取
- **零 invalidation**：沒有快取就沒有一致性問題
- **天然截斷**：只拉當前階段 + 最近 N 筆，避免 context 爆炸
- **錯誤吞掉**：任一查詢失敗不影響主流程，LLM 無 context 也能答

---

## 2. 現況

目前 `controllers/sdlCoach.js` 的 `askCoach` 接受 `{ question, currentStage, context, projectId }`，但：

- `context` 由前端組裝後傳入，後端**不主動查 DB**
- `projectId` 只用於 audit log，**不會**用來撈資料
- 前端 `SdlCoachChat.jsx` 傳的 `context` 目前是空字串或淺層資訊

LLM 因此只能泛談階段方法論，無法引用學生實際的專案進度。

### 2.1 實際架構校準（已對齊 models/controllers）

原始計畫在沒細讀程式碼的情況下寫的，有幾個假設跟實際系統不符。對齊之後的事實：

- **系統是四階段模式**（Option B）。`services/fourStageFilterService.js` 的 `FOUR_STAGE_CONFIG = { STAGE_MAX: 4, SUB_STAGE_MAX: 3 }`，原本的「學習歷程」第五階段已移除，該功能改由獨立的「匯出歷程檔案」模組承擔。本 PR 會一併把 `controllers/sdlCoach.js:25` 的 `VALID_STAGES` 從五階段清成四階段。
- **`Project.currentStage` / `currentSubStage` 是 INTEGER**（`models/project.js:30-37`）。不是中文字串。
- **`Submit.stage` 格式是 `"${stageInt}-${subStageInt}"`**（例如 `"2-1"`，見 `controllers/submit.js:50`）。原計畫寫的 `stage LIKE '${cur}-%'` 只有在 `cur` 是整數字串時才有意義，必須用 `project.currentStage` 而非前端傳的中文 label 當查詢條件。
- **`Idea_wall` 一個專案只有一筆、`stage: null`**（`controllers/project/projectController.js:208` 的註解：「簡化：每個專案只需要一個想法牆，不分階段」；`controllers/ideaWall.js:43` 的讀取邏輯 `findOne({ projectId }) + ORDER BY id ASC`）。查詢時不用也不該帶 stage 過濾。
- **子階段名稱來源**：直接 import `services/fourStageFilterService.js` 的 `SUB_STAGE_TITLES` hardcode map，不走 `Process → Stage → Sub_stage` DB JOIN。
  - `1-1 提出研究主題`、`1-2 提出研究目的`、`1-3 提出研究問題`
  - `2-1 訂定研究構想表`、`2-2 設計研究記錄表`、`2-3 規劃研究排程`
  - `3-1 進行嘗試性研究`、`3-2 分析資料與繪圖`、`3-3 撰寫研究結果`
  - `4-1 檢視研究進度`、`4-2 進行研究討論`、`4-3 撰寫研究結論`

完整的落差分析另見 `sdl-coach-project-context-plan-gaps.md`。

---

## 3. 設計概覽

```
┌─────────────────────────────────────────────────────┐
│  POST /api/sdl-coach/ask { question, projectId }    │
└──────────────────────┬──────────────────────────────┘
                       ↓
           ┌───────────────────────────┐
           │  buildProjectSnapshot()   │
           │  (controllers/sdlCoach.js) │
           └───────────┬───────────────┘
                       ↓
         ┌─────────────┴─────────────┐
         │  1. 權限檢查 UserProject  │
         └─────────────┬─────────────┘
                       ↓
    ┌──────────────────┼──────────────────┐
    │  Promise.all (5s timeout)           │
    ├──────────────────────────────────────┤
    │  ① Project 基本資訊                  │
    │  ② Submit（當前階段最近 5 筆）      │
    │  ③ Kanban → Column → Task（分組）  │
    │  ④ Idea_wall → Node（title 20 筆） │
    └──────────────────┬──────────────────┘
                       ↓
        ┌──────────────┴──────────────┐
        │  組裝 markdown 字串 (≤3000)  │
        └──────────────┬──────────────┘
                       ↓
              【當前任務脈絡】 → userPrompt → LLM
```

---

## 4. 要拉的資料

| # | 來源 | 欄位 | 範圍 | 用途 |
|---|---|---|---|---|
| ① | `Project` | `name`, `describe`, `currentStage`, `currentSubStage` | 1 筆（**必須先查，後續查詢會依賴它**） | 定位專案與階段 |
| ② | `Submit` | `stage`, `content`, `createdAt` | WHERE `projectId` AND `stage LIKE '${project.currentStage}-%'`（注意：`currentStage` 是 INTEGER，不是前端傳的中文 label），按 `createdAt DESC`，LIMIT 5 | 看學生當前階段已產出什麼 |
| ③ | `Kanban → Column → Task` | `Column.name`, `Task.title` | 全部 column（最多 10 個），每組前 3 張 task | 看板進度（按學生自訂 column 分組） |
| ④ | `Idea_wall → Node` | `Node.title` | WHERE `projectId`（不帶 `stage` 過濾，因為一個專案只有一筆 `stage: null` 的想法牆），Node 最多 20 筆 | 想法牆關鍵詞提示 |

### 4.1 權限檢查

```js
UserProject.findOne({ where: { userId, projectId } })
```

- 查無 → `return ''`（不拋錯，避免暴露專案存在性）
- 有權 → 繼續並行查詢

### 4.2 看板排序的特殊處理

`Kanban → Column → Task` 的順序**不是**存在 `Column.order` 欄位，而是：

- `Kanban.column: ARRAY(INTEGER)` ← 存 column id 的順序
- `Column.task: ARRAY(INTEGER)` ← 存 task id 的順序

查完後要在 JS 層用這兩個陣列重新排序：

```js
const sortedColumns = kanban.column
  .map(id => kanban.columns.find(c => c.id === id))
  .filter(Boolean);
```

---

## 5. 函式結構

### 5.1 新增 `buildProjectSnapshot(projectId, userId)`

放在 `controllers/sdlCoach.js` 內部，不額外開 service 檔。

```js
// 注意：SUB_STAGE_TITLES 從 fourStageFilterService 直接 import（hardcode map）
// 不走 Process → Stage → Sub_stage 的 DB JOIN
const { SUB_STAGE_TITLES, STAGE_TITLES } = require('../services/fourStageFilterService');

async function buildProjectSnapshot(projectId, userId) {
  try {
    // 1. 權限檢查
    const hasAccess = await UserProject.findOne({
      where: { userId, projectId }
    });
    if (!hasAccess) return '';

    // 2. 先查 Project（後續 Submit 查詢依賴 currentStage 整數）
    const project = await Project.findByPk(projectId, {
      attributes: ['id', 'name', 'describe', 'currentStage', 'currentSubStage']
    });
    if (!project) return '';

    // 3. 並行查詢其餘三個（都不依賴彼此）
    const [submits, kanban, ideaWall] = await Promise.all([
      Submit.findAll({
        where: {
          projectId,
          // 注意：project.currentStage 是 INTEGER，Submit.stage 格式 "${int}-${int}"
          stage: { [Op.like]: `${project.currentStage}-%` }
        },
        attributes: ['stage', 'content', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Kanban.findOne({
        where: { projectId },
        include: [{
          model: Column,
          attributes: ['id', 'name', 'task'],
          include: [{
            model: Task,
            attributes: ['id', 'title', 'updatedAt']
          }]
        }]
      }),
      // Idea_wall 一個專案只有一筆、stage:null，用 findOne 不帶 stage 過濾
      Idea_wall.findOne({
        where: { projectId },
        order: [['id', 'ASC']],
        attributes: ['id', 'name'],
        include: [{
          model: Node,
          attributes: ['title'],
          limit: 20
        }]
      })
    ]);

    // 4. 組裝 markdown（見第 6 節）
    const snapshot = formatSnapshot({ project, submits, kanban, ideaWall, SUB_STAGE_TITLES, STAGE_TITLES });
    return snapshot.slice(0, MAX_CONTEXT_LEN);

  } catch (err) {
    console.warn('[SDL Coach] buildProjectSnapshot 失敗:', err.message);
    return '';
  }
}
```

### 5.2 修改 `askCoach` handler

```js
// 在組 userPrompt 前插入：
let projectContext = '';
if (projectId && req.user?.id) {
  projectContext = await buildProjectSnapshot(projectId, req.user.id);
}
const finalContext = projectContext || context || '';

const userPrompt = buildUserPrompt({
  question,
  currentStage,
  context: finalContext
});
```

**Fallback 順序**：後端查到的 > 前端傳的 > 空字串

---

## 6. 組裝後的字串格式

```markdown
## 專案
名稱：光合作用對不同光強度的反應
描述：測試紅光、藍光、白光對葉片產氧量的影響
階段：2-1（擇策階段 / 訂定研究構想表）

## 本階段已提交（最近 5 筆）
- [04-10 08:32] 研究問題：不同波長的光對葉片光合作用速率的影響為何...
- [04-09 14:20] 變因設定：操縱變因 = 光源波長，應變變因 = 單位時間產氧量...
- [04-08 16:45] 文獻回顧：已查 Smith 2019 等 3 篇論文...

## 看板任務（依學生自訂列表分組）
### 實驗準備（3 張）
- 預約實驗室
- 準備葉片樣本
- 校正 pH 計
### 進行中（2 張）
- 跑紅光組
- 記錄產氧量
### 待分析（1 張）
- 統計分析數據
### 寫報告（0 張）

## 想法牆節點
葉綠素、光反應、氧氣量、實驗對照組、變因控制、波長、光合作用速率...
```

### 6.1 截斷策略

若組裝後超過 `MAX_CONTEXT_LEN = 3000`：

1. 優先保留 `## 專案` 與 `## 本階段已提交`
2. 依序截斷 `## 想法牆` → `## 看板任務` → `## 本階段已提交`
3. 任一筆 Submit `content` 過長時，`JSON.stringify` 後截到 120 字

> 註：原先階段標示會顯示為「2-1（擇策階段 / 訂定研究構想表）」的格式，子階段名稱來自 `fourStageFilterService.SUB_STAGE_TITLES[project.currentStage][project.currentSubStage]`。

---

## 7. 錯誤與邊界處理

| 情況 | 行為 |
|---|---|
| 無 `projectId` 傳入 | 不呼叫 `buildProjectSnapshot`，fallback 到前端 `context` |
| `UserProject` 查無 | `return ''`（靜默，不暴露專案存在） |
| `Project` 本身查不到 | `return ''` |
| 任一並行查詢超時/失敗 | `try/catch` 吞掉，整體 `return ''`，`console.warn` 記錄 |
| 組裝字串 > 3000 字 | 依第 6.1 節截斷策略處理 |
| LLM 呼叫失敗 | 沿用現有 `askCoach` 的 500 錯誤處理 |

---

## 8. 測試計畫

### 8.1 後端 API

```bash
# 重啟 api
docker compose -f docker-compose.dev.yml restart api

# 測 1：有 projectId + 有權限
curl -X POST http://localhost:3000/api/sdl-coach/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <student_token>" \
  -d '{"question":"我下一步該做什麼？","projectId":1,"currentStage":"擇策"}'

# 測 2：有 projectId + 無權限（應 fallback 到 context）
# 用非專案成員的 token

# 測 3：無 projectId（應使用前端傳的 context）
```

### 8.2 驗證點

- [ ] api log 顯示 `[SDL Coach] snapshot built: N chars`（N > 500）
- [ ] LLM 回應**明顯**引用專案資料（非泛談）
- [ ] 無權限時靜默 fallback，無 500 錯誤
- [ ] Snapshot 耗時 < 100ms（DB 無 N+1）
- [ ] Context 總長度 ≤ 3000 字（即使專案很大）

### 8.3 前端實測

1. 以學生帳號登入
2. 進入專案看板
3. **手動取消註解** `ChatWindow.jsx:148-156` 的自主學習助手 tab（測試用）
4. 切到自主學習助手、問「我現在進度怎麼樣？」
5. 確認 LLM 回答引用到當前專案的看板/提交內容
6. 測試結束後**恢復註解**，不要讓測試用的解除註解被 commit

---

## 9. 實作後的效果（Before / After 對照）

以下用一個真實場景對照：

**情境**：學生「小明」正在做「光合作用」專案，目前在 2-1（擇策階段 / 訂定研究構想表），看板已有部分任務，Submit 已交了研究問題與變因設定。他問自主學習助手：「**我下一步該做什麼？**」

### 9.1 Before（目前無專案資料）

LLM 只能看到：
```
【學生目前所在階段】擇策
【學生問題】我下一步該做什麼？
```

**可能的回答**：

> 你目前在擇策階段，這個階段的重點是選擇適合的研究策略和方法。建議你可以：
>
> 1. 回顧你在「定標」階段提出的研究問題，思考它需要哪種方法來驗證
> 2. 查閱相關文獻，看看前人用過什麼研究設計
> 3. 列出你需要的變因（操縱、應變、控制）
>
> 請問你目前對哪一步驟最沒頭緒呢？

⚠️ **問題**：
- 泛泛而談，沒有針對小明實際做到哪裡
- 建議「列出變因」— 但小明**已經交過變因設定**了（LLM 不知道）
- 建議「查閱文獻」— 屬於前一階段（1-3）的工作，和 2-1 訂定研究構想表沒直接關係（LLM 不知道目前子階段）
- 沒用到看板任務做建議

---

### 9.2 After（串接專案資料後）

LLM 看到：
```
【學生目前所在階段】擇策

【當前任務脈絡】
## 專案
名稱：光合作用對不同光強度的反應
階段：2-1（擇策階段 / 訂定研究構想表）

## 本階段已提交（最近 5 筆）
- [04-10] 研究問題：不同波長的光對葉片光合作用速率的影響為何...
- [04-09] 變因設定：操縱 = 光源波長，應變 = 單位時間產氧量...

## 看板任務
### 實驗準備（3 張）
- 預約實驗室
- 準備葉片樣本
- 校正 pH 計
### 進行中（0 張）
### 待分析（0 張）
### 寫報告（0 張）

## 想法牆節點
葉綠素、光反應、氧氣量、實驗對照組、波長

【學生問題】我下一步該做什麼？
```

**可能的回答**：

> 我看到你這階段（訂定研究構想表）已經交了研究問題和變因設定 — 操縱變因、應變變因都寫好了。不過構想表還有幾個空格可以再補：
>
> 1. **你的應變變因寫「單位時間產氧量」，你打算怎麼量？**水位法？溶氧計？這個如果沒定下來，後面 2-2「設計研究記錄表」會卡住，因為你不知道要記錄什麼單位。
> 2. **看板「進行中」是空的，但已經有三張準備任務**（預約實驗室、樣本、pH 計）— 這代表你已經在想硬體了，可是預實驗的流程（例如「跑紅光組一次、看看讀數」）還沒上板。要不要先把預實驗的步驟拆成卡片？
> 3. **想法牆我看到你有「對照組」這個節點** — 你的控制組打算怎麼設？恆定白光、全黑、還是？
>
> 你覺得這三項裡哪一個最卡？我們先從那個聊起。

✅ **改善**：
- **不會重複建議「列出變因」**（LLM 看到已交）
- **引用具體提交內容**（「你寫單位時間產氧量」）
- **知道當前子階段在做什麼**（2-1 訂定研究構想表 vs 2-2 設計研究記錄表，能預告下一步的依賴）
- **用看板結構推論缺口**（「進行中是空的」→ 缺預實驗步驟）
- **引用想法牆節點**（「對照組」）
- **提問具體、可行動**，符合蘇格拉底式引導原則

---

### 9.3 另一個情境：看板欄位自訂

**情境**：學生「阿華」把預設欄位改成 `想法發散 / 驗證中 / 卡住的 / 完成 / 要問老師`

**Before**：LLM 看不到看板，無法引用任何進度

**After**：

> 我注意到你看板有「卡住的」欄位裡有兩張：「反應速率公式」和「數據怎麼畫圖」。先聊第一個 — 你是卡在「公式選不出來」還是「算出來不合理」？...

- LLM **尊重學生的 workflow 設計**，不會硬套「待辦/做中/完成」
- 「卡住的」這個欄位名本身就是重要信號，LLM 會優先處理

---

## 10. 完成判定

- [ ] `buildProjectSnapshot` 實作完成，包含權限檢查 + 4 個並行查詢 + 組裝 + 截斷
- [ ] `askCoach` 改動完成，fallback 順序正確
- [ ] API 重啟無錯，log 顯示 snapshot 大小
- [ ] curl 測試三種情境（有權、無權、無 projectId）皆符合預期
- [ ] LLM 實測回答明顯引用專案資料
- [ ] 單次查詢耗時 < 100ms
- [ ] 無新增的 N+1 查詢
- [ ] commit 訊息：`feat: 自主學習助手串接專案資料（階段、提交、看板、想法牆）`

---

## 11. 本 PR 一併處理的事

- ✅ `controllers/sdlCoach.js:25` 的 `VALID_STAGES` 從五階段清成四階段（拿掉「學習歷程」），原因是 Option B 模式下第五階段已停用、功能改由「匯出歷程檔案」模組承擔
- ✅ 對應前端 `api/sdlCoach.js` 的 `STAGE_LABELS` 已經是 4 階段，無需動
- ✅ `SdlCoachChat.jsx` 的 `STAGE_HINT` / `QUICK_PROMPTS_BY_STAGE` 已經是 key 1-4，無需動

## 12. 不在本 step 範圍的事

為避免再次過度設計，以下**刻意延後**：

- ❌ 快取 / invalidation（永遠別做，除非 profiling 顯示是瓶頸）
- ❌ Function calling / tool use（先讓 LLM 用純 context 夠用）
- ❌ 多輪對話的 context 差量更新（每次都重查就好）
- ❌ 跨專案記憶（目前 session 綁定 `sdl-coach-${projectId}` 已足夠）
- ❌ 串接 `rag_message` / Gemini Grounding（那是科學助手的事，兩者互補不互通）
- ❌ `help_seeking_log`（學生求助紀錄）帶進 snapshot
- ❌ `chat_turn` 歷史輪次回讀（目前每輪都從 0 開始想，夠用）
- ❌ `node_relations` 想法牆邊關係（只取 node title 已經是夠強的訊號）
- ❌ `idea_wall_message`（想法牆留言串）
- ❌ 清理 `controllers/submit.js:131-145` 那段 legacy 的「每個子階段建一個 Idea_wall」死碼（屬於 submit 模組的清理，不在本 PR）

以上項目都是「等真的有需求再做」。

---

**規劃建立日**：2026-04-14
**規劃作者**：Claude Opus 4.6 + Richie
