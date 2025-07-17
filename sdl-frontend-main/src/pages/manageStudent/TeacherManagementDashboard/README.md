# TeacherManagementDashboard 組件架構

本目錄包含了重構後的 TeacherManagementDashboard 組件，已從單一的大型檔案（約2000行）拆分成模組化的結構。

## 目錄結構

```
TeacherManagementDashboard/
├── index.jsx                     # 主要的教師儀表板組件
├── utils.js                      # 共用的輔助函式
├── components/                   # UI 子組件
│   ├── AnalyticsView.jsx         # 數據分析檢視組件
│   ├── AllStudentsView.jsx       # 所有學生檢視組件
│   ├── GroupsView.jsx            # 小組檢視組件
│   ├── IndividualView.jsx        # 個人檢視組件
│   ├── OverviewView.jsx          # 總覽檢視組件
│   ├── StatsCards.jsx            # 統計卡片組件
│   └── ViewModeButtons.jsx       # 檢視模式切換按鈕組件
└── hooks/                        # 自定義 Hooks
    ├── useTeacherDashboardData.js # 教師儀表板數據獲取 Hook
    └── useTeacherMetrics.js       # 教師指標計算 Hook
```

## 組件職責

### 主組件 (index.jsx)
- 整合所有子組件和 Hooks
- 管理路由參數和檢視模式狀態
- 處理用戶角色判斷
- 統一的載入狀態處理

### 自定義 Hooks

#### useTeacherDashboardData.js
- 負責從多個 API 端點獲取教師儀表板所需的所有數據
- 處理資料載入狀態和錯誤處理
- 整合想法牆、看板任務、學生資料、反思記錄等
- 自動重試機制和錯誤恢復

#### useTeacherMetrics.js
- 計算增強的學生資料和學習指標
- 處理學生狀態分類（優秀、活躍、需關注、不活躍）
- 生成小組資料和協作分析
- 計算班級統計數據

### UI 組件

每個 UI 組件都專注於單一的檢視職責：

#### ViewModeButtons.jsx
- 教師檢視模式切換按鈕（總覽、所有學生、小組檢視、個人檢視、數據分析）
- 響應式設計和狀態高亮

#### StatsCards.jsx
- 顯示關鍵統計指標的卡片組件
- 包含學生數量、平均進度、反思記錄、想法節點等統計

#### OverviewView.jsx
- 班級概況總覽
- 學習進度分佈圖表
- 最近活動時間軸
- 整體活動統計

#### AllStudentsView.jsx
- 所有學生的詳細列表檢視
- 桌面版表格和移動版卡片雙重佈局
- 學生狀態篩選和排序功能
- 快速導航到個人詳情

#### GroupsView.jsx
- 小組選擇和詳細分析
- 小組協作分數計算
- 成員個人進度和貢獻度分析
- 團隊統計數據

#### IndividualView.jsx
- 個別學生的詳細學習歷程
- 學習活躍度和創作表現分析
- 學習建議和狀態評估
- 近期學習軌跡時間軸

#### AnalyticsView.jsx
- 綜合數據分析和統計圖表
- 學生活動排行榜
- 想法牆統計和創作者排行
- 看板任務統計和進度分析

### 輔助函式 (utils.js)
- `calculateProgress`: 計算專案階段進度百分比
- `formatRelativeTime`: 格式化相對時間顯示
- `getStatusColor`: 取得學生狀態對應的顏色樣式
- `getActivityColor`: 取得活動類型顏色
- `generateStudentActivityStats`: 生成學生活動統計
- `calculateCreatorStats`: 計算創作者統計數據

## 重構優勢

1. **可維護性**: 從2000行巨型檔案拆分為15個專業模組，每個檔案職責單一
2. **可複用性**: 組件和 Hooks 可在其他教師管理頁面復用
3. **測試友好**: 小型組件便於進行單元測試和整合測試
4. **程式碼可讀性**: 不再需要在巨型檔案中尋找特定功能
5. **團隊協作**: 多人可同時修改不同的組件，減少合併衝突
6. **效能優化**: 按需載入組件，提升應用響應速度
7. **擴展性**: 新增檢視模式或功能時可輕鬆加入新組件

## API 整合

重構後的組件整合了以下 API 端點：
- 看板系統 (kanban)
- 想法牆節點 (nodes, ideaWall)
- 用戶管理 (users)
- 反思記錄 (reflection)
- 聊天室 (chatroom, question)
- 作業提交 (submit)
- 專案管理 (project)

## 數據處理特色

- **多階段數據獲取**: 自動嘗試多種 stage 格式獲取想法牆數據
- **錯誤恢復機制**: API 調用失敗時的優雅降級處理
- **即時數據同步**: 支援實時數據更新和狀態同步
- **智慧數據關聯**: 自動建立學生活動與各模組數據的關聯

## 使用方式

其他檔案引用時，路徑保持不變：

```javascript
import TeacherManagementDashboard from './pages/manageStudent/TeacherManagementDashboard';
```

因為 `index.jsx` 會被自動識別為目錄的入口檔案。

## 備份

原始的大型檔案已備份為 `TeacherManagementDashboard.jsx.backup`，如需回滾可以參考。

## 技術特色

- **響應式設計**: 完整支援桌面和移動設備
- **無障礙設計**: 符合 WCAG 標準的鍵盤導航和螢幕閱讀器支援
- **效能優化**: 使用 useMemo 和 useCallback 優化重渲染
- **型別安全**: 完整的 PropTypes 定義和資料驗證
