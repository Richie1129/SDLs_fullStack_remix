# 改良版 Idea Improver 實作計畫 (MVP)

> **目標：** 實作基於「影子中控 (Shadow Orchestrator)」架構的 IdeaWall 討論系統。將聊天、知識節點與 AI 介入解耦，建立堅固的資料結構。

## Phase 1: 後端核心 (Backend Core) - 資料結構優先
*(Talk is cheap, show me the data structure.)*

- [x] **1.1 建立 Model: `IdeaWallMessage`**
    - [x] 檔案路徑: `sdl-backend-main/models/idea_wall_message.js`
    - [x] Schema 定義:
        - `content`: TEXT (Not Null)
        - `senderId`: INTEGER (FK -> Users)
        - `ideaWallId`: INTEGER (FK -> IdeaWalls) - **關鍵：定義訊息屬於哪個空間**
        - `relatedNodeId`: INTEGER (FK -> Nodes, Nullable) - **關鍵：定義訊息屬於哪個上下文**
        - `isAiIntervention`: BOOLEAN (Default: false) - **關鍵：區分人類與 AI**
    - [x] 設定關聯 (Associations): 在 `models/index.js` 中設定 `IdeaWall` hasMany `IdeaWallMessage`。

- [x] **1.2 API 實作: 訊息 CRUD**
    - [x] Controller: `sdl-backend-main/controllers/ideaWallMessage.js`
    - [x] `POST /api/ideawall/:wallId/messages`: 
        - 接收 `content`, `relatedNodeId` (可選)。
        - 寫入 DB 後，**必須** 觸發 Socket 事件。
    - [x] `GET /api/ideawall/:wallId/messages`: 
        - 支援 Query Param `?nodeId=xxx`。
        - 若無 `nodeId`，回傳該牆面所有訊息。

- [x] **1.3 Socket.io 事件定義**
    - [x] 定義事件名稱: `EVENT_IDEA_WALL_MSG`。
    - [x] 確保 Payload 結構包含 `relatedNodeId`，以便前端過濾。

## Phase 2: 前端整合 (Frontend Integration) - 視圖實作
*(Never break userspace. UI 必須直覺。)*

- [x] **2.1 UI 元件: `IdeaWallChatPanel`**
    - [x] 位置: `sdl-frontend-main/src/components/IdeaWall/`
    - [x] 實作右側滑出式抽屜 (Drawer Style)。
    - [x] 觸發按鈕: 右側邊緣垂直長條按鈕 (Vertical Trigger)，避免遮擋 FAB。
    - [x] 支援 **「全域模式」** (顯示該牆所有訊息)。
    - [x] 支援 **「節點模式」** (當使用者點擊 Node 時，只顯示該 Node 的相關討論)。

- [x] **2.2 狀態管理與 API 串接**
    - [x] 實作 `useIdeaWallChat` hook。
    - [x] 監聽 Socket 事件，即時更新訊息列表。
    - [x] 處理「點擊節點」事件，切換聊天室的篩選狀態 (Filter)。

## Phase 3: 影子中控 (The Shadow Orchestrator) - 邏輯層
*(Good Taste: 邏輯與 I/O 分離)*

- [x] **3.1 建立 Orchestrator Service**
    - [x] 檔案: `sdl-backend-main/services/orchestrator.js`
    - [x] 機制: 訂閱 `IdeaWallMessage` 的建立事件 (使用 Sequelize Hooks 或 Event Emitter)。

- [x] **3.2 實作「死規則」過濾器 (The Gatekeeper)**
    - [x] 實作 `shouldIntervene(wallId)` 函數。
    - [x] **規則 1 (冷卻):** 檢查該牆面最後一次 AI 介入時間 (例如 10 分鐘內不介入)。
    - [x] **規則 2 (累積):** 檢查自上次介入後的新訊息數量 (例如 < 5 則不介入)。
    - [x] *MVP 驗證:* 先只做 `console.log('Orchestrator Triggered')`，確認觸發邏輯正確。

## Phase 4: AI 大腦接入 (The Brain) - 賦予靈魂
*(最後才做這個，因為這是最不可控的部分)*

- [x] **4.1 整合 LLM Service**
    - [x] 實作 `analyzeContext(messages)`: 呼叫輕量模型 (gpt-4o-mini) 判斷意圖 (Conflict/Question/Social)。
    - [x] 實作 `generateIntervention(context)`: 呼叫強力模型 (gpt-4o) 生成引導語。
    - [x] **Fallback 機制:** 優先使用 `gemini-3.1-flash-lite-preview`，失敗時降級至 `gpt-5-nano` (模擬) / `gpt-4o-mini`。

- [x] **4.2 自動介入實作**
    - [x] 當 Orchestrator 決定介入時，呼叫 `IdeaWallMessage.create()`。
    - [x] 設定 `senderId` 為系統機器人 ID (目前暫定為 1)。
    - [x] 設定 `isAiIntervention = true`。

## Phase 5: 驗證與測試 (Verification)

- [x] **5.1 單元測試**
    - [x] 測試 `shouldIntervene` 邏輯是否正確阻擋頻繁請求。
- [x] **5.2 整合測試**
    - [x] 模擬使用者 A 和 B 對話，驗證 AI 是否在滿足條件後自動插入訊息。
    - [x] 驗證 LLM Service 的 Fallback 機制與錯誤處理。
