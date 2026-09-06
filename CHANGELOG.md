# 📝 更新日誌 (Changelog)

本文件記錄 SDL 全端學習平台的所有版本迭代內容。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

---

## [未發布] - 2026-09-05 — 教師存取範圍收斂為自己指導的專案

### 🔒 安全強化

- **教師不再對所有專案放行**（`middlewares/projectAccess.js`，future-list F021）
  - 專案存取判定只認成員、`project.mentorId` 指向自己的指導教師、admin 與跨班觀摩者；教師對非自己指導的專案與學生一樣拒絕
  - 專案修改／刪除／觀摩設定、檔案讀取與刪除、公告、問答室、KB Coach 紀錄與回饋統計、求助統計、稽核事件歸屬與查詢全部沿用同一判定；只有 admin 保有跨專案的全域範圍
  - 新增 `requireProjectMentor` 中介層，教師端 AI 班級分析與 Orchestrator 手動觸發只允許該專案的指導教師或 admin
  - 依指導老師名稱列專案／列學期：老師本人以自己的 id 查（username 不唯一，不再以名稱反查）、admin 可指定任一老師、其他人只回自己也是成員的專案
  - 批次觀摩設定只認呼叫者本人為指導教師，admin 才可指名他人
  - 公告建立／刪除／socket 廣播限自己指導範圍（專案公告限該專案，個人公告限所屬學生）；公告權限中介層的角色改查資料庫
  - 專案列表的 `userId` 參數只有 admin 可指定他人；專案成員清單（單筆／批次）只回呼叫者能存取的專案
- **資料**：生產環境唯一缺 `mentorId` 的專案（第 26 號）已補為實際指導教師，151 個專案全部有指導教師

### ⚠️ 行為變更

- 教師只看得到自己指導（`mentorId`）的專案；公告總覽只剩全站公告、自己指導專案的公告、自己與所屬學生的個人公告
- 解析不到來源的孤立檔案只剩 admin 可讀可刪；剛上傳尚未掛到專案的檔案，非本人只有 admin 或指導該上傳者的教師可讀

### 🧪 測試

- 後端新增 `teacherScope` 回歸測試（36 案例）；既有 `projectAccess`、`fileAccess`、`idorAuthorization`、`securityMedium` 的教師斷言同步更新（合計 250 案例全數通過）

---

## [未發布] - 2026-09-03 — 資安加固：授權補強與 XSS 修復

### 🔒 安全強化

- **檔案存取加上擁有權檢查**（`utils/fileAccess.js`、`routes/file.js`）
  - 圖片、下載、HEAD 一律先確認呼叫者是檔案擁有者、所屬專案成員／指導教師／教師／管理員或跨班觀摩者
  - 反思日誌與小組日誌的附件納入來源解析，作品集下載不受影響
  - 移除免認證的預簽名下載端點；刪除檔案改為角色查資料庫、評論附件不再無條件放行
  - 新增 `file_uploads` 表記錄上傳者，卡片附件在按下儲存前仍可由上傳者預覽與移除；五張表的 `fileName` 補上索引（migration 可回滾）
- **專案存取判定共用化**（`middlewares/projectAccess.js`）
  - 成員／指導教師／角色／觀摩者的判定集中一處，`taskId → projectId` 的解析合併為單一實作
- **多條讀取端點補上授權**：公告改為需登入且只回傳呼叫者可見範圍、問答室僅本人／教師／指導教師可讀可刪、發言者身分由資料庫角色推導、KB Coach 紀錄與 AI 任務助理求助紀錄限專案相關人員
- **教師端點角色改查資料庫**：學生名單、教師重設學生密碼、使用者列表欄位裁切不再採信 JWT 內的角色
- **RAGFlow 代理加固**（`routes/ragflowProxy.js`、`config/index.js`）
  - chatId 與 sessionId 只接受英數、底線與連字號，阻擋拼進上游 URL 的路徑穿越
  - 生產環境一律驗證對外連線憑證，`SSL_VERIFY=false` 只在非生產環境生效
- **容器改以非 root 執行**（`sdl-backend-main/Dockerfile.prod`、`docker-entrypoint.sh`、`sdl-frontend-main/Dockerfile.prod`）
  - 後端啟動時由 entrypoint 修正宿主機掛載的 logs 目錄擁有者後降權為 node；migration 與 seed 的臨時容器同樣走這條路
  - 前端 serve 以 node 使用者執行
- **相依套件弱點清理**（`npm audit --omit=dev`）
  - 後端由 4 個 Critical、22 個 High 降為 0；bcrypt 升至 6（改用內附預建二進位，脫離 node-pre-gyp 與 tar）、jsondiffpatch 升至 0.7、nodemailer 升至 10
  - 前端由 3 個 Critical、15 個 High 降為 0；移除未使用的 swiper，html2pdf.js 升至 0.14（jspdf 4）
- **移除未使用的使用者查詢端點**，避免以帳號 id 列舉全校名單
- **前端 XSS 修復**（`utils/htmlEscape.js`、`utils/tempPasswordDialog.js`、`utils/formatAnalysisResult.js`）
  - 重設密碼結果對話框改為共用元件，使用者名稱一律跳脫、複製按鈕不再把密碼放進 inline 事件
  - 5Rs 反思的 AI 分析結果每個欄位跳脫後才渲染

### ⚠️ 行為變更

- 學生在總覽頁只會看到全站公告、自己所屬專案的公告與自己的個人公告；教師與管理員不受影響

### 🧪 測試

- 後端新增 `projectAccess`、`fileAccess`、`idorAuthorization`、`ragflowProxy` 四組回歸測試（83 案例）；前端新增跳脫、對話框與分析結果格式化測試（13 案例）

---

## [v3.6.1] - 2026-04-10 — 5Rs 漸進式反思重構、觀摩評論修復與佈局優化

### 🔄 重構

- **5Rs 漸進式反思系統**（`llm_5R.js`、`FiveRsReflectionForm.jsx`、`5RsUtils.js`）
  - 反思表單改為漸進式引導，依學生填寫程度動態解鎖下一層次
  - 後端 AI 分析新增分層評估邏輯，根據填寫層次給予對應回饋
  - 前端反思顯示元件精簡，移除冗餘邏輯
  - 📄 [設計提案](docs/proposals/5RS_PROGRESSIVE_REFLECTION.md)

- **SubmitTask 寫作提示面板**（`SubmitTask.jsx`、`GuidancePanel.jsx`）
  - 收合狀態提升至父元件管理，GuidancePanel 精簡為純展示元件
  - 面板收合時自動調整輸入區域佈局

### 🔴 Bug 修復

- **觀摩模式無法評論卡片**（`CommentSection.jsx`）
  - 移除評論輸入框的 `isObservationMode` 條件限制，觀摩者可發表評論
  - 編輯/刪除按鈕維持原有權限控制（僅留言者本人可操作）

- **觀摩專案列表為空**（`projectViewingController.js`、`projectViewingMiddleware.js`）
  - 放寬 `school_id` 同校檢查：雙方皆無 `school_id` 時跳過比對
  - Controller 與 Middleware 篩選邏輯同步修正

### 🎨 樣式修復

- **5Rs 反思 Modal 滾動問題**（`FiveRsModal.jsx`、`PersonalDailyModal.jsx`）
  - 修正多處響應式佈局與 Modal 內容溢出問題
- **反思相關元件配色與間距調整**（`LogCard.jsx`、`AuditHistoryPanel.jsx`、`StageReflectionGuide.jsx`、`DailyFormFields.jsx`）

---

## [v3.6.0] - 2026-04-09 — 安全全面加固、想法牆即時協作優化與學習歷程 AI 回饋

### 🟣 新功能

- **學習歷程 AI 寫作回饋**（`portfolioAiController.js`）
  - SSE 串流回饋端點，提供學生歷程文字改善建議
  - 敘事草稿自動儲存與載入機制（`user_projects.narrativeDraft` 欄位）
  - 前端學習歷程頁面整合回饋面板與草稿管理

- **任務截止日期**（`CardDetailModal.jsx`）
  - Task model 新增 `dueDate` 欄位，看板卡片支援設定截止日與逾期標示
  - 移除未成熟的甘特圖視圖（GanttView、useGanttData、gantt-task-react 依賴）

- **AI 使用透明度說明**
  - Login 頁面 footer 加入 AI 說明
  - HomePage 常駐「AI 輔助中」浮動提示（可展開說明）
  - 5Rs 反思表單加入 AI 分析提示
  - 教師「需要關注」清單加入 AI 排序邏輯 tooltip

### 🔄 重構

- **想法牆 Optimistic Update**（`IdeaWall.jsx`、`useIdeaWallSocket.js`）
  - 實作 Optimistic Update + Self-Echo 過濾 + DataSet 差量更新
  - 修復 tempId→realId 替換時節點位置跳動
  - 修復 update/delete error 未觸發 rollback

- **mentor 外鍵修正**（`projects` 表）
  - `mentor` 從 username 字串改為 `mentorId` INTEGER 外鍵
  - 所有權限比對（11 處，5 個檔案）改用 mentorId === user.id
  - 防止教師改名後指導關聯靜默斷裂

- **vLLM 模型升級**：Gemma-3-27B → Gemma-4-26B (vllm-193)
- **KB Coach 模型優先順序**：調整為 Gemma-4 → GPT-OSS → Gemini

### 🔒 安全修復

- **19 項 CRITICAL 漏洞修復**
  - 看板拖曳/建立/刪除加入 Transaction + Row Lock（一致 lock ordering 防 deadlock）
  - Task.update 改白名單欄位防止覆寫任意欄位
  - 訊息 handler 加專案權限檢查、公告 handler 加教師角色檢查
  - RAG 路由加 validateToken + IDOR 保護
  - 統一 5 處 calculateProgress 為 `stageUtils.js` 共用版本
  - ChatBotRoom 送出後清空 input + 訊息去重

- **17 項 HIGH 級別修復**
  - getUsers 依角色限制回傳欄位（學生無法取得 email 等 PII）
  - Refresh Token Rotation（每次刷新銷毀舊 token 發新 token）
  - 檔案刪除加所有權驗證（Submit/Task/Comment 歸屬檢查）
  - 專案邀請/按讚改用 findOrCreate 防 TOCTOU 競態
  - 改名/密碼重設全部包在 Transaction + row lock
  - RAG 訊息 userId 改用 socket 認證值取代預設 1

- **額外安全加固**
  - 教師重設密碼新增師生關係驗證
  - 移除錯誤回應中的 `error.message` 避免洩漏內部資訊
  - 清理 projectViewingMiddleware 過量 debug logs

### 🔴 Bug 修復

- **檔案上傳全面修復**
  - FormData token refresh 重試保護（避免空 body 重送）
  - Multer memoryStorage 改 diskStorage + stream 上傳 MinIO（降低 OOM 風險）
  - 5 個上傳入口統一加入 100MB 驗證（`fileValidation.js`）
  - Axios FormData timeout 從 30 秒延長至 5 分鐘
  - Nginx proxy_read/send_timeout 延長至 300 秒
  - MinIO 移除無效 publicEndpoint，改存 `minio://` 邏輯路徑

- **生產環境關鍵修復**
  - 全域錯誤攔截中間件，自動寫入 `logs/errors/`
  - express-rate-limit IPv6 地址處理錯誤修復
  - Token refresh 併發 race condition（queue 機制）
  - 註冊流程缺少 refreshToken + localStorage namespace 不一致
  - Socket.IO 重連使用過期 token（新增 refresh + mutex）
  - 註冊改用 transaction 確保 User + RefreshToken 原子寫入

- **其他修復**
  - Token Refresh 遺漏 username 欄位導致功能異常
  - 後端學期計算第 2 學期學年度少減 1 年
  - 提交階段競態條件（SELECT FOR UPDATE 行級鎖）
  - Portfolio 頁面新增刪除按鈕（僅有重複記錄時顯示）
  - KB Coach AI 回應為 null 時的資料庫寫入錯誤
  - helpSeekingAvoidanceService 欄位名稱錯誤（userId→senderId）

### 📦 資料庫遷移

- `20260327000001-add-mentor-id-to-projects.js` — 專案 mentorId 外鍵
- `20260330000002-add-due-date-to-tasks.js` — 任務截止日期欄位
- `20260331000001-add-narrative-draft-to-user-projects.js` — 敘事草稿欄位

---

## [v3.5.0] - 2026-03-27 — 儀表板學術強化：節律熱圖、多維度風險偵測與健康度評分

### 🟣 新功能

- **4 週學習節律熱圖（學生端）**（`ActivityHeatmap.jsx`）
  - 28 格（4 週 × 7 天）熱圖，teal 色系四段濃淡
  - 整合 4 種資料來源：個人反思、看板任務（含 assignee 篩選）、想法節點、AI 互動
  - 底部依活躍天數自動給出診斷洞察文字（≥14 天 / ≥7 天 / <7 天三段話術）
  - 插入 StudentDashboard 左欄「學習軌跡」與「5Rs 雷達圖」之間
  - 研究依據：2024 Self-Regulation LAD — 節律熱圖有效幫助學生識別並改善拖延行為

- **全班學習節律熱圖（教師端）**（`ClassActivityHeatmap.jsx`）
  - 28 格熱圖，purple 色系四段濃淡，每列右側顯示當週活動總筆數
  - 資料來源：全班反思、看板任務、想法節點（無 userId 篩選，呈現集體節律）
  - **集中趕工偵測**：本週活動量 ≥ 前三週平均 2.5 倍時顯示橘色警示，引導教師判斷是否為臨時抱佛腳模式
  - 插入 TeacherDashboard AnalyticsView 全班 5Rs 雷達圖之後

- **各專案健康度一覽**（`TeacherOverview.jsx`）
  - 綜合評分（0–100）由三項加權：進度（33%）+ 本週反思率（33%）+ 近期活躍度（34%）
  - 活躍度同時查 `allReflections` 與 `allActivities`，避免漏判僅有看板/AI 活動的組
  - 按分數由低至高排列，紅（<45）/ 黃（45–74）/ 綠（≥75）色標示
  - 每列附直連對應 Teacher Dashboard 的「查看」按鈕
  - 標題旁 Tooltip 說明計算邏輯

### 🔧 功能強化

- **需關注清單加入活動時間維度**（`TeacherOverview.jsx`）
  - 原本僅以「進度 < 30%」單一維度判斷，修正為：進度 < 30%（琥珀色）**或** 7 天內無反思（橙色）
  - 修正健康度卡片顯示 🔴 但關注名單卻為空的邏輯矛盾
  - 研究依據：多篇早期預警研究建議至少結合進度趨勢 + 最後活動時間兩個維度

- **學生活動概況改名與配色中性化**（`AnalyticsView.jsx`）
  - 「學生活動排行榜」改名為「學生活動概況」，新增「教師管理參考，不對學生公開」說明
  - 金/銀/銅競爭色改為統一 teal 中性配色，去除競爭意涵
  - 研究依據：SoLAR Handbook 反對對學習者展示競爭排名

- **Tooltip 新增至兩個熱圖標題**
  - `ActivityHeatmap.jsx`（學生端）：說明 4 種資料來源與使用目的
  - `ClassActivityHeatmap.jsx`（教師端）：說明活動來源與集中趕工偵測邏輯

### 🗑️ UI 冗餘清理（TeacherOverview）

| 刪除內容 | 原因 |
|---------|------|
| 「學生表現分析」卡片 | 與頂部統計卡完全重複 |
| 「教學統計」右欄面板 | 數值重複；「總教學時數」= `totalProjects × 40` 為假資料 |
| 「專案監控」Tab | `avgStudentProgress` 恆等於 `progress`（同 stage 設計）|
| 「數據分析」Tab | 內容為統計卡文字複述，資訊量低於現有健康度一覽 |

Tab 從 4 個縮減為 2 個（總覽 / 學生管理），TeacherOverview.jsx 從 ~972 行縮減至 ~830 行。

### 📚 文件更新

- `Reference/DASHBOARD_GAP_ANALYSIS.md`：補充上述四項實作說明，標記完成狀態，學生專案診斷性 CARE 層次從 ★★ 提升至 ★★★

---

## [v3.4.0] - 2026-03-17 — 效能監控基礎設施與全面效能優化

### 🟣 新功能
- **Grafana + Prometheus 效能監控 Dashboard**
  - `docker-compose.dev.yml` 新增 Prometheus（port 9090）與 Grafana（port 3001）服務
  - 自訂 SDL k6 Dashboard：P95/P50 回應時間、VUs、錯誤率、各端點分析
  - Grafana 自動 provision datasource 與 Dashboard，啟動即用
- **完整效能測試套件（`performance/`）**
  - `k6/api-load-test.js` — 負載測試（50 VU，3 分鐘，Token 預取策略避免 rate limit 干擾）
  - `k6/stress-test.js` — 壓力測試（自動尋找服務上限，約 12 分鐘）
  - `k6/spike-test.js` — 尖峰測試（模擬課堂 30 人同時湧入）
  - `lighthouse/lighthouserc.js` — Lighthouse CI 設定（Core Web Vitals 閾值）
  - `lighthouse/web-vitals-patch.js` — 瀏覽器端即時 RUM 監控
  - `profiling/backend-profiler.js` — Node.js 記憶體 / N+1 查詢偵測工具
  - `run-tests.sh` — 一鍵執行腳本，自動偵測 Prometheus 並啟用即時 Grafana 輸出
  - `PERFORMANCE_CHECKLIST.md` — 完整效能驗收標準清單（P-percentile 基準、快取命中率、Bundle 大小等）
- **In-Memory API Cache 服務（`sdl-backend-main/services/apiCache.js`）**
  - 零外部依賴，純 Map 實作，TTL 自動過期
  - 超過 2000 筆自動 GC 防記憶體洩漏
  - Cache key 包含用戶 ID 確保資料隔離
- **V8 Heap Snapshot 端點**（`POST /api/metrics/heapsnapshot`，僅開發環境）
  - 輸出 `.heapsnapshot` 檔案，可用 Chrome DevTools Memory tab 分析記憶體洩漏
- **效能測試專用帳號**
  - `perf_student_01` / `perf_student_02`（student）、`perf_teacher_01`（teacher）
  - 密碼：`Perf@Test2026`，bcrypt rounds=10（避免干擾負載測試數值）
  - 📄 [效能監控完整指南](Reference/PERFORMANCE_MONITORING.md)

### 🔧 P0 關鍵修復
- **登入 Rate Limiter 改為 per-account 鎖定**（`server.js`）
  - 原本每 IP 每分鐘限制 10 次，50 VU 高並發下 96% 請求被 429 封鎖
  - 改用 `keyGenerator`，以帳號名稱為鎖定單位，IP 為後備
  - **效果：k6 錯誤率從 96% 降至 0%**

### ⚡ P2 效能優化（快取）
- **`/api/users/me` 加入 60 秒 In-Memory 快取**（`controllers/user.js`）
  - 快取命中後回應 < 5ms；更新 profile 或密碼時自動清除快取
- **`/api/projects` 加入 30 秒 In-Memory 快取**（`controllers/project/projectController.js`）
  - Cache key 格式：`projects:${userId}:${semesterFilter}`，確保篩選結果正確隔離

### 🔧 P3 錯誤狀態碼規範化
- **`usage.js` startSession 明確區分 400 / 401 / 500**
  - 未授權 → `401`；缺少 projectId 或格式錯誤 → `400`；伺服器錯誤 → `500`

### 🔧 P4 雜項清理
- **移除 `projectController.js` 中 5 行 debug `console.log`**（高負載下影響 I/O）

### 📊 效能基準達成（本機 Docker，50 VU × 3 分鐘）

| 指標 | 優化前 | 優化後 | 改善 |
|------|--------|--------|------|
| HTTP 整體 P95 | 30.3ms | 12.0ms | ↓ 60% |
| 錯誤率 | 96% | 0% | 修復 |
| 登入 P95 | 230ms | 84ms | ↓ 64% |
| 吞吐量 | ~180 req/s | ~420 req/s | ↑ 133% |

---

## [v3.3.1] - 2026-03-09 — 安全強化、AI 修復與錯誤日誌

### 🔒 安全修復
- **getUsers 密碼欄位洩漏**：API 回應加入 `attributes` 限制，排除 `password` 雜湊值
- **公告作者偽造防護**：`author` 欄位改由後端從 JWT 取得，防止前端傳入任意值
- **getHistory 無界限查詢**：`limit` 參數加入上界限制（最大 100 筆），防止 DB 過載

### 🔴 Bug 修復
- **JWT Token 大量 401**：修復 `config/index.js` 中 `refreshExpiresIn` 使用錯誤解析函式的問題
- **Gemini prompt 層級錯誤**：修復 `callWithFallback` 將 systemPrompt 與 userPrompt 拼接的問題，改用 `systemInstruction` 參數確保正確隔離
- **IdeaWallChatPanel null crash**：加入 optional chaining 防止 props 為 null 時崩潰
- **kbCoach 缺失函式**：還原 `buildSystemPrompt` 函式，修復 KB Coach 無法啟動的問題
- **部署 PG 密碼認證失敗**：改從 `.env` 直接讀取 PG 認證資訊，避免硬編碼預設值導致認證錯誤
- **部署流程環境變數**：新增 PG 密碼同步步驟與環境變數完整性驗證

### 🟣 新功能
- **API 錯誤每日報告**：所有 API 錯誤自動寫入 `/logs/errors/YYYY-MM-DD.md`，包含使用者資訊、請求路徑、堆疊追蹤，方便教師問題回報

### 🔧 技術改進
- 後端模組化重構：公告元件拆分、想法牆節點顯示修復
- `assistantCacheService` / `assistantDataService` 改用 Pino 結構化 logger，移除服務層 emoji
- MinIO 配置優化：新增 `MINIO_PUBLIC_ENDPOINT` 環境變數，移除不必要設定
- 移除前端殘留 `console.log`（`useAnnouncementSocket`、`useIdeaWallSocket`）
- `AnnouncementFormModal` 硬編碼顏色改用 `bg-customgreen` 設計系統 token

---

## [v3.3.0] - 2026-03-04 — 求助分析、學校系統與登入改版

### 🌟 重大更新
- **求助行為分析系統 (Help-Seeking Analytics)**
  - 基於 Won (2024) 與 Li (2023) 研究的求助品質量化模型
  - **求助迴避風險偵測**：跨課堂趨勢分析，結合困難信號 + 求助活躍度 + 行為突變偵測
  - **求助成效追蹤**：24 小時後自動檢查任務狀態變化，計算成效分數
  - **教師專用視圖**：專案統計概覽、學生個別記錄、風險預警清單、後續追蹤案例
  - 完整的 RESTful API（8 個端點）與教師儀表板前端整合
  - 📄 [後端實作文檔](docs/backend/HELP_SEEKING_IMPLEMENTATION.md) · [前端實作文檔](docs/frontend/HELP_SEEKING_FRONTEND_IMPLEMENTATION.md) · [研究分析](Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md)
- **學校多租戶系統 (Multi-Tenancy)**
  - 學校資料模型（教育部代碼、公私立、縣市）
  - 使用者與專案關聯學校 ID
  - 註冊時模糊搜尋學校名稱，跨校觀摩隔離機制
- **全新登入系統設計**
  - 登入頁面：雙面板設計、平台特色介紹、5Rs 反思框架說明、統計數字動態計數動畫
  - 註冊頁面：學校搜尋下拉、密碼強度驗證、角色選擇
  - 忘記密碼/重設密碼：Email 寄送帶 Token 的重設連結（24 小時有效、一次性）
  - 重設密碼頁面：即時 Token 驗證、使用者資訊顯示、密碼安全性提示
  - 📄 [密碼重設設定指南](docs/backend/PASSWORD_RESET_SETUP.md)
- **教師儀表板重新設計**
  - 全新圖表系統（Recharts / Chart.js）
  - 效能優化與響應式設計改善
  - 整合求助行為分析視圖
  - 📄 [設計規劃](docs/frontend/TEACHER_DASHBOARD_REDESIGN_PLAN.md) · [設計評審](docs/frontend/TEACHER_DASHBOARD_DESIGN_REVIEW.md)

### ✨ 新功能
- **新手導覽系統 (Onboarding)**
  - **看板導覽**：4 步驟引導（認識看板 → 卡片 → 範例任務 → 求助按鈕），首次使用自動觸發
  - **想法牆導覽**：4 步驟引導（認識想法牆 → 新增節點 → 建立連線 → KB 教練），步驟指示器動畫
- **學生學習歷程匯出**：PDF 格式匯出個人學習歷程，觀摩模式下自動隱藏匯出按鈕
- **vLLM 對話摘要生成**：自動為 AI 對話生成摘要標題
- **AuthImage 元件**：統一帶 Token 認證的圖片顯示與檔案下載，支援環境變數配置
- **首頁 UX 重新設計**：進行中活動常駐展示 + Tab 切換架構、學期篩選預設改為全部

### 🔒 安全強化
- **OWASP Top 10 全面修復**
  - Express Rate Limiting（API 請求頻率限制）
  - Helmet 安全標頭設定
  - 參數驗證與注入防護
  - 安全審查報告已移出公開 repo（含未修復項目位置，不宜公開）
- **密碼重設安全設計**
  - `crypto.randomUUID()` 生成不可預測 Token
  - Token 使用後即刻銷毀，密碼重設後自動撤銷所有 Refresh Token
  - 審計追蹤記錄（REQUEST / VALIDATE / EXECUTE）

### 🔧 技術改進
- **CI/CD 部署流程優化**：GitHub Actions 併發控制、PostgreSQL 啟動等待機制、VITE 環境變數注入
- **Sequelize 資料庫兼容性**：修正 `PG_DB` 與 `PG_NAME` 環境變數讀取
- **手機端響應式體驗**：全面優化移動端佈局與交互 — 📄 [測試報告](docs/reports/responsive-test-report.md)
- **KB Coach 強化**：求助引導 UX 改善、全員開放使用、AI 建議參考功能
- **未登入審計事件防護**：未登入時不送出審計事件，避免 401 錯誤

### 📦 資料庫遷移
- `20260211000000-extend-help-seeking-log.js` — 擴展求助日誌欄位
- `20260211000001-create-help-seeking-avoidance-risk.js` — 求助迴避風險資料表
- `20260211000002-add-course-config-to-projects.js` — 專案課程設定
- `20260211100000-add-semester-to-projects.js` — 專案學期欄位
- `20260215-add-audit-fields.js` — 審計欄位擴充
- `20260223000000-add-session-title-to-rag-messages.js` — 對話標題
- `20260225000000-add-intent-to-kb-coach-history.js` — KB Coach 意圖欄位
- `20260301000001-create-schools-table.js` — 學校資料表
- `20260301000002-add-school-id-to-users.js` — 使用者關聯學校
- `20260301000003-add-school-id-to-projects.js` — 專案關聯學校

---

## [v3.2.0] - 2026-02-11 — 儲存管理與知識建構系統

### 🌟 重大更新
- **StorageService 統一儲存管理**
  - 完全重構本地儲存機制，取代 88+ 處直接 `localStorage` 呼叫
  - 命名空間系統（`authStorage`, `userStorage`, `projectStorage`）
  - 類型安全工具（`getInt`, `getBoolean`, `getNumber`）
  - 認證快捷函式（`getCurrentUserId`, `getCurrentUserRole`, `isAuthenticated`, `isTeacher`）
  - 完整錯誤處理與降級機制（localStorage 不可用時自動切換記憶體儲存）
  - 📄 [StorageService 報告](docs/releases/PHASE2_STORAGESERVICE_REPORT.md)
- **KB Coach 知識建構教練**
  - 基於 Knowledge Building 12 原則的 AI 教練系統
  - Gemini 3.1 Flash-Lite-Preview Function Calling 提供結構化輸出
  - 6 個核心 KB 原則（Phase 1）
  - 零破壞性設計：與舊版「想法發展助手」並存
  - 📄 [KB Coach 實作報告](docs/reports/KB_COACH_IMPLEMENTATION.md)
- **結構化日誌系統**
  - Pino 高效能日誌取代 console.log
  - 自動遮蔽敏感資訊（password, token, apiKey, sessionId）
  - 📄 [Logger 修復報告](docs/releases/LOGGER_FIX_REPORT.md)

### ✨ 新功能
- **反思系統升級**
  - **階段選擇器**：支援日誌關聯特定專案階段（如 1-1, 2-3），提供智慧推薦與驗證
  - **UI 差異化**：雙卡片入口（傳統日誌 vs 5Rs 反思）與智慧橫幅引導
  - 📄 [階段選擇器實作](docs/misc/STAGE_SELECTOR_IMPLEMENTATION.md) · [UI 差異化報告](docs/misc/UI_DIFFERENTIATION_REPORT.md)
- **Idea Improver 2.0**
  - 導入 **Shadow Orchestrator** 架構，實現非侵入式 AI 監控
  - 死規則過濾器：冷卻時間（10 分鐘）+ 訊息累積（5 則）
  - 雙模式切換：全域討論 + 節點討論
  - 📄 [Idea Improver 改進計畫](docs/proposals/Improve-Idea-Improver.md)
- **公告管理系統增強**
  - 完整的刪除功能（RBAC 權限、Socket.IO 即時同步、審計追蹤）
  - 📄 [實作報告](docs/releases/ANNOUNCEMENT_DELETE_COMPLETE.md)

### 🔧 技術改進
- **審計追蹤系統完成 Phase 3 P1**（9 個中等風險操作追蹤點）
  - 📄 [Phase 3 實作報告](docs/releases/PHASE3_IMPLEMENTATION_COMPLETE.md) · [驗證指南](docs/guides/HOW_TO_VERIFY_PHASE3.md)
- 架構優化：`IdeaWallMessage` 模型解耦、權限中間件強化、資料庫索引優化

### 📦 資料庫遷移
- `20260202233226-update-substage-usersubmit.js` — 子階段與使用者提交更新
- `20260205000000-add-stage-to-daily-reflections.js` — 反思日誌階段欄位
- `20260206000000-create-kb-coach-history.js` — KB Coach 歷史記錄
- `20260210000000-remove-announcement-projectId-fkey.js` — 公告外鍵移除
- `20260211000000-drop-user-consents.js` — 移除使用者同意表

---

## [v3.0.0] - 2025-01-12 — 重大更新

### ✨ 新功能
- **5Rs 反思框架與 AI 智能分析功能**
  - 雙 AI 引擎支援（vLLM 本地部署 + gemini-3.1-flash-lite-preview）
  - 結構化反思模型與專業回饋生成
- **儀表板系統模組化重構**
  - 學生儀表板：1000+ 行 → 14 個模組
  - 教師儀表板：2000+ 行 → 15 個專業模組
  - 響應式設計優化

### 🗄️ 系統遷移
- **MinIO 檔案儲存系統**：完全遷移至 MinIO 對象儲存，效能提升 300%

### 🔧 技術改進
- **Session 管理優化**：UUID + localStorage 持久化
- **AI 助理 Streaming 功能**：即時回應體驗
- **Refresh Token 實作**：自動 Token 刷新機制

---

## [v2.3] — 階段完成功能

📄 [詳細更新記錄](Reference/versions/v2.3-stage-completion.md)

- 階段完成流程與自動推進
- 學習完成度追蹤

## [v2.2] — 階段感知型 AI 助理

📄 [詳細更新記錄](Reference/versions/v2.2-stage-aware.md)

- AI 助理根據當前階段動態調整引導策略
- 階段感知 Prompt Engineering

## [v2.1] — AI Advisor 升級

📄 [詳細更新記錄](Reference/versions/v2.1-advisor-upgrade.md)

- AI Advisor 整體升級
- RAG 系統整合

---

## 歷史版本

更早期的版本歷史請參考 Git 提交記錄：

```bash
git log --oneline --no-merges
```
