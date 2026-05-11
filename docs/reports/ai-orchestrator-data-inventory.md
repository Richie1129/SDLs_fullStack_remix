# AI Orchestrator 已收集資料盤點與研究分析價值

> 資料來源：`lazyinwork_backup_20260423_020001.sql`（production DB 備份，2026-04-23 02:00 匯出）
> 時間跨度：**2025-09-09 ~ 2026-04-23**（約 7.5 個月，其中 orchestrator 活躍期為 2026-02 ~ 2026-04）
> 建立日期：2026-04-23

## 目錄

1. [總覽](#1-總覽)
2. [ORCHESTRATOR_DECISION — 規則引擎決策日誌](#2-orchestrator_decision--規則引擎決策日誌)
3. [kb_coach_histories — AI 回應完整內容](#3-kb_coach_histories--ai-回應完整內容)
4. [KB_COACH_GUIDANCE — AI 回應摘要審計](#4-kb_coach_guidance--ai-回應摘要審計)
5. [5Rs AI 分析資料](#5-5rs-ai-分析資料)
6. [其他 AI 相關行為日誌](#6-其他-ai-相關行為日誌)
7. [ai_feedbacks — 學生對 AI 的主觀評價](#7-ai_feedbacks--學生對-ai-的主觀評價)
8. [資料品質問題與警訊](#8-資料品質問題與警訊)
9. [研究分析路線建議](#9-研究分析路線建議)
10. [資料使用注意事項](#10-資料使用注意事項)

---

## 1. 總覽

| 資料類型 | 所在表 | 筆數 | 時間範圍 | 去識別化程度 |
|---|---|---|---|---|
| Orchestrator 決策 | `audit_events` (action=`ORCHESTRATOR_DECISION`) | **223** | 2026-02-24 ~ 2026-04 | 中（metadata 為結構化指標） |
| AI 回應完整內容 | `kb_coach_histories` | **163** | 2026-02-24 ~ 2026-04 | **低（完整明文保留）** |
| AI 回應摘要審計 | `audit_events` (action=`KB_COACH_GUIDANCE`) | **273** | 2026-02-24 ~ 2026-04 | 高（僅 hash + length） |
| 5Rs 反思 AI 分析 | `audit_events` (action=`DAILY_PERSONAL_5RS_AI_ANALYSIS`) | 5 | 2025-09-09 | 中（保留 feedback 明文） |
| 5Rs 輸入審計 | `audit_events` (action=`ASSISTANT_5RS_ANALYZE`) | 9 | 2025-09-09 | 高（hash） |
| 看板 AI 助手開啟 | `audit_events` (action=`KANBAN_AI_ASSISTANT_OPEN`) | 124 | 2026-02-24+ | 僅元資訊 |
| 一般 AI 會話 | `audit_events` (action=`ASSISTANT_*`) | 631 | 跨期 | 混合 |
| **學生對 AI 的回饋** | `ai_feedbacks` | **1** ⚠️ | 2026-03-16 | — |

**觀察：** 相比輸入端（學生寫什麼）與輸出端（AI 回什麼），**評估端（AI 有沒有幫助）幾乎是 0**。這是目前資料結構最大的缺口。

---

## 2. ORCHESTRATOR_DECISION — 規則引擎決策日誌

### 2.1 整體分佈（223 筆）

| decision | 筆數 | 對應 discussionType | 觸發的 agent |
|---|---|---|---|
| **TRIGGER** | 125 (56.1%) | OVERLOAD 89, SHALLOW 22, ECHO_CHAMBER 14 | SYNTHESIZER 89, IMPROVER 22, DEVIL 14 |
| **WAIT** | 98 (43.9%) | HEALTHY 98 | null |

### 2.2 協作品質四指標統計

| 指標 | min | median | mean | max |
|---|---|---|---|---|
| depth（討論深度）| 20.0 | 40.0 | 50.2 | 100.0 |
| diversity（觀點多樣性）| 20.0 | 70.0 | 57.8 | 100.0 |
| convergence（收斂度）| 20.0 | 20.0 | 24.1 | 100.0 |
| nodeCount（貼文數）| 1 | 9 | 7.1 | 10 |

**注意：** 所有值都是 20 的倍數（20/40/60/70/100）— 代表規則引擎用的是**離散分級**而非連續分數，這會限制統計分析的精細度（後續若要用連續指標，需要檢視 `services/orchestrator.js` 的計算邏輯）。

### 2.3 真實資料範例（各類情境各 1 筆）

**範例 A：ECHO_CHAMBER → DEVIL（同溫層警訊）**

```json
{
  "id": "a909594d-f6af-47ff-9c67-a16a89caa912",
  "timestamp": "2026-02-24 11:39:17.619+00",
  "idea_wall_id": 296,
  "project_id": 134,
  "metadata": {
    "role": "DEVIL",
    "reason": "同溫層風險（多樣性: 20, 收斂度: 100）- 需要挑戰觀點",
    "analysis": {"depth": 20, "diversity": 20, "nodeCount": 1, "convergence": 100},
    "decision": "TRIGGER",
    "discussionType": "ECHO_CHAMBER"
  }
}
```

**範例 B：OVERLOAD → SYNTHESIZER（資訊過載）**

```json
{
  "id": "33919758-2e04-4a23-ae55-d426182ca2ca",
  "timestamp": "2026-03-04 01:35:37.66+00",
  "idea_wall_id": 299,
  "project_id": 136,
  "metadata": {
    "role": "SYNTHESIZER",
    "reason": "資訊過載（10篇貼文，收斂度: 20）- 需要整合觀點",
    "analysis": {"depth": 70, "diversity": 100, "nodeCount": 10, "convergence": 20},
    "decision": "TRIGGER",
    "discussionType": "OVERLOAD"
  }
}
```

**範例 C：SHALLOW → IMPROVER（淺層討論）**

```json
{
  "id": "a6ea6297-4aaf-458f-af18-e3210800c6ec",
  "timestamp": "2026-03-09 01:38:35.098+00",
  "idea_wall_id": 309,
  "project_id": 146,
  "metadata": {
    "role": "IMPROVER",
    "reason": "淺層討論（深度分數: 20，平均長度: 20字）- 需要引導深化",
    "analysis": {"depth": 20, "diversity": 70, "nodeCount": 10, "convergence": 20},
    "decision": "TRIGGER",
    "discussionType": "SHALLOW"
  }
}
```

**範例 D：HEALTHY → WAIT（健康討論，不介入）**

```json
{
  "id": "0aa371ec-c91a-45a9-9d31-51be1ff5f79d",
  "timestamp": "2026-03-04 01:48:22.771+00",
  "idea_wall_id": 313,
  "project_id": 150,
  "metadata": {
    "role": null,
    "reason": "討論品質良好（深度: 40, 多樣性: 20）- 暫不介入",
    "analysis": {"depth": 40, "diversity": 20, "nodeCount": 1, "convergence": 20},
    "decision": "WAIT",
    "discussionType": "HEALTHY"
  }
}
```

### 2.4 研究分析價值

| 研究問題 | 可做的分析 |
|---|---|
| 規則引擎判準是否合理？ | 以 depth × diversity × convergence 的分佈驗證 4 個 `discussionType` 的可分性（多變量 ANOVA / LDA） |
| 三種介入情境比例反映什麼？ | **OVERLOAD 89 vs. SHALLOW 22 vs. ECHO_CHAMBER 14** — 學生最容易掉進「資訊過載」陷阱，同溫層較罕見；這本身就是 SDL 協作行為的發現 |
| 介入時機的時序特徵？ | 可 join `nodes` 表，看每次 TRIGGER 後 N 分鐘內學生貼文的 depth 是否提升（中斷時序設計 ITS） |
| 不同班級/教師/主題的差異？ | 21 個專題各自的介入率與類型分佈，可做教學情境比較 |

**限制：**
- `actorId` 都是 `\N`（因為是系統自動事件），無法直接連到學生個人
- 但 `targetId`（idea_wall）和 `projectId` 可 join 到專題與班級

---

## 3. kb_coach_histories — AI 回應完整內容

### 3.1 3 agent × 2 trigger_source 交叉（162 筆有效）

| | manual（學生主動）| orchestrator（系統自動）| 合計 |
|---|---|---|---|
| **SYNTHESIZER** | 48 | 55 | 103 (63%) |
| **IMPROVER** | 16 | 20 | 36 (22%) |
| **DEVIL** | 12 | 11 | 23 (14%) |
| **合計** | 76 (47%) | 86 (53%) | 162 |

### 3.2 每筆保留的完整欄位

```
id, project_id, idea_wall_id, node_id, user_id,
agent_type, model_used (都是 GPT-OSS-20B),
node_title, node_content,          ← 學生原始貼文
thinking_process,                   ← AI 的 CoT 推理（重要！）
response_content,                   ← AI 最終回應（Markdown）
suggested_actions,                  ← JSON: [{label, actionType, payload}]
context_count,                      ← sliding window 用了幾篇歷史貼文
response_time_ms,                   ← 延遲（效能指標）
session_id, created_at, updated_at,
help_seeking_intent,                ← proactive_improve / stuck / null
trigger_source                      ← manual / orchestrator
```

### 3.3 真實回應範例（6 種組合）

#### 範例 1：DEVIL × manual（id=1）

- **學生貼文**：標題「123」、內容「我的理論：456」（測試性貼文）
- **AI CoT**：「我注意到使用者所提出的理論（456）缺乏具體細節與實證支撐，可能存在過度自信的假設。為了促進批判性思考，我將提出一個極端情境，挑戰其穩健性...」
- **AI 回應**（節錄）：
  > ## 反思與挑戰
  > 你在標題 **123** 下提出的理論 *456* 看似合理，但我觀察到以下可能的盲點：
  > 1. **缺乏實證資料**：沒有提供實際案例或數據來驗證核心假設。
  > 2. **過度簡化**：假設所有相關變數都能按預期運作...
  >
  > ### 反例 / 極端情境
  > > **假設**：若你所依賴的關鍵前提（例如「A 將持續穩定」）在短期內失效，整個結論會被推翻...
- **延遲**：4015 ms

#### 範例 2：DEVIL × orchestrator（id=5）

- **學生貼文**：`\N` / `\N`（無標題、無內容）
- **AI CoT**：「步驟1：注意到標題為「無標題」、內容為「無內容」，不屬於完全空白或無意義符號的情況 → 步驟2：因此符合寬鬆的可教性判斷，可進行反思與挑戰 → 步驟3：作為魔鬼代言人，先指出「無內容」本身的哲學/實務空洞...」
- **AI 回應**（節錄）：
  > 看起來你目前的想法是「無內容」。這個說法本身就像是一個空白框架...
  > - 如果你把「無內容」當成一種「空白」的機會，會不會因此忽略了那些值得深入探討的細節？
  > - 如果你把「無內容」看作「完全不需要內容」，那麼在討論星系的多樣性時，是否會錯過重要的觀點？
- **suggested_actions**: 3 個（補充核心論點 / 回覆並挑戰 / 探索反向情境）
- **延遲**：7590 ms
- **問題**：orchestrator 不該對空貼文觸發。這暴露 **規則引擎漏洞**，但對研究也是有價值的發現。

#### 範例 3：IMPROVER × manual（id=3）

- **學生貼文**：標題「水污染的危害」、內容「會造成飲用水風險、生態系破壞與公共健康問題。」
- **AI 回應**：
  > 「你提到水污染會造成飲用水風險、生態系破壞與公共健康問題，這些影響之間有什麼相互關聯？
  > - 例如，根據 WHO 的飲用水標準，哪些物理、化學或生物指標最能反映飲用水安全？
  > - 能否舉一個具體事件，說明水污染如何導致生態失衡（如藻華或魚類死亡）？
  > 這些問題能幫助你把概念具體化，並連結到實際數據與案例。」
- **延遲**：3427 ms（最快的一筆）
- **特徵**：蘇格拉底式提問，非常符合 IMPROVER 人格設定

#### 範例 4：IMPROVER × orchestrator（id=89）

- **學生貼文**：標題「厚頭龍的出現」、內容「我們最想做的恐龍也就是我們的主題」
- **AI CoT**：`\N`
- **AI 回應**：（為空）
- **延遲**：6025 ms
- **問題**：AI 產生了空回應。可能是 LLM 超時或內容過濾。這是**資料品質警訊**。

#### 範例 5：SYNTHESIZER × manual（id=9，星系長城）

- **學生貼文**：標題「星系長城」、內容「目前已發現最大尺度結構」
- **AI CoT**：4 步驟推理，分析多篇作者林天俊觀點，歸納為 4 大討論主題：星系分類、星系間相互作用、距離與可觀測性、星系獨立性爭議
- **AI 回應**（高度結構化的 Markdown 表格與段落）：
  > # 星系長城：從個別星系到宇宙大尺度結構
  > ## 1. 主要討論主題
  > | 主題 | 代表觀點 | 互補/衝突 | 主要結論 |
  > |---|---|---|---|
  > | **星系分類** | M82、M81 為螺旋星系... | **互補**：分類有助於理解星系演化 | ... |
  > | **星系間相互作用** | @林天俊 (3/4/2026) 提到 M82 與 M81 的引力碰撞導致星暴 | **互補**：相互作用是星系演化的關鍵驅動力 | ... |
  > ## 2. 互補與衝突
  > - **互補**：星系分類與相互作用的敘述共同構成星系演化的全貌...
  > - **衝突**：大犬座矮星系作為獨立星系或銀河系邊緣高密度區的爭議...
- **suggested_actions**: 3 個（補充星系分類 / 回覆最新觀測 / 創建大尺度結構模型）
- **context_count**: 9（最飽滿的 sliding window）
- **延遲**：9154 ms（最慢）
- **特徵**：這是**最高品質的 synthesizer 輸出**，展示了系統在真實學術討論中的能力上限

#### 範例 6：SYNTHESIZER × orchestrator（id=8）

- **學生貼文**：標題「星系」、內容「各種星系整合我們的知識：」
- **AI 回應**：
  > ## 星系知識整合
  > ### 共識
  > - **星系類型**：大多數條目屬於螺旋星系（如銀河系、仙女座、波德星系）或矮星系/不規則星系...
  > ### 張力
  > - **分類爭議**：大犬座矮星系被部分學者視為獨立星系或銀河盤面高密度區。
  > - **尺寸數據差異**：例如仙女座大星系距離約250萬光年，而三角座星系距離則約270-300萬光年...
- **context_count**: 8
- **延遲**：6115 ms

### 3.4 研究分析價值

| 研究問題 | 可做的分析 |
|---|---|
| 三種 agent 的人格是否真的有別？ | 對 response_content 做 **LIWC 文本特徵分析**：DEVIL 的疑問句率、IMPROVER 的開放性問句率、SYNTHESIZER 的結構化符號率 |
| manual vs orchestrator 觸發的 prompt 品質差異？ | 兩組 node_content 的平均長度、完整性、可教性（如範例 2 vs 範例 5 的對比） |
| AI 的 CoT 品質？ | thinking_process 的步驟數、條理性，可作為 **AI scaffolding 透明度** 的指標 |
| suggested_actions 的多樣性？ | 每個 agent 建議動作的類型分佈（CREATE_NEW / REPLY）與 payload 具體程度 |
| 延遲與品質的關係？ | response_time_ms vs content quality — 是否長時間運算的回應品質較高？ |
| sliding window 大小的影響？ | context_count (0-10) vs response_content 豐富度 — 訊息足量後品質會飽和嗎？ |

**最重要的研究切入點：**
> **對 163 筆回應做人工評分**（例如 5Rs rubric 或 Scardamalia Knowledge Building 指標），即可產出**第一篇實證論文**：「LLM 多代理人在協作學習情境下的 scaffolding 品質」。

---

## 4. KB_COACH_GUIDANCE — AI 回應摘要審計

審計版保留**結構化摘要**（符合隱私原則），273 筆比 kb_coach_histories 多出約 110 筆（代表部分早期記錄只進 audit、沒進 histories 表，值得追查）。

**單筆範例：**

```json
{
  "input": {
    "title": {"length": 3, "textHash": "a665a459...", "textPreview": "123"},
    "agentType": "DEVIL",
    "contextCount": 0
  },
  "output": {
    "contentLength": 391,
    "thinkingProcessLength": 99
  },
  "provider": "GPT-OSS-20B"
}
```

**研究價值：**
- 即使未來做隱私研究版本，仍能用 textHash 追蹤「同一段內容觸發幾次 AI」
- contentLength / thinkingProcessLength 可當**品質代理變項**
- **與 kb_coach_histories 的 110 筆差異是資料完整性審計重點**

---

## 5. 5Rs AI 分析資料

只在 2025-09-09 有 5 筆 `DAILY_PERSONAL_5RS_AI_ANALYSIS`（測試期）。但資料結構完整，值得保留做未來對比。

### 5.1 單筆範例（節錄）

```json
{
  "title": "1",
  "feedback": {
    "scores": {"relating": 1, "reasoning": 1, "reporting": 1, "responding": 1, "reconstructing": 1},
    "overall": "整體而言，這次反思較為初步，缺乏深度和廣度...",
    "relating": "現階段未能將事件與個人經驗或理論知識產生連結...",
    "reasoning": "目前缺乏對事件的深入思考和分析...",
    "reporting": "目前僅簡單提及事件，缺乏具體細節...",
    "responding": "...",
    "reconstructing": "...",
    "questions": {
      "relating": ["這次事件讓你聯想到過去的哪些經驗？", "你學過的哪些理論可以幫助你理解這個事件？"],
      "reasoning": ["有哪些因素導致了這個結果？", "是否存在其他可能性？"],
      "reporting": ["事件發生的具體時間、地點和人物是哪些？", "當時的環境背景如何？"],
      "responding": ["事件發生時，你內心的真實感受是什麼？", "有哪些情緒影響了你的判斷或行為？"],
      "reconstructing": ["基於你的反思，下一步你打算怎麼做？", "如何避免類似情況再次發生？"]
    },
    "strengths": ["願意嘗試反思。"],
    "templates": {"relating": "這件事讓我想起[過去的經驗]，因為[相似之處]。我也聯想到[相關理論]..."}
  },
  "provider": "gemini-2.0-flash"
}
```

### 5.2 研究價值

- **5 個 R 各自有獨立評分（1-5）、獨立 feedback、引導問句、補寫範本** — 這是**最結構化的 AI-教學對話資料**
- 若下學期正式研究啟動，這份 feedback schema 可直接當依變項（AI 給的 5R 分數）與鷹架介入（AI 提供的問句）
- 對應 5Rs 漸進式反思的實驗可直接用這個分析結果比對「入門模式 vs 全 5R 填」的 AI 評分差異

---

## 6. 其他 AI 相關行為日誌

### 6.1 KANBAN_AI_ASSISTANT_OPEN（124 筆）

```json
{
  "url": "/project/1/kanban",
  "source": "autoCapture",
  "_clientId": "1771933470845-50b58a7gu",
  "timestamp": "2026-02-24T11:44:30.845Z"
}
```

只記錄**開啟動作**，可做「學生在何情境下尋求 AI 幫助」的**行為序列分析**。

### 6.2 AI_TASK_ASSISTANT_REQUEST（7 筆，極重要）

```json
{
  "askedSources": ["同學"],
  "helpSeekingType": "mixed",
  "skippedThinking": false,
  "metacognitiveState": "not_started"
}
```

**欄位意義：**
- `askedSources`: 學生自我報告「問過誰」（同學、老師、網路、AI）
- `helpSeekingType`: 求助類型（instrumental / executive / mixed）
- `skippedThinking`: 是否跳過思考直接問 AI（**求助迴避指標**）
- `metacognitiveState`: 後設認知狀態

**研究價值：這是 SDL × 求助行為研究的核心變項**，目前只有 7 筆（代表功能上線晚或使用率低），需要在下學期重點推廣使用。

### 6.3 其他 AI 會話

| action | 筆數 | 用途 |
|---|---|---|
| ASSISTANT_COMPLETION | 348 | LLM 回應完成（RAG / 一般對話） |
| ASSISTANT_SESSION_CREATE | 165 | 學生開啟 AI 對話 session |
| ASSISTANT_SESSION_MESSAGES_DELETE | 45 | 刪除歷史（隱私 / 後悔） |
| ASSISTANT_SESSION_OPEN | 28 | 重開舊 session |
| AI_TASK_ASSISTANT_HISTORY_VIEW | 10 | 查看歷史 |

---

## 7. ai_feedbacks — 學生對 AI 的主觀評價

**目前只有 1 筆：** SYNTHESIZER / helpful / 2026-03-16

這是**研究計畫最大破口**。沒有學生回饋資料，等於無法驗證：
- AI 回應到底有沒有用？
- 三種 agent 的主觀接受度差異？
- 哪種情境學生最感到被幫助？

### 補救建議（**必須在下學期研究啟動前做**）

1. UI 上每則 AI 回應下**強制**顯示「有幫助 / 沒幫助」+ 原因多選（3 選項）
2. 每週最後一堂課請學生花 30 秒回顧本週 AI 互動（用 `/debug` skill 寫成週回顧頁）
3. 追蹤指標：「ai_feedbacks / kb_coach_histories」覆蓋率，目標 >50%

---

## 8. 資料品質問題與警訊

### 8.1 Orchestrator 的規則漏洞（範例 2 揭露）

空內容貼文（`\N` / `\N`）不應該觸發 DEVIL agent。需檢視 `services/orchestrator.js` 的 `isCoachable` 判斷邏輯。

### 8.2 AI 空回應（範例 4 揭露）

IMPROVER × orchestrator id=89 產出空 response_content。原因可能是：
- LLM 超時（model_used=GPT-OSS-20B 是本地 vLLM）
- 內容過濾器誤觸發
- JSON 解析失敗導致 thinking_process 與 content 都沒存

**行動：** grep `kb_coach_histories` 找出所有空回應，統計發生率，追查系統錯誤率。

### 8.3 kb_coach_histories 與 KB_COACH_GUIDANCE 數量不符

- audit: 273 筆
- histories: 163 筆
- 差異：**110 筆**

可能原因：早期只寫 audit、沒寫 histories；或部分寫入失敗。**要確認是資料遺失還是設計差異**。

### 8.4 actorId 為 null

`ORCHESTRATOR_DECISION` 與部分 AI 事件的 `actorId` 為 `\N`（因為是系統自動觸發），但這讓「追蹤特定學生受到的 AI 介入」變困難。

**解法：** orchestrator 事件可把 `targetId`（idea_wall）→ `idea_walls.project_id` → `projects` join 後抓到相關學生群（但還是無法識別個人）。若要做個人化分析，需要額外紀錄「介入發生當下有哪些學生正在想法牆內活動」。

### 8.5 所有指標都是 20 的倍數

規則引擎用離散分級，統計分析時需處理**序位資料**（用 Spearman、Kendall's tau、順序 logit 等），不能當連續變項用 Pearson。

---

## 9. 研究分析路線建議

按「立即可做」→「需補資料」→「需 A/B 設計」三階段：

### Phase 1：立即可做（本學期結束前）

| 分析 | 所需資料 | 預期產出 |
|---|---|---|
| 描述性統計：三種情境比例、四項指標分佈 | ORCHESTRATOR_DECISION 223 筆 | 論文第 4 章表 4.1-4.3 |
| AI 回應品質的人工編碼 | kb_coach_histories 163 筆 | Knowledge Building rubric 評分資料集 |
| 三 agent 人格可區分性（文本特徵）| response_content + thinking_process | LIWC/TF-IDF 分析結果 |
| manual vs orchestrator prompt 品質差異 | node_title + node_content 分組 | 學生主動求助 vs 被動接受的對比 |
| 系統可靠性報告 | 空回應率、null metadata 率 | 工程改善項目清單 |

### Phase 2：補資料後可做（下學期前做的準備工作）

| 分析 | 缺口 | 行動 |
|---|---|---|
| AI 有效性主觀評估 | ai_feedbacks 只有 1 筆 | 補強 UI 引導學生評分 |
| 求助行為與 AI 依賴度 | AI_TASK_ASSISTANT_REQUEST 只有 7 筆 | 下學期推廣該功能使用 |
| 5Rs 漸進式 vs AI 分析 | 5Rs analysis 只有 5 筆（測試） | 5Rs 重構上線後累積 |
| 個別學生受介入的歷程 | actorId 為 null | 增加 orchestrator 事件的 participant IDs 欄位 |

### Phase 3：A/B 實驗才能做（下學期正式啟動）

| 研究問題 | 設計 |
|---|---|
| Orchestrator 自動介入 vs 被動回應的效果差異 | A 組：orchestrator ON、B 組：OFF（影子模式：照常計算但不真的介入） |
| 三 agent 的差異貢獻 | 2×2×2：[各 agent 開關]，或 counter-balanced within-class |
| 高 SRL vs 低 SRL 學生的獲益差異 | 前測分群 × 介入組別 × 後測 |

---

## 10. 資料使用注意事項

### 去識別化

- `kb_coach_histories` 完整保留學生貼文明文內容（`node_title`, `node_content`, `response_content`）
- 含作者提及（例如範例 5 的「@林天俊 (3/4/2026)」），**研究發表前必須去識別化**
- `audit_events` 的 `actorName`（username）同樣需遮蔽

### 倫理審查

- 研究若要用 2026-02 以前的歷史資料，**需回溯取得家長/學生同意**或 IRB 豁免審查
- 正式實驗需前置 IRB（建議 1-2 個月前送審）

### 保留期

- `audit_events.expiresAt` 欄位設為事件+1 年（`2027-02-24+00` 可見）
- 研究需要的資料請在到期前匯出備份

### 與本檔同步

- 本盤點文件建議每學期結束更新一次
- 若有新 AI action 上線，需在本文件新增對應小節

---

## 附錄：快速查詢 SQL（從 production DB 驗證時可用）

```sql
-- Orchestrator 決策分佈
SELECT
  metadata->>'discussionType' AS type,
  metadata->>'decision' AS decision,
  metadata->>'role' AS role,
  COUNT(*) AS n
FROM audit_events
WHERE action = 'ORCHESTRATOR_DECISION'
GROUP BY 1, 2, 3
ORDER BY n DESC;

-- agent × trigger_source 交叉
SELECT agent_type, trigger_source, COUNT(*)
FROM kb_coach_histories
GROUP BY 1, 2
ORDER BY 1, 2;

-- 空回應率
SELECT
  agent_type,
  trigger_source,
  COUNT(*) FILTER (WHERE response_content IS NULL OR response_content = '') AS empty_n,
  COUNT(*) AS total_n,
  ROUND(100.0 * COUNT(*) FILTER (WHERE response_content IS NULL OR response_content = '') / COUNT(*), 1) AS empty_rate
FROM kb_coach_histories
GROUP BY 1, 2;

-- audit 與 histories 數量差異
SELECT
  (SELECT COUNT(*) FROM audit_events WHERE action = 'KB_COACH_GUIDANCE') AS audit_count,
  (SELECT COUNT(*) FROM kb_coach_histories) AS history_count;
```
