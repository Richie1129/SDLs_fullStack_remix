# SDL Coach 計畫 — 與實際架構的落差清單

> **用途**：對照 `sdl-coach-project-context-plan.md` 與實際程式碼／DB schema，列出**計畫裡寫得跟系統現況不符**的地方，以及**計畫漏掉但應該補**的項目。
>
> **為什麼做這份文件**：原計畫是在沒有細讀 models/controllers 的情況下寫的，有幾處直接假設了錯誤的資料格式與命名。在開始實作前，必須先把這些對齊，否則寫出來的 `buildProjectSnapshot` 會回傳空字串或噴錯。
>
> **建立日**：2026-04-14
> **更新**：改寫版（原版包含不必要的「課綱詞彙對應」討論，已移除；本專案五階段 `['定標','擇策','監評','調節','學習歷程']` 的框架本身符合課綱理念，不需要改動）

---

## 1. 必改：計畫與實作現況直接牴觸

### 1.1 `Submit.stage` 儲存格式是 `"${stageInt}-${subStageInt}"`，不是中文字串

**計畫寫的**（第 4 節 ② ）：
```
stage LIKE '${cur}-%'
```
暗示 `cur` 是中文階段名（例如 `擇策`）。

**實際是**（`controllers/submit.js:50, 77, 93, 235`）：
```js
const stageKey = `${currentStageInt}-${currentSubStageInt}`;
await Submit.create({ stage: stageKey, ... });
```
`Submit.stage` 儲存的字串長得像 `"2-1"`、`"3-2"`，兩個整數用 `-` 接起來。`Submit.stage` 的第二個例證在 `submit.js:283`：
```js
const [aStage, aSubStage] = a.stage.split('-').map(Number);
```

**影響**：如果 `buildProjectSnapshot` 收到 `currentStage='擇策'` 去跑 `WHERE stage LIKE '擇策-%'`，會回傳 **0 筆**。

**改法**：snapshot 應該直接從 DB 讀 `Project.currentStage`（整數），並用：
```js
where: { projectId, stage: { [Op.like]: `${project.currentStage}-%` } }
```
**不要依賴前端傳入的 `currentStage`**，因為 `api/sdlCoach.js:13` 已經把整數轉成中文 label 再送（`stageNumberToLabel(1..4)`），但 DB 存的是整數字串，兩套不相容。

---

### 1.2 `Project.currentStage` / `currentSubStage` 是 INTEGER，不是中文

**計畫隱含假設**：第 4 節 ① 列 `currentStage` 當欄位來源，第 9 節 Before 範例寫 `【學生目前所在階段】擇策`。

**實際**（`models/project.js:30-37`）：
```js
currentStage: { type: DataTypes.INTEGER, allowNull: true },
currentSubStage: { type: DataTypes.INTEGER, allowNull: true },
```
兩個欄位都是整數。Chinese label 是**表現層**才做的轉換（`api/sdlCoach.js` 的 `STAGE_LABELS`）。

**改法**：`buildProjectSnapshot` 查到 `currentStage` 後要自己決定要不要轉中文再放進 markdown，並且**以 int 為權威值**做其他查詢。

---

### 1.3 系統實際是「四階段模式」（Option B 隱藏 Stage 5）

**重大發現**：`services/fourStageFilterService.js` 的註解與配置：
```js
// Option B: 四階段 SRL 循環 - 過濾 Stage 5 資料
// 將「歷程」階段從 API 回應中過濾，改為獨立的 Portfolio 功能模組
const FOUR_STAGE_CONFIG = {
  STAGE_MIN: 1,
  STAGE_MAX: 4,          // [Option B 隱藏] 原值 5，改為 4
  SUB_STAGE_MIN: 1,
  SUB_STAGE_MAX: 3,      // [Option B 隱藏] 原值 10，改為 3
  HIDDEN_STAGE: 5
};
```

而且 `controllers/submit.js:114-115` 確實在用這組常數判斷階段推進上限。`api/sdlCoach.js` 的 `STAGE_LABELS` 也只到 4：
```js
const STAGE_LABELS = { 1: '定標', 2: '擇策', 3: '監評', 4: '調節' };
```

但 `controllers/sdlCoach.js:25` 仍宣告：
```js
const VALID_STAGES = ['定標', '擇策', '監評', '調節', '學習歷程'];
```

**這是現存的不一致**。如果學生真的在做「學習歷程」，前端沒有對應 int，不會送過來；即使硬送 `'學習歷程'` 過來，`Project.currentStage` 也不會是 5（因為 `submit.js` 的進階邏輯不會推到 5）。

**對 `buildProjectSnapshot` 的影響**：
- 不要相信 `Project.currentStage === 5` 的狀態會出現
- 計畫第 4 節 查詢的過濾條件要以四階段為準
- 第五階段「學習歷程」的情境先不管（或另外做一個 portfolio snapshot）
- `VALID_STAGES` 是否要降回 4 階段？這是順手可以清的債，但不是本 PR 的 scope

---

### 1.4 子階段實際名稱是**寫死的表**（`SUB_STAGE_TITLES`），不是「2-1 = 擇策 > 研究方法」

**計畫 第 9.1 節 Before 範例寫的**：
```
階段：2-1（擇策 > 研究方法）
```

**實際**（`services/fourStageFilterService.js`）：
```js
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
  '4-3': '撰寫研究結論',
};
```

`2-1` 叫**訂定研究構想表**，不是「擇策 > 研究方法」（後者是我憑空編的）。

**同時**：這套名稱還有**另一個來源** — `Process → Stage → Sub_stage` 三張 DB 表（`models/stage.js`、`models/sub_stage.js`、`controllers/submit.js:107-111, 137-138`）。`submit.js` 在推進 sub-stage 時會這樣查名稱：
```js
const stage = await Stage.findAll({
  where: { id: process[0].stage[currentStageInt - 1] }
});
const subStageId = stage[0].sub_stage[currentSubStageInt];
const subStageRecord = await Sub_stage.findByPk(subStageId, { attributes: ['name'] });
```

所以系統其實**同時有兩套子階段名稱來源**：
- (A) DB 的 `stages` / `sub_stages` 表（per-project 透過 `Process.stage` 陣列索引）
- (B) `fourStageFilterService.js` 的 `SUB_STAGE_TITLES` 硬寫的 map

`buildProjectSnapshot` 要決定用哪一套。傾向：
- **查 DB**（跟 `submit.js` 的寫法一致，會跟著專案的 Process 同步）
- 或者**直接用 `SUB_STAGE_TITLES`**（O(1)、沒 JOIN，但如果某個專案客製了 Process 會對不上）

**改法**：
1. 第 9.1 節 / 第 9.2 節 的範例必須用真實子階段名稱重寫（例如 `2-1 訂定研究構想表`）
2. 計畫第 4 節 要補一段說明：子階段名稱從哪裡來、為什麼這樣選

---

### 1.5 `Idea_wall` 是**一個專案一個**，所有階段共用同一個

系統的明確設計決策是：**每個專案只有一個想法牆，不分階段**。證據有兩處：

**建立端**（`controllers/project/projectController.js:208-214`）：專案建立時只插一筆 Idea_wall：
```js
// 簡化：每個專案只需要一個想法牆，不分階段
await Idea_wall.create({
  name: `${createdProject.name}-想法牆`,
  type: "project",
  projectId: createdProject.id,
  stage: null // 不再使用階段概念
});
```
重點：`stage: null`，註解說「不再使用階段概念」。

**讀取端**（`controllers/ideaWall.js:43-47`）：
```js
// 直接查找專案的想法牆（應該只有一個）
const result = await Idea_wall.findOne({
  where: { projectId: projectId },
  order: [['id', 'ASC']]
});
```
沒有 stage 過濾，註解也寫「應該只有一個」。

**我原本的錯誤**：我看到 `submit.js:131-145` 有 `Idea_wall.create({ stage: nextStageKey, ... })` 這種 per-sub-stage 建立邏輯，就誤以為每個 sub-stage 會有獨立的 Idea_wall。實際上那是「不再使用階段概念」這個簡化之前的舊邏輯，現況下不該再依賴它。

**對 snapshot 的影響**：查想法牆只要用 projectId 就夠，不需要也不該用 stage 過濾：
```js
const ideaWall = await Idea_wall.findOne({
  where: { projectId, type: 'project' },
  order: [['id', 'ASC']],
  include: [{ model: Node, attributes: ['title'], limit: 20 }],
});
```

**改法**：計畫 第 4 節 ④ 改成：
```
④ Idea_wall（projectId 查那一個唯一的想法牆）→ Node.title 最多 20 筆
```
不指定 stage，單純靠 projectId。

---

## 2. 應補：計畫漏掉、但值得放進 snapshot 的訊號

### 2.1 Node 有「節點間關係」但計畫沒拉

`models/node.js:31-44` 顯示 Node 是**自連接多對多**：
```js
Node.belongsToMany(Node, { as: 'successors', through: NodeRelation, ... });
Node.belongsToMany(Node, { as: 'predecessors', through: NodeRelation, ... });
```

學生的想法牆實際上是一張有向圖，邊代表「A 推論到 B」「A 影響 B」這類思考鏈。只拉 `title` 會丟掉最有價值的部分（思考結構）。

**建議**：snapshot 增加一段「想法牆結構」，例如：
```
## 想法牆節點關係（最多 10 條邊）
- 光強度 → 光合作用速率
- 葉綠素 → 光反應
- 對照組 ← 全黑組
```
但這是**加分題**，不是 v1 必做。如果怕複雜先只拉 title。

### 2.2 Task 不只有 title

`models/task.js` 顯示 Task 還有：`content`, `labels`, `assignees`, `owner`, `dueDate`, `images`, `files`, `createdAt`。

對 LLM 判斷進度最有用的是：
- `dueDate` — 快過期的卡片是「該推進的項目」
- `assignees` / `owner` — 看學生自己名下有幾張
- `labels` — 如果學生有標「阻塞」「待問老師」這類 label，對助手來說是強信號

**建議**：snapshot 的 Task 部分至少保留 `title`，有餘裕就加 `dueDate`（只顯示快到期的）。可以先 v1 只放 title，未來再擴充。

### 2.3 子階段名稱來源：用 `fourStageFilterService.SUB_STAGE_TITLES`（已定案）

計畫直接把階段名稱當字面值用，沒意識到系統每個專案其實也有獨立的 `Process` row，透過 `Process.stage: INTEGER[]` 索引到 `Stage` 表，再透過 `Stage.sub_stage: INTEGER[]` 索引到 `Sub_stage` 表——這是既有 `submit.js` 的做法。

**決策已定**：`buildProjectSnapshot` **直接 import `fourStageFilterService.SUB_STAGE_TITLES`** 這個 hardcode map，不走 DB JOIN。

**理由**：
- 省兩次查詢，snapshot 的目標是 < 100ms
- `fourStageFilterService` 本來就是這套流程的權威配置來源
- 即使 `Process` 表有 per-project 客製，目前沒有這個使用情境

### 2.4 `VALID_STAGES` 要順手清成四階段（已定案）

`controllers/sdlCoach.js:25` 還寫五階段，但系統實際是四階段（第 1.3 節）。

**決策已定**：本 PR 一併清理：
```diff
- const VALID_STAGES = ['定標', '擇策', '監評', '調節', '學習歷程'];
+ const VALID_STAGES = ['定標', '擇策', '監評', '調節'];
```

**理由**：「學習歷程」階段已在系統層面取消，該功能搬到獨立的「匯出歷程檔案」模組。`VALID_STAGES` 留著五個只會造成後人誤解與資料不一致。知識小抄（`docs/sdl-coach-knowledge-base.md`）裡仍包含「學習歷程階段」段落，LLM 仍可以用那些提示引導學生反思，但**不會有 `currentStage='學習歷程'` 這種 API 請求**。

### 2.5 `Project.course_config` 有課程節奏資訊

`models/project.js:64-74` 顯示 Project 有 `course_config` JSONB：
```js
{
  sessions_per_week: 2,
  has_homework: false,
  stage_duration_weeks: 2,
  analysis_window_sessions: 2,
}
```

`stage_duration_weeks` 特別有用：LLM 可以用它判斷「學生在這個階段停留時間是否超出預期」。但這又是加分題。

---

## 3. 可延後（列進計畫 第 11 節「不在本 step 範圍」）

### 3.1 `help_seeking_log` / `help_seeking_avoidance_risk` — 已存在的學生狀態信號

`models/help_seeking_log.js` 與 `help_seeking_avoidance_risk.js` 已經在追蹤學生「求助行為」與「求助迴避風險」，而且已經跟 Project / Task 建立關聯（`models/project.js:105-112`）。

**未來 snapshot 可以用這個判斷**：
- 學生是「單純卡住」還是「逃避求助」
- 最近 analysis_window 內有沒有異常的求助模式

但**本 PR 不做**。原因：scope creep、而且助手知道學生「有求助迴避風險」可能會改變語氣，需要教學設計判斷（屬於 `sdl-coach-teacher-review-form.md` 的範疇）。

### 3.2 回讀 `sdl_coach_messages`（原名 `chat_turn`）的最近一輪自主學習對話

`sessionId='sdl-coach-${projectId}'` 的訊息都存在 `sdl_coach_messages` 表（2026-04-17 從 `chat_turns` rename）。snapshot 可以把最近 2–3 輪丟回去讓 LLM 有連貫性。

但**本 PR 不做**。原因：對話連貫性靠 `session_id` 綁定，目前 `askCoach` 是 stateless 呼叫，要加連貫性應該另開一個 feature。

### 3.3 想法牆訊息（`idea_wall_message`）

Idea_wall 有 `hasMany(IdeaWallMessage)`，學生會在 idea wall 上留訊息。這也是 signal，但同樣為避免 scope creep 先不做。

---

## 4. 計畫 第 9 節 Before / After 範例需要重寫

原範例問題：
- 子階段標籤 `2-1（擇策 > 研究方法）` 是幻想的，真實是 `2-1 訂定研究構想表`
- 學生繳交「變因設定」「文獻回顧」出現在 `2-1`，但 `2-1` 的任務是「訂定研究構想表」，時間軸上變因設定應該出現在 `2-2 設計研究記錄表` 或 `2-1` 的研究構想表裡
- 「紙上作業已完成 70%」的百分比是助手修辭，系統沒有這個計算

**需要做的**：
1. 把 第 9 節 的 Before / After 全部用真實子階段名稱（`1-1`~`4-3` 這 12 個）重寫
2. 用 `SUB_STAGE_TITLES` 的實際任務名稱當情境，不要自己編「研究方法」這類不存在的標籤
3. 百分比描述要改成「看板任務 3/5 完成」這種可從 DB 直接推出的具體指標

這我可以改。但改之前要先定案 第 1~2 節 的所有決策（例如子階段名稱來源選 A/B/C）。

---

## 5. 修正後 snapshot 應該長什麼樣（示意）

```
## 專案
名稱：光合作用對不同光強度的反應
階段：2-2（擇策 / 設計研究記錄表）

## 本階段已繳交（Submit，stage LIKE '2-%'，最近 5 筆）
- [04-10 by user#3] {content 前 80 字}
- [04-09 by user#3] {content 前 80 字}
- [04-08 by user#5] {content 前 80 字}

## 看板任務（依學生自訂欄位順序）
### 想法發散（2 張）
- 查光合作用文獻
- 列出可能變因
### 進行中（1 張）
- 設計記錄表格
### 卡住的（1 張）
- 不知道怎麼量產氧量
### 完成（0 張）

## 想法牆節點（專案唯一的 idea_wall，最多 20 個 Node.title）
葉綠素、光反應、氧氣量、對照組、波長、光強度
```

這版跟計畫 第 9.2 節 相比：
- 階段標記改真實的 `2-2（擇策 / 設計研究記錄表）`
- 不再出現「紙上作業 70%」這類空口數字
- Idea_wall 明確限定 `stage='${currentStageKey}'`
- 看板按學生自訂欄位順序（保留原設計意圖）

---

## 6. 實作前的 checklist（給自己）

- [ ] 在 DB 跑一次 `SELECT DISTINCT stage FROM submits LIMIT 20;` 確認格式真的是 `"2-1"` 這種
- [ ] 跑 `SELECT id, name, currentStage, currentSubStage FROM projects LIMIT 5;` 看有沒有 `currentStage > 4` 的實例
- [ ] 跑 `SELECT id, projectId, stage, type FROM idea_walls WHERE projectId = <任一>;` 確認每個專案只有一筆 idea_wall、`stage` 為 NULL（符合 projectController.js:208 的設計）
- [ ] 在 `controllers/sdlCoach.js` import `fourStageFilterService.SUB_STAGE_TITLES` 做子階段名稱顯示
- [ ] 清理 `VALID_STAGES` 為四階段
- [ ] 重寫計畫第 9 節的 Before / After 範例

做完這四項才動 `buildProjectSnapshot` 的 code。

---

**撰寫者**：Claude Opus 4.6
**狀態**：實際讀過 models/controllers 之後的對齊版本
