# 反思日誌權限修正文檔

## 問題描述

教師（指導教師）在反思日誌系統中擁有不正確的編輯權限，能夠修改學生的個人日誌和小組日誌。根據業務需求，教師應該只能**查看**和**下載附件**，不能進行任何編輯操作。

## 需求規格

### 權限矩陣

| 角色 | 個人日誌 | 小組日誌 | 說明 |
|------|---------|---------|------|
| **學生（創建者）** | ✅ 編輯、刪除 | ✅ 查看 | 可以編輯自己創建的個人日誌 |
| **學生（專案成員）** | ❌ 只能查看 | ✅ 編輯、刪除 | 小組日誌可由任何專案成員編輯 |
| **教師（指導教師）** | ❌ 只能查看、下載 | ❌ 只能查看、下載 | 無編輯、刪除權限 |
| **跨班觀摩者** | ❌ 只能查看、下載 | ❌ 只能查看、下載 | 無編輯、刪除權限 |

### 功能權限明細

#### 學生權限
- ✅ 新增個人日誌（傳統/5Rs）
- ✅ 編輯自己的個人日誌
- ✅ 刪除自己的個人日誌
- ✅ 新增小組日誌
- ✅ 編輯任何小組日誌（同專案成員）
- ✅ 刪除任何小組日誌（同專案成員）
- ✅ 上傳/刪除附件
- ✅ 下載附件

#### 教師權限
- ❌ 新增日誌（隱藏「新增」按鈕）
- ❌ 編輯日誌（顯示「查看」按鈕）
- ❌ 刪除日誌（隱藏刪除圖標）
- ❌ 上傳/刪除附件（禁用文件輸入）
- ✅ 查看日誌內容（只讀模式）
- ✅ 下載附件
- ✅ 查看變更歷史

---

## 修正內容

### 後端修改（3 處）

#### 1. 指導教師權限降級為只讀
**檔案**: `sdl-backend-main/middlewares/projectViewingMiddleware.js:65-67`

```javascript
if (isProjectMentor) {
    // 指導教師只有查看權限，無編輯權限
    req.readOnly = true;  // 修改前: false
    req.hasViewingPermission = true;
    console.log('權限通過：指導教師（只讀）');
    return next();
}
```

**修改說明**: 將指導教師的 `readOnly` 從 `false` 改為 `true`，確保教師無法通過後續的寫入權限檢查。

---

#### 2. 移除教師編輯日誌的特殊權限分支
**檔案**: `sdl-backend-main/middlewares/projectViewingMiddleware.js:221-225`

```javascript
// 刪除以下代碼：
// 檢查是否為指導教師
const user = await User.findByPk(userId);
if (user && project.mentor === user.username) {
    console.log('權限通過：指導教師編輯日誌');
    return next();
}
```

**修改說明**: 移除教師編輯日誌的邏輯分支，教師不再擁有日誌編輯權限。

---

#### 3. 移除教師編輯提交的特殊權限分支
**檔案**: `sdl-backend-main/middlewares/projectViewingMiddleware.js:251-255`

```javascript
// 刪除以下代碼：
// 檢查是否為指導教師
const user = await User.findByPk(userId);
if (user && project.mentor === user.username) {
    console.log('權限通過：指導教師編輯提交');
    return next();
}
```

**修改說明**: 移除教師編輯提交的邏輯分支，統一權限控制。

---

### 前端修改（10 處）

#### 4. LogCard 權限檢查邏輯
**檔案**: `sdl-frontend-main/src/components/reflection/LogCard.jsx:29-40`

```javascript
// 權限檢查：判斷當前用戶是否可以編輯此日誌
const currentUserId = parseInt(localStorage.getItem("id"));
const currentUserRole = localStorage.getItem("role");
const isTeacher = currentUserRole === "teacher";
const isCreator = item.userId === currentUserId || item.user?.id === currentUserId;
const isTeamLog = inferredTargetType === 'daily_team';

// 權限邏輯：
// - 教師：永遠不能編輯
// - 小組日誌：所有學生都可以編輯（不檢查創建者）
// - 個人日誌：只有創建者可以編輯
const canEdit = !isTeacher && (isTeamLog || isCreator);
```

**修改說明**: 新增前端權限判斷，區分個人日誌（僅創建者可編輯）和小組日誌（專案成員可編輯）。

---

#### 5. 編輯/查看按鈕切換
**檔案**: `sdl-frontend-main/src/components/reflection/LogCard.jsx:225-240`

```javascript
{/* Edit/View Button */}
{canEdit ? (
  <button
    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-300 text-sm sm:text-base"
    onClick={() => onEdit(item)}
  >
    編輯 {is5Rs ? "5Rs 反思" : "傳統日誌"}
  </button>
) : (
  <button
    className="w-full bg-[#5BA491] text-white py-2 px-4 rounded hover:bg-[#5BA491]/80 transition-colors duration-300 text-sm sm:text-base"
    onClick={() => onEdit(item)}
  >
    查看 {is5Rs ? "5Rs 反思" : "日誌"}
  </button>
)}
```

**修改說明**: 根據 `canEdit` 權限顯示「編輯」（藍色）或「查看」（綠色）按鈕。

---

#### 6. 刪除按鈕權限控制
**檔案**: `sdl-frontend-main/src/components/reflection/LogCard.jsx:147`

```javascript
{typeof onDelete === 'function' && canEdit && (
  <button
    type="button"
    onClick={() => onDelete(item)}
    title="刪除這筆日誌"
    aria-label="刪除日誌"
    className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
  >
    <FiTrash2 className="w-4 h-4" />
  </button>
)}
```

**修改說明**: 刪除按鈕只在 `canEdit` 為 `true` 時顯示，教師無法看到刪除按鈕。

---

#### 7. 新增查看日誌處理函數
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:505-512`

```javascript
const handleViewClick = (item) => {
  console.log("查看日誌:", item);
  setTitle(item.title);
  setContent(item.content);
  setAttachFile(null);
  setEditingId(item.id);
  setPersonalDailyModalOpen(true);
};
```

**修改說明**: 新增教師查看傳統日誌的處理函數。

---

#### 8. 個人日誌編輯邏輯加入教師判斷
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:629-649`

```javascript
const handlePersonalLogEdit = (item) => {
  // 檢查是否為教師
  const currentUserRole = localStorage.getItem("role");
  const isTeacher = currentUserRole === "teacher";

  if (isTeacher) {
    // 教師只能查看
    if (is5RsFormat(item.content)) {
      handleView5Rs(item);
    } else {
      handleViewClick(item);
    }
  } else {
    // 學生可以編輯
    if (is5RsFormat(item.content)) {
      handleEdit5Rs(item);
    } else {
      handleEditClick(item);
    }
  }
};
```

**修改說明**: 教師點擊時進入查看模式，學生點擊時進入編輯模式。

---

#### 9. 小組日誌編輯邏輯加入教師判斷
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:665-681`

```javascript
const handleTeamLogEdit = (item) => {
  // 檢查是否為教師
  const currentUserRole = localStorage.getItem("role");
  const isTeacher = currentUserRole === "teacher";

  if (isTeacher) {
    // 教師只能查看，打開 modal 但不允許編輯
    setTitle(item.title || "");
    setContent(item.content || "");
    setAttachFile(null);
    setEditingId(item.id);
    setTeamDailyModalOpen(true);
  } else {
    // 學生可以編輯
    handleEditTeamClick(item);
  }
};
```

**修改說明**: 小組日誌同樣區分教師查看和學生編輯。

---

#### 10. Modal 輸入欄位禁用（個人日誌）
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:987-1013`

```javascript
<input
  className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
  type="text"
  placeholder="日誌名稱..."
  name="title"
  value={title}
  onChange={handleChange}
  required
  disabled={userRole === "teacher"}  // 新增
/>
<textarea
  className="rounded outline-none ring-2 ring-[#5BA491] w-full mb-3 p-1 resize-none overflow-auto"
  rows={10}
  placeholder="撰寫您的日誌..."
  name="content"
  value={content}
  onChange={handleChange}
  disabled={userRole === "teacher"}  // 新增
/>
<input
  className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
  type="file"
  name="filename"
  onChange={handleAddFileChange}
  multiple
  disabled={userRole === "teacher"}  // 新增
/>
```

**修改說明**: 教師打開 modal 時，所有輸入欄位變為禁用狀態。

---

#### 11. Modal 按鈕控制（個人日誌）
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:1046-1066`

```javascript
<div className="flex justify-end m-2">
  <button
    onClick={() => setPersonalDailyModalOpen(false)}
    className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2"
  >
    {userRole === "teacher" ? "關閉" : "取消"}  {/* 修改 */}
  </button>
  {userRole !== "teacher" && (  {/* 新增條件 */}
    <button
      onClick={(e) => {
        editingId
          ? handleSaveEdit()
          : handleCreateOrUpdatePersonalDaily(e);
      }}
      type="submit"
      className="mx-auto w-full h-7 mb-2 bg-[#5BA491] rounded font-bold text-xs sm:text-sm text-white"
    >
      {editingId ? "更新" : "儲存"}
    </button>
  )}
</div>
```

**修改說明**: 教師查看時隱藏「儲存」按鈕，只顯示「關閉」按鈕。

---

#### 12-13. Modal 刪除附件按鈕隱藏
**檔案**:
- `sdl-frontend-main/src/pages/reflection/Reflection.jsx:1037-1044` (個人)
- `sdl-frontend-main/src/pages/reflection/Reflection.jsx:1207-1214` (小組)

```javascript
{userRole !== "teacher" && (  {/* 新增條件 */}
  <button
    onClick={handleRemovePersonalAttachment}
    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
  >
    刪除附件
  </button>
)}
```

**修改說明**: 教師無法刪除附件，只能下載。

---

#### 14. 隱藏「新增個人日誌」按鈕
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:761-815`

```javascript
{/* Action Buttons - 只有學生可以新增 */}
{userRole !== "teacher" && (  {/* 新增條件 */}
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
    <button>傳統日誌</button>
    <button>+5Rs 反思</button>
  </div>
)}
```

**修改說明**: 教師無法看到新增日誌按鈕。

---

#### 15. 隱藏「新增小組日誌」按鈕
**檔案**: `sdl-frontend-main/src/pages/reflection/Reflection.jsx:857-889`

```javascript
{/* Action Button - 只有學生可以新增 */}
{userRole !== "teacher" && (  {/* 新增條件 */}
  <div className="flex">
    <button>新增</button>
  </div>
)}
```

**修改說明**: 教師無法看到新增小組日誌按鈕。

---

## 測試檢查清單

### 教師端測試
- [ ] 教師無法看到「新增日誌」按鈕（個人/小組）
- [ ] 教師點擊日誌卡片顯示「查看」按鈕（綠色 #5BA491）
- [ ] 教師打開 modal 時所有輸入欄位為禁用狀態
- [ ] 教師 modal 只顯示「關閉」按鈕，無「儲存」/「更新」按鈕
- [ ] 教師無法看到刪除日誌圖標（垃圾桶）
- [ ] 教師無法看到「刪除附件」按鈕
- [ ] 教師可以正常下載附件
- [ ] 教師可以查看變更歷史
- [ ] 教師嘗試透過 API 直接編輯日誌時收到 403 錯誤

### 學生端測試（個人日誌）
- [ ] 學生可以看到「新增日誌」按鈕
- [ ] 學生可以創建個人日誌（傳統/5Rs）
- [ ] 學生可以編輯自己的個人日誌（顯示「編輯」按鈕，藍色）
- [ ] 學生可以刪除自己的個人日誌
- [ ] 學生可以上傳/刪除附件
- [ ] 學生查看其他學生的個人日誌時顯示「查看」按鈕（綠色）
- [ ] 學生無法編輯其他學生的個人日誌

### 學生端測試（小組日誌）
- [ ] 學生可以看到「新增小組日誌」按鈕
- [ ] 學生可以創建小組日誌
- [ ] 學生可以編輯任何小組日誌（顯示「編輯」按鈕，藍色）
- [ ] 學生可以刪除任何小組日誌
- [ ] 學生可以上傳/刪除小組日誌附件
- [ ] 非專案成員學生查看時顯示「查看」按鈕（綠色）

---

## 技術架構

### 權限控制層級

```
┌─────────────────────────────────────────────────────────┐
│ 1. 路由層 (routes/daily.js)                             │
│    - validateToken: 驗證用戶登入                         │
│    - checkProjectViewingPermission: 檢查專案查看權限     │
│    - checkWritePermission: 檢查寫入權限                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 中介層 (middlewares/projectViewingMiddleware.js)     │
│    - 專案成員: readOnly = false                         │
│    - 指導教師: readOnly = true (只讀)                   │
│    - 跨班觀摩: readOnly = true (只讀)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 控制層 (controllers/daily.js)                        │
│    - 執行業務邏輯                                        │
│    - 記錄審計日誌                                        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 前端層 (components/LogCard.jsx, pages/Reflection.jsx)│
│    - UI 權限控制（按鈕顯示/隱藏）                        │
│    - 表單禁用狀態                                        │
└─────────────────────────────────────────────────────────┘
```

### 權限判斷流程

```javascript
// 後端權限判斷邏輯
function checkWritePermission(req, res, next) {
  // 1. 專案成員直接通過
  if (req.readOnly === false && req.hasViewingPermission === true) {
    return next();
  }

  // 2. 檢查是否為專案成員（針對 dailyRecord）
  if (req.dailyRecord && isProjectMember) {
    return next();  // 小組日誌：專案成員可編輯
  }

  // 3. 檢查是否為創建者（針對個人日誌）
  if (req.dailyRecord.userId === currentUserId) {
    return next();  // 個人日誌：創建者可編輯
  }

  // 4. 拒絕訪問
  return res.status(403).json({ message: '沒有權限進行此操作' });
}
```

```javascript
// 前端權限判斷邏輯
const canEdit = !isTeacher && (isTeamLog || isCreator);

// isTeacher: 教師永遠 canEdit = false
// isTeamLog: 小組日誌，學生都可編輯
// isCreator: 個人日誌，只有創建者可編輯
```

---

## 潛在問題與解決方案

### ❌ 問題 1: 教師可以透過 API 直接修改
**解決**: 後端中介層 `checkWritePermission` 已移除教師的編輯權限，API 調用會返回 403 錯誤。

### ❌ 問題 2: 前端按鈕隱藏但 API 端點仍可訪問
**解決**: 雙重保護 - 前端 UI 禁用 + 後端權限檢查，即使繞過前端也會被後端攔截。

### ❌ 問題 3: 小組日誌非創建者無法編輯
**解決**: LogCard 組件新增 `isTeamLog` 判斷，小組日誌不檢查創建者，所有學生都可編輯。

### ❌ 問題 4: 教師看到編輯按鈕但無法保存
**解決**: 前端新增 `canEdit` 權限控制，教師只顯示「查看」按鈕（綠色），並禁用所有輸入欄位。

---

## 部署步驟

1. **備份資料庫**（建議）
   ```bash
   # 備份 PostgreSQL/MySQL
   pg_dump your_database > backup_$(date +%Y%m%d).sql
   ```

2. **部署後端**
   ```bash
   cd sdl-backend-main
   # 確認修改的檔案
   git diff middlewares/projectViewingMiddleware.js

   # 重啟後端服務
   pm2 restart sdl-backend
   # 或
   npm run dev
   ```

3. **部署前端**
   ```bash
   cd sdl-frontend-main
   # 確認修改的檔案
   git diff src/components/reflection/LogCard.jsx
   git diff src/pages/reflection/Reflection.jsx

   # 重新編譯
   npm run build

   # 重啟前端服務
   pm2 restart sdl-frontend
   # 或
   npm run dev
   ```

4. **清除瀏覽器快取**
   - 教師和學生都需要強制刷新（Ctrl+Shift+R / Cmd+Shift+R）

5. **執行測試檢查清單**
   - 使用教師帳號測試所有只讀功能
   - 使用學生帳號測試編輯功能
   - 使用不同專案成員測試小組日誌編輯

---

## 回滾方案

如果出現問題需要回滾：

```bash
# 後端回滾
cd sdl-backend-main
git checkout HEAD~1 middlewares/projectViewingMiddleware.js
pm2 restart sdl-backend

# 前端回滾
cd sdl-frontend-main
git checkout HEAD~1 src/components/reflection/LogCard.jsx
git checkout HEAD~1 src/pages/reflection/Reflection.jsx
npm run build
pm2 restart sdl-frontend
```

---

## 維護注意事項

1. **新增功能時**：確保所有寫入操作都經過 `checkWritePermission` 中介層
2. **前端開發**：使用 `userRole === "teacher"` 判斷是否隱藏編輯功能
3. **API 設計**：所有 POST/PUT/DELETE 路由都必須包含權限檢查
4. **測試**：每次修改權限相關代碼後，必須執行完整的測試檢查清單

---

## 修改歷史

| 日期 | 版本 | 修改者 | 說明 |
|------|------|--------|------|
| 2025-01-XX | 1.0 | Claude | 初始版本 - 修正教師編輯權限問題 |

---

## 相關文件

- [專案權限設計文檔](./project-permission-design.md)（如果存在）
- [審計日誌系統](./audit-system.md)（如果存在）
- [反思日誌 API 文檔](./reflection-api.md)（如果存在）

---

**文檔建立日期**: 2025-01-XX
**最後更新**: 2025-01-XX
**維護者**: 開發團隊
