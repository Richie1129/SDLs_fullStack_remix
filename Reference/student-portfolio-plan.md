# 個人學習歷程功能實作計畫

> 建立日期：2026-02-23
> 分支：refactor/carditem-decomposition

---

## 一、現況與問題

### 既有功能
- `GET /api/projects/:projectId/export-data` → 小組共同匯出（無個人篩選）
- `ExportPreview/index.jsx` → 整個小組的 PDF 匯出
- `portfolioBackendService.js` → 四階段資料聚合（無 userId）

### 核心問題
現有匯出系統是**小組共同歷程**，所有組員看到同一份資料。缺乏個人歸屬篩選。

---

## 二、資料來源分析

| 資料 | 個人歸屬 | 實作方式 |
|------|---------|---------|
| `DailyPersonal` | userId FK（已有，只缺篩選） | `WHERE userId = req.userId` |
| `Submit` | userId FK（已有，只缺篩選） | `WHERE userId = req.userId` |
| `HelpSeekingLog` | userId FK | `WHERE userId = req.userId` |
| `Node` | `owner` TEXT = username | `WHERE owner = user.username` |
| `TaskChangeLog` | `changedBy` TEXT = username | `WHERE changedBy = user.username` |
| `DailyTeam` | 小組共同 | **不列入個人資料** |
| `ChatTurn` | 未實作 | **略過** |

### DailyPersonal.stage 的特殊性
- `stage = "1"~"4"` → 對應 SDL 四階段
- `stage = null` → 自由反思，不強制分類
- **不要求每個階段都有反思**，只檢查是否有任何反思

---

## 三、功能範圍

### 3.1 個人資料聚合 API
```
GET /api/projects/:projectId/portfolio/student
```
回傳：
- 個人反思（DailyPersonal，含自由反思）
- 個人正式提交（Submit）
- 個人任務貢獻（TaskChangeLog）
- 個人想法牆節點（Node WHERE owner）
- 完整度檢查結果

### 3.2 AI 學習敘事生成（串流）
```
POST /api/projects/:projectId/portfolio/generate-narrative
```
- 使用現有 `streamingService.js` + `gemini.js`
- 以 DailyPersonal 5Rs 為骨幹
- 任務貢獻 + 想法牆節點為佐證
- 按四個 SDL 階段分節
- 自由反思獨立為「跨階段省思」

### 3.3 匯出前提醒（軟提醒，不擋路）
觸發條件：
- `DailyPersonal.count === 0` → 提醒「尚未有任何個人反思」
- `Submit` 有空白子階段 → 提醒「X 個正式提交尚未完成」
- 兩個按鈕：「前往補充」/ 「仍要匯出」

### 3.4 PDF 模板選擇（3 種）
在匯出前讓學生選擇視覺風格。

---

## 四、三種 PDF 模板

### Template A：典雅學術版（Classic Academic）
- 白底，深藍標題（`#1e3a5f`）
- 清晰的章節結構，適合備審資料
- 引用框突顯反思原文
- 適合：大學申請、正式評量

### Template B：現代活力版（Modern Vibrant）
- 彩色階段標籤（SDL 綠 `#5BA491`）
- 卡片式排版，圖示裝飾
- 視覺化完成度進度條
- 適合：班級分享、課堂展示

### Template C：時間軸敘事版（Timeline Narrative）
- 左側時間軸貫穿全頁
- 每階段為一個里程碑
- 強調故事性與成長弧線
- 適合：自我回顧、反思導向

---

## 五、新增檔案清單

### 後端
```
sdl-backend-main/
├── services/
│   └── studentPortfolioService.js    ← 個人資料聚合 + AI prompt 建構
├── controllers/
│   └── studentPortfolio.js           ← 3 個 handler
└── routes/
    └── studentPortfolio.js           ← 路由定義
```

### 前端
```
sdl-frontend-main/src/
├── api/
│   └── studentPortfolio.js           ← API 呼叫層
└── pages/
    └── StudentPortfolio/
        ├── index.jsx                  ← 主頁面（模板選擇 + 預覽 + 匯出）
        ├── hooks/
        │   └── useStudentPortfolio.js ← 資料載入 + 狀態管理
        ├── components/
        │   ├── TemplateSelector.jsx   ← 模板選擇 UI
        │   ├── PreExportReminder.jsx  ← 匯出前提醒 Modal
        │   └── NarrativePanel.jsx     ← AI 敘事串流顯示
        └── templates/
            ├── ClassicTemplate.jsx    ← 典雅學術版
            ├── ModernTemplate.jsx     ← 現代活力版
            └── TimelineTemplate.jsx   ← 時間軸敘事版
```

### 修改檔案
```
sdl-backend-main/server.js            ← 加入新路由
sdl-frontend-main/src/App.jsx         ← 加入新頁面路由
```

---

## 六、實作順序

```
Step 1  後端 studentPortfolioService.js（資料聚合）
Step 2  後端 controller + route + 註冊到 server.js
Step 3  前端 API 層 studentPortfolio.js
Step 4  前端三個 PDF 模板元件
Step 5  前端 StudentPortfolio 主頁面 + hooks + components
Step 6  前端 App.jsx 加入路由
```

---

## 七、AI 敘事 Prompt 結構

```
你是學習歷程整理助手。根據以下學生的真實學習資料，
生成一份個人學習歷程敘述。

【限制】
- 只能使用提供的資料，不得憑空編造
- 如某階段資料不足，如實說明「本階段記錄較少」
- 使用第一人稱，每階段約 150-250 字

【學生資訊】
姓名：{username}，專案：{projectName}

【定標階段】
正式提交：{submits_stage_1}
個人反思：{reflections_stage_1}
任務貢獻：{task_logs_stage_1}

【擇策階段】...
【監評階段】...
【調節階段】...
【自由反思】{free_reflections}
```

---

## 八、完整度判斷邏輯

```javascript
function checkCompleteness(data) {
  return {
    hasAnyReflection: data.reflections.length > 0,
    missingSubmits: getMissingSubStages(data.submits),
    // ❌ 不按每個階段檢查反思（自由反思也算數）
    // ❌ 不強制要求 Level 3 警示出現在 PDF 中
    // ✅ 警示只在匯出前提醒 + 教師儀表板
  }
}
```
