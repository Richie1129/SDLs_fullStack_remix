# SDL 平台階段重構調查報告：從五階段到四階段 SRL 循環

> **文件版本：** 1.0
> **日期：** 2026-01-22
> **作者：** Technical Investigation
> **狀態：** 調查完成，待決策

---

## 目錄

1. [Executive Summary](#1-executive-summary)
2. [調查背景與目標](#2-調查背景與目標)
3. [理論基礎：為什麼是四階段？](#3-理論基礎為什麼是四階段)
4. [代碼依賴深度分析](#4-代碼依賴深度分析)
5. [數據影響評估](#5-數據影響評估)
6. [Option B 完整實作方案](#6-option-b-完整實作方案)
7. [決策矩陣與理由說明](#7-決策矩陣與理由說明)
8. [風險評估與緩解策略](#8-風險評估與緩解策略)
9. [實作時程建議](#9-實作時程建議)
10. [附錄：完整檔案清單](#10-附錄完整檔案清單)

---

## 1. Executive Summary

### 調查結論

經過深度代碼分析、SRL 理論研究和 e-Portfolio 最佳實踐調查，**我建議採用 Option B：隱藏 + 重新定位**。

### 核心發現

| 面向 | 發現 |
|------|------|
| **代碼影響** | 共 29 個檔案涉及「歷程」階段，其中 12 個為核心檔案 |
| **數據兼容** | 現有 stage 5 數據（格式 "5-1" ~ "5-5"）需保留，不可刪除 |
| **理論依據** | Zimmerman SRL 模型為三階段循環，你的四階段設計完全對應 |
| **最佳實踐** | e-Portfolio 應「自動整合」而非「手動填寫」，減少重複勞動 |

### 建議方案摘要

```
┌─────────────────────────────────────────────────────────────────┐
│                     Option B: 隱藏 + 重新定位                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: 前端隱藏（1-2 小時）                                  │
│  ├─ 從階段導航隱藏「歷程」                                      │
│  ├─ 修改進度計算邏輯                                           │
│  └─ 保留 Protfolio 頁面但改名為「學習歷程檔案」                 │
│                                                                 │
│  Phase 2: 功能升級（4-8 小時）                                  │
│  ├─ 重新設計 Protfolio 為「自動生成」模式                       │
│  ├─ 整合現有 ExportPreview 功能                                │
│  └─ 新增可選的個人補充欄位                                     │
│                                                                 │
│  Phase 3: 後端優化（2-4 小時）                                  │
│  ├─ 階段上限改為 4                                             │
│  ├─ 新增自動生成 API                                           │
│  └─ 保留舊數據向後兼容                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 調查背景與目標

### 2.1 問題陳述

目前 SDL 平台採用五大階段結構：

| 階段 | 名稱 | 子階段數 | 功能定位 |
|------|------|----------|----------|
| 1 | 定標 | 3 | 目標設定 |
| 2 | 擇策 | 3 | 策略規劃 |
| 3 | 監評 | 3 | 執行監控 |
| 4 | 調節 | 3 | 反思調整 |
| **5** | **歷程** | **5** | **學習歷程檔案製作** |

**問題**：第五階段「歷程」存在以下問題：
1. 打斷 SRL 循環的理論完整性
2. 要求學生「手動填寫」已存在於平台的數據
3. 增加不必要的行政負擔

### 2.2 調查目標

1. 確認「歷程」階段的所有代碼依賴關係
2. 評估數據遷移風險
3. 研究 SRL 理論支持
4. 設計最佳重構方案

---

## 3. 理論基礎：為什麼是四階段？

### 3.1 Zimmerman 的 SRL 循環模型

根據 [Zimmerman (2000) 的自我調節學習循環模型](https://pmc.ncbi.nlm.nih.gov/articles/PMC5408091/)，SRL 是一個**三階段循環**：

```
          ┌─────────────────┐
          │   FORETHOUGHT   │
          │     (預備)       │
          │  • 任務分析      │
          │  • 目標設定      │
          │  • 策略規劃      │
          │  • 自我效能信念   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   PERFORMANCE   │
          │     (執行)       │
          │  • 自我控制      │
          │  • 注意聚焦      │
          │  • 策略使用      │
          │  • 自我監控      │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ SELF-REFLECTION │
          │     (反思)       │
          │  • 自我評價      │
          │  • 因果歸因      │
          │  • 自我反應      │
          │  • 適應性推論    │
          └────────┬────────┘
                   │
                   └──────────────► 回到 Forethought（循環）
```

### 3.2 你的四階段設計如何對應 SRL

| SDL 階段 | SRL 階段 | 對應說明 |
|----------|----------|----------|
| **定標** | Forethought | 目標設定、任務分析 |
| **擇策** | Forethought | 策略規劃、資源評估 |
| **監評** | Performance | 執行監控、自我控制 |
| **調節** | Self-Reflection | 反思評估、調整策略 |

**結論**：你的四階段設計將 Zimmerman 的 Forethought 拆分為「定標」和「擇策」，更細緻地引導學習者進行前期規劃，這是**符合理論的合理擴展**。

### 3.3 「歷程」不屬於 SRL 循環

「歷程」階段的五個子階段是：

- 5-1：封面製作
- 5-2：摘要撰寫
- 5-3：目錄編制
- 5-4：內容撰寫
- 5-5：反思撰寫

這些活動是**文檔整理**，而非**學習調節**。根據 SRL 理論：

> *"According to Zimmerman (2000), during the reflection phase, the student may contemplate how the work generally links to his/her goals and use of strategies, and can involve the creation of setting new learning outcomes for future tasks, central to SRL theory."*

**關鍵洞察**：反思的目的是「設定未來學習目標」，而非「製作歷程檔案」。歷程檔案是**學習證據的產出**，應該是自動化的副產品，而非學習過程本身。

### 3.4 e-Portfolio 最佳實踐

根據 [e-Portfolio 研究](https://link.springer.com/chapter/10.1007/978-3-642-21934-4_40)：

> *"Many customized eportfolio systems can be integrated with existing student information systems and course management systems. An advantage of tightly integrated systems is the ability to repurpose existing information and artifacts for use in portfolios."*

**最佳實踐**：
1. **數據重用 (Data Repurposing)**：自動整合 LMS 中已存在的學習數據
2. **減少重複輸入**：學生不應重複填寫系統已有的資訊
3. **反思才是核心**：e-Portfolio 的價值在於反思過程，而非格式化文件

**結論**：你現有的 `ExportPreview` 已經實現了自動整合，只需將其提升為主要入口。

---

## 4. 代碼依賴深度分析

### 4.1 前端核心依賴（12 個檔案）

#### 層級 1：直接涉及 Stage 5 的檔案

| 檔案 | 影響程度 | Stage 5 相關代碼 |
|------|----------|------------------|
| [Protfolio.jsx](sdl-frontend-main/src/pages/protfolio/Protfolio.jsx) | ⭐⭐⭐ 核心 | `insertTitles = ["定標", "擇策", "監評", "調節", "歷程"]`（行 140）<br>`stageDescriptions["5-1"]` ~ `["5-5"]`（行 134-139） |
| [SubStageBar.jsx](sdl-frontend-main/src/components/SubStageBar.jsx) | ⭐⭐⭐ 核心 | `stageInfo[4] = ["封面製作", "摘要撰寫", ...]`（行 151）<br>`stageGoal[4]`, `stageProcess[4]`（行 28-34） |
| [SideBar.jsx](sdl-frontend-main/src/components/SideBar.jsx) | ⭐⭐⭐ 核心 | `{ name: "歷程", index: 5 }`（行 240）<br>`subStages[5]`（行 248）<br>`"歷程檔案"` 菜單項（行 169） |
| [ExportPreview/index.jsx](sdl-frontend-main/src/pages/ExportPreview/index.jsx) | ⭐⭐⭐ 核心 | `['1', '2', '3', '4', '5'].map(stage => ...)`（行 204）<br>`"五階段學習歷程"` 區塊標題（行 203） |

#### 層級 2：間接涉及的檔案

| 檔案 | 影響程度 | 相關邏輯 |
|------|----------|----------|
| [useStageIndex.js](sdl-frontend-main/src/hooks/useStageIndex.js) | ⭐⭐ 高 | `STAGE_CONFIG.STAGE.MAX = 5` |
| [student-dashboard/utils.js](sdl-frontend-main/src/pages/student-dashboard/utils.js) | ⭐⭐ 高 | `if (stage === 5) return 100;`（行 81） |
| [App.jsx](sdl-frontend-main/src/App.jsx) | ⭐⭐ 高 | `/project/:projectId/protfolio` 路由（行 67） |
| [submit.js (API)](sdl-frontend-main/src/api/submit.js) | ⭐⭐ 高 | `getAllSubmit()` 會返回 stage 5 數據 |

#### 層級 3：展示用檔案

| 檔案 | 影響程度 | 說明 |
|------|----------|------|
| ManagementOverview.jsx | ⭐ 中 | 顯示進度時涉及 stage 5 |
| StudentOverview.jsx | ⭐ 中 | 顯示進度時涉及 stage 5 |
| teacher-dashboard/utils.js | ⭐ 中 | 進度計算涉及 stage 5 |
| useProjectData.js | ⭐ 中 | 專案數據包含 stage 5 |

### 4.2 後端核心依賴（8 個檔案）

| 檔案 | 影響程度 | Stage 5 相關邏輯 |
|------|----------|------------------|
| [submit.js (Controller)](sdl-backend-main/controllers/submit.js) | ⭐⭐⭐ 核心 | 創建 Submit 時 `stage: "${currentStageInt}-${currentSubStageInt}"`<br>階段自動推進邏輯（行 56-135） |
| [export.js (Controller)](sdl-backend-main/controllers/export.js) | ⭐⭐⭐ 核心 | `STAGE_NAMES['5'] = '收尾階段'`<br>按 stage 1-5 分組 submits |
| [dataFormatter.js](sdl-backend-main/utils/dataFormatter.js) | ⭐⭐⭐ 核心 | `STAGE_NAMES = { '5': '收尾階段' }`<br>`groupSubmitsByStage()` |
| [submit.js (Model)](sdl-backend-main/models/submit.js) | ⭐⭐ 高 | `stage: DataTypes.TEXT`（格式 "5-1"） |
| [project.js (Model)](sdl-backend-main/models/project.js) | ⭐⭐ 高 | `currentStage: INTEGER`（可為 5） |
| [submit.js (Routes)](sdl-backend-main/routes/submit.js) | ⭐⭐ 高 | Submit CRUD 路由 |
| [export.js (Routes)](sdl-backend-main/routes/export.js) | ⭐⭐ 高 | Export 路由 |
| [submitChangeLogger.js](sdl-backend-main/utils/submitChangeLogger.js) | ⭐ 中 | 變更追蹤 |

### 4.3 依賴關係圖

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端層                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   SideBar.jsx    │───▶│  SubStageBar.jsx │    │    App.jsx       │      │
│  │   (導航選項)      │    │  (進度條顯示)     │    │   (路由配置)      │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                        Protfolio.jsx                               │     │
│  │  • insertTitles (5 個階段標題)                                     │     │
│  │  • stageDescriptions (5-1 ~ 5-5)                                  │     │
│  │  • getAllSubmit() 調用                                            │     │
│  │  • 導航至 ExportPreview                                           │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│           │                                               │                 │
│           ▼                                               ▼                 │
│  ┌──────────────────┐                        ┌──────────────────┐          │
│  │   submit.js      │                        │ ExportPreview    │          │
│  │   (API 調用)     │                        │ (PDF 匯出)       │          │
│  └────────┬─────────┘                        └────────┬─────────┘          │
│           │                                           │                     │
└───────────┼───────────────────────────────────────────┼─────────────────────┘
            │                                           │
            ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              後端 API 層                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                     Routes                                        │      │
│  │  GET /api/submit          POST /api/submit                        │      │
│  │  GET /api/projects/:id/export-data                                │      │
│  └───────────────────────────────┬──────────────────────────────────┘      │
│                                  │                                          │
│                                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                   Controllers                                     │      │
│  │  submit.js:                                                       │      │
│  │   • createSubmit() - stage: "${currentStageInt}-${subStageInt}"  │      │
│  │   • 自動推進邏輯 - 檢查是否為 stage 5-5                           │      │
│  │                                                                   │      │
│  │  export.js:                                                       │      │
│  │   • getExportData() - 按 stage 1-5 分組                          │      │
│  │   • STAGE_NAMES['5'] = '收尾階段'                                 │      │
│  └───────────────────────────────┬──────────────────────────────────┘      │
│                                  │                                          │
│                                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                   Utils                                           │      │
│  │  dataFormatter.js:                                                │      │
│  │   • STAGE_NAMES = { '1': '定標', ..., '5': '收尾' }              │      │
│  │   • groupSubmitsByStage()                                         │      │
│  │   • formatStageName("5-3") → { stage: 5, subStage: 3 }           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           資料庫層                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐            │
│  │     submits    │    │    projects    │    │     stages     │            │
│  │ ─────────────  │    │ ─────────────  │    │ ─────────────  │            │
│  │ id             │    │ id             │    │ id             │            │
│  │ stage (TEXT)   │◄───│ currentStage   │───▶│ name           │            │
│  │ "5-1"~"5-5"    │    │ (1~5)          │    │ sub_stage[]    │            │
│  │ content (JSON) │    │ ProjectEnd     │    │                │            │
│  │ projectId (FK) │    │                │    │                │            │
│  └────────────────┘    └────────────────┘    └────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 數據影響評估

### 5.1 現有數據結構

```sql
-- submits 表中 stage 欄位的可能值
SELECT DISTINCT stage FROM submits ORDER BY stage;

-- 預期結果：
-- 1-1, 1-2, 1-3  (定標)
-- 2-1, 2-2, 2-3  (擇策)
-- 3-1, 3-2, 3-3  (監評)
-- 4-1, 4-2, 4-3  (調節)
-- 5-1, 5-2, 5-3, 5-4, 5-5  (歷程) ← 需要處理
```

### 5.2 數據處理策略

| 策略 | 說明 | 風險 |
|------|------|------|
| **A. 保留** ✅ | 保留 stage 5 數據，前端過濾顯示 | 低 |
| **B. 軟刪除** | 標記 stage 5 數據為 archived | 中 |
| **C. 硬刪除** ❌ | 刪除 stage 5 數據 | 高（數據丟失） |

**建議：採用策略 A**

理由：
1. 現有數據可能有參考價值
2. 不需要資料庫遷移
3. 可透過前端過濾實現隱藏

### 5.3 向後兼容方案

```javascript
// 前端：過濾掉 stage 5 數據
const filteredSubmits = stagePortfolio.filter(item => {
    const stageNum = parseInt(item.stage.split('-')[0]);
    return stageNum <= 4;
});

// 後端：ExportPreview 仍可選擇包含 stage 5
const exportOptions = {
    includeStage5: false,  // 新增選項
    sections: ['kanban', 'ideaWalls', 'reflections', ...] // 移除 'submits' 或過濾
};
```

---

## 6. Option B 完整實作方案

### 6.1 為什麼選擇 Option B？

| 考量因素 | Option A (直接刪除) | Option B (隱藏+重定位) ✅ | Option C (僅隱藏 UI) |
|----------|---------------------|--------------------------|---------------------|
| 數據保留 | ❌ 丟失 | ✅ 完整保留 | ✅ 完整保留 |
| 理論對應 | ✅ 四階段 | ✅ 四階段 + Portfolio | ⚠️ 不完整 |
| 功能升級 | ❌ 無 | ✅ 自動生成 | ❌ 無 |
| 開發成本 | 高（遷移） | 中 | 低 |
| 未來擴展 | ❌ 需重建 | ✅ 可漸進 | ⚠️ 受限 |

### 6.2 實作架構

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        新架構：四階段 SRL 循環 + Portfolio 模組              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SRL 四階段循環（主要流程）                        │   │
│  │                                                                     │   │
│  │      定標 (1)                                                       │   │
│  │        │ • 研究主題、目的、問題                                      │   │
│  │        ▼                                                            │   │
│  │      擇策 (2)                                                       │   │
│  │        │ • 構想表、記錄表、排程                                      │   │
│  │        ▼                                                            │   │
│  │      監評 (3)                                                       │   │
│  │        │ • 嘗試性研究、分析、結果                                    │   │
│  │        ▼                                                            │   │
│  │      調節 (4)                                                       │   │
│  │        │ • 進度檢視、討論、結論                                      │   │
│  │        │                                                            │   │
│  │        └──────────► 回到定標（新專案/新週期）                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ 數據自動流入                                 │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               學習歷程檔案模組（獨立功能）                            │   │
│  │                                                                     │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │ 自動整合數據源：                                             │  │   │
│  │   │ • Kanban Tasks (columns, tasks, labels)                     │  │   │
│  │   │ • IdeaWall Nodes (nodes, relations)                         │  │   │
│  │   │ • Reflections (5Rs personal/team)                           │  │   │
│  │   │ • UsageSession (學習時間統計)                                │  │   │
│  │   │ • ChatRoom Messages (討論紀錄)                               │  │   │
│  │   └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │ 可選個人補充：                                               │  │   │
│  │   │ • 封面圖片（上傳或選擇模板）                                  │  │   │
│  │   │ • 個人感言（100 字內，選填）                                  │  │   │
│  │   │ • 自選展示順序                                               │  │   │
│  │   └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │ 輸出選項：                                                   │  │   │
│  │   │ • [預覽] - 即時預覽生成的歷程檔案                            │  │   │
│  │   │ • [下載 PDF] - 使用現有 html2pdf                            │  │   │
│  │   │ • [分享連結] - 生成唯讀分享 URL（未來功能）                   │  │   │
│  │   └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Phase 1：前端隱藏（詳細步驟）

#### 6.3.1 修改 SubStageBar.jsx

**檔案：** `sdl-frontend-main/src/components/SubStageBar.jsx`

**修改前（行 146-152）：**
```javascript
const stageInfo = [
    ["提出研究主題", "提出研究目的", "提出研究問題"],
    ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
    ["進行嘗試性研究", "分析資列與繪圖", "撰寫研究結果"],
    ["檢視研究進度", "進行研究討論", "撰寫研究結論"],
    ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"]  // ← 移除
];
```

**修改後：**
```javascript
const stageInfo = [
    ["提出研究主題", "提出研究目的", "提出研究問題"],
    ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
    ["進行嘗試性研究", "分析資列與繪圖", "撰寫研究結果"],
    ["檢視研究進度", "進行研究討論", "撰寫研究結論"]
];
```

**同步修改 stageGoal 和 stageProcess（行 16-53）：**
- 移除 `stageGoal[4]` 和 `stageProcess[4]` 的內容

**理由：** SubStageBar 是顯示當前階段進度的組件，移除 stage 5 後不應再顯示其子階段。

#### 6.3.2 修改 SideBar.jsx

**檔案：** `sdl-frontend-main/src/components/SideBar.jsx`

**修改 stages 陣列（約行 235-241）：**
```javascript
// 修改前
const stages = [
    { name: "定標", index: 1 },
    { name: "擇策", index: 2 },
    { name: "監評", index: 3 },
    { name: "調節", index: 4 },
    { name: "歷程", index: 5 },  // ← 移除
];

// 修改後
const stages = [
    { name: "定標", index: 1 },
    { name: "擇策", index: 2 },
    { name: "監評", index: 3 },
    { name: "調節", index: 4 },
];
```

**修改 subStages 陣列（約行 243-249）：**
```javascript
// 移除 subStages[5]
```

**修改菜單項「歷程檔案」：**
```javascript
// 修改前
{ name: "歷程檔案", link: `/project/${projectId}/protfolio`, icon: TiFolderOpen }

// 修改後：改名並調整位置
{ name: "學習歷程", link: `/project/${projectId}/portfolio`, icon: TiFolderOpen }
```

**理由：**
- 階段列表不再包含「歷程」
- 「學習歷程」成為獨立的功能入口，而非階段

#### 6.3.3 修改 Protfolio.jsx

**檔案：** `sdl-frontend-main/src/pages/protfolio/Protfolio.jsx`

**修改 insertTitles（行 140）：**
```javascript
// 修改前
const insertTitles = ["定標", "擇策", "監評", "調節", "歷程"];

// 修改後
const insertTitles = ["定標", "擇策", "監評", "調節"];
```

**修改 stageDescriptions（行 121-139）：**
```javascript
// 移除 "5-1" ~ "5-5" 的定義
const stageDescriptions = {
    "1-1": "提出研究主題",
    "1-2": "提出研究目的",
    "1-3": "提出研究問題",
    "2-1": "訂定研究構想表",
    "2-2": "設計研究記錄表",
    "2-3": "規劃研究排程",
    "3-1": "進行嘗試性研究",
    "3-2": "分析資列與繪圖",
    "3-3": "撰寫研究結果",
    "4-1": "檢視研究進度",
    "4-2": "進行研究討論",
    "4-3": "撰寫研究結論",
    // 移除 "5-1" ~ "5-5"
};
```

**新增數據過濾（在 useEffect 中）：**
```javascript
useEffect(() => {
    if (stagePortfolio.length > 0) {
        // 過濾掉 stage 5 的數據
        const filteredPortfolio = stagePortfolio.filter(item => {
            const stageNum = parseInt(item.stage.split('-')[0]);
            return stageNum <= 4;
        });

        const itemsWithTitles = [];
        filteredPortfolio.forEach((item, index) => {
            // ... 原有邏輯
        });
        setPortfolioItemsWithTitles(itemsWithTitles);
    }
}, [stagePortfolio]);
```

**理由：** 保留 API 返回的完整數據，但在前端過濾顯示，確保向後兼容。

#### 6.3.4 修改 useStageIndex.js

**檔案：** `sdl-frontend-main/src/hooks/useStageIndex.js`

```javascript
// 修改前
export const STAGE_CONFIG = {
    STAGE: { MIN: 1, MAX: 5, DEFAULT: 1 },
    SUB_STAGE: { MIN: 1, MAX: 5, DEFAULT: 1 }
};

// 修改後
export const STAGE_CONFIG = {
    STAGE: { MIN: 1, MAX: 4, DEFAULT: 1 },  // MAX 改為 4
    SUB_STAGE: { MIN: 1, MAX: 3, DEFAULT: 1 }  // MAX 改為 3（標準子階段數）
};
```

**理由：** 階段上限改為 4，防止新專案進入 stage 5。

#### 6.3.5 修改進度計算邏輯

**檔案：** `sdl-frontend-main/src/pages/student-dashboard/utils.js`

```javascript
// 修改前
export const calculateProgress = (currentStage, currentSubStage) => {
    if (currentStage === 5) return 100;  // Stage 5 直接 100%
    // ...
};

// 修改後
export const calculateProgress = (currentStage, currentSubStage) => {
    const stage = parseInt(currentStage) || 1;
    const subStage = parseInt(currentSubStage) || 1;

    // 四階段模式：每階段 25%，每子階段 ~8.33%
    const stageProgress = (stage - 1) * 25;
    const subStageProgress = ((subStage - 1) / 3) * 25;

    return Math.min(100, Math.round(stageProgress + subStageProgress));
};
```

**理由：** 調整進度計算為四階段模式。

### 6.4 Phase 2：功能升級（學習歷程自動生成）

#### 6.4.1 新增 Portfolio 生成服務

**新檔案：** `sdl-frontend-main/src/services/portfolioGenerator.js`

```javascript
/**
 * 學習歷程檔案自動生成服務
 * 整合 ExportPreview 的數據收集邏輯
 */

export const generatePortfolioData = async (projectId) => {
    const exportData = await getExportData(projectId);

    return {
        // 基本資訊
        project: exportData.basicInfo,
        members: exportData.members,

        // 自動整合的學習數據
        stages: {
            goalSetting: extractStageData(exportData, 1),   // 定標
            strategy: extractStageData(exportData, 2),      // 擇策
            monitoring: extractStageData(exportData, 3),    // 監評
            regulation: extractStageData(exportData, 4),    // 調節
        },

        // 反思紀錄
        reflections: {
            personal: exportData.reflections.personal,
            team: exportData.reflections.team,
        },

        // 想法牆
        ideaWalls: exportData.ideaWalls,

        // 統計數據
        statistics: {
            ...exportData.statistics,
            // 移除 stage 5 相關統計
            totalStages: 4,
        }
    };
};

const extractStageData = (exportData, stageNum) => {
    const { kanban, submits } = exportData;

    return {
        kanban: kanban.columns.filter(col => col.stageNum === stageNum),
        submissions: submits.byStage[String(stageNum)] || [],
    };
};
```

**理由：** 封裝數據整合邏輯，便於維護和測試。

#### 6.4.2 重新設計 Portfolio 頁面

**檔案：** `sdl-frontend-main/src/pages/protfolio/Protfolio.jsx`

新增「自動生成」模式的 UI：

```jsx
// 簡化後的 Portfolio 頁面結構
export default function Portfolio() {
    const [portfolioData, setPortfolioData] = useState(null);
    const [coverImage, setCoverImage] = useState(null);
    const [personalNote, setPersonalNote] = useState('');

    return (
        <div className="portfolio-container">
            {/* 學習成果總覽 */}
            <StatisticsSection data={portfolioData?.statistics} />

            {/* 可選補充資料 */}
            <OptionalSection>
                <CoverImageUploader value={coverImage} onChange={setCoverImage} />
                <PersonalNoteInput value={personalNote} onChange={setPersonalNote} maxLength={100} />
            </OptionalSection>

            {/* 四階段學習歷程預覽 */}
            <StagePreviewSection stages={portfolioData?.stages} />

            {/* 反思紀錄預覽 */}
            <ReflectionsPreview reflections={portfolioData?.reflections} />

            {/* 匯出選項 */}
            <ExportActions
                onPreview={handlePreview}
                onDownloadPDF={handleDownloadPDF}
            />
        </div>
    );
}
```

**理由：**
- 突出「自動整合」的價值
- 簡化用戶操作（不用手動填寫）
- 保留少量可選的個人化選項

### 6.5 Phase 3：後端優化

#### 6.5.1 修改階段限制

**檔案：** `sdl-backend-main/controllers/submit.js`

```javascript
// 在 createSubmit 中新增階段上限檢查
const MAX_STAGE = 4;

if (currentStageInt > MAX_STAGE) {
    return res.status(400).json({
        success: false,
        message: '已達最大階段限制'
    });
}
```

#### 6.5.2 修改 dataFormatter.js

**檔案：** `sdl-backend-main/utils/dataFormatter.js`

```javascript
// 修改前
const STAGE_NAMES = {
    '1': '定標階段',
    '2': '啟動階段',
    '3': '規劃階段',
    '4': '執行階段',
    '5': '收尾階段'  // ← 保留但標記為 deprecated
};

// 修改後
const STAGE_NAMES = {
    '1': '定標階段',
    '2': '擇策階段',  // 名稱更新
    '3': '監評階段',  // 名稱更新
    '4': '調節階段',  // 名稱更新
    // '5' 不再使用，但保留以兼容舊數據
};

// 新增：四階段專用配置
export const ACTIVE_STAGES = ['1', '2', '3', '4'];
```

#### 6.5.3 修改 Export API（可選包含 stage 5）

**檔案：** `sdl-backend-main/controllers/export.js`

```javascript
// 新增查詢參數
const getExportData = async (req, res) => {
    const { projectId } = req.params;
    const { includeDeprecatedStages = false } = req.query;

    // ...

    // 過濾階段
    const stageFilter = includeDeprecatedStages
        ? ['1', '2', '3', '4', '5']
        : ['1', '2', '3', '4'];

    // ...
};
```

**理由：** 提供選項，允許舊專案仍可匯出 stage 5 數據。

---

## 7. 決策矩陣與理由說明

### 7.1 關鍵決策清單

| # | 決策點 | 選擇 | 理由 |
|---|--------|------|------|
| 1 | 數據處理策略 | 保留 + 前端過濾 | 避免數據丟失；簡化實作；可逆 |
| 2 | 進度計算 | 四階段平均分配 | 符合 SRL 循環；更直觀 |
| 3 | Portfolio 功能定位 | 獨立功能模組 | 符合 e-Portfolio 最佳實踐 |
| 4 | 子階段數量 | 統一為 3 | 保持一致性；簡化邏輯 |
| 5 | 後端階段上限 | 軟限制 (MAX=4) | 允許舊專案繼續運作 |
| 6 | 自動生成 vs 手動填寫 | 自動生成 + 可選補充 | 減少行政負擔；提升用戶體驗 |

### 7.2 詳細理由說明

#### 決策 1：為什麼保留 stage 5 數據而非刪除？

```
理由：
1. 數據可能有歷史參考價值
2. 硬刪除是不可逆操作，風險高
3. 前端過濾的成本遠低於資料庫遷移
4. 未來若需要恢復，數據仍可用

技術實現：
- 前端：filter(stage <= 4)
- 後端：新增 includeDeprecatedStages 參數
```

#### 決策 2：為什麼採用四階段平均分配進度？

```
理由：
1. Zimmerman 的 SRL 是三階段循環，沒有「第五階段」的概念
2. 四階段（定標、擇策、監評、調節）更符合理論
3. 平均分配（每階段 25%）更直觀

舊邏輯：
- Stage 5 = 100%（跳躍式）

新邏輯：
- Stage 1-4 各 25%
- 每子階段 ~8.33%
```

#### 決策 3：為什麼將 Portfolio 定位為獨立功能模組？

```
理由（來自學術研究）：

1. e-Portfolio 的核心價值是「反思」，不是「格式化文件」
   > "it is the process of reflection that makes them a tool for life-long learning"

2. 數據重用是最佳實踐
   > "the ability to repurpose existing information and artifacts for use in portfolios"

3. 減少重複輸入提升用戶體驗
   > "學生不應重複填寫系統已有的資訊"

實作意涵：
- Portfolio 不是「階段」，而是「產出」
- 自動整合 LMS 數據，而非手動填寫
- 反思已在「調節」階段完成，不需再做「5-5 反思撰寫」
```

---

## 8. 風險評估與緩解策略

### 8.1 風險矩陣

| 風險 | 可能性 | 影響 | 緩解策略 |
|------|--------|------|----------|
| 現有專案進度顯示異常 | 中 | 中 | 提供轉換腳本；前端兼容處理 |
| 舊數據無法顯示 | 低 | 低 | 保留數據；提供 legacy 模式 |
| 用戶困惑（階段變化） | 中 | 中 | 提供說明文件；UI 提示 |
| 後端 API 不兼容 | 低 | 高 | 版本化 API；保持向後兼容 |

### 8.2 回滾計劃

如果需要回滾：

1. **前端**：恢復修改的檔案（Git revert）
2. **後端**：移除階段限制
3. **數據**：無需處理（已保留）

預估回滾時間：< 1 小時

---

## 9. 實作時程建議

### 9.1 Phase 1：前端隱藏

| 任務 | 預估時間 | 優先級 |
|------|----------|--------|
| 修改 SubStageBar.jsx | 15 分鐘 | P0 |
| 修改 SideBar.jsx | 20 分鐘 | P0 |
| 修改 Protfolio.jsx | 30 分鐘 | P0 |
| 修改 useStageIndex.js | 10 分鐘 | P0 |
| 修改進度計算 utils | 15 分鐘 | P0 |
| 測試 | 30 分鐘 | P0 |
| **小計** | **~2 小時** | |

### 9.2 Phase 2：功能升級

| 任務 | 預估時間 | 優先級 |
|------|----------|--------|
| 設計新 Portfolio UI | 2 小時 | P1 |
| 實作 portfolioGenerator.js | 2 小時 | P1 |
| 整合 ExportPreview | 2 小時 | P1 |
| 新增可選補充欄位 | 1 小時 | P2 |
| 測試 | 1 小時 | P1 |
| **小計** | **~8 小時** | |

### 9.3 Phase 3：後端優化

| 任務 | 預估時間 | 優先級 |
|------|----------|--------|
| 修改階段限制 | 30 分鐘 | P1 |
| 修改 dataFormatter.js | 30 分鐘 | P1 |
| 修改 Export API | 1 小時 | P2 |
| 測試 | 1 小時 | P1 |
| **小計** | **~3 小時** | |

### 9.4 總時程

| Phase | 時間 | 可獨立部署 |
|-------|------|-----------|
| Phase 1 | 2 小時 | ✅ 是 |
| Phase 2 | 8 小時 | ✅ 是 |
| Phase 3 | 3 小時 | ✅ 是 |
| **總計** | **~13 小時** | |

---

## 10. 附錄：完整檔案清單

### 10.1 需要修改的檔案（Phase 1）

```
sdl-frontend-main/src/
├── components/
│   ├── SubStageBar.jsx         ★★★ 核心
│   └── SideBar.jsx             ★★★ 核心
├── pages/
│   └── protfolio/
│       └── Protfolio.jsx       ★★★ 核心
├── hooks/
│   └── useStageIndex.js        ★★ 高
└── pages/
    └── student-dashboard/
        └── utils.js            ★★ 高
```

### 10.2 需要修改的檔案（Phase 2-3）

```
sdl-frontend-main/src/
├── services/
│   └── portfolioGenerator.js   (新增)
└── pages/
    └── ExportPreview/
        └── index.jsx           ★★ 高

sdl-backend-main/
├── controllers/
│   ├── submit.js               ★★ 高
│   └── export.js               ★★ 高
└── utils/
    └── dataFormatter.js        ★★★ 核心
```

### 10.3 不需要修改的檔案

```
sdl-backend-main/models/
├── submit.js                   (stage 欄位格式不變)
├── project.js                  (currentStage 仍可為 1-4)
└── stage.js                    (資料庫結構不變)
```

---

## 參考資料

1. [Zimmerman, B. J. (2000). Attaining self-regulation: A social cognitive perspective](https://pmc.ncbi.nlm.nih.gov/articles/PMC5408091/)
2. [Panadero, E. (2017). A Review of Self-regulated Learning: Six Models and Four Directions for Research](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00422/full)
3. [Integration of ePortfolios in Learning Management Systems](https://link.springer.com/chapter/10.1007/978-3-642-21934-4_40)
4. [ePortfolios Explained: Theory and Practice - University of Waterloo](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/eportfolios-explained-theory-and-practice)
5. [The reality of assessing 'authentic' electronic portfolios](https://www.researchgate.net/publication/309146190)

---

*報告完成日期：2026-01-22*
*如有問題，請聯繫技術團隊*
