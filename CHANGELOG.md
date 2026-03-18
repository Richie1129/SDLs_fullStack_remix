# 📝 更新日誌 (Changelog)

本文件記錄 SDL 全端學習平台的所有版本迭代內容。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

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
  - 📄 [安全審查報告](docs/reports/SECURITY_AUDIT_REPORT.md)
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
