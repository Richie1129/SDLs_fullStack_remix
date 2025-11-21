# AI-Scaffold Orchestrator for Knowledge Building

## 專案目標
開發一套基於 LLM 的多重代理人系統 (Multi-Agent System)，能自動監測學生的討論內容，並在「適當的時機」自主選擇扮演「想法改進者」、「綜合者」或「魔鬼代言人」介入討論，以促進高中生的知識翻新。

## 系統架構與詳細功能需求 (Functional Requirements)

系統分為三個層級，對應三個核心模組：

### 模組 A: 監聽與上下文管理 (Context Manager) - Input Layer
-   **輸入**: 接收最近 N 篇貼文 (Sliding Window, 建議 N=10) 或是特定討論串的全部內容。
-   **處理**: 將非結構化文字整理為 JSON 格式（包含：學生ID、時間戳記、內文、引用關係）。

### 模組 B: 中控大腦 (The Orchestrator) - Brain Layer
這是不對外說話的後台 Agent，負責「診斷」與「派單」。
-   **觸發機制**: 每當有新貼文產生時觸發（Event-driven）。
-   **冷卻機制 (Cooldown)**: 為避免洗版，設定全域冷卻時間（例如：同一討論串 AI 介入後需等待 20 分鐘或新增 3 篇貼文後，才允許再次掃描）。
-   **判斷邏輯 (Reasoning Loop)**:
    -   **分析狀態**: 評分目前的討論品質（深度 Depth、多樣性 Diversity、收斂度 Convergence）。
    -   **決策門檻 (Thresholds)**:
        -   `IF (Depth < Low) AND (New_Post_Count > 3)` -> **Trigger: Idea Improver**
        -   `IF (Diversity < Low) AND (Agreement > High)` -> **Trigger: Devil's Advocate**
        -   `IF (Information_Entropy > High) OR (Post_Count > 10 without Summary)` -> **Trigger: Synthesizer**
        -   `ELSE` -> **Action: None** (保持靜默)
-   **輸出**: `Action_Command` (例如：`{"role": "Devil_Advocate", "target_post_ids": [101, 102]}`)

### 模組 C: 執行代理人 (Worker Agents) - Action Layer
根據模組 B 的指令，載入特定 Persona 進行回應生成。

| 角色名稱 | 功能定義 | 語氣設定 (Tone) |
| :--- | :--- | :--- |
| **Idea Improver** | 針對單一或少數觀點，指出邏輯缺口，提出引導式問題。 | 蘇格拉底式、好奇、鼓勵性。 |
| **Synthesizer** | 針對多篇觀點，提取共識與張力，繪製知識地圖。 | 客觀、清晰、結構化、像圖書館員。 |
| **Devil's Advocate** | 針對過度一致的觀點，提出反例或不同視角。 | 禮貌的挑戰者、提供「如果...會怎樣」的情境。 |

---

## 資料流與實作邏輯 (Implementation Logic)

```mermaid
graph TD
    A[學生發布新貼文] --> B{檢查冷卻時間};
    B -- 冷卻中 --> C[結束 / 不動作];
    B -- 無冷卻 --> D[中控大腦讀取對話紀錄];
    D --> E[LLM 進行 CoT 推理評估];
    E --> F{決定行動?};
    F -- 不需要介入 --> C;
    F -- 需要介入 --> G[路由至指定 Agent (Improver/Synthesizer/Devil)];
    G --> H[生成回應內容];
    H --> I[發布回應至討論區];
    I --> J[重置冷卻計時器];
```

---

## 開發階段規劃 (Phasing)

### Phase 1: The Manual Trinity (MVP) - ✅ 已完成
**目標**：建立基礎設施，驗證三種 Agent 人格的有效性。不涉及自動判斷，由人工手動觸發。

#### 1. Backend Refactor (`controllers/kbCoach.js`)
-   **Agent Factory**: 建立 `AGENT_PERSONAS`，定義三種人格與 System Prompts。
    -   🛠️ **Idea Improver**: 蘇格拉底式引導。
    -   🔗 **Synthesizer**: 知識整合與連結。
    -   😈 **Devil's Advocate**: 批判性思考挑戰。
-   **Context Manager**: 實作 `SlidingWindowContext` (N=10)，抓取最近貼文作為短期記憶。
-   **Unified Schema**: 統一輸出格式 `{ thinkingProcess, content, suggestedActions }`。

#### 2. Frontend Interface (`components/KB_Coach.jsx`)
-   **UI 重構**: 實作「三按鈕」介面，取代舊版單一按鈕。
-   **CoT 展示**: 新增折疊區塊顯示 AI 的 `thinkingProcess`，促進後設認知。
-   **Markdown 渲染**: 引入 `react-markdown` 優化閱讀體驗。

---

### Phase 2: The Silent Orchestrator (Automation Core) - 🚧 待執行
**目標**：實作「中控大腦」與「冷卻機制」，讓系統具備自主性。

#### 1. The Brain (`services/orchestrator.js`)
-   **Orchestrator Agent**: 一個不直接對話的後台 Agent。
-   **Reasoning Loop**:
    -   Input: 最近 N 篇貼文 + 討論區元數據 (Depth, Diversity)。
    -   Output: JSON 指令 `{ action: "TRIGGER" | "WAIT", role: "...", targetIds: [...] }`。
-   **決策門檻 (Thresholds)**:
    -   `Depth < Low` -> Trigger Improver
    -   `Diversity < Low` -> Trigger Devil's Advocate
    -   `Entropy > High` -> Trigger Synthesizer

#### 2. Cooldown Mechanism (`utils/cooldownManager.js`)
-   **State Management**: 使用 Redis 或記憶體快取記錄 `LastInterventionTime`。
-   **規則**:
    -   同一討論串冷卻時間 > 20 分鐘。
    -   或新增貼文數 > 3 篇。

#### 3. Simulation Testbed
-   建立測試腳本，餵入歷史討論串資料。
-   記錄 Orchestrator 的決策日誌，調整 Prompt 閾值以避免過度干擾。

---

### Phase 3: Full Integration (Deployment) - 📅 規劃中
**目標**：前端自動化接入，讓 AI 成為討論區的隱形參與者。

#### 1. Event-Driven Trigger
-   在 `createNode` Controller 中埋入 Hook。
-   當新節點建立 -> 非同步觸發 Orchestrator 分析。

#### 2. Frontend Notification
-   **即時通知**: 使用 Socket.io 或 Polling 機制。
-   **UI 呈現**: 顯示「AI 助教正在輸入...」或「AI 建議...」的提示。
-   **自動插入**: 經使用者確認或自動將 AI 回應轉為新節點。

#### 3. Feedback Loop
-   允許學生對 AI 回應按讚/倒讚。
-   收集數據以優化 System Prompts 和 Orchestrator 的判斷邏輯。

---

## 關鍵技術指標 (Key Technical Specs)

-   **LLM 模型**:
    -   Orchestrator: 建議使用 `gpt-4o` 或 `claude-3-5-sonnet` (高推理能力)。
    -   Worker Agents: 使用 `gemini-2.5-flash` 或 `gpt-4o-mini` (高性價比)。
-   **Prompt Engineering**:
    -   必須使用 **Chain-of-Thought (CoT)**，要求 AI 先輸出思考過程再輸出決策。
-   **Latency**:
    -   Phase 3 的自動分析必須是非同步 (Async)，不可阻塞使用者發文流程。
