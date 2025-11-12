# SDL (Self-Directed Learning) 全端學習平台

> **🚀 2025 最新版本**：整合 AI 反思分析功能、模組化儀表板架構與 MinIO 檔案儲存系統

一個專為教育研究設計的智慧型自主學習平台，結合科學探究方法論、AI 輔助學習分析與現代化協作工具。

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
- [故障排除](#-故障排除)
- [貢獻指南](#-貢獻指南)

---

## ✨ 核心功能

### 🎯 學習引導系統
- **科學探究五階段引導**：定標 → 擇策 → 監評 → 調節 → 學習歷程
- **智慧看板管理**：拖拽式任務管理，即時協作同步
- **AI 學習助手**：基於 RAG 技術的個人化學習支援（[詳細指南](Reference/AI_ASSISTANT_GUIDE.md)）
- **數位作品集**：階段性學習成果展示與管理

### 🧠 AI 反思分析系統
- **5Rs 反思框架**：Reporting → Responding → Relating → Reasoning → Reconstructing
- **雙 AI 引擎支援**：GPT-4o-mini + Gemini-2.0-Flash，自動容錯機制
- **專業回饋生成**：針對每個反思層次提供個人化改進建議
- **學習品質評估**：自動分析反思深度與完整度

### 🤝 協作與交流
- **即時聊天系統**：專案群組、學習小組的即時通訊與檔案分享
- **互動問答平台**：師生問答、同儕互助的知識交流空間
- **創意想法牆**：腦力激盪與創意分享，支援節點關係視覺化
- **公告通知系統**：多層級、精準推播的資訊發佈平台

### 📊 智慧儀表板系統
- **學生儀表板**：個人學習概覽、團隊協作資訊、學習軌跡記錄
- **教師管理儀表板**：多視圖模式、學生個別追蹤、即時監控系統
- **教師總覽面板**：全局統計、跨專案進度監控、系統分析功能
- **響應式設計**：桌面版表格與移動版卡片雙重佈局

### 🔧 技術創新特色
- **統一檔案管理**：MinIO 對象儲存確保檔案安全與高可用性
- **即時協作同步**：基於 Socket.io 的高效能即時通訊
- **模組化架構**：前後端組件化設計，易於維護和擴展
- **Session 管理優化**：UUID + localStorage 持久化（[修復說明](Reference/SESSION_FIX_IMPLEMENTATION.md)）

---

## 🏗️ 技術架構

### 核心技術堆疊

#### 前端技術
- **基礎框架**：React 18.2.0 + Vite 5.0
- **UI 系統**：TailwindCSS + Styled Components
- **狀態管理**：React Query + Context API
- **資料視覺化**：Recharts, Vis Network, React Beautiful DnD
- **路由系統**：React Router DOM v6

#### 後端技術
- **核心框架**：Node.js + Express.js
- **資料庫**：PostgreSQL + Sequelize ORM v6
- **身份驗證**：JWT + Bcrypt（[Refresh Token 實作](Reference/REFRESH_TOKEN_IMPLEMENTATION.md)）
- **即時通訊**：Socket.io v4.6
- **檔案處理**：MinIO Object Storage + AWS SDK v3
- **AI 整合**：OpenAI GPT-4o-mini + Google Gemini-2.0-Flash

#### DevOps 基礎設施
- **容器化**：Docker + Docker Compose
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

# AI 服務 API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# JWT 認證密鑰
JWT_SECRET=your_super_secret_key

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
│   │   ├── components/         # 可重用組件庫
│   │   ├── pages/              # 頁面組件
│   │   ├── hooks/              # 自定義 React Hooks
│   │   ├── api/                # API 呼叫層
│   │   └── utils/              # 工具函數
│   └── package.json
│
├── sdl-backend-main/           # Express.js 後端 API
│   ├── controllers/            # 業務邏輯控制器
│   ├── models/                 # Sequelize 資料模型
│   ├── routes/                 # API 路由定義
│   ├── middlewares/            # 中介軟體
│   ├── services/               # 服務層
│   ├── config/                 # 設定檔案
│   ├── migrations/             # 資料庫遷移檔案
│   └── package.json
│
├── docs/                       # 詳細文檔目錄
│   ├── frontend/               # 前端開發文檔
│   ├── backend/                # 後端開發文檔
│   └── general/                # 通用文檔
│
├── docker-compose.yml          # 開發環境容器配置
├── docker-compose.prod.yml     # 生產環境容器配置
├── nginx.conf                  # Nginx 反向代理配置
├── .env                        # 環境變數（不要提交）
└── README.md                   # 本文件
```

**檢視完整檔案結構**：執行 `tree -L 3 -I 'node_modules|.git'`

---

## 📚 文檔導航

### 📖 核心文檔

| 文檔 | 說明 |
|------|------|
| [AI_ASSISTANT_GUIDE.md](Reference/AI_ASSISTANT_GUIDE.md) | AI 專案助理完整使用指南（Streaming、RAG 系統） |
| [SESSION_FIX_IMPLEMENTATION.md](Reference/SESSION_FIX_IMPLEMENTATION.md) | Session ID 管理修復實作總結 |
| [CLAUDE.md](CLAUDE.md) | Claude AI 輔助開發指南 |

### 🚀 開發文檔

| 文檔 | 說明 |
|------|------|
| [Reference/REFRESH_TOKEN_IMPLEMENTATION.md](Reference/REFRESH_TOKEN_IMPLEMENTATION.md) | Refresh Token 實作說明 |
| [Reference/TOKENS_EXPLAINED.md](Reference/TOKENS_EXPLAINED.md) | Token 機制詳細說明 |
| [Reference/MONITORING.md](Reference/MONITORING.md) | 系統監控與日誌指南 |
| [docs/backend/README.md](Reference/backend/BACKEND_API_README.md) | 後端 API 文檔 |

### 📊 版本更新

| 文檔 | 說明 |
|------|------|
| [Reference/versions/v2.3-stage-completion.md](Reference/versions/v2.3-stage-completion.md) | v2.3 階段完成功能 |
| [Reference/versions/v2.2-stage-aware.md](Reference/versions/v2.2-stage-aware.md) | v2.2 階段感知型 AI 助理 |
| [Reference/versions/v2.1-advisor-upgrade.md](Reference/versions/v2.1-advisor-upgrade.md) | v2.1 AI Advisor 升級 |

### 🛠️ 問題修復記錄

| 文檔 | 說明 |
|------|------|
| [Reference/reflection-log-permission-fix.md](Reference/reflection-log-permission-fix.md) | 反思日誌權限修復 |
| [Reference/frontend/LOGIN_FIX_TEST.md](Reference/frontend/LOGIN_FIX_TEST.md) | 登入功能修復測試 |
| [Reference/backend/FIXES_SUMMARY.md](Reference/backend/FIXES_SUMMARY.md) | 後端修復總結 |
| [Reference/general/IMPROVEMENTS_SUMMARY.md](Reference/general/IMPROVEMENTS_SUMMARY.md) | 系統改進總結 |

---

## 🆕 最新更新

### v3.0.0 (2025-01-12) - 重大更新

#### ✨ 新功能
- **5Rs 反思框架與 AI 智能分析功能**
  - 雙 AI 引擎支援（GPT-4o-mini + Gemini-2.0-Flash）
  - 結構化反思模型與專業回饋生成
- **儀表板系統模組化重構**
  - 學生儀表板：1000+ 行 → 14 個模組
  - 教師儀表板：2000+ 行 → 15 個專業模組
  - 響應式設計優化

#### 🗄️ 系統遷移
- **MinIO 檔案儲存系統**
  - 完全遷移至 MinIO 對象儲存
  - 效能提升 300%
  - 支援 PB 級檔案儲存

#### 🔧 技術改進
- **Session 管理優化**：UUID + localStorage 持久化（[詳情](Reference/SESSION_FIX_IMPLEMENTATION.md)）
- **AI 助理 Streaming 功能**：即時回應體驗（[指南](Reference/AI_ASSISTANT_GUIDE.md)）
- **Refresh Token 實作**：自動 Token 刷新機制（[說明](Reference/REFRESH_TOKEN_IMPLEMENTATION.md)）

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
docker compose logs -f api | grep -i "api\|gemini\|openai"
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

# 還原資料庫遷移
npm run migrate:undo
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

*最後更新：2025-01-13 | 版本：v3.0.0*
