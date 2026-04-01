# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 模型使用規則

| 情境 | 使用模型 | 說明 |
|------|----------|------|
| 問題分析、規劃實作計畫、架構設計 | `opus` | 透過 Agent tool 指定 `model: "opus"` |
| 研究調查、事實查核、文件閱讀 | `opus` | 需要深度推理的研究任務 |
| 程式碼實作、檔案編輯、bug 修復 | `sonnet` | 預設模型，速度與品質的最佳平衡 |
| 簡單搜尋、快速查詢 | `sonnet` | 不需切換 |

**執行方式：** 使用 Agent tool 時，依上表指定 `model` 參數；主執行緒直接實作時維持預設 `sonnet`。

## 專案概述

SDL (Self-Directed Learning) 是一個全端學習平台,結合科學探究五階段方法論(定標→擇策→監評→調節→學習歷程)、AI 輔助學習分析與現代化協作工具。

**核心技術堆疊:**
- 前端: React 18 + Vite 5 + TailwindCSS + Socket.io Client
- 後端: Node.js + Express + PostgreSQL + Sequelize ORM v6 + Socket.io v4.6
- 檔案儲存: MinIO (S3 相容的對象儲存)
- AI 整合: Google Gemini 3.1-flash-lite-preview
- DevOps: Docker Compose + Nginx 反向代理

## 常用開發指令

### 啟動與部署

```bash
# 啟動所有服務 (開發環境)
docker compose up -d

# 本地開發（主要使用此指令）
docker compose -f docker-compose.dev.yml up --build

# ⚠️ 本地開發時，所有 docker compose 指令都需加上 -f docker-compose.dev.yml：
# 檢查服務狀態
docker compose -f docker-compose.dev.yml ps

# 查看特定服務日誌
docker compose -f docker-compose.dev.yml logs -f api      # 後端 API
docker compose -f docker-compose.dev.yml logs -f front    # 前端
docker compose -f docker-compose.dev.yml logs -f postgres # 資料庫
docker compose -f docker-compose.dev.yml logs -f minio    # MinIO 儲存

# 重啟特定服務
docker compose -f docker-compose.dev.yml restart api
docker compose -f docker-compose.dev.yml restart front

# 停止所有服務
docker compose -f docker-compose.dev.yml down

# 停止並刪除所有資料 (包含 volumes)
docker compose down -v
```

### 前端開發 (sdl-frontend-main/)

```bash
cd sdl-frontend-main

# 安裝依賴
npm install

# 啟動開發伺服器 (熱重載)
npm run dev

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview

# 執行測試
npm test
npm run test:run  # 單次執行測試
```

### 後端開發 (sdl-backend-main/)

```bash
cd sdl-backend-main

# 安裝依賴
npm install

# 啟動開發伺服器 (使用 nodemon 熱重載)
npm run dev

# 啟動生產伺服器
npm start

# 資料庫遷移
npm run migrate              # 執行所有遷移
npm run migrate:undo         # 回滾最後一次遷移
npm run migrate:status       # 查看遷移狀態

# MinIO 測試與設定
npm run test-minio          # 測試 MinIO 連線
```

### 資料庫 seed / import 腳本規則

撰寫任何資料庫插入或批次匯入腳本前：
1. 先讀取對應的 Sequelize model，列出所有 `allowNull: false` 的必填欄位
2. 對照來源資料確認每個必填欄位都有值（特別注意 `email`、`password` 等）
3. 先以 3 筆測試資料執行驗證，確認無 ValidationError 後再跑完整資料

### 資料庫操作

```bash
# 進入 PostgreSQL 容器
docker compose exec postgres psql -U postgres -d postgres

# 查看所有資料表
docker compose exec postgres psql -U postgres -d postgres -c "\dt"

# 備份資料庫
docker compose exec postgres pg_dump -U postgres postgres > backup.sql

# 還原資料庫
docker compose exec -T postgres psql -U postgres postgres < backup.sql
```

## 架構設計重點

### 模組化架構 (重構自 1492 行巨型檔案)

**後端架構:**
- `server.js` - 主伺服器入口,負責初始化 Express、Socket.IO 和中間件
- `sockets/socketManager.js` - 統一管理所有 Socket.IO 連線和認證
- `sockets/handlers/` - Socket 事件處理器,按功能模組化:
  - `taskHandler.js` - 看板任務事件
  - `columnHandler.js` - 看板欄位事件
  - `messageHandler.js` - 聊天室訊息事件
  - `nodeHandler.js` - 想法牆節點事件
  - `announcementHandler.js` - 公告事件
  - `ideaWallMessageHandler.js` - 想法牆訊息事件
  - `aiCoachHandler.js` - AI 教練事件
- `services/` - 業務邏輯服務層:
  - `orchestrator.js` - AI 助理協調器 (整合 RAG 與 Streaming)
  - `streamingService.js` - AI Streaming 回應服務
  - `structuredStreamingService.js` - 結構化 Streaming (5Rs 反思分析)
  - `gemini.js` - AI 模型介面
  - `emailService.js` - 郵件服務
  - `auditService.js` - 審計日誌服務
- `middlewares/` - Express 中間件:
  - `AuthMiddleware.js` - JWT 身份驗證
  - `minioUploadMiddleware.js` - MinIO 檔案上傳
  - `performanceMonitor.js` - API 效能監控
- `routes/` - RESTful API 路由定義 (24+ 路由檔案)
- `models/` - Sequelize 資料模型 (40+ 模型)

**前端架構:**
- `src/pages/` - 頁面元件 (Dashboard、Kanban、IdeaWall 等)
- `src/components/` - 可重用元件庫
- `src/hooks/` - 自定義 React Hooks:
  - `useAssistantChat.js` - AI 助理 Streaming 聊天
  - `useStageIndex.js` - 階段感知邏輯
  - `useIdeaWallChat.js` - 想法牆聊天功能
- `src/api/` - API 呼叫層 (使用 Axios)
- `src/utils/` - 工具函數

### Socket.IO 事件架構

Socket.IO 採用 **事件驅動架構**,前後端透過事件名稱通訊:

**連線認證流程:**
1. 前端連線時攜帶 JWT token (`socket.handshake.auth.token`)
2. `socketManager.js` 驗證 token 並附加 `socket.userId` 和 `socket.user`
3. 所有事件處理器可直接使用 `socket.user` 取得當前使用者

**事件命名規範:**
- 客戶端發送: `createTask`, `updateColumn`, `sendMessage`
- 伺服器廣播: `taskCreated`, `columnUpdated`, `messageReceived`
- AI 事件: `aiCoach:query` (客戶端) → `aiCoach:response` (伺服器)

**重要提醒:** 斷線時必須 `socket.removeAllListeners()` 防止記憶體洩漏

### AI 系統架構 (Gemini + RAG + Streaming)

**專案助理系統 (Project Assistant):**
- **RAG 整合**: 自動收集專案資料(看板任務、想法牆、提交記錄、對話歷史)注入 Prompt
- **Streaming 回應**: 使用 `streamingService.js` 逐字串流,提供即時反饋
- **AI 引擎**: 使用 Google Gemini 3.1-flash-lite-preview
- **個人化稱呼**: 系統自動帶入使用者名稱

**5Rs 反思分析系統:**
- **反思框架**: Reporting → Responding → Relating → Reasoning → Reconstructing
- **結構化 Streaming**: 使用 `structuredStreamingService.js` 逐項串流分析結果
- **AI 分析**: 針對每個 R 層次提供個人化改進建議
- 前端元件: `FiveRsReflectionForm.jsx` (輸入) + `FiveRsReflectionDisplay.jsx` (顯示)

### 認證與權限系統

**JWT Token 機制 (雙 Token 架構):**
- **Access Token**: 短效 token (1-2 小時),用於 API 呼叫
- **Refresh Token**: 長效 token (7 天),用於刷新 Access Token
- **自動刷新**: `src/api/client.js` 攔截器自動處理 401 並刷新 token
- **Token 清理**: Docker Compose 中有 `token-cleanup` 服務每 6 小時清理過期 token

**Session 管理 (UUID + localStorage):**
- 使用 UUID 作為 Session ID
- 持久化儲存於 localStorage
- 參考文件: `Reference/SESSION_FIX_IMPLEMENTATION.md`

**權限中間件:**
- `AuthMiddleware.js` - 驗證 JWT token
- `projectViewingMiddleware.js` - 專案查看權限
- `ideaWallProjectMiddleware.js` - 想法牆專案權限

### MinIO 檔案儲存系統

**遷移背景:** v3.0 完全遷移至 MinIO 對象儲存,效能提升 300%

**重要觀念:**
- MinIO 是 S3 相容的對象儲存,使用 AWS SDK v3 操作
- 所有檔案儲存操作透過 `minioUploadMiddleware.js` 處理
- Bucket 名稱: `sdl-files` (由 `minio-init` 服務自動建立)
- 檔案上傳路徑: `/api/*/upload` 端點
- 環境變數配置於 `docker-compose.yml` 和 `.env`

**連線資訊:**
- MinIO API: `http://minio:9000` (容器內) / `http://localhost:9000` (本地)
- MinIO Console: `http://localhost:9001`
- 預設帳密: `minioadmin / minioadmin` (生產環境請修改)

### 儀表板系統 (模組化重構)

**重構成果:**
- 學生儀表板: 1000+ 行 → 14 個模組
- 教師儀表板: 2000+ 行 → 15 個模組

**模組化結構 (以教師儀表板為例):**
- `teacher-dashboard/index.jsx` - 主要容器
- `teacher-dashboard/components/StatsCards.jsx` - 統計卡片
- `teacher-dashboard/components/FilterSection.jsx` - 篩選器
- `teacher-dashboard/components/StudentTable.jsx` - 學生表格
- `teacher-dashboard/components/StudentCard.jsx` - 響應式卡片(移動版)

**響應式設計模式:**
- 桌面版 (lg+): 使用表格佈局
- 移動版 (< lg): 使用卡片佈局
- 統計卡片 Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`

## 設計系統規範

**重要:** 必須遵循 `DESIGN_SYSTEM.md` 中定義的設計規範

### 間距系統 (Spacing Tokens)

使用語意化間距 token,**禁止使用任意數值**:

**元件內邊距:**
- `p-component-xs` (8px) - 極小元件
- `p-component-sm` (12px) - 小卡片、小按鈕
- `p-component-md` (20px) - 標準卡片
- `p-component-lg` (32px) - 大卡片
- `p-component-xl` (40px) - 頁面容器

**元件間距:**
- `gap-stack-xs` (8px) - 緊密排列
- `gap-stack-sm` (16px) - 標準間距
- `gap-stack-md` (24px) - 寬鬆間距
- `gap-stack-lg` (40px) - 區塊之間
- `gap-stack-xl` (64px) - 大區塊之間

**按鈕內邊距:**
- `px-btn-x-sm py-btn-y-sm` (12px/6px) - 小按鈕
- `px-btn-x py-btn-y` (16px/8px) - 標準按鈕
- `px-btn-x-lg py-btn-y-lg` (24px/12px) - 大按鈕

### 字體系統

使用語意化字體大小,**禁止使用固定數值**:
- `text-h1` (32px) - 頁面主標題
- `text-h2` (24px) - 區塊標題
- `text-h3` (20px) - 卡片標題
- `text-body` (16px) - 主要內容
- `text-body-sm` (14px) - 次要內容
- `text-caption` (12px) - 輔助說明

### Hover 效果規範

**✅ 正確做法:**
```jsx
<button className="
  bg-customgreen
  hover:bg-customgreen/90
  hover:shadow-lg
  transition-shadow duration-fast
">
```

**❌ 禁止做法:**
```jsx
// 禁止使用 scale 或 translateY - 會造成佈局位移
<button className="hover:scale-105 hover:-translate-y-1">
```

### 動畫速度

使用標準化速度 token:
- `duration-fast` (150ms) - Hover、Focus 微互動
- `duration-normal` (250ms) - Modal 淡入淡出
- `duration-slow` (400ms) - Drawer 滑動、頁面過渡

### 響應式設計

必須包含 `md:` 中間斷點,**禁止跳過斷點**:

```jsx
// ❌ 錯誤: 跳過 md 斷點
<div className="grid-cols-2 lg:grid-cols-5">

// ✅ 正確: 平滑過渡
<div className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
```

## 可用 Skills 快速參考

| 指令 | 用途 | 何時使用 |
|------|------|---------|
| `/commit` | 繁體中文 commit + push + 驗證 | 每次提交前 |
| `/debug` | 收集 Docker/DB/env 環境快照 | 遇到任何錯誤前 |
| `/feature <描述>` | 確認互動模型與受影響檔案 | 實作新功能前 |
| `/auth-sync` | 比對並同步三個 auth 頁面樣式 | 修改 auth 頁面後 |

## Git 規範

- **commit 訊息一律使用繁體中文**，不使用簡體中文或英文描述（技術術語除外）
- 使用 `/commit` skill 執行完整的 commit + push + 驗證流程
- push 後必須用 `git log --oneline -1` 與 `git ls-remote origin HEAD` 比對 hash，確認遠端已同步

## 程式碼規範

### 命名約定

- **React 元件**: PascalCase (`StudentDashboard.jsx`)
- **函式**: camelCase (`fetchStudentData`)
- **常數**: UPPER_SNAKE_CASE (`FIVE_R_FRAMEWORK`)
- **檔案**: kebab-case 或 PascalCase (`student-dashboard.jsx` 或 `StudentDashboard.jsx`)

### 圖示與 Emoji 規範

- **禁止在 UI 中使用 emoji**（包含按鈕、標籤、標題、提示訊息等）
- **圖示一律使用 `react-icons`**，例如 `import { FiUser } from 'react-icons/fi'`
- 需要新圖示時，優先從 `react-icons` 已有的 icon 集中挑選

### Auth 頁面一致性規則

修改任一 auth 頁面（`Login.jsx`、`Register.jsx`、`ForgotPassword.jsx`、`ResetPassword.jsx`）時：
- **主動檢查並同步其他兩個頁面**，確保品牌面板寬度、配色、動畫速度、響應式斷點一致
- 三頁共用：`customgreen` 主題 + `duration-normal` 動畫 + `h-screen overflow-hidden` 佈局

### 多步驟 UX 流程規則

實作對話框、引導流程等互動功能前，先向使用者確認：
- 項目是「預填選取」還是「自動執行」？
- 每個步驟的按鈕文字為何？
- 確認後才開始撰寫程式碼

### JSX 中的變數提取規則

在 JSX render 內需要避免重複計算（如 `isOverdue`）時：

**✅ 正確做法：在 render 函式最上方宣告 const**
```jsx
// 在 return 之前
const isOverdue = cardData.dueDate && new Date(cardData.dueDate) < new Date();

return (
  <div className={isOverdue ? 'text-red-500' : ''}>...</div>
);
```

**❌ 禁止在 JSX 內使用 IIFE**
```jsx
// 會破壞 JSX 結構，造成難以追蹤的括號不平衡錯誤
{(() => {
  const isOverdue = ...;
  return <div>...</div>;
})()}
```

IIFE 在 JSX 中雖然語法上合法，但容易在 edit 過程中造成 `</div>` 多餘或缺漏，且難以 debug。

### 錯誤處理

**前端:**
- 使用 Error Boundary 包裹主要元件 (`GlobalErrorBoundary`, `KanbanErrorBoundary` 等)
- API 呼叫使用 try-catch 並提供使用者友善的錯誤訊息
- Socket 連線錯誤使用 `SocketStatusIndicator` 顯示狀態

**後端:**
- 所有 API 端點必須有 try-catch
- 使用 `auditService.js` 記錄關鍵操作
- Socket 事件處理器必須捕捉錯誤並 emit 錯誤事件

### 效能最佳化

**前端:**
- 大型清單使用虛擬化 (`react-window` 或 `react-virtual`)
- 圖片懶加載
- 使用 React.memo 避免不必要的重新渲染
- Socket 事件監聽器在 component unmount 時必須清除

**後端:**
- 使用 Sequelize 的 `attributes` 限制查詢欄位
- 避免 N+1 查詢,使用 `include` 預先載入關聯
- API 回應使用 pagination 分頁
- 效能監控: `performanceMonitor.js` 會記錄慢查詢 (> 1000ms)

## 重要參考文件

### 核心功能文件
- `Reference/AI_ASSISTANT_GUIDE.md` - AI 專案助理完整使用指南
- `Reference/SESSION_FIX_IMPLEMENTATION.md` - Session ID 管理修復實作
- `Reference/REFRESH_TOKEN_IMPLEMENTATION.md` - Refresh Token 實作說明
- `DESIGN_SYSTEM.md` - 設計系統規範 (必讀!)

### 版本更新記錄
- `Reference/versions/v2.3-stage-completion.md` - v2.3 階段完成功能
- `Reference/versions/v2.2-stage-aware.md` - v2.2 階段感知型 AI 助理
- `Reference/versions/v2.1-advisor-upgrade.md` - v2.1 AI Advisor 升級

### 問題修復記錄
- `Reference/reflection-log-permission-fix.md` - 反思日誌權限修復
- `Reference/backend/FIXES_SUMMARY.md` - 後端修復總結
- `Reference/general/IMPROVEMENTS_SUMMARY.md` - 系統改進總結

## 環境變數配置

### 後端 (.env 必須設定)

```env
# 資料庫設定
PG_DB=postgres
PG_USER=postgres
PG_PASSWORD=your_strong_password
PG_HOST=postgres

# MinIO 對象儲存設定
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_minio_password
MINIO_BUCKET_NAME=sdl-files

# AI 服務 API Keys
GEMINI_API_KEY=your_gemini_api_key

# JWT 認證密鑰
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=2h

# Email 設定 (密碼重設功能)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=SDL Platform <noreply@sdl.com>
FRONTEND_URL=http://localhost

NODE_ENV=development
```

## 常見問題排查

### 前端無法連接後端

1. 確認 API Base URL 是否正確 (應為 `/api` 而非 `http://localhost:3000`)
2. 檢查 `nginx.conf` 中的 `/api/` 反向代理配置
3. 查看瀏覽器 Console 是否有 CORS 錯誤

### Socket.IO 連線失敗

1. 確認前端使用正確的 Socket URL (應為 `/` 而非 `http://localhost:3000`)
2. 檢查 JWT token 是否正確附加於 `socket.handshake.auth.token`
3. 查看後端日誌確認認證流程

### MinIO 檔案上傳失敗

1. 確認 MinIO 服務正常運行: `docker compose logs minio`
2. 檢查 bucket 是否已建立: 訪問 `http://localhost:9001`
3. 測試 MinIO 連線: `cd sdl-backend-main && npm run test-minio`
4. 確認環境變數 `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` 正確設定

### 資料庫遷移錯誤

1. 確認 PostgreSQL 服務正常: `docker compose logs postgres`
2. 檢查遷移狀態: `npm run migrate:status`
3. 回滾最後一次遷移: `npm run migrate:undo`
4. 重新執行遷移: `npm run migrate`

### AI 功能無法使用

1. 確認環境變數 `GEMINI_API_KEY` 已設定
2. 檢查 API Key 是否有效 (可使用 Postman 測試)
3. 查看後端日誌: `docker compose logs -f api | grep -i "gemini"`
4. Gemini API Key 申請: https://makersuite.google.com/app/apikey

## 系統監控

**效能監控:**
- API 效能追蹤: `GET /api/metrics/performance` (需要 METRICS_TOKEN)
- 記憶體監控: `GET /api/metrics/memory`
- 慢查詢警告: 自動記錄 > 1000ms 的 API 請求

**日誌查看:**
```bash
# 後端日誌 (包含 Pino 結構化日誌)
docker compose logs -f api

# 即時查看 Socket.IO 事件
docker compose logs -f api | grep "Socket"

# 查看 API 效能警告
docker compose logs api | grep "SLOW"
```

## 部署注意事項

### 生產環境部署

1. **使用生產環境配置:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

2. **環境變數檢查清單:**
- [ ] 修改所有預設密碼 (`PG_PASSWORD`, `MINIO_SECRET_KEY`, `JWT_SECRET`)
- [ ] 設定正確的 `FRONTEND_URL`
- [ ] 配置 Email 服務 (`EMAIL_*` 變數)
- [ ] 設定 `METRICS_TOKEN` 保護監控端點
- [ ] 設定 `NODE_ENV=production`

3. **SSL/TLS 設定 (生產環境):**
- 使用 Let's Encrypt + Certbot
- 修改 `nginx.conf` 啟用 HTTPS

4. **資料庫備份:**
```bash
# 定期備份
docker compose exec postgres pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql
```

### Docker 映像更新

```bash
# 重新建構並啟動
docker compose build --no-cache
docker compose up -d

# 清理舊映像
docker image prune -a
```
