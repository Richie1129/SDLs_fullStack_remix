# 專案式學習 (PBL) 與自主學習 (SDL) 的動態鷹架系統設計報告

**作者：** GitHub Copilot (Linus Persona)
**日期：** 2025-12-19
**主題：** 基於學習階段的動態看板模版與鷹架設計

## 1. 核心論點 (The Core Argument)

**現狀問題：**
預設的 `To Do` / `Doing` / `Done` 結構僅適用於「執行階段 (Performance Phase)」。對於自主學習至關重要的「定標 (Goal Setting)」與「反思 (Reflection)」階段，這種結構是無效甚至有害的，因為它強迫學生過早進入「執行模式」，而忽略了「規劃模式」。

**解決方案：**
實作 **"Phase-Aware Kanban Templates" (階段感知看板模版)**。系統應根據專案當前的 SDL 階段（定標、擇策、監評、調節），動態切換看板的欄位結構與預設卡片內容。這在教育心理學上稱為 **"Procedural Scaffolding" (程序性鷹架)**。

---

## 2. 理論基礎 (Theoretical Foundation)

我們不只是在做功能，我們是在實踐理論。

### A. Zimmerman 的自我調節學習 (SRL) 模型
Zimmerman 認為學習是一個循環過程，而非線性過程。我們的看板應該反映這個循環：
1.  **預備階段 (Forethought):** 學生需要分析任務、設定目標。
    *   *軟體對應：* 看板不應展示「任務」，而應展示「目標」與「標準」。
2.  **表現階段 (Performance):** 學生執行任務、監控進度。
    *   *軟體對應：* 標準的 Kanban (To Do/Doing/Done) 在此時才最有效。
3.  **自我反思階段 (Self-Reflection):** 學生評價成果、歸因成敗。
    *   *軟體對應：* 看板應轉變為「評價表」或「反思日誌」。

**參考文獻：**
*   Zimmerman, B. J. (2002). *Becoming a Self-Regulated Learner: An Overview*. Theory Into Practice. [Link](https://www.researchgate.net/publication/237348337_Becoming_a_Self-Regulated_Learner_An_Overview)
*   Panadero, E. (2017). *A Review of Self-regulated Learning: Six Models and Four Directions for Research*. Frontiers in Psychology. [Link](https://www.frontiersin.org/articles/10.3389/fpsyg.2017.00422/full)

### B. 認知負荷理論 (Cognitive Load Theory)
初學者在面對空白的看板時，會產生巨大的「外在認知負荷 (Extraneous Cognitive Load)」。他們不知道該填什麼。
*   **解決方案：** 提供 **"Worked Examples" (已解決範例)**。預先填入一張「完美範例卡片」，讓學生只需模仿，降低啟動門檻。

**參考文獻：**
*   Sweller, J. (1988). *Cognitive Load During Problem Solving: Effects on Learning*. Cognitive Science. [Link](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1202_4)
*   Kirschner, P. A., et al. (2006). *Why Minimal Guidance During Instruction Does Not Work*. Educational Psychologist. [Link](https://www.tandfonline.com/doi/abs/10.1207/s15326985ep4102_1)

### C. 鷹架理論 (Scaffolding)
Vygotsky 的「近側發展區 (ZPD)」概念指出，學生在有輔助的情況下能表現得更好。軟體介面就是那個「更有能力的他人 (MKO)」。
*   **應用：** 隨著學生進入不同階段，看板結構從「高度引導 (定標)」逐漸轉向「自由執行 (監評)」，最後回歸「高度結構化反思 (調節)」。

**參考文獻：**
*   Vygotsky, L. S. (1978). *Mind in Society: The Development of Higher Psychological Processes*.
*   Quintana, C., et al. (2004). *A Scaffolding Design Framework for Software to Support Science Inquiry*. Journal of the Learning Sciences. [Link](https://www.tandfonline.com/doi/abs/10.1207/s15327809jls1303_4)

---

## 3. 創新實作方案 (The Innovation)

與其讓使用者自己建立列表，我們根據 SDL 四階段提供以下 **"Smart Templates"**：

### 階段一：定標 (Goal Setting)
*目標：發散思考，收斂目標。*
*   **建議欄位結構：**
    1.  **🎯 靈感池 (Brainstorming):** "任何想法都可以丟進來"
    2.  **🔍 篩選區 (Selection):** "從靈感池中挑選最想做的"
    3.  **🏆 最終目標 (Final Goal):** "這是我決定要做的專案"
    4.  **📏 成功標準 (Success Criteria):** "做到什麼程度才算好？"
*   **預設範例卡片 (Scaffolding):**
    *   在「成功標準」欄位中預置一張卡片：「範例：能成功辨識 5 種植物」。

### 階段二：擇策 (Strategy Selection)
*目標：拆解任務，盤點資源。*
*   **建議欄位結構：**
    1.  **📚 資源盤點 (Resources Needed):** "我需要什麼書、網站或工具？"
    2.  **🚧 潛在困難 (Obstacles):** "可能會遇到什麼問題？"
    3.  **🆘 求助策略 (Help Seeking):** "遇到問題我該找誰？"
    4.  **📅 行動計畫 (Action Plan):** "第一步、第二步..."
*   **創新點：** 此階段的卡片可以連結到系統的「資源庫」。

### 階段三：監評 (Monitoring & Evaluation)
*目標：執行任務，監控進度。*
*   **建議欄位結構 (標準 Kanban):**
    1.  **📋 待辦清單 (To Do)**
    2.  **🔥 進行中 (In Progress)** *(限制 WIP: 一次只能做一件事)*
    3.  **⛔ 卡關中 (Blocked)** *(此欄位可觸發 AI 助教介入)*
    4.  **✅ 已完成 (Done)**
*   **與歷程檔案整合：** 當卡片移至 Done 時，彈出提示：「是否將此成果上傳至學習歷程？」

### 階段四：調節 (Regulation)
*目標：反思過程，調整策略。*
*   **建議欄位結構：**
    1.  **👍 做得好的 (What Worked)**
    2.  **👎 需要改進的 (What Didn't)**
    3.  **💡 下次調整 (Adjustments)**
    4.  **📝 結案報告 (Final Report)**

---

## 4. 技術架構建議 (Technical Architecture)

作為 Linus，我必須警告你：**不要把這些邏輯寫死 (Hardcode) 在 `Kanban.jsx` 裡！** 那會是一場災難。

你應該設計一個 **"Template Engine" (模版引擎)**。

### Data Structure Design (Good Taste)

你需要一個配置檔 (Config) 或資料庫表來定義這些模版。

```javascript
// src/config/kanbanTemplates.js

export const PHASE_TEMPLATES = {
  "GOAL_SETTING": {
    columns: [
      { 
        title: "🎯 靈感池", 
        isSystem: true, // 防止被刪除
        defaultCards: [
          { title: "範例：我想研究校園植物", type: "example" }
        ]
      },
      { title: "📏 成功標準", isSystem: true }
    ],
    // 當使用者在此階段點擊「新增卡片」時的預設內容
    cardPlaceholder: "寫下一個具體的目標..." 
  },
  "MONITORING": {
    columns: [
      { title: "待辦清單", type: "todo" },
      { title: "進行中", type: "doing", limit: 3 }, // WIP Limit
      { title: "已完成", type: "done" }
    ]
  }
  // ... 其他階段
};
```

### Implementation Strategy

1.  **後端 (Backend):**
    *   當專案進入新階段 (例如從「定標」轉入「擇策」) 時，後端 API 應該有一個 `migrateKanban(projectId, newPhase)` 的功能。
    *   它會：
        1.  將舊階段的卡片封存 (Archive) 或移動到一個「歷史」欄位。
        2.  根據 `PHASE_TEMPLATES` 建立新的欄位結構。
        3.  插入預設的鷹架卡片 (Scaffolding Cards)。

2.  **前端 (Frontend):**
    *   `KanbanColumn` 組件需要升級，支援渲染「範例卡片」(樣式可能不同，例如虛線邊框)。
    *   `useKanbanData` 需要處理「階段切換」的事件。

---

## 5. 為什麼這樣做？ (The Verdict)

1.  **降低門檻：** 學生不需要學習「如何管理專案」，他們只需要跟隨欄位的引導。
2.  **內化思維：** 透過反覆使用這些欄位，學生會逐漸內化 SDL 的思維模式（例如：做事前先想「資源」，做完後想「反思」）。
3.  **數據結構優雅：** 我們沒有為每個階段寫死 UI，而是透過「數據驅動 (Data-Driven)」的方式來渲染不同的學習場景。這符合 "Good Taste"。

這就是將「教育理論」轉化為「軟體規格」的最佳實踐。

## 6. 全局視圖 (The Master View)

**問題：** 
使用者需要「見樹又見林」。分階段視圖是「樹」，全局視圖是「林」。如果只能看到當前階段，使用者會失去對專案整體的掌控感。

**解決方案：**
在 `viewConfig` 中新增 `mode: 'ALL_PHASES'`。
在此模式下，**不建議**使用橫向卷軸無限長的 Kanban (那樣太醜了)。
建議轉為 **"Grouped List View" (分組清單)** 或 **"Story Map" (故事地圖)** 形式：

*   **Phase 1: 定標**
    *   [Card] 最終目標
    *   [Card] 成功標準
*   **Phase 2: 擇策**
    *   [Card] 行動計畫 A
    *   [Card] 資源 B
*   **Phase 3: 監評**
    *   [Card] 任務 X (Done)
    *   [Card] 任務 Y (Doing)

**技術實作：**
這再次證明了 `useKanbanView` 的價值。我們不需要寫一個新的頁面，只需要在 `useKanbanView` 中增加一個轉換邏輯：
當 `viewConfig.showAllPhases === true` 時，忽略當前階段過濾，並按 `phase` 屬性進行分組 (Group By Phase)。
## 6. 全局視圖 (The Master View)

**問題：** 
使用者需要「見樹又見林」。分階段視圖是「樹」，全局視圖是「林」。如果只能看到當前階段，使用者會失去對專案整體的掌控感。

**解決方案：**
在  中新增 。
在此模式下，**不建議**使用橫向卷軸無限長的 Kanban (那樣太醜了)。
建議轉為 **"Grouped List View" (分組清單)** 或 **"Story Map" (故事地圖)** 形式：

*   **Phase 1: 定標**
    *   [Card] 最終目標
    *   [Card] 成功標準
*   **Phase 2: 擇策**
    *   [Card] 行動計畫 A
    *   [Card] 資源 B
*   **Phase 3: 監評**
    *   [Card] 任務 X (Done)
    *   [Card] 任務 Y (Doing)

**技術實作：**
這再次證明了 `useKanbanView` 的價值。我們不需要寫一個新的頁面，只需要在 `useKanbanView` 中增加一個轉換邏輯：
當 `viewConfig.showAllPhases === true` 時，忽略當前階段過濾，並按 `phase` 屬性進行分組 (Group By Phase)。

## 7. 資料庫架構變更 (Database Schema Changes)

為了支援上述功能，我們必須對後端資料模型進行「外科手術式」的精準修改。

### A. Column Model (`sdl-backend-main/models/column.js`)
目前的 `Column` 模型不知道它屬於哪個階段。這必須改變。

**修改方案：**
新增 `phase` 欄位。

```javascript
const Column = sequelize.define('column', {
    // ... existing fields
    phase: {
        type: DataTypes.ENUM('GOAL_SETTING', 'STRATEGY', 'MONITORING', 'REGULATION', 'ALL'),
        allowNull: false,
        defaultValue: 'MONITORING' // 保持向後兼容
    }
});
```

### B. Kanban Model (`sdl-backend-main/models/kanban.js`)
目前的 `column` 欄位是一個簡單的 `INTEGER[]`，它定義了欄位的順序。
如果我們把所有階段的欄位都塞進這個陣列，順序管理會變成地獄。

**修改方案：**
將 `column` 欄位升級為 `JSONB`，或者保留 `column` 作為「當前活躍欄位」，並新增 `phase_columns` 存儲各階段配置。
但為了保持 "Good Taste" (簡潔性)，建議：

**方案：單一事實來源 (Single Source of Truth)**
保持 `column` 陣列存儲**所有**欄位 ID (Global Order)。
前端根據 `Column.phase` 進行過濾。
這樣做的好處是：不需要複雜的 JSON 結構，且相容現有的 API (現有 API 會回傳所有欄位，前端只是選擇性渲染)。

### C. API Response (`getKanban`)
後端 `controllers/kanban.js` 必須在回傳 `columnData` 時包含 `phase` 屬性。

```javascript
// controllers/kanban.js
const columnData = await Column.findAll({
    attributes: ['id', 'name', 'task', 'phase'], // Add phase
    where: { kanbanId: id }
});
```

---

## 8. 實作路徑 (Implementation Path)

1.  **Database Migration:** 新增 `phase` column 到 `columns` table。
2.  **Backend Logic:** 更新 `createProject` 或 `initializeKanban` 邏輯，一次性建立所有 4 個階段的預設欄位 (根據 `PHASE_TEMPLATES`)。
3.  **Frontend Logic:** 修改 `useKanbanView`，實作 `filterByPhase`。
4.  **UI:** 新增 Phase Switcher Tabs。
