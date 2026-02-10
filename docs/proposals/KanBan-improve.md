# 看板改進計畫 (Linus 之道)

這份文件追蹤看板 (Kanban) 的重構與改進過程。
**目標：** 將數據與視圖解耦，引入靈活的 View Model，並確保過程零破壞。

## 第一階段：架構重構 (基礎)
- [x] **步驟 1.1：提取數據邏輯 (`useKanbanData`)**
    - 將 `useQuery`、`socket` 監聽器和樂觀更新 (Optimistic Update) 邏輯移出 `Kanban.jsx`。
    - 建立 `src/pages/Kanban/hooks/useKanbanData.js`。
    - **目標：** `Kanban.jsx` 不應知道 `socket` 或 `fetch` 的存在。它只應接收 `data` 和 `actions`。
- [x] **步驟 1.2：實作視圖模型 (`useKanbanView`)**
    - 建立 `src/pages/Kanban/hooks/useKanbanView.js`。
    - 實作數據標準化 (將後端陣列轉換為查找表)。
    - 實作 `transformData(data, viewConfig)` 以動態生成渲染列表。
    - **目標：** 支援 `groupBy` (例如：按狀態、按負責人) 而無需更改後端結構。

## 第二階段：組件拆解與整合
- [x] **步驟 2.1：重構 `Kanban.jsx` 以使用 Hooks**
    - 用 `useKanbanData` 和 `useKanbanView` 替換原本 900 行的邏輯。
    - 確保現有功能 (拖放、新增卡片、刪除) 運作如常。
- [x] **步驟 2.2：UI 組件化**
    - 將列表渲染邏輯提取為 `KanbanColumn` 組件。
    - 確保 `KanbanColumn` 和 `Carditem` 是接收 Props 的純組件 (Pure Components)。

## 第三階段：彈性功能 (好品味)
- [x] **步驟 3.1：新增視圖控制**
    - 新增 UI 以更改 `viewConfig` (例如：按成員過濾、切換緊湊模式)。
- [x] **步驟 3.2：實作動態分組**
    - 允許在「狀態視圖」(預設) 和「負責人視圖」(誰在做什麼) 之間切換。

---

## 進度日誌
- **[Date]**: 計畫建立。
- **[Date]**: 完成第一階段與步驟 2.1。
- **[Date]**: 完成第二階段 (組件拆解)。
- **[Date]**: 完成第三階段 (彈性視圖與動態分組)。
