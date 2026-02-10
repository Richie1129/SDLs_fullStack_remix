# 階段選擇器測試指南

## 測試前準備

### 1. 確認資料庫遷移已完成
```bash
cd sdl-backend-main
npm run migrate:status
# 應該看到: 20260205000000-add-stage-to-daily-reflections.js - Applied
```

### 2. 重啟後端服務（載入更新後的 Model）
```bash
docker compose restart api
# 或本地開發模式
cd sdl-backend-main && npm run dev
```

### 3. 重啟前端服務（載入更新後的元件）
```bash
docker compose restart front
# 或本地開發模式
cd sdl-frontend-main && npm run dev
```

---

## 功能測試清單

### ✅ 階段 1: 個人反思日誌 - 新增記錄

**操作步驟**:
1. 登入系統，進入專案頁面
2. 點擊「反思日誌」→「個人日誌」→「新增個人日誌」
3. 檢查是否出現「專案階段（選填）」下拉選單
4. 檢查是否有智慧推薦（如果當前專案有階段資訊）

**預期結果**:
- ✅ StageSelector 顯示在標題輸入框下方
- ✅ 下拉選單分組顯示：Stage 1、Stage 2、Stage 3、Stage 4
- ✅ 如果有推薦階段，該選項顯示 ⭐ 圖示
- ✅ 可以選擇「不指定階段」
- ✅ 選擇階段後顯示確認訊息（黃色提示框）

**測試資料**:
- 標題: `測試階段 1-1 個人反思`
- 選擇階段: `1-1`
- 內容: `這是測試內容`

---

### ✅ 階段 2: 5Rs 反思日誌 - 新增記錄

**操作步驟**:
1. 點擊「反思日誌」→「5Rs 反思」→「新增 5Rs 反思」
2. 檢查 StageSelector 是否顯示在標題輸入框上方
3. 填寫 5Rs 內容並選擇階段

**預期結果**:
- ✅ StageSelector 顯示在標題輸入框之前
- ✅ 階段選擇器功能與個人日誌相同

**測試資料**:
- 標題: `測試階段 2-2 5Rs 反思`
- 選擇階段: `2-2`
- Reporting: `完成了問卷設計`
- Responding: `感覺有點困難`
- Relating: `想起了之前的研究經驗`
- Reasoning: `需要更多樣本數`
- Reconstructing: `下次會提早開始`

---

### ✅ 階段 3: 編輯現有記錄

**操作步驟**:
1. 點擊任何已存在的反思日誌的「編輯」按鈕
2. 檢查階段選擇器是否正確載入原有階段值
3. 修改階段並儲存

**預期結果**:
- ✅ StageSelector 正確顯示原有階段（如果有）
- ✅ 可以修改為其他階段
- ✅ 可以清除階段（改為「不指定」）
- ✅ 儲存後階段值正確更新

---

### ✅ 階段 4: 資料庫驗證

**檢查新增記錄**:
```bash
docker compose exec postgres psql -U postgres -d postgres -c "
  SELECT id, title, stage, \"createdAt\" 
  FROM daily_personals 
  ORDER BY \"createdAt\" DESC 
  LIMIT 5;
"
```

**預期結果**:
- ✅ `stage` 欄位顯示正確的階段值（如 `1-1`, `2-2`）
- ✅ 未選擇階段的記錄 `stage` 欄位為 `NULL`

---

### ✅ 階段 5: 智慧推薦測試

**設定專案階段**:
```javascript
// 在瀏覽器 Console 執行
import { setStageInfo } from '@/utils/authUtils';
setStageInfo(2, 3); // 設定為第 2 階段第 3 子階段
```

**操作步驟**:
1. 重新整理頁面
2. 點擊「新增個人日誌」或「新增 5Rs 反思」
3. 檢查 StageSelector

**預期結果**:
- ✅ `2-3` 選項顯示 ⭐ 圖示
- ✅ 選擇 `2-3` 後顯示：「✅ 已選擇推薦階段 2-3」
- ✅ 選擇其他階段顯示：「ℹ️ 已選擇階段 X-Y」

---

### ✅ 階段 6: 後端 API 測試

**測試 createPersonalDaily API**:
```bash
curl -X POST http://localhost:3000/api/daily/personal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "projectId=1" \
  -F "userId=1" \
  -F "title=API 測試" \
  -F "content=測試內容" \
  -F "stage=3-1"
```

**測試 updatePersonalDaily API**:
```bash
curl -X PUT http://localhost:3000/api/daily/personal/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "title=更新標題" \
  -F "stage=3-2"
```

**預期結果**:
- ✅ 回應狀態碼 `200` 或 `201`
- ✅ 回應資料中包含 `stage` 欄位
- ✅ 後端日誌顯示正確處理 stage 參數

---

## 錯誤排查

### 問題 1: StageSelector 未顯示
**檢查**:
- ✅ 確認 `sdl-frontend-main/src/components/reflection/StageSelector.jsx` 存在
- ✅ 確認 Vite 編譯無錯誤（檢查終端機）
- ✅ 檢查瀏覽器 Console 是否有 import 錯誤

### 問題 2: 階段值未儲存
**檢查**:
- ✅ 瀏覽器 Network 面板檢查 FormData 是否包含 `stage` 參數
- ✅ 後端日誌檢查 `req.body.stage` 是否有值
- ✅ 確認 migration 已執行（`npm run migrate:status`）

### 問題 3: 編輯時階段值不正確
**檢查**:
- ✅ ReflectionRefactored.jsx 的 `handleEditClick` 是否正確設定 `setStage(item.stage || "")`
- ✅ 檢查 API 回應資料是否包含 `stage` 欄位

### 問題 4: 智慧推薦未生效
**檢查**:
- ✅ localStorage 是否有 `currentStage` 和 `currentSubStage`
  ```javascript
  console.log(localStorage.getItem('currentStage'));
  console.log(localStorage.getItem('currentSubStage'));
  ```
- ✅ ReflectionRefactored.jsx 的 `recommendedStage` 計算邏輯

---

## 測試完成檢查表

- [ ] 個人日誌新增時 StageSelector 顯示正常
- [ ] 5Rs 反思新增時 StageSelector 顯示正常
- [ ] 編輯現有記錄時正確載入階段值
- [ ] 階段值正確儲存到資料庫
- [ ] 智慧推薦功能運作正常
- [ ] 可以清除階段（改為不指定）
- [ ] 後端 API 正確處理 stage 參數
- [ ] 所有 Console 無錯誤訊息

---

## 進階測試（選用）

### 測試附件上傳 + 階段選擇
1. 新增反思日誌並上傳附件
2. 同時選擇階段
3. 確認兩者都正確儲存

### 測試團隊日誌階段功能
1. 如果 backend 已支援 `daily_teams.stage`
2. 測試團隊日誌是否也支援階段選擇

### 測試階段篩選功能（如果已實作）
1. 在反思日誌列表新增階段篩選器
2. 測試能否正確篩選不同階段的記錄

---

## 完成報告範例

```markdown
## 測試結果報告 - 階段選擇器功能

**測試日期**: 2026-02-05
**測試人員**: [Your Name]
**版本**: v3.0

### ✅ 通過測試
- 個人日誌新增功能
- 5Rs 反思新增功能
- 編輯功能載入正確
- 資料庫儲存正確
- 智慧推薦功能正常

### ❌ 發現問題
- 無

### 📝 備註
- 建議未來新增階段篩選功能
- 建議新增階段統計儀表板
```

---

**最後更新**: 2026-02-05  
**測試環境**: Docker Compose / 本地開發
