# TeacherOverview 重設計規劃

## 背景與動機

### 使用者訪談摘要（教師視角）

| 問題 | 教師回答 | 設計意涵 |
|------|----------|----------|
| 何時使用？ | 上課前、上課時 | 需 10 秒內掃完，不是深度分析工具 |
| 看完後做什麼？ | 確認歷程檔案、kanban、idea_wall 狀態，提醒學生補上 | 需要逐組完成度檢查表 |
| 關注粒度？ | 小組優先，再看個人 | 主軸是小組，不是個別學生 |
| 現有哪塊有用？ | SDL 階段分布，但看不出是哪一組在哪一子階段 | 階段資訊要綁到具體組名 + 子階段 |
| 最想知道什麼？ | 專案進行到哪、歷程內容為何 | 需能直接預覽歷程內容 |

### 現有頁面問題

1. **虛榮指標** — 統計卡片（專案數、學生數、反思總數）不驅動任何教學決策
2. **資訊重複** — 「專案健康度」和「專案進度概覽」呈現相同資料
3. **缺乏行動性** — 看到問題但沒有明確的下一步
4. **抽象評分** — 「健康分 42」對教師無意義
5. **無時間脈絡** — 全是靜態快照，看不出趨勢

---

## 設計方向：小組狀態看板

從「分析儀表板」轉為「課前備課清單 + 課中快速查閱工具」。

### 頁面結構

```
┌─────────────────────────────────────────────────┐
│ TopBar                                          │
├─────────────────────────────────────────────────┤
│ 標題 + 學期篩選 pill                              │
├─────────────────────────────────────────────────┤
│ Section 1: SDL 階段總覽（互動式）                  │
│ ┌ 定標(2組) ─── 擇策(3組) ─── 監評(1組) ─── 調節  │
│ │ 每個階段下方列出組名 + 子階段標籤                  │
│ └ 點擊階段可快速篩選下方卡片                        │
├─────────────────────────────────────────────────┤
│ Section 2: 小組狀態卡片（主體，排序：缺最多排前面）   │
│ ┌────────────────┐  ┌────────────────┐          │
│ │ A組 — 擇策 2-1  │  │ B組 — 定標 1-3 │          │
│ │                 │  │                │          │
│ │ 歷程檔案 ██░ 2/3│  │ 歷程檔案 █░░ 1/3│          │
│ │ Kanban   ✅ 活躍│  │ Kanban   ⚠ 3天 │          │
│ │ Idea Wall ✅ 8則│  │ Idea Wall ❌ 空 │          │
│ │                 │  │                │          │
│ │ [預覽歷程][進入] │  │ [預覽歷程][進入]│          │
│ └────────────────┘  └────────────────┘          │
├─────────────────────────────────────────────────┤
│ Section 3: 歷程預覽抽屜（右側滑出）                 │
│ 顯示該組各已到達子階段的填寫內容摘要                  │
│ 標出哪些子階段尚未填寫                              │
└─────────────────────────────────────────────────┘
```

### 核心改變

| 移除 | 新增 |
|------|------|
| 6 個統計卡片（虛榮指標） | 小組狀態卡片（完成度檢查表） |
| 專案健康度評分 | 歷程檔案填寫進度（X/Y 子階段） |
| 最近活動流 | Kanban 最後活動時間 |
| 學生管理 tab | Idea Wall 節點數 |
| 重複的專案進度概覽 | 歷程內容預覽抽屜 |

---

## 資料來源與 API 策略

### 現有可用 API

| 資料 | API | 回傳重點 |
|------|-----|----------|
| 教師所有專案 | `GET /projects/mentor/:name?semester=` | `currentStage`, `currentSubStage`, `name`, `id` |
| 專案學生 | `GET /projects/:id/users` | `[{id, username, ...}]` |
| 各子階段提交 | `GET /submit?projectId=` | `[{stage: "1-1", userId, content, createdAt}]` |
| Kanban 活動 | `GET /kanbans/projects/:id/activity?limit=1` | 最近一筆活動的 `createdAt` |
| Idea Wall | `GET /ideaWall/:projectId` | Wall 物件（需另查 node 數） |

### 新增後端 API（減少前端 N+1 呼叫）

**`GET /api/teacher/projects-summary?semester=`**

一次回傳教師所有專案的狀態摘要：

```jsonc
{
  "projects": [
    {
      "id": 1,
      "name": "探討校園植物多樣性",
      "semester": "114-2",
      "currentStage": 2,
      "currentSubStage": 1,
      "projectEnd": false,
      "members": [
        { "id": 10, "username": "王小明" },
        { "id": 11, "username": "李小華" }
      ],
      // 歷程檔案：已到達的子階段中，哪些有提交
      "submitStatus": {
        "reached": ["1-1", "1-2", "1-3"],  // 已經過的子階段
        "submitted": ["1-1", "1-3"],         // 有提交的子階段
        "missing": ["1-2"]                   // 缺少提交的子階段
      },
      // Kanban 最後活動
      "kanban": {
        "lastActivityAt": "2026-04-15T10:30:00Z",  // null 表示從未有活動
        "taskCount": 12
      },
      // Idea Wall
      "ideaWall": {
        "nodeCount": 8,
        "lastNodeAt": "2026-04-14T08:00:00Z"  // null 表示無節點
      }
    }
  ]
}
```

### 歷程預覽 API（按需載入）

沿用現有 `GET /submit?projectId=` — 前端在使用者點擊「預覽歷程」時才載入。

---

## 實作計畫

### Phase 1: 後端 — 批次狀態摘要 API

**檔案**: `sdl-backend-main/controllers/teacherOverviewController.js`（新增）
**路由**: `sdl-backend-main/routes/teacherOverview.js`（新增）

邏輯：
1. 根據 `req.user` 查詢該教師的所有專案（可選 semester 篩選）
2. 用 `Promise.all` 並行取得每個專案的：
   - 成員列表（`Project` → `User` association）
   - 提交記錄（`Submit.findAll`，只取 `stage` + `userId` 欄位）
   - Kanban 最後活動（`activityService.getProjectActivities(id, {limit:1})`）
   - Idea Wall 節點數（`Node.count({ where: { ideaWallId } })`）
3. 計算 `submitStatus`：比對 `reached` 子階段 vs 實際有提交的子階段
4. 組裝回傳

### Phase 2: 前端 — TeacherOverview 重寫

**修改檔案**: `sdl-frontend-main/src/pages/overview/TeacherOverview.jsx`

#### 2a. 資料層
- 新增 API 函式 `getTeacherProjectsSummary(semester)` in `api/project.js`
- 用 `useQuery` 取得摘要資料
- 歷程預覽用獨立 `useQuery` + `enabled: false`，點擊時觸發

#### 2b. SDL 階段總覽區塊
- 保留水平分布圖
- 每個階段下方顯示該階段的組名 pill
- 組名 pill 包含子階段資訊（如「A組 2-1」）
- 點擊階段可篩選下方卡片

#### 2c. 小組狀態卡片
- Grid layout，每張卡片顯示：
  - 組名 + 當前階段/子階段標籤
  - 歷程檔案進度條（submitted / reached）
  - 缺少提交的子階段名稱列表
  - Kanban 最後活動（相對時間 or 警示）
  - Idea Wall 節點數
  - 「預覽歷程」和「進入專案」按鈕
- 預設排序：缺少項目最多的排前面
- 支援按階段篩選

#### 2d. 歷程預覽抽屜
- 右側滑出 panel
- 列出各已到達子階段：
  - 有提交 → 顯示內容摘要（截取前 100 字）
  - 未提交 → 標示「尚未填寫」+ 子階段名稱
- 底部提供「進入專案」連結

### Phase 3: 測試與調整（後續）

- 確認響應式佈局（sm / md / lg）
- 確認空狀態處理
- 確認學期篩選正常運作

---

## 子階段計算邏輯

```
reached 子階段 = 所有 stageNum < currentStage 的子階段
               + currentStage 中 subNum <= currentSubStage 的子階段
               （但排除 currentStage-currentSubStage 本身，因為那是「正在進行」）

範例：currentStage=2, currentSubStage=2
  reached = ["1-1", "1-2", "1-3", "2-1"]  // 2-2 是「進行中」，不算已到達
  如果 submitted = ["1-1", "1-3", "2-1"]
  則 missing = ["1-2"]
```

---

## 保留項目

- 學期篩選 pill（現有）
- TopBar（現有）
- `calculateProgress` 工具函式（現有）
- 導航回首頁按鈕（現有）
