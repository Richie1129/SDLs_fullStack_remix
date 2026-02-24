# 🚀 階段選擇器 - 快速啟動指南

> **3 分鐘快速部署反思日誌階段選擇功能**

---

## ⚡ 快速部署（推薦）

```bash
# 一鍵部署
bash deploy-stage-selector.sh
```

這個腳本會自動完成：
- ✅ 執行資料庫遷移
- ✅ 重啟後端服務（載入新 Model）
- ✅ 重啟前端服務（編譯新元件）
- ✅ 驗證服務狀態

---

## 🔧 手動部署（進階）

### Step 1: 資料庫遷移
```bash
cd sdl-backend-main
npm run migrate
npm run migrate:status  # 驗證遷移成功
```

### Step 2: 重啟服務
```bash
# Docker 模式
docker compose restart api
docker compose restart front

# 或本地開發模式
cd sdl-backend-main && npm run dev  # Terminal 1
cd sdl-frontend-main && npm run dev  # Terminal 2
```

---

## ✅ 快速測試

### 1. 開啟反思日誌頁面
```
http://localhost:5173/reflection
```

### 2. 測試個人日誌
- 點擊「**新增個人日誌**」
- 確認看到「**專案階段（選填）**」下拉選單
- 選擇任意階段（如 `2-3`）
- 填寫標題和內容
- 點擊「**儲存**」

### 3. 驗證資料庫
```bash
docker compose exec postgres psql -U postgres -d postgres -c "
  SELECT id, title, stage FROM daily_personals 
  ORDER BY \"createdAt\" DESC LIMIT 3;
"
```

**預期結果**: `stage` 欄位顯示 `2-3`

---

## 🎯 核心功能

### 階段選擇器位置
- ✅ **個人日誌**: 標題輸入框下方
- ✅ **5Rs 反思**: 標題輸入框上方

### 智慧推薦
系統會根據 localStorage 的 `currentStage` 和 `currentSubStage` 自動推薦階段：

```javascript
// 設定當前階段（用於測試）
localStorage.setItem('currentStage', '2');
localStorage.setItem('currentSubStage', '3');
// 重新整理頁面，推薦階段會顯示 ⭐ 2-3
```

### 階段列表
```
Stage 1:
  - 1-1 分組
  - 1-2 專題設定

Stage 2:
  - 2-1 文獻探討
  - 2-2 設計研究（設計&分析）

Stage 3:
  - 3-1 撰寫發展

Stage 4:
  - 4-1 組內同儕互評
  - 4-2 組際同儕互評
  - 4-3 成果發表
```

---

## 📁 檔案清單

### 新增檔案
```
sdl-backend-main/migrations/
  └── 20260205000000-add-stage-to-daily-reflections.js

sdl-frontend-main/src/components/reflection/
  └── StageSelector.jsx

專案根目錄/
  ├── TEST_STAGE_SELECTOR.md              # 完整測試指南
  ├── STAGE_SELECTOR_IMPLEMENTATION.md    # 詳細實作文檔
  ├── deploy-stage-selector.sh            # 一鍵部署腳本
  └── QUICKSTART.md                       # 本文件
```

### 修改檔案
```
後端 (3):
  - sdl-backend-main/models/daily_personal.js
  - sdl-backend-main/models/daily_team.js
  - sdl-backend-main/controllers/daily.js

前端 (7):
  - sdl-frontend-main/src/pages/reflection/ReflectionRefactored.jsx
  - sdl-frontend-main/src/pages/reflection/components/PersonalDailyModal.jsx
  - sdl-frontend-main/src/pages/reflection/components/FiveRsModal.jsx
  - sdl-frontend-main/src/pages/reflection/components/DailyFormFields.jsx
  - sdl-frontend-main/src/components/FiveRsReflectionForm.jsx
  - sdl-frontend-main/src/pages/reflection/hooks/use5RsReflection.js
  - sdl-frontend-main/src/pages/reflection/hooks/usePersonalDaily.js
```

---

## 🐛 常見問題

### Q1: StageSelector 未顯示
**解決方法**:
```bash
# 檢查 Vite 編譯錯誤
cd sdl-frontend-main
npm run dev
# 查看終端機輸出
```

### Q2: stage 欄位未儲存
**解決方法**:
```bash
# 確認 migration 已執行
cd sdl-backend-main
npm run migrate:status | grep add-stage-to-daily-reflections
# 應顯示: Applied
```

### Q3: 智慧推薦未生效
**解決方法**:
```javascript
// 在瀏覽器 Console 檢查
console.log(localStorage.getItem('currentStage'));
console.log(localStorage.getItem('currentSubStage'));
// 如果為 null，表示尚未設定專案階段
```

---

## 📚 延伸閱讀

- **完整測試指南**: [TEST_STAGE_SELECTOR.md](./TEST_STAGE_SELECTOR.md)
- **詳細實作文檔**: [STAGE_SELECTOR_IMPLEMENTATION.md](./STAGE_SELECTOR_IMPLEMENTATION.md)
- **專案開發規範**: [AGENTS.md](./AGENTS.md)
- **設計系統**: [sdl-frontend-main/DESIGN_SYSTEM.md](./sdl-frontend-main/DESIGN_SYSTEM.md)

---

## 🎉 完成後的下一步

### 選用功能
1. **階段篩選**: 在列表頁新增階段篩選器
2. **階段統計**: 顯示各階段反思數量
3. **任務提示**: 完成任務後提示撰寫反思
4. **學習歷程**: 按階段分組顯示反思

詳見 [STAGE_SELECTOR_IMPLEMENTATION.md](./STAGE_SELECTOR_IMPLEMENTATION.md) 第 「🔮 未來擴展建議」 章節。

---

**最後更新**: 2026-02-05  
**版本**: v1.0  
**維護**: SDL 開發團隊

🎯 **Ready to go!**
