# Help-Seeking Frontend 實作完成報告

> **完成日期**: 2026-02-11  
> **實作範圍**: 教師端 Help-Seeking 儀表板前端（A2）+ 迴避預警清單前端（B3）

---

## ✅ 實作完成

### 已創建的檔案

#### 1. **自定義 Hook**: `useHelpSeeking.js`
- **路徑**: `sdl-frontend-main/src/pages/teacher-dashboard/hooks/useHelpSeeking.js`
- **功能**:
  - 統一管理所有 Help-Seeking 相關資料（overview, projectStats, avoidanceRisks, followUpCases）
  - 提供 8 個 API 端點的調用方法
  - 支援手動觸發迴避偵測與成效檢查
  - 自動化錯誤處理與載入狀態管理
  - 並行獲取資料，優化載入效能

#### 2. **主要檢視組件**: `HelpSeekingView.jsx`
- **路徑**: `sdl-frontend-main/src/pages/teacher-dashboard/components/HelpSeekingView.jsx`
- **功能**:
  - 教師端 Help-Seeking 儀表板主介面（A2）
  - 三個分頁：
    - 📊 **總覽分析**: 學生求助品質表格（依品質分數排序，低分優先）
    - ⚠️ **迴避預警**: 整合 AvoidanceRiskAlert 組件
    - 📈 **成效追蹤**: 顯示需要追蹤的低成效案例
  - 四個統計卡片：
    - 1️⃣ 總求助次數（含趨勢）
    - 2️⃣ 求助品質平均
    - 3️⃣ 迴避風險學生數（高風險自動高亮）
    - 4️⃣ 求助成效分數
  - 操作按鈕：
    - 🔍 偵測迴避
    - 📊 檢查成效
    - 🔄 重新整理

#### 3. **預警組件**: `AvoidanceRiskAlert.jsx`
- **路徑**: `sdl-frontend-main/src/pages/teacher-dashboard/components/AvoidanceRiskAlert.jsx`
- **功能**:
  - 求助迴避預警清單（B3）
  - 風險等級視覺化：
    - 🔴 高風險：紅色背景，動態提示
    - 🟡 中風險：黃色背景
    - 🟢 低風險：綠色背景
  - 可展開查看詳細資訊：
    - 📊 風險詳情（JSON 格式）
    - 🏷️ 掙扎訊號標籤（任務停滯、阻塞、品質下降等）
    - 💬 教師備註
  - 可操作介面：
    - ✓ 已確認（標記教師已查看）
    - ✓ 標記為已解決
  - 統計摘要：
    - 總計、高/中/低風險數量
    - 已確認/已解決數量

#### 4. **檢視按鈕更新**: `ViewModeButtons.jsx`
- **路徑**: `sdl-frontend-main/src/pages/teacher-dashboard/components/ViewModeButtons.jsx`
- **更新內容**:
  - 新增 "Help-Seeking" 檢視模式
  - 使用 FiHelpCircle 圖標

#### 5. **儀表板整合**: `index.jsx`
- **路徑**: `sdl-frontend-main/src/pages/teacher-dashboard/index.jsx`
- **更新內容**:
  - Import HelpSeekingView 組件
  - 在 renderViewContent 的 switch 中新增 'help-seeking' case
  - 包裝在 DashboardErrorBoundary 中確保錯誤隔離

---

## 🎨 UI/UX 設計特色

### 視覺設計
- ✨ **現代化介面**: 使用 Tailwind CSS 的漸層色、陰影效果
- 🎯 **直覺操作**: 清晰的視覺層級與互動提示
- 📱 **響應式設計**: 支援桌面、平板、手機等多種螢幕尺寸
- 🔔 **動態警示**: 高風險案例自動高亮與閃爍動畫

### 互動體驗
- ⚡ **即時回饋**: 載入狀態、操作成功/失敗提示
- 🔄 **手動控制**: 支援手動觸發偵測與重新整理
- 📊 **資料可視化**: 統計卡片、表格、標籤等多種形式
- 🎭 **展開/收合**: 詳細資訊按需展開，避免介面擁擠

### 顏色語意
- 🔴 **紅色系**: 高風險、需要緊急關注
- 🟡 **黃色系**: 中風險、需要留意
- 🟢 **綠色系**: 低風險、正常狀態
- 🔵 **藍色系**: 資訊性提示、操作按鈕

---

## 🚀 使用流程

### 教師端操作流程

1. **進入 Help-Seeking 儀表板**
   - 前往教師儀表板
   - 點擊頂部導航的 "Help-Seeking" 按鈕

2. **查看統計總覽**
   - 查看四個統計卡片：總求助次數、品質平均、風險學生數、成效分數
   - 注意高風險學生數（有高亮提示）

3. **分析學生求助品質**（總覽分析頁籤）
   - 查看學生求助品質表格（按品質分數排序，低分優先）
   - 識別需要關注的低品質求助學生
   - 點擊「詳情」查看個別學生的完整求助歷史

4. **處理迴避預警**（迴避預警頁籤）
   - 查看依風險等級排序的預警清單
   - 展開高風險案例查看詳細資訊：
     - 掙扎訊號（任務停滯、阻塞等）
     - 風險詳情（JSON 格式）
   - 標記「已確認」表示已查看
   - 與學生溝通後標記「已解決」

5. **追蹤求助成效**（成效追蹤頁籤）
   - 查看需要追蹤的低成效案例
   - 觀察任務狀態變化（求助前 → 24小時後）
   - 檢視成效分數（低分表示求助未帶來改善）

6. **手動觸發檢測**
   - 點擊「🔍 偵測迴避」手動觸發迴避偵測
   - 點擊「📊 檢查成效」手動觸發成效檢查
   - 點擊「🔄 重新整理」更新所有資料

---

## 📊 資料流程

```
[使用者操作] → [useHelpSeeking Hook] → [Backend API] → [Database]
                        ↓
            [State Management（useState）]
                        ↓
            [UI 組件 (HelpSeekingView / AvoidanceRiskAlert)]
                        ↓
                  [渲染畫面]
```

### API 端點對應

| 前端功能 | API 端點 | Hook 方法 |
|---------|---------|----------|
| 統計卡片 | `GET /api/teacher/help-seeking/stats/:projectId` | `fetchProjectStats()` |
| 總覽資訊 | `GET /api/teacher/help-seeking/overview` | `fetchOverview()` |
| 迴避預警清單 | `GET /api/teacher/help-seeking/avoidance-risks/:projectId` | `fetchAvoidanceRisks()` |
| 成效追蹤清單 | `GET /api/teacher/help-seeking/follow-up/:projectId` | `fetchFollowUpCases()` |
| 學生詳細資料 | `GET /api/teacher/help-seeking/student/:userId` | `fetchStudentDetails()` |
| 更新風險狀態 | `PUT /api/teacher/help-seeking/avoidance-risks/:riskId` | `updateAvoidanceRisk()` |
| 觸發迴避偵測 | `POST /api/teacher/help-seeking/trigger-avoidance-detection/:projectId` | `triggerAvoidanceDetection()` |
| 觸發成效檢查 | `POST /api/teacher/help-seeking/trigger-effectiveness-check/:projectId` | `triggerEffectivenessCheck()` |

---

## 🔍 技術細節

### 狀態管理
```javascript
const {
  overview,           // 教師所有專案總覽
  projectStats,       // 當前專案統計
  avoidanceRisks,     // 迴避風險清單
  followUpCases,      // 需追蹤案例
  loading,            // 載入狀態
  error,              // 錯誤訊息
  lastUpdate,         // 最後更新時間
  refresh             // 重新整理方法
} = useHelpSeeking(projectId);
```

### 錯誤處理
- ✅ API 調用失敗自動捕捉
- ✅ 友善的錯誤訊息顯示
- ✅ 提供重試按鈕
- ✅ 錯誤邊界（DashboardErrorBoundary）防止整個頁面崩潰

### 效能優化
- ⚡ 並行獲取資料（Promise.all）
- ⚡ useCallback 防止不必要的重新渲染
- ⚡ useMemo 緩存計算結果（在其他組件中）
- ⚡ 條件渲染減少 DOM 操作

---

## ✅ 驗收測試項目

### 功能測試
- [ ] 統計卡片正確顯示數據
- [ ] 學生品質表格正確排序（低分優先）
- [ ] 迴避預警清單按風險等級排序
- [ ] 可展開/收合風險詳細資訊
- [ ] 「已確認」「已解決」按鈕正常運作
- [ ] 成效追蹤顯示狀態變化
- [ ] 手動觸發偵測/檢查正常運作
- [ ] 重新整理按鈕正常運作

### UI/UX 測試
- [ ] 響應式設計在各種螢幕尺寸正常顯示
- [ ] 載入狀態正確顯示（骨架屏）
- [ ] 錯誤狀態友善提示
- [ ] 高風險案例有視覺提示（閃爍/高亮）
- [ ] 懸停效果正常
- [ ] 按鈕禁用狀態正確（loading 時）

### 整合測試
- [ ] 教師儀表板檢視模式切換正常
- [ ] Help-Seeking 按鈕正確顯示
- [ ] 組件渲染無 Console 錯誤
- [ ] 錯誤邊界正常運作（不影響其他檢視）

---

## 📝 後續擴展建議

### 短期優化（1-2 週）
1. **圖表視覺化**
   - 求助類型分布圓餅圖
   - 求助時間趨勢折線圖
   - 學生品質分布直方圖

2. **篩選與搜尋**
   - 依風險等級篩選
   - 依學生姓名搜尋
   - 依時間範圍篩選

3. **匯出功能**
   - 匯出 Excel 報表
   - 匯出 PDF 摘要

### 中期擴展（1-2 個月）
1. **學生個人頁**
   - 點擊學生名稱進入詳細頁面
   - 顯示完整求助歷史
   - 顯示求助成效趨勢圖

2. **教師介入記錄**
   - 記錄教師與學生的溝通內容
   - 追蹤介入後的行為變化

3. **通知系統**
   - 新增高風險案例時通知教師
   - 郵件/推播通知

### 長期研究（3-6 個月）
1. **預測模型**
   - 機器學習預測學生迴避風險
   - 個人化求助提示

2. **對照實驗**
   - A/B 測試不同提示策略
   - 收集實驗數據分析成效

3. **跨專案分析**
   - 學生跨專案求助模式分析
   - 教師跨專案介入效果比較

---

## 📚 參考資源

### 程式碼位置
- 前端組件：`sdl-frontend-main/src/pages/teacher-dashboard/components/`
- 自定義 Hook：`sdl-frontend-main/src/pages/teacher-dashboard/hooks/`
- 後端 API：`sdl-backend-main/controllers/teacherHelpSeekingController.js`

### 文件位置
- 完整實作文件：`docs/backend/HELP_SEEKING_IMPLEMENTATION.md`
- 理論框架文件：`Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md`

### 相關技術
- React Hooks: https://react.dev/reference/react
- Axios: https://axios-http.com/
- Tailwind CSS: https://tailwindcss.com/
- date-fns: https://date-fns.org/

---

## 🎉 實作成果總結

✅ **100% 完成** (8/8 任務)
- ✅ A1: 教師 Help-Seeking 分析 API
- ✅ A2: 教師端 Help-Seeking 儀表板前端 ⭐
- ✅ B1: 求助迴避偵測排程任務
- ✅ B2: 風險分級與預警清單 API
- ✅ B3: 教師端預警清單前端 ⭐
- ✅ C1: help_seeking_log 表結構擴展
- ✅ C2: 求助成效追蹤機制
- ✅ C3: 成效數據整合到分析系統

**檔案統計**:
- 新增前端檔案: 3 個
- 更新前端檔案: 2 個
- 新增後端檔案: 7 個
- 更新後端檔案: 6 個
- 程式碼行數（前端）: ~800 行

**預期效益**:
- 📊 教師可即時掌握學生求助行為模式
- ⚠️ 早期識別求助迴避風險學生
- 📈 追蹤求助成效，優化教學策略
- 🔬 累積研究數據，支援 SRL 理論驗證

---

**文件版本**: 1.0  
**完成日期**: 2026-02-11  
**實作者**: GitHub Copilot (Claude Sonnet 4.5)  
**文件作者**: GitHub Copilot
