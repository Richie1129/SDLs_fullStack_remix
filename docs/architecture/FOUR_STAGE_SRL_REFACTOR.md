# 四階段 SRL 循環重構說明

> **版本**: 1.0.0
> **日期**: 2026-01-27
> **狀態**: 已實作 (Option B)

---

## 目錄

1. [執行摘要](#執行摘要)
2. [理論基礎](#理論基礎)
3. [為何從五階段改為四階段](#為何從五階段改為四階段)
4. [階段對應與映射](#階段對應與映射)
5. [歷程檔案的改變](#歷程檔案的改變)
6. [技術實作方式](#技術實作方式)
7. [向後兼容策略](#向後兼容策略)
8. [參考文獻](#參考文獻)

---

## 執行摘要

本次重構將 SDL 平台從原有的「五階段探究學習模型」調整為「四階段 SRL 循環模型」，更精準地對應 Zimmerman 自主學習理論。

### 核心改變

| 項目 | 原設計 (五階段) | 新設計 (四階段) |
|------|----------------|----------------|
| 階段數量 | 5 | 4 |
| 歷程檔案 | 第 5 階段手動填寫 | 獨立模組自動生成 |
| 理論對應 | 科學探究流程 | SRL 循環理論 |
| 完成標準 | 完成 Stage 5 | 完成 Stage 4-3 |

---

## 理論基礎

### Zimmerman 自主學習循環模型 (1989, 2000)

Barry Zimmerman 提出的自主學習 (Self-Regulated Learning, SRL) 理論是當代教育心理學最具影響力的學習理論之一。該理論將學習視為一個**循環過程**，包含三個核心階段：

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    ┌──────────────┐                                     │
│    │   Forethought │ ◄─────────────────────┐           │
│    │   (前瞻階段)   │                        │           │
│    └───────┬──────┘                        │           │
│            │                               │           │
│            ▼                               │           │
│    ┌──────────────┐                        │           │
│    │  Performance  │                        │           │
│    │  (執行階段)   │                        │           │
│    └───────┬──────┘                        │           │
│            │                               │           │
│            ▼                               │           │
│    ┌──────────────┐                        │           │
│    │Self-Reflection│ ──────────────────────┘           │
│    │  (反思階段)   │                                    │
│    └──────────────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
              Zimmerman SRL Cycle (循環)
```

### 三階段詳細說明

#### 1. Forethought Phase (前瞻階段)
- **任務分析**: 設定目標、策略規劃
- **自我動機信念**: 自我效能、結果預期、興趣價值

#### 2. Performance Phase (執行階段)
- **自我控制**: 自我指導、意象化、注意力集中、任務策略
- **自我觀察**: 元認知監控、自我記錄

#### 3. Self-Reflection Phase (反思階段)
- **自我判斷**: 自我評估、歸因分析
- **自我反應**: 滿意/不滿意反應、適應性/防禦性推論

---

## 為何從五階段改為四階段

### 原有五階段模型的問題

原有設計基於「科學探究流程」：

```
Stage 1: 定標 (定義問題)
Stage 2: 擇策 (選擇策略)
Stage 3: 監評 (監控評估)
Stage 4: 調節 (調整修正)
Stage 5: 歷程 (學習歷程檔案)
```

**問題分析：**

| 問題 | 說明 |
|------|------|
| 🔴 理論不一致 | Stage 5「歷程」不屬於學習循環的一部分，而是**記錄/呈現**層面 |
| 🔴 角色混淆 | 歷程檔案是學習的「輸出」，不是學習「過程」的階段 |
| 🔴 重複勞動 | 學生在 Stage 1-4 已記錄所有內容，Stage 5 要求重新整理造成負擔 |
| 🔴 循環中斷 | 完成 Stage 5 後無法自然銜接下一輪學習循環 |

### 四階段模型的優勢

新設計將原有五階段對應至 Zimmerman SRL 循環的**細化版本**：

```
┌─────────────────────────────────────────────────────────────┐
│                     SRL 四階段循環                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐                           ┌─────────┐        │
│   │  定標   │  ←───── 循環 ──────────→  │  調節   │        │
│   │ Stage 1 │                           │ Stage 4 │        │
│   └────┬────┘                           └────▲────┘        │
│        │                                     │              │
│        ▼                                     │              │
│   ┌─────────┐                           ┌─────────┐        │
│   │  擇策   │  ─────────────────────→   │  監評   │        │
│   │ Stage 2 │                           │ Stage 3 │        │
│   └─────────┘                           └─────────┘        │
│                                                             │
│   Forethought ──────► Performance ──────► Reflection       │
│   (前瞻規劃)          (執行監控)          (反思調節)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**優勢分析：**

| 優勢 | 說明 |
|------|------|
| ✅ 理論一致 | 完美對應 Zimmerman SRL 三階段循環 (細分為四個操作階段) |
| ✅ 循環完整 | Stage 4 調節後自然銜接回 Stage 1，形成真正的學習循環 |
| ✅ 減少負擔 | 歷程檔案自動生成，學生專注於學習本身 |
| ✅ 資料整合 | 平台自動聚合四階段資料，提供更完整的學習分析 |

---

## 階段對應與映射

### SRL 理論與四階段對應表

| SRL 階段 | SDL 階段 | 子階段 | 學習活動 |
|----------|----------|--------|----------|
| **Forethought** | **定標 (Stage 1)** | 1-1 提出研究主題 | 目標設定 |
| (前瞻階段) |  | 1-2 提出研究目的 | 動機建立 |
|  |  | 1-3 提出研究問題 | 任務分析 |
| **Forethought** | **擇策 (Stage 2)** | 2-1 訂定研究構想表 | 策略選擇 |
| (前瞻階段) |  | 2-2 設計研究記錄表 | 自我監控工具 |
|  |  | 2-3 規劃研究排程 | 時間管理 |
| **Performance** | **監評 (Stage 3)** | 3-1 進行嘗試性研究 | 策略執行 |
| (執行階段) |  | 3-2 分析資料與繪圖 | 自我觀察 |
|  |  | 3-3 撰寫研究結果 | 自我記錄 |
| **Self-Reflection** | **調節 (Stage 4)** | 4-1 檢視研究進度 | 自我評估 |
| (反思階段) |  | 4-2 進行研究討論 | 歸因分析 |
|  |  | 4-3 撰寫研究結論 | 適應性推論 |

### 原 Stage 5「歷程」的重新定位

原有 Stage 5 包含：
- 5-1 封面製作
- 5-2 摘要撰寫
- 5-3 目錄編制
- 5-4 內容撰寫
- 5-5 反思撰寫

**重新定位為獨立的 Portfolio 模組：**

```
┌──────────────────────────────────────────────────────────┐
│                    Portfolio 模組                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   四階段學習資料                                          │
│   ┌────────┬────────┬────────┬────────┐                 │
│   │ Stage 1│ Stage 2│ Stage 3│ Stage 4│                 │
│   │  定標  │  擇策  │  監評  │  調節  │                 │
│   └───┬────┴───┬────┴───┬────┴───┬────┘                 │
│       │        │        │        │                       │
│       ▼        ▼        ▼        ▼                       │
│   ┌──────────────────────────────────┐                   │
│   │     Portfolio 自動生成引擎        │                   │
│   │  - 資料聚合 (aggregateData)      │                   │
│   │  - 模板生成 (generateTemplate)   │                   │
│   │  - 匯出驗證 (validateExport)     │                   │
│   └──────────────────────────────────┘                   │
│                      │                                   │
│                      ▼                                   │
│   ┌──────────────────────────────────┐                   │
│   │     學習歷程檔案 (自動生成)       │                   │
│   │  - 封面 (Cover)                  │                   │
│   │  - 摘要 (Summary)                │                   │
│   │  - 四階段內容 (Stages 1-4)       │                   │
│   │  - 結論與反思 (Conclusion)       │                   │
│   └──────────────────────────────────┘                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 歷程檔案的改變

### Before: 手動填寫 (Stage 5)

```
學生流程:
1. 完成 Stage 1-4 的學習
2. 進入 Stage 5
3. 手動填寫封面資訊
4. 手動撰寫摘要
5. 手動編制目錄
6. 手動整理內容
7. 手動撰寫反思

問題:
- 重複勞動 (Stage 1-4 已有的內容需重新整理)
- 格式不一致
- 容易遺漏
- 學習循環中斷
```

### After: 自動生成 (Portfolio 模組)

```
學生流程:
1. 完成 Stage 1-4 的學習 (專注於學習本身)
2. 進入 Portfolio 模組
3. 系統自動聚合四階段資料
4. 預覽自動生成的歷程檔案
5. 可選：補充或編輯
6. 一鍵匯出

優勢:
- 零重複勞動
- 格式標準化
- 完整性自動檢查
- 支援循環學習 (完成後可開始新循環)
```

### 歷程檔案結構對比

| 區塊 | Before (手動) | After (自動) |
|------|---------------|--------------|
| 封面 | Stage 5-1 手動填寫 | 自動從專案資訊生成 |
| 摘要 | Stage 5-2 手動撰寫 | 自動統計 + AI 輔助生成 |
| 目錄 | Stage 5-3 手動編制 | 自動根據內容生成 |
| 內容 | Stage 5-4 重新整理 | 直接引用 Stage 1-4 提交 |
| 反思 | Stage 5-5 手動撰寫 | 自動整合反思日誌 + AI 分析 |

### 資料來源映射

```javascript
// Portfolio 自動生成的資料來源

const portfolioDataSources = {
  // 封面資訊
  coverPage: {
    title: 'project.name',           // 專案名稱
    authors: 'project.members',       // 專案成員
    date: 'project.createdAt',       // 專案創建日期
    mentor: 'project.mentor'         // 指導老師
  },

  // 摘要統計
  summary: {
    totalStages: 4,                   // 固定四階段
    submissions: 'count(submits)',    // 提交次數統計
    reflections: 'count(daily)',      // 反思日誌統計
    taskCompletion: 'tasks.completed / tasks.total'
  },

  // 各階段內容
  stages: {
    1: {
      title: '定標階段',
      submissions: 'submits.where(stage.startsWith("1-"))',
      reflections: 'daily.where(stage === 1)',
      tasks: 'tasks.where(stage === 1)'
    },
    2: { /* 擇策階段 */ },
    3: { /* 監評階段 */ },
    4: { /* 調節階段 */ }
  },

  // 結論
  conclusion: {
    autoSummary: 'AI.summarize(stages)',
    reflectionHighlights: 'daily.top(5, rating)',
    learningInsights: 'AI.analyze(progress)'
  }
};
```

---

## 技術實作方式

### 實作策略: Option B - 隱藏式重構

採用**非破壞性**的隱藏式重構，保持向後兼容：

```javascript
// 所有修改使用統一的註解標記
// [Option B 隱藏] 說明文字

// 範例: useStageIndex.js
const STAGE_CONFIG = {
  STAGE: {
    MIN: 1,
    MAX: 4,  // [Option B 隱藏] 原值 MAX: 5，改為 4
    DEFAULT: 1
  },
  SUB_STAGE: {
    MIN: 1,
    MAX: 3,  // [Option B 隱藏] 原值 MAX: 10，改為 3
    DEFAULT: 1
  }
};
```

### 修改檔案總覽

#### 前端 (sdl-frontend-main)

| 檔案 | 修改內容 |
|------|----------|
| `hooks/useStageIndex.js` | STAGE_CONFIG.MAX: 5 → 4 |
| `components/SideBar.jsx` | 註解 Stage 5 選項 |
| `components/SubStageBar.jsx` | 註解 Stage 5 子階段 |
| `pages/protfolio/Protfolio.jsx` | 過濾 Stage 5 資料 |
| `pages/student-dashboard/utils.js` | 進度計算調整為四階段 |
| `pages/ExportPreview/index.jsx` | 只顯示四階段 |
| `services/portfolioAutoGenService.js` | 新增 Portfolio 生成服務 |

#### 後端 (sdl-backend-main)

| 檔案 | 修改內容 |
|------|----------|
| `controllers/submit.js` | getAllSubmit 過濾 Stage 5 |
| `controllers/export.js` | 匯出資料過濾 Stage 5 |
| `services/fourStageFilterService.js` | 新增過濾服務 |
| `services/portfolioBackendService.js` | 新增 Portfolio 後端服務 |

### 測試覆蓋

```
測試總數: 99 個

前端測試:
├── fourStageRefactor.test.js     (35 tests) ✅
└── portfolioAutoGeneration.test.js (30 tests) ✅

後端測試:
└── fourStageBackend.test.js      (34 tests) ✅
```

---

## 向後兼容策略

### 資料庫層面

```sql
-- 不修改資料庫結構
-- Stage 5 資料保持原樣，只在應用層過濾

-- 原有資料範例
SELECT * FROM submits WHERE stage LIKE '5-%';
-- 這些資料仍然存在，但 API 不會返回
```

### API 層面

```javascript
// 過濾邏輯在 Controller 層實作
const filteredSubmits = filterStage5Data(allSubmits);
// Stage 5 資料被過濾，前端不會收到
```

### 進度計算

```javascript
// 向後兼容: 舊的 Stage 5 專案仍被視為 100% 完成
const calculateProgress = (stage, subStage) => {
  if (stage > 4) return 100;  // 向後兼容
  if (stage === 4 && subStage >= 3) return 100;
  // ... 四階段計算邏輯
};
```

### 未來擴展

如果需要完全移除 Stage 5：

```bash
# 資料庫遷移腳本 (可選，未來需要時執行)
npm run migrate:remove-stage5

# 這會:
# 1. 備份 Stage 5 資料
# 2. 將 Stage 5 資料移至 portfolio_archive 表
# 3. 移除 submits 表中的 Stage 5 記錄
```

---

## 參考文獻

### 學術文獻

1. **Zimmerman, B. J. (1989).** A social cognitive view of self-regulated academic learning. *Journal of Educational Psychology*, 81(3), 329-339.

2. **Zimmerman, B. J. (2000).** Attaining self-regulation: A social cognitive perspective. In M. Boekaerts, P. R. Pintrich, & M. Zeidner (Eds.), *Handbook of self-regulation* (pp. 13-39). Academic Press.

3. **Zimmerman, B. J., & Schunk, D. H. (2011).** *Handbook of self-regulation of learning and performance*. Routledge.

4. **Pintrich, P. R. (2000).** The role of goal orientation in self-regulated learning. In M. Boekaerts, P. R. Pintrich, & M. Zeidner (Eds.), *Handbook of self-regulation* (pp. 451-502). Academic Press.

5. **Winne, P. H., & Hadwin, A. F. (1998).** Studying as self-regulated learning. In D. J. Hacker, J. Dunlosky, & A. C. Graesser (Eds.), *Metacognition in educational theory and practice* (pp. 277-304). Lawrence Erlbaum.

### SRL 循環模型圖示

```
                    ┌─────────────────────────────────────┐
                    │        ZIMMERMAN SRL MODEL          │
                    │           (2000, 2011)              │
                    └─────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
   │ FORETHOUGHT │           │ PERFORMANCE │           │SELF-REFLECT │
   │             │           │             │           │             │
   │ • 目標設定  │    ──►    │ • 策略執行  │    ──►    │ • 自我評估  │
   │ • 策略規劃  │           │ • 自我監控  │           │ • 歸因分析  │
   │ • 自我動機  │           │ • 注意力    │           │ • 適應推論  │
   └─────────────┘           └─────────────┘           └──────┬──────┘
          ▲                                                    │
          │                                                    │
          └────────────────── 循環 ◄───────────────────────────┘

                    SDL Platform 四階段對應:

          ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
          │  定標   │  │  擇策   │  │  監評   │  │  調節   │
          │ Stage 1 │  │ Stage 2 │  │ Stage 3 │  │ Stage 4 │
          └─────────┘  └─────────┘  └─────────┘  └─────────┘
               │            │            │            │
               └────────────┴────────────┴────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Portfolio     │
                    │  (獨立模組)     │
                    │  自動生成歷程   │
                    └─────────────────┘
```

---

## 附錄

### A. 相關程式碼位置

```
sdl-frontend-main/
├── src/
│   ├── hooks/useStageIndex.js              # 階段配置
│   ├── components/
│   │   ├── SideBar.jsx                     # 側邊欄階段選單
│   │   └── SubStageBar.jsx                 # 子階段選單
│   ├── pages/
│   │   ├── protfolio/Protfolio.jsx         # Portfolio 頁面
│   │   ├── student-dashboard/utils.js      # 進度計算
│   │   └── ExportPreview/index.jsx         # 匯出預覽
│   ├── services/
│   │   └── portfolioAutoGenService.js      # Portfolio 服務
│   └── test/__tests__/
│       ├── fourStageRefactor.test.js       # 四階段測試
│       └── portfolioAutoGeneration.test.js # Portfolio 測試

sdl-backend-main/
├── controllers/
│   ├── submit.js                           # 提交 API
│   └── export.js                           # 匯出 API
├── services/
│   ├── fourStageFilterService.js           # 過濾服務
│   └── portfolioBackendService.js          # Portfolio 服務
└── __tests__/
    └── fourStageBackend.test.js            # 後端測試
```

### B. 搜尋修改點

```bash
# 搜尋所有 Option B 隱藏的修改
grep -r "\[Option B 隱藏\]" --include="*.js" --include="*.jsx"
```

### C. 恢復原狀 (如需要)

如果需要恢復五階段模式，取消所有 `// [Option B 隱藏]` 註解即可：

```bash
# 搜尋並檢視所有需要恢復的位置
grep -rn "Option B 隱藏" --include="*.js" --include="*.jsx"
```

---

*文件結束*
