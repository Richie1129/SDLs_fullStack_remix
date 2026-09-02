# 效能瓶頸審查報告

> 日期：2026-09-02
> 範圍：後端（Express + Sequelize + Socket.io）、前端（React + Vite）、基礎設施（PostgreSQL、nginx、Docker）
> 方法：唯讀程式碼審查加上生產伺服器 192.168.30.111 的實測數據。**未做負載測試**，因為審查時段是上課時間；`performance/k6/` 已有腳本，建議在離峰時段跑一次取得基準線。
> 資料規模：289 users、151 projects、2455 nodes、2701 tasks、72685 audit_events。課堂情境約 30 到 100 人同時上線，裝置多為 Chromebook。

---

## 一、總覽與優先順序

依「影響程度 × 修復成本」排序。階段一全部是改設定或一行程式的事，一天內可完成，且零資料風險。

| 順序 | 項目 | 層 | 工作量 | 影響 |
|---|---|---|---|---|
| 1 | 關閉生產環境的 Sequelize SQL logging | 後端 | 小 | 每句 SQL 都印到 Docker log，隨流量線性放大 CPU 與磁碟 I/O |
| 2 | 補上 38 個外鍵欄位的索引 | DB | 小 | 看板活動流、聊天室、權限 JOIN 全是 seq scan |
| 3 | 修正 12 處 `Project.update({ id })` 寫入放大 | 後端 | 小 | 每次拖卡片多 2 次查詢加 2 筆 audit；PROJECT_UPDATE 已佔 audit_events 19% |
| 4 | 換掉 6.5 MB 的 logo 圖 | 前端 | 小 | 每個專案頁都載入，30 人同時上課約 195 MB 傳輸 |
| 5 | 移除 Tailwind regex safelist | 前端 | 小 | 612 KB render-blocking CSS，其中約 500 KB 是沒用到的顏色 |
| 6 | nginx 開 gzip 與靜態資源快取 | 基礎設施 | 小 | 區網使用者每次下載未壓縮 JS，無 Cache-Control |
| 7 | PostgreSQL 記憶體參數調整 | 基礎設施 | 小 | 15 GB 機器只用 128 MB shared_buffers |
| 8 | QueryClient 預設 staleTime、關閉 refetchOnWindowFocus | 前端 | 小 | 切分頁回來整頁 query 重打 |
| 9 | 檔案下載改 streaming 或 302 presigned URL | 後端 | 小到中 | 單一使用者下載大檔可打爆 API 記憶體 |
| 10 | Gemini 呼叫加逾時 | 後端 | 小 | 懸掛請求吃光 connection pool，連帶登入與看板一起卡 |
| 11 | useObservationMode 改 Context | 前端 | 中 | 開一個 20 卡看板發 46 次相同請求 |
| 12 | SdlCoachChat 改 React.lazy | 前端 | 小 | Kanban 路由少 738 KB JS |
| 13 | 權限檢查加 TTL 快取 | 後端 | 中 | 每個 socket 事件 2 次 JOIN 查詢 |
| 14 | buildKanbanData 消除 N+1、拖曳改差量廣播 | 後端 | 小到中 | 一次拖曳約 20 次 DB round-trip 加整板廣播 |
| 15 | 無分頁 findAll 加 limit，submits 排除 BLOB 欄位 | 後端 | 中 | 聊天室與 RAG 歷史隨學期線性劣化 |
| 16 | 看板 memo 失效與 deep clone | 前端 | 中 | 搜尋框每敲一鍵全板深拷貝重繪 |
| 17 | 每卡片 socket listener 整併到 board 層 | 前端 | 中 | 20 卡 = 100 個 listener |
| 18 | 教師儀表板 N+1 與 Promise.all 打滿 pool | 後端 | 中 | 一位老師開總覽瞬間 140 個並行查詢 |
| 19 | Help-Seeking 排程 N+1 與 iLike 全表掃描 | 後端 | 中 | 每 6 小時數千次序列查詢，可能撞上上課時段 |
| 20 | usage 清理改單句 UPDATE 加部分索引 | 後端 | 小 | 下課瞬間 100 個 session 逐列 save |
| 21 | 移除未使用的第二個 socketManager 實例 | 前端 | 小 | WiFi 恢復時每人多開一條 socket |
| 22 | AuthImage 加模組層快取 | 前端 | 小到中 | 同一張圖多份 blob 常駐記憶體 |
| 23 | StudentOverview 7N 請求改聚合端點 | 全端 | 中到大 | 8 個專案 = 56 個並行請求 |

---

## 二、基礎設施實測

### 2.1 PostgreSQL

38 個外鍵欄位沒有索引（查詢 pg_constraint 對 pg_index 比對）：

```
ai_task_feedbacks.projectId        idea_walls.projectId              question_messages.questionId
card_tags.tagId                    messages.threadId / userId        questions.projectId / userId
chatroom_messages.projectId/userId node_change_logs.nodeId           rag_messages.project_id / userId
columns.kanbanId                   node_relations.to_id              sdl_coach_messages.userId
comment_attachments.commentId      processes.projectId               stages.processId
comment_likes.userId               project_comment_attachments.commentId  sub_stages.stageId
comments.parentId/taskId/userId    project_comment_likes.userId      submit_change_logs.submitId
daily_teams.userId                 project_comments.parentId/projectId/userId  tags.projectId
help_seeking_avoidance_risks.taskId  task_change_logs.taskId         teacher_analysis_reports.userId
idea_wall_messages.senderId        threads.userId                    user_projects.projectId
```

主要設定全是 Docker 映像預設值：

| 參數 | 目前 | 建議（15 GB 主機，6 核） |
|---|---|---|
| shared_buffers | 128 MB | 3 GB |
| effective_cache_size | 4 GB | 9 GB |
| work_mem | 4 MB | 16 MB |
| maintenance_work_mem | 64 MB | 512 MB |
| random_page_cost | 4 | 1.1（SSD） |

表大小：audit_events 59 MB 為最大，是第二名 task_change_logs（2.2 MB）的 27 倍。

### 2.2 nginx 與靜態資源

前端由 `serve -s` 提供，經 nginx 轉發。區網直打 `/assets/index-*.js` 的回應：無 Content-Encoding、無 Cache-Control、346 KB 原始大小。經 Cloudflare 的外部使用者有 brotli 與 `max-age=14400` 邊緣快取，所以問題只影響校內。`performance/PERFORMANCE_CHECKLIST.md` 已規定 JS/CSS 應為 `max-age=31536000, immutable`，但未實作。

前端 chunk 前八大：SubmitTask 721 KB、cpp 611 KB（shiki 語法檔，由 streamdown 帶入）、cytoscape 432 KB、Reflection 340 KB、index 338 KB、index.es 310 KB、recharts 294 KB、另一 index 257 KB。dist 共約 500 個檔案，大量是 shiki 語法檔與 mermaid 圖表模組。

### 2.3 容器資源（閒置時）

api 76 MB、postgres 150 MB、minio 85 MB、pgAdmin 250 MB、front 28 MB、nginx 7 MB、cloudflared 18 MB。pgAdmin 是最大的記憶體使用者，可改為需要時才啟動。

---

## 三、後端發現

### B1. 生產環境的 Sequelize SQL logging 沒關

`sdl-backend-main/util/database.js` 建立 Sequelize 實例時沒有傳 `logging`，走預設的 `console.log`。`config/database.js` 那個只印慢查詢的 `slowQueryLogger` 只被 sequelize-cli 用（`.sequelizerc` 指向它），與執行期的 API 無關。生產日誌可看到每句 `Executing (default): SELECT ...`。

影響：一次拖卡片約 20 句 SQL，100 人上課時每秒數百到上千行寫進 Docker json-file log，吃 CPU 與磁碟 I/O，stdout 為 pipe 時還有 backpressure 卡 event loop 的風險。

修法：`util/database.js` 加 `logging: process.env.NODE_ENV === 'production' ? false : console.log`，或複用 `slowQueryLogger` 加 `benchmark: true`。compose 的 api 服務加 `logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }`。

### B2. 熱表外鍵沒有索引

`migrations/20250812094349-initial-schema.js` 建了 27 張表，一個 addIndex 都沒有；`20251018000000-add-performance-indexes.js` 只補了 users / projects / daily_personals / tasks / nodes。實際被課堂路徑打到的：

| 表 | 缺索引欄位 | 被誰查 |
|---|---|---|
| task_change_logs | projectId, createdAt | `services/activityService.js` 看板活動流 |
| node_change_logs | projectId, createdAt, nodeId | 同上 |
| chatroom_messages | projectId | `controllers/chatroom.js` |
| columns | kanbanId | `utils/kanbanHelper.js`，每次拖曳 |
| rag_messages | userId, project_id | `controllers/rag_message.js` |
| question_messages | questionId | `controllers/question.js` |
| user_projects | projectId | PermissionGuard 的 Project 與 User JOIN |
| node_relations | to_id | `sockets/handlers/nodeHandler.js` |
| daily_teams | projectId | |
| audit_events | source、(action, timestamp) | `routes/auditClient.js` |

修法：一支 migration，照 `20251018000000` 的寫法用 `concurrently: true` 加 already exists 的 catch，建完跑 ANALYZE。零資料風險。

### B3. Audit hook 寫入放大

兩層疊加。第一，`hooks/registerAuditHooks.js` 的 `resolveProjectIdFromTask` 每次多查 Column 與 Kanban 各一次。第二，socket handler 裡 12 處 `Project.update({ id: projectId }, { where: { id: projectId }, individualHooks: true })`，本意是更新 updatedAt，實際把 id 更新成自己，什麼都沒改，卻因 individualHooks 觸發 SELECT 加 Project afterUpdate hook，多寫一筆 PROJECT_UPDATE audit。

實測：audit_events 依 action 統計，PROJECT_UPDATE 13,800 筆排第一，佔全部 19%。

正確寫法已存在於 `taskHandler.js` 的 `Project.update({ updatedAt: new Date() }, { where: { id: projectId }, transaction: t })`。

修法：12 處機械式替換；`resolveProjectIdFromTask` 改成單句 include JOIN 或直接從 options 傳 projectId；`services/auditService.js` 的 `AuditEvent.create` 改走既有的 aggregateBuffer 批次 flush。

### B4. 每個 socket 事件做 2 次無快取的權限查詢

`auth/PermissionGuard.js` 每次 `User.findByPk` 加 `Project.findByPk` 含 users 的 many-to-many JOIN，15 個受保護事件都走這條。`socketManager.js` 握手時已查過 User 存在 `socket.user`，沒被重用。

修法：TTL 30 到 60 秒的 in-memory Map 快取，key 為 `userId:projectId`，成員變更時 invalidate；User 直接用 `socket.user`。

### B5. 拖曳卡片重建整張看板並廣播全員

`utils/kanbanHelper.js` 的 `buildKanbanData` 在迴圈內逐欄 `Task.findAll`。一次拖曳完整成本約 20 到 23 次 DB round-trip，然後整張看板序列化廣播給房間所有人。

修法：改成一次 `Task.findAll({ where: { columnId: { [Op.in]: columnIds } } })` 在記憶體分組（tasks_columnId_idx 已存在）；拖曳廣播改差量 `{ taskId, fromColumnId, toColumnId, index }`，nodeHandler 的 nodeSync 已是這個做法。

### B6. 檔案下載整個讀進記憶體

`config/minio.js` 的 `downloadFileFromMinio` 把 stream `Buffer.concat` 成單一 Buffer，`routes/file.js` 的 `/direct/` 與 `/image/` 再 `res.send(buffer)`。上傳限制 100 MB。10 人同時下載 50 MB 影片等於 500 MB 常駐加 concat 複製峰值，足以打爆 Node heap 讓整個 API 容器重啟。

修法：改 `response.Body.pipe(res)` 並轉發 ContentLength / ContentType / ETag，`/image/` 加 If-None-Match 回 304；或 `/direct/` 直接 302 導向已存在的 `getPresignedDownloadUrl`，完全繞過 Node。

### B7. Gemini 呼叫沒有逾時

`services/llmGateway.js` 的 `callWithFallback` 只把 timeout 傳給 vLLM，Gemini 分支的 geminiOpts 沒有 timeout，`callGemini` 還會對每把金鑰輪一次。`/api/llm` 與 `/api/sdl-coach` 每分鐘 30 次的 rate limit 下，100 人上課可累積數十條懸掛請求吃光 pool max 20，之後所有 API 一起卡在 acquire 30 秒逾時。

修法：`callGemini` 用 Promise.race 包 timeout，`callWithFallback` 把 timeout 傳進 geminiOpts；檢查 `streamingService.js`、`sdlCoach.js`、`kbCoach.js` 的 SSE 路徑是否也需要 server-side 上限。

### B8. Help-Seeking 排程巢狀 N+1 與 iLike 全表掃描

`services/helpSeekingScheduler.js` 每 6 小時跑 `detectAllActiveProjectsAvoidanceRisks`：所有進行中專案 → 每個成員 → 3 支分析函式各打多次 DB，全部序列 await。底層 `Task.findAll` 用 `owner ILIKE '%userId%'`，前置萬用字元讓索引失效，而且 owner 存的是名稱不是 id，語意本身有問題。首次執行在啟動後 5 分鐘，上課時重啟服務必撞。

修法：批次並行加 setImmediate 讓步；整專案 tasks 一次撈出分組；owner 比對改精確等值；排程避開上課時段。

### B9. 持續成長的表上無分頁 findAll

139 處 findAll 只有 1 處帶 limit。實際會被課堂打到的：

| 位置 | 問題 |
|---|---|
| `controllers/chatroom.js` | 整個專案聊天史，無 limit，projectId 無索引 |
| `controllers/user.js` | GET /api/users 無條件回傳全部使用者 |
| `controllers/rag_message.js` | 該使用者所有 RAG 對話，跨專案 |
| `controllers/submit.js` 與 `projectController.js` | 沒指定 attributes，會撈出 submits.fileData BLOB 欄位 |
| `controllers/comments.js`、`projectComments.js` | 三層 include 無 limit |
| `services/dailyService.js` | 老師視角撈全班所有反思 |
| `controllers/usage.js` | 每次 summary 撈全部 session 在 JS 重算 |

修法：message 類加 limit 50 加 cursor 分頁；submits 明確 attributes 排除 fileData（`teacherOverviewController.js` 已是正確範例）；GET /api/users 加篩選；usage 改 SQL 聚合。

### B10. 教師儀表板 N+1 與 Promise.all 打滿 pool

`controllers/teacherOverviewController.js` 對每個專案並行 3 支查詢加 `getProjectActivities`（本身 4 支，其中 2 支掃無索引的 change_logs），每專案約 7 次。`teacherHelpSeekingController.js` 對每個學生 findOne。一位老師 20 個專案 = 瞬間 140 個並行查詢排隊，這段期間全班學生的 API 都在等 pool。

修法：跨專案 `WHERE projectId IN (...) GROUP BY` 聚合；findOne 改一次 findAll 建 Map；短期止血用每批 4 個的分批並行。

### B11. usage 清理每 60 秒無上限 findAll 加逐列 save

`services/usageCleanupService.js` 每分鐘 `UsageSession.findAll` 掃 stale session 再逐筆 save。唯一索引 (userId, projectId) 用不上。下課瞬間 100 個 session 同時 stale，剛好卡在下一堂課開始。

修法：部分索引 `usage_sessions(endedAt, lastActiveAt) WHERE endedAt IS NULL`，迴圈換成單句 UPDATE，或至少 limit 200 分批。

### B12. PostgreSQL 預設參數與 pool 20

見 2.1。`docker-compose.prod.yml` 與 `deploy/docker-compose.server.yml` 的 postgres 沒有任何 command 調參。修法：

```yaml
command: >
  postgres -c shared_buffers=3GB -c effective_cache_size=9GB
           -c work_mem=16MB -c maintenance_work_mem=512MB
           -c max_connections=100 -c random_page_cost=1.1
```

pool 先維持 20，等 B3、B4、B5 把每次操作的查詢數壓下來再評估。

---

## 四、前端發現

### F1. TopBar 的 logo 是 6.5 MB PNG，顯示高度 56 px

`components/TopBar.jsx` 兩處 `<img src="/SDLS_LOGO_GEMINI.png" className="h-14 w-auto" />`。`public/SDLS_LOGO_GEMINI.png` 6,525 KB。同目錄 `SDLS_Logo_2.png` 851 KB、`飛行.png` 799 KB。`Login.jsx` 的 `NCU_logo.jpg` 226 KB 顯示 20 px。

修法：logo 重新輸出成 2x 顯示尺寸的 WebP（約 15 到 30 KB），校徽輸出 40 px WebP，加 width/height 屬性避免 CLS。

### F2. Tailwind regex safelist 產生 612 KB CSS

`tailwind.config.cjs` 的 `safelist: [{ pattern: /(bg|text|top|left)-./ }]` 讓建構結果含 13,790 條規則，`bg-lime-`、`bg-fuchsia-`、`text-violet-` 各 242 條，專案根本沒用。CSS 是 render-blocking，每頁都要先解析。

修法：grep 出所有樣板字串拼類名的地方改成靜態對照表，刪掉 safelist；保守做法先縮成具體清單。預期 CSS 掉到 60 到 100 KB。

### F3. useObservationMode 在每張卡片各發 2 支未快取請求

`hooks/useObservationMode.js` 用原生 axios 呼叫 `getProjectUser` 與 `getProject`，不經 React Query。呼叫端 6 處，含 `CarditemRefactored.jsx` 每張卡片一次。20 張卡片的看板 = 46 次請求同時打同兩個端點；30 人同時開看板約 1,400 次。

修法：提升成 ObservationProvider 放在 ProjectLayout，內部用 useQuery，hook 改成只讀 context。

### F4. Kanban 路由靜態載入 738 KB 的 Streamdown

依賴鏈 `Kanban.jsx` → `DraggableImage` → `ChatContent` → `SdlCoachChat` → `MessageContent.jsx` 的 `import { Streamdown } from 'streamdown'`，帶入 mermaid、shiki、katex、cytoscape。各路由 JS 傳遞閉包：Kanban 2,023 KB、IdeaWall 1,533 KB（vis-network 685 KB）、HomePage 543 KB、Login 432 KB。`vite.config.js` 沒有 manualChunks。

修法：SdlCoachChat 與 AITaskAssistantModal 改 React.lazy 加 Suspense；MessageContent 目前只用 GFM 與程式碼區塊，可改用已安裝的 react-markdown 加 remark-gfm（88 KB）；vite.config 加 manualChunks 拆出穩定 vendor chunk。

### F5. QueryClient 沒有預設值，切分頁就整頁重打

`main.jsx` 的 `new QueryClient()` 走 react-query v3 預設：staleTime 0、refetchOnWindowFocus true、retry 3。36 個 useQuery 只有 13 處設 staleTime。另有 4 支 query key 沒帶 projectId 造成跨專案快取污染：`TopBar.jsx` 與 `CarditemRefactored.jsx` 的 `"getProjectUser"`、`SubStageBar.jsx` 的 `"getProject"`、`useTeamDaily.js` 的 `["teamDaily"]`。

修法：`defaultOptions.queries` 設 `staleTime: 60_000, refetchOnWindowFocus: false, retry: 1`；4 支 key 補上 projectId。需跑一輪回歸確認沒有頁面依賴切回自動更新。

### F6. React.memo 被新物件 prop 破壞，每次輸入都 deep clone 整個看板

`KanbanColumn.jsx` 每次 render 對 Carditem 傳 `data={{ ...item, isOptimistic }}` 新物件，全專案唯一的 memo 失效。`useKanbanView.js` 用 `JSON.parse(JSON.stringify(kanbanData))` 深拷貝，deps 含 viewConfig，而 `Kanban.jsx` 搜尋框每敲一鍵就更新 viewConfig。`useCardData.js` effect deps 是整個 initialData 物件。

修法：拿掉深拷貝改淺拷貝；搜尋框 debounce 200 到 300 ms；isOptimistic 移進 Carditem 由 id 推導；useCardData deps 改具體欄位。

### F7. 每張卡片各自註冊 5 個 socket listener

`useCardSocket.js` 每張卡片註冊 taskItem、activityUpdate、cardUpdated、taskDeleted、taskDeleteError，各自 invalidateQueries；`useKanbanData.js` 在 board 層又註冊一次。20 張卡 = 100 個 listener。清理邏輯正確，問題是架構。

修法：整併到 useKanbanData，board 層一組 listener，用 payload 的 taskId 做局部 setQueryData。

### F8. 未使用的第二個 socketManager 實例

`services/socketManager.js` 模組載入即實例化並監聽 window online 自動連線。唯一 import 它的 `SocketStatusIndicator.jsx` 從未被 render，但經 `ErrorBoundary/index.js` barrel 被 ProjectLayout 載入。WiFi 恢復時每個學生多開一條沒人用的 socket；connect_error 每次重試各發一次無節流的 `/api/errors`。

修法：移除 barrel 的 re-export；若要保留改 lazy 實例化；errorReportingService 加節流去重。

### F9. AuthImage 每次掛載都 XHR 抓 blob，無前端快取

`AuthImage.jsx` 用 `apiClient.get(path, { responseType: 'blob' })` 建 Object URL，縮圖與詳情 Modal 各解碼一份。後端有 `Cache-Control: public, max-age=3600`，但 public 用在需 token 的圖片經 Cloudflare 有共享快取風險。

修法：模組層 `Map<src, Promise<objectUrl>>` 含引用計數；根本做法是後端發 presigned URL 讓瀏覽器原生快取，Cache-Control 改 private。

### F10. StudentOverview 一次送 7N 個未快取請求

`pages/overview/StudentOverview.jsx` 對每個專案並行 6 支加 getNodes 共 7 支，且 `semester: 'all'` 抓所有學期。8 個專案 = 56 個並行請求。`ManagementOverview.jsx` 與 `useTeacherData.js` 同型。

修法：短期改只抓目前學期並搬進 useQuery 加 staleTime 5 分鐘；長期後端加聚合端點。

### 定時器總表

專案沒有任何 refetchInterval 或遞迴 setTimeout 輪詢。

| 位置 | 頻率 | 作用 |
|---|---|---|
| `providers/TrackingProvider.jsx` | 5 秒 | POST /audit/batch，有批次（滿 20 筆或 5 秒），佇列空不送，設計正確 |
| `useUsageSession.js` | 75 秒 | POST /usage/heartbeat，僅 student-dashboard，合理 |
| `SocketStatusIndicator.jsx` | 5 秒 | 本地 setState，該元件從未被 render |
| `AgentInsightsPanel.jsx` | 1 秒 | 本地冷卻倒數，deps 每 tick 重建 interval，建議改 ref |
| `SubStageBar.jsx` | 50 毫秒 | 打字機效果，每字元一次 render |
| `ideaWall/Timer.jsx` | 1 秒 | 本地倒數 |
| `DraggableImage/useUIState.js` | 10 秒 | 本地 setState |

真正的請求尖峰來自三個事件驅動來源：refetchOnWindowFocus（F5）、元件掛載的 2N 與 7N 請求（F3、F10）、socket 事件觸發整份 kanbanDatas invalidate（F7）。

---

## 五、建議執行順序

### 階段一：一天內，零資料風險

1. B1 關 SQL logging，compose 加 log rotation。
2. B2 索引 migration（38 個外鍵欄位加 audit_events 的 (action, timestamp)、usage_sessions 部分索引）。
3. B3 替換 12 處 `Project.update({ id })`。
4. F1 換 logo 與校徽圖。
5. F2 移除 regex safelist。
6. nginx 加 gzip 與 `/assets/` 的 `expires 1y` 加 `Cache-Control: public, immutable`。
7. B12 PostgreSQL 參數，並把 `postgres:latest` 釘成 `postgres:17`。
8. F5 QueryClient 預設值加 4 支 bare key。
9. F12 SdlCoachChat 與 AITaskAssistantModal 改 lazy。
10. F8 移除 socketManager barrel export。

做完後在離峰時段用 `performance/k6/load-test.js` 跑一次，建立基準線。

### 階段二：一週

B6 下載 streaming 或 presigned 302、B7 Gemini 逾時、B5 buildKanbanData 消除 N+1、B9 的 submits 排除 BLOB 與 message 類分頁、B11 usage 清理、F3 ObservationProvider、F6 看板 memo 與 deep clone、F9 AuthImage 快取。

### 階段三：視回饋排程

B4 權限快取、B5 差量廣播（需動前端）、B8 Help-Seeking 排程重構、B10 教師儀表板聚合、F4 換掉 Streamdown 加 manualChunks、F7 socket listener 整併、F10 聚合端點。

階段三尚未排程的項目待決定後登錄至 `future-list.md`。

---

## 六、備註

- 本報告所有程式碼引用皆經實際讀取，audit action 分布與索引缺失皆為伺服器實測。
- 上傳路徑（`minioUploadMiddleware.js`）已正確使用 diskStorage 與 stream，不在問題清單內。
- TrackingProvider 的批次設計正確，不需要改。
- 相關文件：`performance/PERFORMANCE_CHECKLIST.md`（驗收標準）、`docs/proposals/BACKUP_AND_STORAGE_PLAN.md`（備份與檔案儲存方案）。
