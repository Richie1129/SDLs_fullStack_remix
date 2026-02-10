# 階段選擇器完整實作報告

> **功能**: 為反思日誌（個人 + 5Rs）新增階段選擇功能  
> **狀態**: ✅ 實作完成  
> **日期**: 2026-02-05

---

## 📋 實作概述

為反思日誌系統新增階段選擇功能,允許使用者將日誌關聯到特定專案階段（如 1-1, 2-3, 4-2）。支援智慧推薦、階段分組顯示、可選填等特性。

### 核心特性
- ✅ 階段選擇（分組顯示 Stage 1-4）
- ✅ 智慧推薦（基於 localStorage 的 currentStage/currentSubStage）
- ✅ 可選填（允許不指定階段）
- ✅ 視覺回饋（推薦階段顯示 ⭐、確認訊息）
- ✅ 編輯支援（正確載入並更新階段）
- ✅ 完整的後端 API 支援

---

## 🗄️ 資料庫變更

### Migration: `20260205000000-add-stage-to-daily-reflections.js`

```sql
-- 新增欄位
ALTER TABLE daily_personals ADD COLUMN stage VARCHAR(10) NULL;
ALTER TABLE daily_teams ADD COLUMN stage VARCHAR(10) NULL;

-- 新增索引
CREATE INDEX idx_daily_personals_stage ON daily_personals (stage);
CREATE INDEX idx_daily_personals_project_stage ON daily_personals (projectId, stage);
CREATE INDEX idx_daily_teams_stage ON daily_teams (stage);
CREATE INDEX idx_daily_teams_project_stage ON daily_teams (projectId, stage);
```

### Model 更新

**sdl-backend-main/models/daily_personal.js**:
```javascript
stage: {
  type: DataTypes.STRING(10),
  allowNull: true,
  comment: '關聯階段（格式：1-1, 2-3 等）'
}
```

**sdl-backend-main/models/daily_team.js**:
```javascript
stage: {
  type: DataTypes.STRING(10),
  allowNull: true,
  comment: '關聯階段（格式：1-1, 2-3 等）'
}
```

---

## 🔧 後端實作

### Controller 更新: `sdl-backend-main/controllers/daily.js`

#### 1. createPersonalDaily
```javascript
const newPersonalDaily = await Daily_personal.create({
  projectId,
  userId,
  title,
  content,
  stage: req.body.stage || null, // ✅ 新增
  fileUrl: fileNames.length > 0 ? fileNames[0] : null,
  additionalFileUrls: JSON.stringify(fileNames.slice(1))
});
```

#### 2. updatePersonalDaily
```javascript
const updatedPersonalDaily = await existingDaily.update({
  title: title || existingDaily.title,
  content: content || existingDaily.content,
  stage: req.body.stage !== undefined ? req.body.stage : existingDaily.stage, // ✅ 新增
  fileUrl: fileNames.length > 0 ? fileNames[0] : existingDaily.fileUrl,
  additionalFileUrls: JSON.stringify(fileNames.slice(1))
});
```

#### 3. createTeamDaily
```javascript
const newTeamDaily = await Daily_team.create({
  projectId,
  userId,
  title,
  content,
  stage: req.body.stage || null, // ✅ 新增
  fileUrl: fileNames.length > 0 ? fileNames[0] : null,
  additionalFileUrls: JSON.stringify(fileNames.slice(1))
});
```

#### 4. updateTeamDaily
```javascript
const updatedTeamDaily = await existingDaily.update({
  title: title || existingDaily.title,
  content: content || existingDaily.content,
  stage: req.body.stage !== undefined ? req.body.stage : existingDaily.stage, // ✅ 新增
  fileUrl: fileNames.length > 0 ? fileNames[0] : existingDaily.fileUrl,
  additionalFileUrls: JSON.stringify(fileNames.slice(1))
});
```

---

## 🎨 前端實作

### 1. 新元件: `StageSelector.jsx`

**路徑**: `sdl-frontend-main/src/components/reflection/StageSelector.jsx`

#### Props
```javascript
{
  value: string,              // 當前選擇的階段（如 "2-3"）
  onChange: function,         // 階段變更處理函式
  disabled: boolean,          // 是否禁用
  recommendedStage: string,   // 智慧推薦的階段（顯示 ⭐）
}
```

#### 特性
- **分組顯示**: Stage 1-4 階層式選單
- **智慧推薦**: 推薦階段顯示 ⭐ 圖示
- **視覺回饋**: 選擇後顯示確認訊息（黃色提示框）
- **可選填**: 預設「不指定階段」選項
- **無障礙**: 完整的 ARIA 標籤

#### 階段結構
```javascript
const STAGES = {
  1: [
    { value: "1-1", label: "分組" },
    { value: "1-2", label: "專題設定" }
  ],
  2: [
    { value: "2-1", label: "文獻探討" },
    { value: "2-2", label: "設計研究（設計&分析）" }
  ],
  3: [
    { value: "3-1", label: "撰寫發展" }
  ],
  4: [
    { value: "4-1", label: "組內同儕互評" },
    { value: "4-2", label: "組際同儕互評" },
    { value: "4-3", label: "成果發表" }
  ]
};
```

---

### 2. 更新元件清單

#### A. `DailyFormFields.jsx`
```javascript
// Props 新增
{
  stage,
  onStageChange,
  recommendedStage,
}

// JSX 新增
{onStageChange && (
  <StageSelector
    value={stage}
    onChange={onStageChange}
    disabled={disabled || isTeacher}
    recommendedStage={recommendedStage}
  />
)}
```

#### B. `PersonalDailyModal.jsx`
```javascript
// Props 新增
{
  stage,
  onStageChange,
  recommendedStage,
}

// 傳遞給 DailyFormFields
<DailyFormFields
  stage={stage}
  onStageChange={onStageChange}
  recommendedStage={recommendedStage}
  // ...其他 props
/>
```

#### C. `FiveRsModal.jsx`
```javascript
// Props 新增
{
  stage,
  onStageChange,
  recommendedStage,
}

// 傳遞給 FiveRsReflectionForm
<FiveRsReflectionForm
  stage={stage}
  onStageChange={onStageChange}
  recommendedStage={recommendedStage}
  // ...其他 props
/>
```

#### D. `FiveRsReflectionForm.jsx`
```javascript
// Props 新增
{
  stage,
  onStageChange,
  recommendedStage,
}

// JSX 新增（在標題輸入框之前）
{onStageChange && (
  <StageSelector
    value={stage}
    onChange={onStageChange}
    recommendedStage={recommendedStage}
  />
)}

// handleSave 更新
onSave({
  title,
  content,
  attachFile,
  stage, // ✅ 新增
});
```

---

### 3. Hook 更新

#### A. `use5RsReflection.js`

**handle5RsSave 函式**:
```javascript
// 新增時新增 stage
if (data.stage) {
  formData.append("stage", data.stage);
}

// 編輯時也新增 stage
if (data.stage) {
  formData.append("stage", data.stage);
}
```

#### B. `usePersonalDaily.js`
- ✅ 已支援 FormData，無需修改
- updateMutation 自動處理 FormData 中的 stage 欄位

---

### 4. 主元件: `ReflectionRefactored.jsx`

#### State 管理
```javascript
const [stage, setStage] = useState("");  // 選擇的階段

// 智慧推薦
const { currentStage, currentSubStage } = getStageInfo();
const recommendedStage = currentStage && currentSubStage 
  ? `${currentStage}-${currentSubStage}` 
  : null;
```

#### 新增日誌 (handleCreateOrUpdatePersonalDaily)
```javascript
const formData = new FormData();
formData.append("projectId", projectId);
if (stage) {
  formData.append("stage", stage);
}
// ...其他欄位
createMutation.mutate(formData);
```

#### 編輯日誌 (handleSaveEdit)
```javascript
const formData = new FormData();
formData.append("id", Number(editingId));
if (stage) {
  formData.append("stage", stage);
}
// ...其他欄位
updateMutation.mutate(formData);
```

#### 載入編輯資料 (handleEditClick)
```javascript
setStage(item.stage || "");
```

#### Modal Props
```javascript
<PersonalDailyModal
  stage={stage}
  onStageChange={setStage}
  recommendedStage={recommendedStage}
  onClose={() => {
    setStage("");  // 重置階段
    // ...
  }}
/>

<FiveRsModal
  stage={stage}
  onStageChange={setStage}
  recommendedStage={recommendedStage}
  onClose={() => {
    setStage("");  // 重置階段
    // ...
  }}
/>
```

---

## 🔄 資料流程圖

### 新增流程
```
使用者點擊「新增日誌」
  ↓
ReflectionRefactored 取得智慧推薦 (getStageInfo)
  ↓
recommendedStage = "2-3"
  ↓
開啟 Modal (PersonalDailyModal / FiveRsModal)
  ↓
StageSelector 顯示並標記推薦階段 (⭐)
  ↓
使用者選擇階段
  ↓
setStage("2-3")
  ↓
使用者填寫內容並點擊儲存
  ↓
handleCreateOrUpdatePersonalDaily 建立 FormData
  ↓
formData.append("stage", "2-3")
  ↓
createMutation.mutate(formData)
  ↓
POST /api/daily/personal
  ↓
Controller: stage = req.body.stage || null
  ↓
Daily_personal.create({ stage: "2-3", ... })
  ↓
資料庫儲存
```

### 編輯流程
```
使用者點擊「編輯」按鈕
  ↓
handleEditClick(item)
  ↓
setStage(item.stage || "")  // 載入現有階段
  ↓
StageSelector 顯示當前階段
  ↓
使用者修改階段 (或保持不變)
  ↓
點擊儲存
  ↓
handleSaveEdit 建立 FormData
  ↓
formData.append("stage", stage)
  ↓
updateMutation.mutate(formData)
  ↓
PUT /api/daily/personal/:id
  ↓
Controller: stage = req.body.stage !== undefined ? req.body.stage : existingDaily.stage
  ↓
existingDaily.update({ stage: "3-1", ... })
  ↓
資料庫更新
```

---

## 🧪 測試指南

### 完整測試清單
請參考 `TEST_STAGE_SELECTOR.md`

### 快速驗證命令

#### 1. 檢查資料庫
```bash
docker compose exec postgres psql -U postgres -d postgres -c "
  SELECT id, title, stage, \"createdAt\" 
  FROM daily_personals 
  ORDER BY \"createdAt\" DESC 
  LIMIT 5;
"
```

#### 2. 測試 API
```bash
# 新增測試
curl -X POST http://localhost:3000/api/daily/personal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "projectId=1" \
  -F "userId=1" \
  -F "title=測試" \
  -F "content=內容" \
  -F "stage=2-3"

# 更新測試
curl -X PUT http://localhost:3000/api/daily/personal/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "title=更新" \
  -F "stage=3-1"
```

---

## 📊 檔案變更清單

### 新增檔案
- `sdl-backend-main/migrations/20260205000000-add-stage-to-daily-reflections.js`
- `sdl-frontend-main/src/components/reflection/StageSelector.jsx`
- `TEST_STAGE_SELECTOR.md`
- `STAGE_SELECTOR_IMPLEMENTATION.md` (本文件)

### 修改檔案
#### 後端 (3 個檔案)
- `sdl-backend-main/models/daily_personal.js`
- `sdl-backend-main/models/daily_team.js`
- `sdl-backend-main/controllers/daily.js`

#### 前端 (7 個檔案)
- `sdl-frontend-main/src/pages/reflection/ReflectionRefactored.jsx`
- `sdl-frontend-main/src/pages/reflection/components/PersonalDailyModal.jsx`
- `sdl-frontend-main/src/pages/reflection/components/FiveRsModal.jsx`
- `sdl-frontend-main/src/pages/reflection/components/DailyFormFields.jsx`
- `sdl-frontend-main/src/components/FiveRsReflectionForm.jsx`
- `sdl-frontend-main/src/pages/reflection/hooks/use5RsReflection.js`
- `sdl-frontend-main/src/pages/reflection/hooks/usePersonalDaily.js` (已支援，無需修改)

### 變更統計
- **總計**: 12 個檔案
- **後端**: 3 個檔案（+ 1 migration）
- **前端**: 7 個檔案（+ 1 新元件）
- **文檔**: 2 個檔案

---

## 🚀 部署步驟

### 1. 執行資料庫遷移
```bash
cd sdl-backend-main
npm run migrate
```

### 2. 重啟後端（載入新 Model）
```bash
docker compose restart api
```

### 3. 重建前端（編譯新元件）
```bash
docker compose restart front
```

### 4. 驗證功能
按照 `TEST_STAGE_SELECTOR.md` 進行完整測試。

---

## 🔮 未來擴展建議

### 階段 1: 階段篩選器
**位置**: ReflectionRefactored.jsx  
**功能**: 新增下拉選單篩選特定階段的反思日誌

```javascript
const [stageFilter, setStageFilter] = useState("");

const filteredDaily = personalDaily.filter(item => 
  !stageFilter || item.stage === stageFilter
);
```

### 階段 2: 階段統計儀表板
**位置**: 新元件 `StageStatistics.jsx`  
**功能**: 顯示各階段反思數量、完成度等統計資訊

### 階段 3: 任務提交後提示
**位置**: Submit.jsx  
**功能**: 完成任務提交後提示撰寫該階段反思日誌

```javascript
// 提交成功後
Swal.fire({
  title: '提交成功！',
  text: '是否撰寫本階段的反思日誌？',
  showCancelButton: true,
  confirmButtonText: '前往撰寫',
}).then((result) => {
  if (result.isConfirmed) {
    navigate('/reflection', { 
      state: { suggestedStage: currentStage } 
    });
  }
});
```

### 階段 4: 學習歷程整合
**位置**: Portfolio.jsx  
**功能**: 學習歷程按階段分組顯示反思日誌

---

## 🎓 設計決策說明

### 為什麼 stage 是 nullable？
- 允許使用者撰寫通用反思（不限於特定階段）
- 向後相容（現有資料不受影響）
- 使用者可自由選擇是否關聯階段

### 為什麼使用智慧推薦？
- 減少使用者選擇負擔
- 提高反思與當前進度的關聯性
- 保持使用者專注於內容撰寫

### 為什麼階段格式是 "X-Y"？
- 與專案 stage 管理系統一致
- 易於理解和維護
- 支援未來擴展（如 "2-3a", "2-3b"）

### 為什麼使用 FormData？
- 支援檔案上傳
- 後端已有完善的 multipart/form-data 處理
- 保持 API 一致性

---

## 📝 維護注意事項

### 新增階段時
1. 更新 `StageSelector.jsx` 中的 `STAGES` 物件
2. 更新 `EXPECTED_USER_SUBMIT` (如果該階段有任務表單)
3. 更新文檔中的階段列表

### 修改階段邏輯時
確保以下檔案同步更新：
- `StageSelector.jsx` - UI 顯示
- `authUtils.js` - getStageInfo / setStageInfo
- `stageManager.js` - 階段管理邏輯（如果存在）

### 資料庫查詢優化
已建立的索引：
- `idx_daily_personals_stage` - 單欄位索引
- `idx_daily_personals_project_stage` - 複合索引

查詢建議：
```sql
-- ✅ 推薦：使用複合索引
SELECT * FROM daily_personals 
WHERE projectId = 1 AND stage = '2-3';

-- ⚠️ 可用：單欄位索引
SELECT * FROM daily_personals 
WHERE stage = '2-3';
```

---

## ✅ 完成檢查表

### 後端
- [x] Migration 已建立並測試
- [x] daily_personal Model 更新
- [x] daily_team Model 更新
- [x] createPersonalDaily 支援 stage
- [x] updatePersonalDaily 支援 stage
- [x] createTeamDaily 支援 stage
- [x] updateTeamDaily 支援 stage

### 前端
- [x] StageSelector 元件已建立
- [x] DailyFormFields 整合 StageSelector
- [x] PersonalDailyModal 傳遞 stage props
- [x] FiveRsModal 傳遞 stage props
- [x] FiveRsReflectionForm 使用 StageSelector
- [x] use5RsReflection 處理 stage
- [x] usePersonalDaily 支援 FormData
- [x] ReflectionRefactored 完整整合

### 文檔
- [x] 實作報告 (本文件)
- [x] 測試指南 (TEST_STAGE_SELECTOR.md)
- [x] 更新 AGENTS.md (如需要)

---

## 🐛 已知問題

**目前無已知問題**

---

## 📞 聯絡資訊

**實作者**: SDL 開發團隊  
**版本**: v1.0  
**最後更新**: 2026-02-05

---

**Happy Coding! 🚀**
