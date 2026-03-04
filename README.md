# SDL (Self-Directed Learning) 全端學習平台

> **🚀 2026 最新版本 v3.3**：新增求助行為分析系統、學校多租戶機制、密碼重設流程、全新登入頁面設計、新手導覽系統與學生學習歷程匯出

一個專為教育研究設計的智慧型自主學習平台，結合科學探究方法論、AI 輔助學習分析與現代化協作工具。採用 React 18 + Node.js + PostgreSQL + Socket.IO 全端架構，提供完整的專案式學習 (PBL) 支援。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)
[![Node](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org/)

---

## 📋 目錄

- [核心功能](#-核心功能)
- [技術架構](#️-技術架構)
- [快速開始](#-快速開始)
- [專案結構](#-專案結構)
- [文檔導航](#-文檔導航)
- [最新更新](#-最新更新)
- [更新日誌](CHANGELOG.md)
- [故障排除](#-故障排除)
- [貢獻指南](#-貢獻指南)

---

## ✨ 核心功能

### 🎯 學習引導系統
- **科學探究五階段引導**：定標 → 擇策 → 監評 → 調節 → 學習歷程
- **智慧看板管理**：拖拽式任務管理，即時協作同步
- **新手導覽系統**：看板與想法牆互動式引導教學，首次使用自動觸發
- **AI 學習助手**：基於 RAG 技術的個人化學習支援（[詳細指南](Reference/AI_ASSISTANT_GUIDE.md)）
- **數位作品集**：階段性學習成果展示與管理，支援 PDF 匯出

### 🧠 AI 反思分析與知識建構系統
- **5Rs 反思框架**：Reporting → Responding → Relating → Reasoning → Reconstructing
- **階段選擇功能**：支援關聯專案階段（如 1-1, 2-3），提供智慧推薦與驗證
- **UI 差異化設計**：雙卡片選擇器區分「傳統日誌」與「5Rs 結構化反思」，搭配智慧橫幅提示
- **KB Coach 教練系統**：基於 Knowledge Building 12 原則的 AI 教練，使用 Gemini Function Calling 提供結構化引導
- **雙 AI 引擎支援**：vLLM (本地部署) + gemini-2.5-flash，自動容錯與降級機制
- **專業回饋生成**：針對每個反思層次提供個人化改進建議

### 📊 求助行為分析系統 (Help-Seeking Analytics)
- **求助品質分析**：基於 Won (2024) 與 Li (2023) 研究，量化求助行為品質分數
- **求助迴避風險偵測**：跨課堂趨勢分析，結合困難信號 + 求助活躍度 + 行為突變偵測
- **求助成效追蹤**：24 小時後自動檢查任務狀態變化，計算求助成效分數
- **教師儀表板視圖**：專案統計概覽、學生個別追蹤、風險預警清單
- **AI 任務助手求助引導**：引導式求助流程，記錄後設認知狀態與求助類型（工具型/執行型）

### 🤝 協作與交流
- **即時聊天系統**：專案群組、學習小組的即時通訊與檔案分享（Socket.IO v4.6）
- **互動問答平台**：師生問答、同儕互助的知識交流空間
- **創意想法牆 (Idea Improver 2.0)**：
  - **影子中控 (Shadow Orchestrator)**：解耦 AI 邏輯與聊天視圖，實現非侵入式智慧監控
  - **AI 自動引導**：基於死規則過濾器（冷卻時間、訊息累積）+ LLM 上下文分析（Conflict/Question/Social）
  - **雙模式切換**：支援「全域討論」與「節點討論」模式，右側滑出式抽屜設計
- **公告通知系統**：完整的 RBAC 權限控制（教師/管理員）、建立/刪除功能與 Socket.IO 即時推播

### 📊 智慧儀表板系統
- **學生儀表板**：個人學習概覽、團隊協作資訊、學習軌跡記錄
- **教師管理儀表板**：多視圖模式、學生個別追蹤、即時監控系統、求助行為分析圖表
- **教師總覽面板**：全局統計、跨專案進度監控、系統分析功能
- **響應式設計**：桌面版表格與移動版卡片雙重佈局，全面手機端優化

### 🏫 學校多租戶系統
- **學校資料管理**：教育部學校代碼、公私立分類、縣市歸屬
- **跨校觀摩隔離**：不同學校的專案資料隔離與權限控制
- **註冊時學校選擇**：模糊搜尋學校名稱，自動關聯使用者與學校

### 🔐 帳號安全與認證
- **密碼重設流程**：Email 寄送重設連結（Nodemailer）、24 小時有效期限、一次性 Token 驗證
- **全新登入/註冊頁面**：雙面板設計（品牌 + 表單）、平台特色介紹、統計數字動態計數
- **JWT + Refresh Token**：雙 Token 機制，存取權杖 15 分鐘 + 更新權杖 7 天
- **AuthImage 元件**：帶 Token 認證的安全圖片顯示與檔案下載

### 🔧 技術創新特色
- **StorageService 統一儲存管理**：
  - 取代 88+ 處直接 `localStorage` 呼叫，提供類型安全、錯誤處理、命名空間隔離
  - 認證工具函式（`getCurrentUserId`, `getCurrentUserRole`）簡化常用操作
  - 支援物件序列化、批量操作、資料匯出/匯入
- **結構化日誌系統**：Pino 高效能日誌，自動遮蔽敏感資訊（password, token, apiKey）
- **三級審計追蹤系統**（P0-P3）：
  - **P0 (最高風險)**：認證、授權、權限變更 - 已完成
  - **P1 (中等風險)**：專案查看權限、成員管理、聊天室、AI 互動、檔案操作 - 已完成（9 個追蹤點）
  - **P2-P3**：規劃中 - 學習資料與低風險操作
- **MinIO 對象儲存**：統一檔案管理，S3 相容介面，確保檔案安全與高可用性
- **即時協作同步**：Socket.io v4.6 高效能即時通訊，支援房間訂閱與事件廣播
- **模組化架構**：前後端組件化設計，控制器層拆分優化（儀表板 1000+ 行 → 14-15 個模組）
- **OWASP Top 10 安全強化**：全面修復常見 Web 安全弱點，包含 Rate Limiting、Helmet、參數驗證

---

## 🏗️ 技術架構

### 核心技術堆疊

#### 前端技術
- **基礎框架**：React 18.2.0 + Vite 5.0
- **UI 系統**：TailwindCSS + Styled Components
- **狀態管理**：React Query + Context API
- **動畫引擎**：Framer Motion
- **資料視覺化**：Recharts, Chart.js, Vis Network, React Beautiful DnD
- **路由系統**：React Router DOM v6
- **Markdown 渲染**：React Markdown + remark-gfm + Streamdown (AI 串流)

#### 後端技術
- **核心框架**：Node.js + Express.js
- **資料庫**：PostgreSQL + Sequelize ORM v6
- **身份驗證**：JWT + Bcrypt（[Refresh Token 實作](Reference/REFRESH_TOKEN_IMPLEMENTATION.md)）
- **即時通訊**：Socket.io v4.6
- **檔案處理**：MinIO Object Storage + AWS SDK v3
- **郵件服務**：Nodemailer（SMTP / 演示模式自動切換）
- **日誌系統**：Pino v9 + Pino-HTTP（結構化日誌、敏感資訊遮蔽）
- **安全中間件**：Helmet v8 + express-rate-limit
- **AI 整合**：
  - vLLM（本地部署大型語言模型，反思分析、對話、摘要標題生成）
  - Google gemini-2.5-flash（Gemini Flash Thinking, Function Calling）
  - 自動容錯與降級機制

#### DevOps 基礎設施
- **容器化**：Docker + Docker Compose
- **CI/CD**：GitHub Actions（自動建構、遷移、部署）
- **反向代理**：Nginx
- **資料庫管理**：pgAdmin v4
- **對象儲存**：MinIO (S3 相容)
- **SSL/TLS**：Let's Encrypt + Certbot (生產環境)

### 系統架構圖

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │    │     Nginx       │    │   Express 後端  │
│   (Vite 構建)   │◄──►│  反向代理服務   │◄──►│   RESTful API   │
│   Port: 5173    │    │   Port: 80/443  │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        ▼
         ▼                        │              ┌─────────────────┐
┌─────────────────┐              │              │   PostgreSQL    │
│   Socket.io     │              │              │ (關聯式資料庫)  │
│   即時通訊服務  │              │              │   Port: 5432    │
└─────────────────┘              │              └─────────────────┘
                                  │                        │
                                  │                        ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │     MinIO       │    │    pgAdmin      │
                        │   對象儲存服務  │    │ (資料庫管理工具)│
                        │   Port: 9000    │    │   Port: 5555    │
                        └─────────────────┘    └─────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │  MinIO Console  │
                        │ (管理控制台)    │
                        │   Port: 9001    │
                        └─────────────────┘
```

---

## 🚀 快速開始

### 環境需求

- **Docker**: 20.10+ 和 Docker Compose 2.0+
- **Node.js**: 18+ (本地開發時需要)
- **Git**: 版本控制

### 1. 克隆專案並配置環境變數

```bash
# 克隆專案
git clone <repository-url>
cd SDLs_fullStack_remix

# 複製環境變數範本
cd sdl-backend-main
cp .env.example .env
```

編輯 `sdl-backend-main/.env` 檔案：

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

# AI 服務設定
VLLM_API_BASE=http://vllm:8000/v1  # vLLM 本地部署端點
GEMINI_API_KEY=your_gemini_api_key

# JWT 認證密鑰
JWT_SECRET=your_super_secret_key

# 郵件服務設定（密碼重設功能）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@sdl-platform.com
FRONTEND_URL=http://localhost

NODE_ENV=development
```

**🔒 安全提醒**：使用強密碼，不要將 `.env` 檔案提交到版本控制。

### 2. 啟動所有服務

```bash
# 返回專案根目錄
cd ..

# 啟動所有服務（首次啟動會自動下載並構建映像檔）
docker compose up -d

# 檢查服務狀態
docker compose ps
```

### 3. 初始化資料庫

```bash
# 執行資料庫遷移
docker compose exec api npm run migrate

# 檢查資料庫連線
docker compose exec postgres psql -U postgres -d postgres -c "\dt"
```

### 4. 驗證部署

訪問以下端點確認服務正常運行：

| 服務 | URL | 說明 |
|------|-----|------|
| **前端應用** | http://localhost | React 開發伺服器 |
| **後端 API** | http://localhost/api/health | 健康檢查端點 |
| **pgAdmin** | http://localhost:5555 | 資料庫管理工具 |
| **MinIO 控制台** | http://localhost:9001 | 檔案儲存管理 |

### 5. 生產環境部署（可選）

```bash
# 使用生產環境配置
docker compose -f docker-compose.prod.yml up -d

# 檢查生產環境狀態
docker compose -f docker-compose.prod.yml ps
```

---

## 📁 專案結構

```
SDLs_fullStack_remix/
├── sdl-frontend-main/          # React 前端應用
│   ├── src/
│   │   ├── components/         # 可重用組件庫（AuthImage, StageSelector...）
│   │   ├── pages/              # 頁面組件
│   │   │   ├── login/          # 登入/註冊/忘記密碼/重設密碼
│   │   │   ├── Kanban/         # 看板管理（含新手導覽）
│   │   │   ├── ideaWall/       # 想法牆（含新手導覽）
│   │   │   ├── reflection/     # 反思日誌系統
│   │   │   ├── student-dashboard/ # 學生儀表板
│   │   │   ├── teacher-dashboard/ # 教師儀表板
│   │   │   ├── StudentPortfolio/  # 學生學習歷程
│   │   │   └── ...
│   │   ├── hooks/              # 自定義 React Hooks
│   │   ├── api/                # API 呼叫層
│   │   ├── providers/          # Context Providers（Tracking）
│   │   └── utils/              # 工具函數（StorageService）
│   └── package.json
│
├── sdl-backend-main/           # Express.js 後端 API
│   ├── controllers/            # 業務邏輯控制器
│   │   ├── project/            # 專案相關（模組化拆分）
│   │   ├── teacherHelpSeekingController.js  # 求助行為分析
│   │   ├── passwordReset.js    # 密碼重設
│   │   └── ...
│   ├── models/                 # Sequelize 資料模型（46 個）
│   ├── routes/                 # API 路由定義
│   ├── middlewares/            # 中介軟體（認證、權限、Rate Limiting）
│   ├── services/               # 服務層
│   │   ├── helpSeekingAvoidanceService.js   # 求助迴避偵測
│   │   ├── helpSeekingEffectivenessService.js # 求助成效追蹤
│   │   ├── emailService.js     # 郵件服務
│   │   ├── auditService.js     # 審計服務
│   │   └── ...
│   ├── config/                 # 設定檔案
│   ├── migrations/             # 資料庫遷移檔案（62 個）
│   └── package.json
│
├── docs/                       # 詳細文檔目錄
│   ├── releases/               # 版本發佈報告
│   ├── reports/                # 功能實作報告
│   ├── guides/                 # 使用指南
│   ├── proposals/              # 功能提案
│   ├── architecture/           # 架構設計文檔
│   ├── frontend/               # 前端開發文檔
│   ├── backend/                # 後端開發文檔
│   └── ...
│
├── Reference/                  # 參考文檔
│   ├── HELP_SEEKING_IN_SRL_ANALYSIS.md  # 求助行為研究分析
│   └── ...
│
├── .github/                    # GitHub Actions CI/CD 配置
├── docker-compose.yml          # 開發環境容器配置
├── docker-compose.prod.yml     # 生產環境容器配置
├── docker-compose.dev.yml      # 進階開發配置
├── nginx.conf                  # Nginx 反向代理配置
├── .env                        # 環境變數（不要提交）
└── README.md                   # 本文件
```

**檢視完整檔案結構**：執行 `tree -L 3 -I 'node_modules|.git'`

---

## 📚 文檔導航

> 📂 **完整文檔索引**：[docs/README.md](docs/README.md) — 按分類瀏覽所有 53 份技術文檔

### 📖 核心文檔

| 文檔 | 說明 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | AI 輔助開發指南（程式碼規範、StorageService、設計系統規範） |
| [CHANGELOG.md](CHANGELOG.md) | 完整版本更新日誌（含 Migration 記錄） |
| [AI_ASSISTANT_GUIDE.md](Reference/AI_ASSISTANT_GUIDE.md) | AI 專案助理完整使用指南（Streaming、RAG 系統） |
| [HELP_SEEKING_IN_SRL_ANALYSIS.md](Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md) | 求助行為研究文獻分析 |

### 🚀 開發文檔

| 文檔 | 說明 |
|------|------|
| [REFRESH_TOKEN_IMPLEMENTATION.md](Reference/REFRESH_TOKEN_IMPLEMENTATION.md) | Refresh Token 實作說明 |
| [TOKENS_EXPLAINED.md](Reference/TOKENS_EXPLAINED.md) | Token 機制詳細說明 |
| [MONITORING.md](Reference/MONITORING.md) | 系統監控與日誌指南 |
| [SECURITY_AUDIT_REPORT.md](docs/reports/SECURITY_AUDIT_REPORT.md) | OWASP Top 10 安全審查報告 |
| [PASSWORD_RESET_SETUP.md](docs/backend/PASSWORD_RESET_SETUP.md) | 密碼重設功能設定指南 |

### 📊 功能實作報告

| 文檔 | 說明 |
|------|------|
| [HELP_SEEKING_IMPLEMENTATION.md](docs/backend/HELP_SEEKING_IMPLEMENTATION.md) | 求助行為分析系統後端實作 |
| [HELP_SEEKING_FRONTEND_IMPLEMENTATION.md](docs/frontend/HELP_SEEKING_FRONTEND_IMPLEMENTATION.md) | 求助行為分析前端實作 |
| [KB_COACH_IMPLEMENTATION.md](docs/reports/KB_COACH_IMPLEMENTATION.md) | KB Coach 知識建構教練（Gemini Function Calling） |
| [TEACHER_DASHBOARD_REDESIGN_PLAN.md](docs/frontend/TEACHER_DASHBOARD_REDESIGN_PLAN.md) | 教師儀表板重新設計規劃 |
| [PHASE3_IMPLEMENTATION_COMPLETE.md](docs/releases/PHASE3_IMPLEMENTATION_COMPLETE.md) | Phase 3 P1 審計追蹤（9 個追蹤點） |

### 🏗️ 架構與提案

| 文檔 | 說明 |
|------|------|
| [FOUR_STAGE_SRL_REFACTOR.md](docs/architecture/FOUR_STAGE_SRL_REFACTOR.md) | 四階段自我調整學習重構方案 |
| [KB.md](docs/architecture/KB.md) | Knowledge Building 理論架構 |
| [Improve-SDLS.md](docs/proposals/Improve-SDLS.md) | SDL 平台整體改進提案 |
| [TYPESCRIPT_MIGRATION_PLAN.md](docs/proposals/TYPESCRIPT_MIGRATION_PLAN.md) | TypeScript 務實遷移計畫 |

### 🛠️ 指南與修復

| 文檔 | 說明 |
|------|------|
| [TOKEN_CLEANUP_GUIDE.md](docs/guides/TOKEN_CLEANUP_GUIDE.md) | Token 清理指南 |
| [TRACKING_PROVIDER_GUIDE.md](docs/guides/TRACKING_PROVIDER_GUIDE.md) | 追蹤提供者整合指南 |
| [AUDIT_COVERAGE_REPORT.md](docs/reports/AUDIT_COVERAGE_REPORT.md) | 審計覆蓋率報告 |
| [STAGE_REFLECTION_GUIDE_V2.md](docs/guides/STAGE_REFLECTION_GUIDE_V2.md) | 階段反思指南 V2 |

---

## 🆕 最新更新

> 📜 **完整更新日誌**：[CHANGELOG.md](CHANGELOG.md)（含每個版本的資料庫 Migration 記錄）

### v3.3.0 (2026-03-04) — 求助分析、學校系統與登入改版

| 類別 | 重點更新 |
|------|----------|
| 🌟 **求助行為分析** | 求助品質量化、迴避風險偵測、成效追蹤、教師儀表板視圖（8 個 API 端點） |
| 🏫 **學校多租戶** | 學校資料模型、跨校觀摩隔離、註冊時學校搜尋 |
| 🔐 **登入系統改版** | 全新雙面板登入頁、註冊頁、忘記密碼、Email 密碼重設 |
| 📊 **教師儀表板** | 全新圖表系統（Recharts / Chart.js）、求助分析整合 |
| 🎓 **新手導覽** | 看板 / 想法牆 4 步驟互動式導覽 |
| 📋 **學習歷程匯出** | PDF 格式學生學習歷程匯出 |
| 🔒 **安全強化** | OWASP Top 10 修復、Rate Limiting、Helmet |
| ⚙️ **CI/CD** | GitHub Actions 併發控制、PostgreSQL 啟動等待、VITE 環境變數注入 |

### v3.2.0 (2026-02-11) — 儲存管理與知識建構系統

| 類別 | 重點更新 |
|------|----------|
| 🌟 **StorageService** | 統一儲存管理，取代 88+ 處 `localStorage`，命名空間 + 類型安全 |
| 🧠 **KB Coach** | Knowledge Building 12 原則 AI 教練，Gemini Function Calling |
| 📝 **結構化日誌** | Pino 高效能日誌，敏感資訊自動遮蔽 |
| ✨ **反思升級** | 階段選擇器、UI 差異化（雙卡片 + 智慧橫幅） |
| 💡 **Idea Improver 2.0** | Shadow Orchestrator 非侵入式 AI 監控 |
| 🔧 **審計 Phase 3 P1** | 9 個中等風險操作追蹤點 |

### v3.0.0 (2025-01-12) — 重大更新

| 類別 | 重點更新 |
|------|----------|
| ✨ **5Rs 反思** | 雙 AI 引擎（vLLM + Gemini）結構化反思分析 |
| 📊 **儀表板重構** | 2000+ 行 → 14-15 個模組 |
| 🗄️ **MinIO 遷移** | 對象儲存，效能提升 300% |
| 🔐 **Refresh Token** | 雙 Token 機制自動刷新 |

> 📖 更早版本（v2.1 ~ v2.3）：[Reference/versions/](Reference/versions/)

---

## 🔍 故障排除

### 常見問題快速解決

#### 1. Docker 服務啟動失敗

```bash
# 檢查 Docker 狀態
docker --version
docker compose --version

# 重新建構映像檔
docker compose build --no-cache

# 清理 Docker 資源
docker system prune -a
```

#### 2. 資料庫連線問題

```bash
# 檢查 PostgreSQL 服務狀態
docker compose logs postgres

# 進入資料庫容器檢查
docker compose exec postgres psql -U postgres -d postgres

# 重置資料庫
docker compose down -v
docker compose up postgres -d
```

#### 3. MinIO 檔案存取問題

```bash
# 檢查 MinIO 服務狀態
docker compose logs minio

# 測試 MinIO 連線
curl http://localhost:9000/minio/health/live

# 訪問 MinIO 控制台手動建立 bucket
# http://localhost:9001
```

#### 4. 前端無法連接後端

- 確認 `nginx.conf` 中的 `/api/` 路徑配置
- 檢查前端 API Base URL 是否正確（應為 `/api` 而非 `http://localhost:3000`）
- 查看瀏覽器 Console 是否有 CORS 錯誤

#### 5. AI 功能無法使用

```bash
# 確認環境變數
cat sdl-backend-main/.env | grep API_KEY

# 檢查後端日誌
docker compose logs -f api | grep -i "api\|gemini"
```

#### 6. 密碼重設郵件未收到

```bash
# 檢查郵件服務配置
cat sdl-backend-main/.env | grep EMAIL

# 查看後端郵件發送日誌
docker compose logs -f api | grep -i "email\|password reset"

# 演示模式下重設連結會輸出在後端日誌中
```

### 更多問題？

- 查看詳細故障排除指南：[Reference/general/CODE_REVIEW_CHECKLIST.md](Reference/general/CODE_REVIEW_CHECKLIST.md)
- 查看系統監控指南：[Reference/MONITORING.md](Reference/MONITORING.md)
- 提交 Issue：[GitHub Issues](https://github.com/Richie1129/SDLs_fullStack_remix/issues)

---

## 💻 本地開發

### 前端開發

```bash
cd sdl-frontend-main

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 執行測試
npm run test
```

### 後端開發

```bash
cd sdl-backend-main

# 安裝依賴
npm install

# 啟動開發伺服器（熱重載）
npm run dev

# 資料庫遷移
npm run migrate

# 查看遷移狀態
npm run migrate:status

# 還原資料庫遷移
npm run migrate:undo

# 執行測試
npm test
```

**開發規範與最佳實踐**：參考 [Reference/general/CODE_REVIEW_CHECKLIST.md](Reference/general/CODE_REVIEW_CHECKLIST.md)

---

## 🤝 貢獻指南

我們歡迎任何形式的貢獻！請遵循以下步驟：

### 開發流程

1. **Fork 專案**並建立功能分支
2. **遵循程式碼規範**與檔案命名約定
3. **撰寫測試**並確保測試通過
4. **提交 Pull Request**並詳細描述變更

### 程式碼規範

- **React 組件命名**：PascalCase（例如：`StudentDashboard`）
- **函式命名**：camelCase（例如：`fetchStudentData`）
- **常數命名**：UPPER_SNAKE_CASE（例如：`FIVE_R_FRAMEWORK`）
- **檔案命名**：kebab-case 或 PascalCase（例如：`student-dashboard.js` 或 `StudentDashboard.jsx`）

### 提交訊息規範

```
feat: 新增 AI 學習助手功能
fix: 修復檔案上傳問題
docs: 更新 API 文件
style: 調整 UI 樣式
refactor: 重構反思系統代碼
test: 新增單元測試
chore: 更新依賴套件
security: 修復安全弱點
```

---

## 📞 聯絡資訊

- **專案維護者**：蔡狄澄 Richie Tsai & 郭俊傑 Jack Kuo
- **問題回報**：[GitHub Issues](https://github.com/Richie1129/SDLs_fullStack_remix/issues)
- **功能建議**：[GitHub Discussions](https://github.com/Richie1129/SDLs_fullStack_remix/discussions)

---

## 📄 授權條款

本專案採用 MIT 授權條款，詳見 [LICENSE](LICENSE) 檔案。

---

## 🙏 致謝

感謝所有為 SDL Fullstack Remix 專案貢獻的開發者和教育研究者。本專案旨在推動數位學習創新，促進自主學習和科學探究的發展。

---

## 📈 專案特色亮點

### 🎓 教育研究價值
- **科學探究方法論**：完整實作五階段學習引導（定標 → 擇策 → 監評 → 調節 → 學習歷程）
- **5Rs 反思框架**：基於 Gibbs 反思循環的結構化反思模型
- **Knowledge Building 理論**：KB Coach 實踐 12 原則的知識建構教練系統
- **求助行為研究**：基於 Won (2024) 與 Li (2023) 研究的求助品質分析與迴避偵測
- **專案式學習 (PBL)**：完整的協作工具鏈支援

### 🔐 企業級安全設計
- **三級審計追蹤系統**：P0（最高風險）/ P1（中等風險）/ P2-P3（低風險）全方位操作記錄
- **JWT + Refresh Token**：雙 Token 機制，存取權杖 15 分鐘 + 更新權杖 7 天
- **RBAC 權限控制**：角色基礎存取控制（學生/教師/管理員）
- **敏感資訊保護**：Pino 日誌自動遮蔽 password, token, apiKey 等敏感欄位
- **OWASP Top 10 合規**：Rate Limiting、Helmet、參數驗證、安全標頭
- **安全密碼重設**：一次性加密 Token、使用後即刻銷毀、強制重新登入

### 🚀 效能與可維護性
- **模組化重構**：儀表板系統從 2000+ 行拆分為 14-15 個專業模組
- **統一儲存管理**：StorageService 取代 88+ 處直接 localStorage 操作
- **結構化日誌**：Pino 高效能日誌系統，生產環境零配置
- **MinIO 對象儲存**：S3 相容介面，效能提升 300%
- **CI/CD 自動化**：GitHub Actions 自動建構、遷移與部署

### 🤖 AI 技術整合
- **多模型協作**：vLLM (本地部署) + Gemini 2.5 Flash 雙引擎，自動容錯
- **Streaming 回應**：即時 AI 回應體驗，支援 Server-Sent Events
- **Function Calling**：Gemini 結構化輸出，保證 JSON 格式正確性
- **Shadow Orchestrator**：非侵入式 AI 監控與智能介入
- **AI 對話摘要**：vLLM 驅動的自動對話標題生成

---

*最後更新：2026-03-04 | 版本：v3.3.0*
