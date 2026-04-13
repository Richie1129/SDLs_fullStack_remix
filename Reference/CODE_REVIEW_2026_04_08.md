# 全專案 Code Review 報告

**審查日期：** 2026-04-08  
**審查範圍：** 35 個後端控制器、7 個 Socket 處理器、292 個前端原始碼檔案、所有中間件與路由  
**審查觸發原因：** 修復 `createSubmit` 競態條件後，全面排查是否有類似問題  
**修復原則：** 任何修復不能影響現有資料（已寫入 CLAUDE.md）

---

## 狀態圖例

- [ ] 未開始
- [x] 已修復

---

## CRITICAL（必須立即修復）

### C1: 看板拖曳 — 無 Transaction 的 Read-Modify-Write

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/taskHandler.js:366-475`
- **問題：** `handleTaskDrag` 讀取兩個 Column 的 task 陣列，在 JS 中操作後分別寫回，無 Transaction 無鎖定
- **影響場景：** 兩人同時拖卡片 → 第二次寫入覆蓋第一次 → 卡片從欄位消失或重複出現
- **建議修復：** 包在單一 Transaction 中，對兩個 Column row 做 `SELECT FOR UPDATE`，或改用 SQL 原子陣列操作（`array_remove` / `array_append`）
- **資料風險：** 高 — 會直接丟失卡片在欄位中的參照

---

### C2: 建立任務 — Column 陣列非原子更新

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/taskHandler.js:85-97`
- **問題：** `Task.create` 後讀取 Column、在 JS 中 append 新 ID、`column.save()`，全部無 Transaction
- **影響場景：** 兩人同時在同一欄位建卡片 → 兩次都讀到 `[1,2,3]` → A 存 `[1,2,3,4]`、B 存 `[1,2,3,5]` → 卡片 4 從欄位消失
- **建議修復：** 同 C1，Transaction + Row Lock 或原子陣列操作
- **資料風險：** 高 — Task 記錄存在但從 Column.task 陣列中消失（孤兒）

---

### C3: 刪除欄位 — 三步操作無 Transaction

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/columnHandler.js:197-308`
- **問題：** (1) 更新 Kanban.column 陣列 → (2) 刪除 Tasks → (3) 刪除 Column，三步無 Transaction
- **影響場景：** 步驟 1 成功但步驟 3 失敗 → Kanban 陣列已移除該欄位但 Column/Task 仍在 DB
- **建議修復：** 包在單一 Transaction 中
- **資料風險：** 高 — 資料不一致

---

### C4: Task.update 直接 spread 客戶端資料

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/taskHandler.js:171-174`
- **問題：** `Task.update({ ...cardData, ... })` 直接展開客戶端送來的整個物件
- **影響場景：** 惡意用戶送 `cardData: { id: 5, columnId: 999, createdAt: "..." }` → 可覆寫任何 Task 欄位
- **建議修復：** 改為白名單：`{ title: cardData.title, content: cardData.content, labels: cardData.labels, ... }`
- **資料風險：** 高 — 可直接篡改資料

---

### C5: 訊息處理器無專案權限檢查

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/messageHandler.js` 全部事件
- **問題：** `send_message`、`join_room`、`join_project` 等全部用 `registerSimpleEvent`，無權限驗證
- **影響場景：** 任何登入用戶可加入任意專案聊天室、發送/讀取其他專案的訊息
- **建議修復：** 改用 `registerProtectedEvent` 並加入 `'read'`/`'write'` 權限
- **資料風險：** 中 — 資料洩漏但不破壞

---

### C6: 公告發送無角色檢查

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/announcementHandler.js:13-19`
- **問題：** `emitAnnouncement` 用 `registerSimpleEvent`，任何登入用戶都能發
- **影響場景：** 學生可發送假公告給所有連線用戶，且會存入 DB
- **建議修復：** 加角色檢查 `if (socket.user.role !== 'teacher') return;` 或用 `registerProtectedEvent`
- **資料風險：** 中 — 會寫入假資料

---

### C7: RAG 對話路由完全無認證

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/routes/rag_message.js` 所有路由（8 個端點）
- **問題：** 所有端點缺少 `validateToken` 中間件
- **受影響端點：**
  - `GET /api/rag_message/test/:userId` — 測試端點暴露在生產
  - `GET /api/rag_message/history/:userId` — 完整對話歷史
  - `GET /api/rag_message/sessions/:userId` — 所有 session
  - `DELETE /api/rag_message/session/:userId/:sessionId` — 刪除 session
  - `POST /api/rag_message/create-session` — 建立 session
  - `POST /api/rag_message/generate-title/:sessionId` — 產生標題
- **影響場景：** 未登入者可讀取/刪除任何用戶的 AI 對話記錄
- **建議修復：** 所有路由加 `validateToken`，並驗證 `req.userId === req.params.userId` 防 IDOR
- **資料風險：** 高 — 可刪除他人資料

---

### C8: Socket catch 區塊 `socket.user` ReferenceError

- **狀態：** [x] 已修復
- **檔案：** `taskHandler.js`、`columnHandler.js`、`nodeHandler.js`、`messageHandler.js`、`announcementHandler.js` 的所有 catch 區塊
- **問題：** catch 中使用 `socket.user` 但 `socket` 未在 handler 方法的作用域中定義，handler 透過 `handler.call(baseHandler, data)` 調用，`this` 是 baseHandler，應使用 `this.socket.user`
- **影響場景：** 任何 Socket handler 報錯 → catch 本身拋出 `ReferenceError: socket is not defined` → 原始錯誤被遮蔽，用戶收到靜默失敗
- **建議修復：** 全域搜尋替換 catch 中的 `socket.user` → `this.socket.user`
- **資料風險：** 低（不影響資料，但影響錯誤追蹤）

---

### C9: ChatBotRoom 送出訊息後未清空 input + 訊息重複

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/components/ChatBotRoom.jsx:13-24, 30-44`
- **問題：** `sendMessage` 後未呼叫 `setCurrentMessage("")`；同時本地樂觀新增 + Socket 回傳再新增 = 訊息出現兩次
- **影響場景：** 用戶每按 Enter 重送同一訊息，每條訊息出現兩次
- **建議修復：** 送出後清空 input，並做訊息去重（比對 ID 或時間戳）
- **資料風險：** 中 — DB 中會有重複訊息記錄

---

### C10: AskQuestion Socket listener 捕獲 stale closure

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/AskQuestion/AskQuestion.jsx:85-98`
- **問題：**
  1. `refreshMessages` 中的 `chats` 是 effect 建立時的快照，後續更新不會反映
  2. 切換聊天室時未離開舊房間（沒有 `leave_QuestionRoom`）
  3. `socket.off` 未指定具名 handler
- **影響場景：** 切換聊天室後，舊 listener 用過期的 `chats` 資料處理新訊息
- **建議修復：** 用 ref 追蹤 `chats`、離開舊房間、使用具名 handler
- **資料風險：** 低 — 顯示層問題

---

## HIGH（應盡快修復）

### H1: getUser 回傳密碼 hash

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/user.js:53-65`
- **問題：** `User.findByPk(userId)` 未指定 `attributes`，回傳包含 bcrypt password hash
- **建議修復：** 加 `attributes: { exclude: ['password'] }`

---

### H2: getUsers 回傳所有用戶 PII

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/user.js:19-29`
- **問題：** 任何登入用戶可取得所有人的 email、班級、座號等
- **建議修復：** 限制為 teacher/admin 角色，或限制回傳欄位

---

### H3: Refresh Token 未做 Rotation

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/auth.js:12-76`
- **問題：** 使用 refresh token 取得新 access token 後，舊 refresh token 仍然有效
- **建議修復：** 每次刷新時銷毀舊 token 並發新 token

---

### H4: 檔案刪除無所有權驗證

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/routes/file.js:147, 192`
- **問題：** `DELETE /api/file/:fileName` 只要認證通過就能刪任何檔案
- **建議修復：** 驗證檔案所有權（上傳者或專案成員）

---

### H5: 專案邀請 TOCTOU

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/project/projectMemberController.js:8-83`
- **問題：** 先查是否已加入 → 再加入，無 Transaction，兩個請求可能都通過檢查
- **建議修復：** 用 `findOrCreate` + unique constraint，或 Transaction + Lock

---

### H6: 按讚 Toggle TOCTOU

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/comments.js:167-208`、`controllers/projectComments.js:213-233`
- **問題：** 查有無讚 → 建立或刪除，無 Transaction。快速雙擊建立兩個讚記錄
- **建議修復：** `findOrCreate` + unique constraint on `(commentId, userId)`

---

### H7: 改名非原子操作

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/user.js:288-383`
- **問題：** `User.update` 在 Transaction 外，`Task.update` + `Node.update` 在 Transaction 內。前者成功後者失敗 → 名稱不一致
- **建議修復：** 全部放在同一個 Transaction 中

---

### H8: updateSubmit 的 findByPk 在 Transaction 外

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/submit.js:337-440`
- **問題：** `Submit.findByPk(submitId)` 無 `{ transaction: t }` 和 lock
- **建議修復：** 移入 Transaction 並加 `lock: t.LOCK.UPDATE`

---

### H9: 密碼重設無 Transaction

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/passwordReset.js:162-245`
- **問題：** 讀取 token → 驗證 → 改密碼 → 銷毀 token，全部分開操作
- **建議修復：** 包在 Transaction 中，`SELECT FOR UPDATE` 鎖定 reset token

---

### H10: SubStageBar Socket cleanup 被註解

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/components/SubStageBar.jsx:204-215`
- **問題：** `socket.off('refreshKanban', handleRefreshKanban)` 被註解掉 → 頁面切換累積重複 listener
- **建議修復：** 取消註解該行

---

### H11: useKanbanData 樂觀更新讀取 stale kanbanData

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/Kanban/hooks/useKanbanData.js:208-452`
- **問題：** `addCard`、`addColumn`、`deleteColumn`、`moveCard` 從 closure 讀取 `kanbanData` 而非用 functional updater
- **建議修復：** 改用 `setKanbanData(prev => ...)` functional updater 模式

---

### H12: ProtectedRoute 邏輯錯誤 + 無 Token 過期檢查

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/utils/ProtectedRoute.jsx:6-18`
- **問題：** `!auth ? A : auth ? B : C` 三元邏輯中 C 不可達；且只檢查 token 是否存在，不檢查是否過期
- **建議修復：** 修正三元邏輯，加入 token 過期時間檢查

---

### H13: 刪除任務 — Column 陣列 + Task.destroy 無 Transaction

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/taskHandler.js:304-315`
- **問題：** Column 陣列更新和 Task.destroy 分開操作
- **建議修復：** 包在 Transaction 中

---

### H14: broadcastToProject 信任客戶端 projectId

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/socketHandlers.js:22` 及多處 handler
- **問題：** 權限檢查用客戶端提供的 projectId，但實際操作的資源（Task、Column）可能屬於其他專案
- **建議修復：** 操作後驗證資源確實屬於聲稱的 projectId

---

### H15: `parseInt(data.creator) || 1` 預設 userId

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/messageHandler.js:138`
- **問題：** 缺失 creator 時預設為 userId=1，訊息被歸屬給管理員
- **建議修復：** 使用 `this.socket.userId`

---

## MEDIUM

### M1: 聊天室/提問路由無專案權限檢查

- **狀態：** [x] 已修復
- **檔案：** `routes/question.js`、`routes/chatroom.js`
- **修復方式：** 為含 `projectId` 的路由加上 `checkProjectViewingPermission` 中間件

---

### M2: 多個 controller `.catch(err => console.log(err))` 不回 response

- **狀態：** [x] 已修復
- **檔案：** `controllers/chatroom.js`、`controllers/question.js`、`controllers/ideaWall.js`
- **修復方式：** 改為 try-catch 並回 `res.status(500).json({ message: '...' })`

---

### M3: 刪除專案先刪 MinIO 檔案再做 DB Transaction

- **狀態：** [x] 已修復
- **檔案：** `controllers/project/projectController.js`
- **修復方式：** 先收集檔案名稱，DB Transaction commit 後再刪 MinIO 檔案

---

### M4: Portfolio react-query key 缺 projectId

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/protfolio/Protfolio.jsx`
- **修復方式：** query key 改為 `["protfolioDatas", projectId]`

---

### M5: ChatRoom 訊息重複（樂觀 + Socket 回傳）

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/components/ChatRoom.jsx`
- **修復方式：** receive_message handler 中以 message+author+createdAt 去重

---

### M6: useAssistantChat SSE stream 無 AbortController

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/hooks/useAssistantChat.js`
- **修復方式：** 加 AbortController ref，新訊息時 abort 前一次請求，unmount 時 cleanup

---

### M7: useAnnouncementSocket listener 頻繁重綁

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/hooks/useAnnouncementSocket.js`
- **修復方式：** 用 useRef 追蹤 selectedAnnouncement，從 deps 中移除

---

### M8: useIdeaWallChat 離開頁面未離開房間

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/hooks/useIdeaWallChat.js`
- **修復方式：** 取消註解 `socket.emit('leave_ideawall', ideaWallId)`

---

### M9: ReflectionRefactored 階段資訊非響應式

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/reflection/ReflectionRefactored.jsx`
- **修復方式：** 取代 `getStageInfo()` 為 `useStageManager()` hook

---

### M10: MIME type 驗證依賴客戶端 header

- **狀態：** [x] 已修復（2026-04-13）
- **檔案：** `sdl-backend-main/middlewares/minioUploadMiddleware.js`
- **問題：** `fileFilter` 僅比對 multer 傳入的 `file.mimetype`，而該值來自客戶端 `Content-Type` header，攻擊者可將 `.exe` 宣告為 `application/pdf` 繞過白名單
- **修復內容：**
  1. 新增依賴 `file-type@16.5.4`（CJS 相容的最後一版）於 `sdl-backend-main/package.json`
  2. 實作 `verifyFileMagicBytes(file)` helper：以 `FileType.fromFile(path)` 讀取檔頭 magic bytes 偵測真實 MIME，對照白名單
  3. 將 `allowedTypes` 提升為模組級常數，`fileFilter` 與 magic bytes 驗證共用
  4. `uploadToMinio` / `uploadSingleToMinio` 於檔案寫入磁碟後、上傳 MinIO 前，逐檔呼叫 `verifyFileMagicBytes`；任一驗證失敗立即清理全部暫存檔並回 400
  5. 以 `verifiedMime`（偵測結果）取代 `file.mimetype` 傳給 `uploadFileToMinio` 與回傳結構，確保 MinIO object metadata 與 DB 紀錄皆以真實 MIME 為準
  6. 新增 `MIME_ALIASES`（`application/x-zip-compressed` ↔ `application/zip` 等）處理 client/file-type 別名差異
  7. 新增 `TEXT_MIME_TYPES` 白名單（`text/plain`、`text/csv`）——這類檔案無 magic bytes 可偵測，屬低風險類型，允許直接信任 client header（即使內容被篡改，瀏覽器以 text 開啟不會執行）
- **端到端驗證：**
  - Case 1（宣告 PDF、內容為 PNG）：接受，mime 被覆寫為 `image/png` ✓
  - Case 2（宣告 PNG、內容為 .exe）：拒絕 `application/x-msdownload` ✓
  - Case 3（純文字 `text/plain`）：接受 ✓
- **資料風險：** 無 —— 僅影響新上傳驗證邏輯，既有 DB 紀錄與 MinIO 物件不變
- **Docker 注意事項：** `package.json` 新增依賴，需重新 `docker compose -f docker-compose.dev.yml up --build`
- **類似問題檢查：**
  - `sdl-backend-main` 全專案只有此一個 `multer` 上傳入口（`grep require('multer')` 僅命中這一檔），無其他需同步的上傳點
  - downstream 消費者 `controllers/submit.js`、`controllers/comments.js`、`controllers/projectComments.js` 只是把 `mimeType` 寫入 DB，無任何業務邏輯依賴 client-declared 值，切換為 detected MIME 不會引發相容性問題

---

### M11: projectViewingMiddleware debug log 洩漏敏感資訊

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/middlewares/projectViewingMiddleware.js`
- **修復方式：** 移除大量 console.log，僅保留 development 環境下的精簡 debug 資訊

---

### M12: 多處錯誤回應含 `error.message`

- **狀態：** [x] 部分修復
- **檔案：** `projectViewingMiddleware.js`、`announcement.js`、`ideaWall.js`
- **修復方式：** 移除 error.message/error.stack 暴露。其餘 controllers 待後續批次處理

---

### M13: adminResetPassword 不驗證師生關係

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/user.js`
- **修復方式：** 新增教師與學生的專案成員關係或 mentor 關係驗證

---

### M14: CORS 缺少 PATCH method

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/config/index.js`
- **修復方式：** methods 陣列加入 `'PATCH'`

---

### M15: 多處前端直接用 localStorage 繞過 storageService

- **狀態：** [ ] 未修復
- **檔案：** `AskQuestion.jsx`、`useNodeOperations.js`、`Profile.jsx`、`IdeaWall.jsx` 等
- **建議修復：** 統一改用 `storageService` / `authStorage`

---

### M16: broadcastToProject 重複送給 sender

- **狀態：** [x] 已修復（先前批次）
- **檔案：** `sdl-backend-main/sockets/socketHandlers.js`
- **修復方式：** 移除多餘的 `this.socket.emit`，統一使用 `io.to(projectId).emit()`

---

## LOW

### L1: error.stack 洩漏到客戶端

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/controllers/announcement.js:98`

---

### L2: startSession TOCTOU 可建重複 session

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/controllers/usage.js:21-73`

---

### L3: `/api/daily_file` 靜態目錄無認證

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/server.js:162`

---

### L4: 多頁面缺 ErrorBoundary

- **狀態：** [x] 已修復（2026-04-13）
- **檔案：** IdeaWall、Reflection、AskQuestion、Portfolio、Submit 頁面
- **問題：** 這 5 個頁面未被任何 ErrorBoundary 包覆，一旦渲染錯誤會直接觸發 RootLayout 的 `GlobalErrorBoundary`，整個應用（含 SideBar/TopBar）變成全螢幕錯誤 UI
- **修復內容：**
  1. 新增 `sdl-frontend-main/src/components/ErrorBoundary/PageErrorBoundary.jsx` — 頁面級錯誤邊界，採用 inline 錯誤 UI（保留 SideBar/TopBar/SubStageBar），提供「重試」與「重新載入頁面」兩個復原路徑
  2. 於 `sdl-frontend-main/src/components/ErrorBoundary/index.js` 導出
  3. 於 `sdl-frontend-main/src/layouts/ProjectLayout.jsx` 在 `<Outlet />` 外包一層 `<PageErrorBoundary key={location.pathname}>` —— 一處修復覆蓋所有專案子頁面；`key` 讓路徑切換時自動重置錯誤狀態
- **設計決策：**
  - 在 Layout 層統一包覆，而非每個頁面個別加，避免重複並確保未來新增頁面自動受保護
  - Kanban 的 `KanbanErrorBoundary`、TeacherDashboard 的 `DashboardErrorBoundary` 仍保留，形成「內層細粒度 → 外層兜底」分層
  - 採用設計系統語意 token（`text-h3`、`p-component-md-lg`、`customgreen`、`duration-normal`），圖示用 `react-icons/fi`
- **類似問題檢查：**
  - 頂層路由 `homepage`、`bulletin`、`List`、`observation`、`profile` 等同樣只有 RootLayout 的 `GlobalErrorBoundary` 作兜底，但不在本條 code review 範圍內，未擴大修改（可考慮後續追加為獨立條目）
  - `overView` / `student-overview` / `teacher-overview` / `teacherDashboard` / `studentDashboard` 內部已使用 `DashboardErrorBoundary`；Kanban 有 `KanbanErrorBoundary`，無需額外處理

---

### L5: Refresh Token 明文儲存於 DB

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/controllers/user.js:167`
- **建議修復：** 改存 SHA-256 hash

---

### L6: Rate limiter 在非 production 完全跳過

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/routes/passwordReset.js:16`、`server.js:74`
- **建議修復：** 只在 `NODE_ENV === 'test'` 時跳過

---

---

# 第二輪審查：商業邏輯、快取一致性、前後端資料對齊

**審查日期：** 2026-04-08（第二輪）  
**審查原因：** 第一輪未涵蓋商業邏輯錯誤、快取一致性、前後端資料格式對齊等面向

---

## CRITICAL

### R2-C1: 進度計算有 4 套互相矛盾的實作

- **狀態：** [x] 已修復
- **檔案：**
  - `sdl-frontend-main/src/pages/teacher-dashboard/utils.js:4-14` — 用 5 階段模型，除數 2
  - `sdl-frontend-main/src/pages/student-dashboard/utils.jsx:66-81` — 用 4 階段模型，除數 3（正確）
  - `sdl-frontend-main/src/pages/overview/utils/overviewUtils.jsx:21-33` — 用錯誤的子階段數 `[3,4,5,3]`
  - `sdl-frontend-main/src/pages/overview/ManagementOverview.jsx:100-106` — 用舊 5 階段/17 子階段模型
- **問題：** 同一個專案在不同頁面顯示不同進度百分比
- **具體範例：** 專案在 stage 3-1 時：教師儀表板 40%、學生儀表板 50%、Overview 47%、ManagementOverview 53%
- **建議修復：** 統一為一個 shared utility，使用 4 階段模型（student-dashboard 的版本）
- **資料風險：** 無（純顯示層）

---

### R2-C2: `inviteForProject` 未清除 apiCache

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/project/projectMemberController.js:58`
- **問題：** 學生透過邀請碼加入專案後，未清除 `apiCache`
- **影響：** 加入的學生在專案列表中看不到新專案，最長需等 30 秒
- **建議修復：** 加 `apiCache.delByPrefix('projects:${userId}')`

---

### R2-C3: `assignStudentsToGroup` 未清除 apiCache

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/project/projectMemberController.js:109`
- **問題：** 教師批次分配學生到專案後，所有被分配學生的快取未清除
- **影響：** 所有被分配的學生在 30 秒內看不到新專案
- **建議修復：** 加 `apiCache.delByPrefix('projects:')`

---

## HIGH

### R2-H1: `overviewUtils.jsx` 子階段數錯誤 `[3,4,5,3]`

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/overview/utils/overviewUtils.jsx:23`
- **問題：** 應為 `[3,3,3,3]`，stage 2 不是 4 個子階段、stage 3 不是 5 個
- **影響：** Overview 頁面的進度百分比全部算錯

---

### R2-H2: `ManagementOverview.jsx` 用舊 5 階段模型

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/overview/ManagementOverview.jsx:100-106`
- **問題：** 用 `/17*100` 計算（5 階段共 17 子階段），應為 4 階段 12 子階段
- **影響：** 完成所有階段（4-3）只顯示 70.6% 而非 100%
- **附帶問題：** 第 143-144 行用 `<75` 和 `>75` 篩選，恰好 75% 的專案哪個列表都不出現

---

### R2-H3: `teacher-dashboard/utils.js` 用錯誤除數

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/teacher-dashboard/utils.js:4-14`
- **問題：** 用舊 5 階段公式：`(stage-1)*20` + `(sub-1)/2*20`
- **影響：** 完成所有階段只顯示 80% 而非 100%

---

### R2-H4: `createSubmit` 在 commit 前就清除 assistant cache

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/submit.js:213-215`
- **問題：** `invalidateProjectCache(pId)` 在 `t.commit()` 之前呼叫。若 commit 失敗則快取已被無效化；若並發請求在兩者之間重建快取，會快取到舊資料持續 5 分鐘
- **建議修復：** 移到 `await t.commit()` 之後

---

### R2-H5: `createSubmit` 未清除 apiCache（專案列表）

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/submit.js`
- **問題：** 提交後 `Project.update` 改了 `currentStage`/`currentSubStage`，但未清除 `apiCache`
- **影響：** 學生提交後回到儀表板，進度指標 30 秒內仍顯示舊階段
- **建議修復：** commit 後加 `apiCache.delByPrefix('projects:')`

---

### R2-H6: Socket `taskItem` 事件廣播的是 Sequelize update 回傳值而非實際資料

- **狀態：** [x] 已修復
- **檔案：**
  - 後端：`sdl-backend-main/sockets/handlers/taskHandler.js:212`
  - 前端：`sdl-frontend-main/src/pages/Kanban/hooks/useKanbanData.js:161`
- **問題：** `Task.update()` 回傳 `[affectedCount]`（如 `[1]`），不是更新後的 Task 物件
- **影響：** 前端目前用 `invalidateQueries` 繞過（重新拉取），但 payload 是無意義的 `[1]`

---

### R2-H7: Socket `nodeUpdated` 事件同樣廣播 update 回傳值

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/nodeHandler.js:213`
- **問題：** 同 R2-H6，`Node.update()` 回傳 `[1]` 而非節點資料

---

## MEDIUM

### R2-M1: Idea_wall title 存的是 Sub_stage 的 DB ID 而非名稱

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/submit.js`
- **修復方式：** 引入 Sub_stage model，用 `findByPk` 查詢名稱後設定為 title

---

### R2-M2: Node handler 未清除 assistantCache

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/sockets/handlers/nodeHandler.js`
- **修復方式：** 在 create/update/delete 後呼叫 `invalidateProjectCache(projectId)`

---

### R2-M3: `updateSubmit` / `deleteSubmit` 未清除 assistant cache

- **狀態：** [x] 已修復
- **檔案：** `sdl-backend-main/controllers/submit.js`
- **修復方式：** updateSubmit 在 commit 後、deleteSubmit 在 destroy 後呼叫 `invalidateProjectCache`

---

### R2-M4: SubStageBar useEffect 依賴陣列錯誤

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/components/SubStageBar.jsx`
- **修復方式：** 依賴改為 `[currentStageIndex, currentSubStageIndex]`

---

### R2-M5: `useProjectData.js` 專案篩選在 75%-99% 有缺口

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/home/hooks/useProjectData.js`
- **修復方式：** "進行中" 改為 `!isProjectEnded(project) && !isPortfolioCompleted(project)`

---

### R2-M6: Portfolio title 插入基於位置而非實際階段

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/protfolio/Protfolio.jsx`
- **修復方式：** 改為按 `item.stage` 欄位的主階段值分組，先排序再以 lastMainStage 追蹤變化

---

### R2-M7: Socket error event 命名不一致

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/Kanban/hooks/useKanbanData.js`
- **修復方式：** 移除 `ColumnCreatedError` 和 `ColumnDeleteError` PascalCase 監聽

---

### R2-M8: `ManagementOverview` 未做學期篩選

- **狀態：** [x] 已修復
- **檔案：** `sdl-frontend-main/src/pages/overview/ManagementOverview.jsx`
- **修復方式：** 引入 `getCurrentSemester()`，查詢時帶入 semester 參數，query key 也加入 semester

---

## LOW

### R2-L1: `stageGoal` 陣列存取無邊界檢查

- **狀態：** [ ] 未修復
- **檔案：** `sdl-frontend-main/src/components/SubStageBar.jsx:112-118`
- **問題：** `currentStage` 或 `currentSubStage` 為 0/undefined 時會 TypeError

---

### R2-L2: `adminResetPassword` 未清 `me:` cache

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/controllers/user.js:526`
- **影響：** 極小，`passwordResetAt` 不在快取欄位中

---

### R2-L3: `updateCardItem` / `deleteCardItem` API 函式呼叫不存在的路由

- **狀態：** [ ] 未修復
- **檔案：** `sdl-frontend-main/src/api/kanban.js:36-43`
- **問題：** 後端 PUT/DELETE `/api/kanbans` 路由已被註解，這些是 dead code

---

### R2-L4: `refreshKanban` 廣播給所有 socket 而非專案房間

- **狀態：** [ ] 未修復
- **檔案：** `sdl-backend-main/sockets/handlers/taskHandler.js:481-484`
- **問題：** `this.socket.broadcast.emit` 廣播給所有連線，不只相關專案

---

---

## 修復優先排序（整合兩輪審查）

### 第一批：影響資料完整性（最高優先）

| Issue | 修復成本 | 說明 |
|-------|---------|------|
| C1-C3, H13 | 高 | 看板 Task/Column 陣列操作全部需要 Transaction + Row Lock |
| C8 | 低 | 全域搜尋替換 `socket.user` → `this.socket.user` |
| C4 | 低 | Task.update 改白名單欄位 |
| R2-M1 | 低 | Idea_wall title 查 Sub_stage name 而非存 ID |

### 第二批：安全漏洞

| Issue | 修復成本 | 說明 |
|-------|---------|------|
| C7 | 低 | RAG 路由加 `validateToken` + IDOR 保護 |
| H1 | 低 | getUser 加 `attributes: { exclude: ['password'] }` |
| C5-C6 | 中 | Socket 訊息/公告改 `registerProtectedEvent` |
| H4 | 中 | 檔案刪除加所有權驗證 |

### 第三批：商業邏輯統一

| Issue | 修復成本 | 說明 |
|-------|---------|------|
| R2-C1 | 中 | 統一 4 套 `calculateProgress` 為 shared utility |
| R2-H1-H3 | 低 | 修正 overviewUtils、ManagementOverview、teacher-dashboard 的公式 |
| R2-M5 | 低 | 修正專案篩選 75%-99% 缺口 |
| R2-M6 | 中 | Portfolio 改用 stage 欄位分組而非位置 |

### 第四批：快取一致性

| Issue | 修復成本 | 說明 |
|-------|---------|------|
| R2-C2-C3 | 低 | inviteForProject / assignStudents 加 apiCache 清除 |
| R2-H4-H5 | 低 | createSubmit 移動 invalidate 到 commit 後 + 清 apiCache |
| R2-M2-M3 | 低 | nodeHandler / updateSubmit / deleteSubmit 清 assistant cache |

### 第五批：前端穩定性

| Issue | 修復成本 | 說明 |
|-------|---------|------|
| C9 | 低 | ChatBotRoom 清空 input + 去重 |
| H10 | 低 | 取消註解 socket.off |
| M4 | 低 | query key 加 projectId |
| H11 | 中 | useKanbanData 改 functional updater |
| R2-M4 | 低 | SubStageBar useEffect 依賴修正 |

### 第六批：其餘改善

逐步處理剩餘 MEDIUM/LOW 問題。

---

---

# 第三輪補充：H4 修復引入的 Regression

**發現日期：** 2026-04-13  
**發現方式：** 使用者在 Kanban 卡片嘗試刪除附件時拿到 403 Forbidden（`DELETE /api/file/:fileName`）

---

## HIGH

### R3-H1: `verifyFileOwnership` 對 Task.files/images 的查詢永遠找不到（H4 regression）

- **狀態：** [x] 已修復（2026-04-13）
- **檔案：** `sdl-backend-main/routes/file.js:155-208` — `verifyFileOwnership`
- **引入 commit：** `5e679a8`（H4: 檔案刪除加所有權驗證）
- **症狀：** 非教師使用者刪除 Kanban 卡片附件時，後端穩定回 `403 無權刪除此檔案`。前端 log：
  ```
  AxiosError: Request failed with status code 403
  at useFileManagement.js:168 (apiClient.delete(`/file/${fileName}`))
  ```
- **根因：**
  1. **`Task.files` 是 `jsonb[]`，不是 `jsonb`。** 原寫法 `{ files: { [Op.contains]: [{ fileName }] } }` 產生的 SQL 是 `files @> ARRAY['{"fileName":"xxx"}']::jsonb[]`，對 `jsonb[]` 而言 `@>` 要求「**陣列元素完全相等**」而非 JSON 子集包含。實際儲存的元素結構是 `{"url":..., "size":..., "fileName":..., "mimeType":..., "originalName":...}`，因此永遠比不到。
  2. **`Task.images` 欄位存的是完整 URL 路徑**（如 `/api/file/image/xxx.jpg`），但查詢用純 fileName 做 `text[] @>` 字串相等比對，也永遠比不到。
  3. 兩條路徑全部比空後，`verifyFileOwnership` 回落到最後一行 `return userRole === 'teacher'` —— 孤立檔案僅教師可刪，學生/一般使用者一律 403。
- **DB 驗證：**
  ```sql
  -- 原查詢（永遠回空）
  SELECT id FROM tasks WHERE files @> ARRAY['{"fileName":"1766...pdf"}']::jsonb[];
  -- (0 rows)

  -- 正確查詢（命中）
  SELECT id FROM tasks WHERE EXISTS (
      SELECT 1 FROM unnest(files) f WHERE f->>'fileName' = '1766...pdf'
  );
  -- (1 row)
  ```
- **修復內容：**
  1. 移除 Sequelize ORM 的 `Op.contains` 寫法（型別誤判的 trap）
  2. 改用原生 SQL + `unnest`：
     ```sql
     SELECT k."projectId"
     FROM tasks t
     LEFT JOIN columns c ON c.id = t."columnId"
     LEFT JOIN kanbans k ON k.id = c."kanbanId"
     WHERE EXISTS (
         SELECT 1 FROM unnest(t.files) AS f WHERE f->>'fileName' = :fileName
     )
     OR EXISTS (
         SELECT 1 FROM unnest(t.images) AS img
         WHERE img = :fileName OR img LIKE :fileNameSuffix
     )
     LIMIT 1
     ```
     `fileNameSuffix = '%/' || fileName`，兼容 `images` 存完整 URL 與歷史純 fileName 兩種情況
  3. 直接 JOIN `tasks → columns → kanbans` 一次取到 `projectId`，避免 Sequelize include 的樣板代碼
  4. 清理不再使用的 import：`Task`、`Column`、`Kanban`、`Op`
- **端到端驗證：**
  - 對既有資料實測 `files` 路徑（PDF 附件）：正確回傳 `projectId: 1` ✓
  - 對既有資料實測 `images` 路徑（JPG 圖片）：正確回傳 `projectId: 1` ✓
  - nodemon 熱重載無錯誤
- **影響範圍：**
  - `DELETE /api/file/:fileName` 與 `POST /api/file/batch-delete` 共用同一個 `verifyFileOwnership`，兩個端點同時修復
  - 純讀取邏輯修正，不影響現有 DB 資料
- **教訓：**
  - `DataTypes.ARRAY(DataTypes.JSONB)` 對映到 Postgres `jsonb[]`，與單一 `jsonb` 欄位的 `@>` 語義**完全不同**。前者是陣列元素相等、後者是 JSON 子集包含。Sequelize 的 `Op.contains` 對兩者寫法相同但行為不同，是個容易誤踩的 trap
  - 寫 ownership 檢查務必對真實資料做端到端測試，不能只單元測 ORM 層
  - 與 CLAUDE.md「實作後的自我審查 → 假設是否已驗證」呼應：當初 H4 修復時沒對實際 `jsonb[]` 資料實測，假設 Sequelize 的 `contains` 能直接用

---

## 附註

- 第一輪由 4 個平行 Agent 審查（後端控制器、Socket 處理器、前端狀態管理、認證/安全）
- 第二輪由 3 個平行 Agent 補充審查（快取一致性、商業邏輯正確性、前後端資料對齊）
- 已於 2026-04-08 修復的問題：`controllers/submit.js` 的 `createSubmit` 競態條件（commit `cba53ea`）
- 已於 2026-04-08 修復的問題：`utils/semesterUtils.js` 第 2 學期學年度計算 + 專案列表快取清除（commit `9a806f6`）
- 於 2026-04-13 補上第三輪：R3-H1 — H4 修復引入的 `verifyFileOwnership` Sequelize `jsonb[]` containment 誤用
- 所有修復必須遵循 CLAUDE.md「修復與重構的最高原則」：不能影響現有資料
