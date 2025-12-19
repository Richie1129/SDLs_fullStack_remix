# SDL 階段感知看板實作計畫 (SDL Phase-Aware Kanban Implementation Plan)

## 第一階段：前端核心與 UI (Frontend Core & UI) - *優先執行以進行視覺驗證*
- [ ] **配置檔 (Config)**: 建立 `sdl-frontend-main/src/config/kanbanTemplates.js`，定義每個階段的欄位結構與預設卡片。
- [ ] **類型定義 (Type Definition)**: 更新前端模型/類型，在 `Column` 介面中加入 `phase` (如果使用 TS，否則請記在心裡)。
- [ ] **Hook 更新 (`useKanbanView`)**:
    - 新增 `currentPhase` 狀態 (源自 `project.currentStage` 或本地狀態)。
    - 實作 `filterColumnsByPhase(columns, phase)` 邏輯。
    - 實作 `Master View` 邏輯 (按階段分組)。
    - *臨時方案*：在後端未就緒前，暫時在前端 mock 欄位的 `phase` 屬性以供測試。
- [ ] **UI 實作 (Components)**:
    - **階段導航 (Phase Navigator)**: 在 `Kanban.jsx` 中建立 `PhaseTabs` 元件，以便手動切換階段 (或顯示當前階段)。
    - **全局視圖切換 (Master View Toggle)**: 新增按鈕以切換 `viewConfig.mode` 至 `ALL_PHASES`。
    - **欄位渲染 (Column Rendering)**: 更新 `KanbanColumn` 以支援「範例卡片」(視覺區隔)。

## 第二階段：後端基礎 (Backend Foundation)
- [ ] **資料庫遷移 (DB Migration)**: 建立遷移腳本，在 PostgreSQL 的 `columns` 表中新增 `phase` 欄位。
    - 類型: `ENUM` 或 `STRING` (值: 'GOAL_SETTING', 'STRATEGY', 'MONITORING', 'REGULATION')。
    - 預設值: 'MONITORING' (以支援現有專案)。
- [ ] **模型更新 (Model Update)**: 更新 `sdl-backend-main/models/column.js` 以包含 `phase` 欄位。
- [ ] **控制器更新 (Controller Update)**: 更新 `sdl-backend-main/controllers/kanban.js` 中的 `getKanban` 以選取 `phase` 屬性。
- [ ] **初始化邏輯 (Initialization Logic)**: 更新專案建立邏輯 (可能在 `project.js` 或 `kanban.js` 控制器中)，在建立專案時根據模版生成 *所有 4 個階段* 的欄位。

## 第三階段：整合與測試 (Integration & Testing)
- [ ] **遷移腳本**: 撰寫腳本將資料庫中現有欄位的 `phase` 設為 'MONITORING'。
- [ ] **驗證**: 檢查切換階段時，欄位是否正確更新且無需重新載入頁面。
- [ ] **驗證**: 檢查「全局視圖」是否正確將所有欄位分組顯示。
