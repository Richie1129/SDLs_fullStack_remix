# SDL (Self-Directed Learning) 全端學習平台

SDL 是一個面向教育研究與專案式學習（PBL）的智慧型學習平台，整合科學探究流程、AI 輔助分析與即時協作工具。

[![Version](https://img.shields.io/badge/version-v3.6.1-0ea5e9)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-required-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Node](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=1f2937)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deploy](https://github.com/Richie1129/SDLs_fullStack_remix/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/Richie1129/SDLs_fullStack_remix/actions/workflows/deploy.yml)

## 目錄

- [SDL (Self-Directed Learning) 全端學習平台](#sdl-self-directed-learning-全端學習平台)
  - [目錄](#目錄)
  - [這是什麼](#這是什麼)
  - [核心能力](#核心能力)
  - [技術堆疊](#技術堆疊)
  - [快速開始](#快速開始)
    - [1. 環境需求](#1-環境需求)
    - [2. 設定環境變數](#2-設定環境變數)
    - [3. 啟動服務](#3-啟動服務)
    - [4. 初始化資料庫](#4-初始化資料庫)
    - [5. 驗證服務](#5-驗證服務)
  - [常用開發指令](#常用開發指令)
    - [本地整體開發（推薦）](#本地整體開發推薦)
    - [前端](#前端)
    - [後端](#後端)
  - [文件導覽](#文件導覽)
  - [版本與更新](#版本與更新)
  - [故障排除](#故障排除)
  - [貢獻與授權](#貢獻與授權)

## 這是什麼

SDL 提供完整的學習與協作流程，包含：

- 科學探究五階段引導（定標、擇策、監評、調節、學習歷程）
- 任務看板、聊天室、想法牆的即時協作
- AI 學習助理與 5Rs 結構化反思分析
- 教師端求助行為分析與風險偵測

目標是把「學習歷程、協作歷程、反思歷程」整合成可追蹤、可分析、可回饋的教學與研究平台。

## 核心能力

- 學習引導：五階段流程、專案管理、學習歷程展示
- AI 支援：RAG、串流回應、KB Coach（Gemini Function Calling）
- 反思系統：傳統日誌 + 5Rs 結構化反思
- 教師分析：求助品質、求助成效、求助迴避風險
- 安全與治理：JWT + Refresh Token、RBAC、審計追蹤、敏感資料遮蔽

## 技術堆疊

- 前端：React 18、Vite 5、TailwindCSS、Socket.IO Client
- 後端：Node.js、Express、PostgreSQL、Sequelize v6、Socket.IO v4.6
- 儲存：MinIO（S3 相容）
- AI：vLLM（本地）+ gemini-3.1-flash-lite-preview（雲端）
- 部署：Docker Compose、Nginx、GitHub Actions

## 快速開始

### 1. 環境需求

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+（本地開發時）

### 2. 設定環境變數

```bash
cd sdl-backend-main
cp .env.example .env
```

請至少設定：

- `PG_PASSWORD`
- `JWT_SECRET`
- `MINIO_SECRET_KEY`
- `GEMINI_API_KEY`（若需啟用 Gemini）

### 3. 啟動服務

```bash
cd ..
docker compose up -d
docker compose ps
```

### 4. 初始化資料庫

```bash
docker compose exec api npm run migrate
```

### 5. 驗證服務

- 前端：<http://localhost>
- API 健康檢查：<http://localhost/api/health>
- pgAdmin：<http://localhost:5555>
- MinIO Console：<http://localhost:9001>

## 常用開發指令

### 本地整體開發（推薦）

```bash
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f front
```

### 前端

```bash
cd sdl-frontend-main
npm install
npm run dev
npm run build
npm test
```

### 後端

```bash
cd sdl-backend-main
npm install
npm run dev
npm run migrate
npm run migrate:status
npm test
```

## 文件導覽

完整索引請看 [docs/README.md](docs/README.md)。

- 開發規範與專案規則：[CLAUDE.md](CLAUDE.md)
- 版本變更紀錄：[CHANGELOG.md](CHANGELOG.md)
- AI 助理指南：[Reference/AI_ASSISTANT_GUIDE.md](Reference/AI_ASSISTANT_GUIDE.md)
- Token 機制：[Reference/REFRESH_TOKEN_IMPLEMENTATION.md](Reference/REFRESH_TOKEN_IMPLEMENTATION.md)
- 系統監控：[Reference/MONITORING.md](Reference/MONITORING.md)
- 求助行為研究：[Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md](Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md)

## 版本與更新

目前版本：`v3.6.1`（2026-04-10）

近期重點：

- 5Rs 漸進式反思重構：依學生填寫程度動態解鎖反思層次，AI 分層評估回饋
- 觀摩模式修復：修正無法查看專案與評論卡片的問題
- 響應式佈局優化：5Rs Modal 滾動、SubmitTask 寫作提示面板收合邏輯
- 安全全面加固：修復 19 項 CRITICAL + 17 項 HIGH 級別漏洞（Transaction、Row Lock、IDOR、Token Rotation）
- 想法牆 Optimistic Update 重構（Self-Echo 過濾 + DataSet 差量更新）
- 學習歷程 AI 寫作回饋（SSE 串流 + 敘事草稿自動儲存）

完整內容請查看 [CHANGELOG.md](CHANGELOG.md)。

## 故障排除

快速檢查：

```bash
docker compose ps
docker compose logs api --tail=200
docker compose logs postgres --tail=200
docker compose logs minio --tail=200
```

進一步排查文件：

- [Reference/MONITORING.md](Reference/MONITORING.md)
- [Reference/general/CODE_REVIEW_CHECKLIST.md](Reference/general/CODE_REVIEW_CHECKLIST.md)

## 貢獻與授權

- Issue 回報：[GitHub Issues](https://github.com/Richie1129/SDLs_fullStack_remix/issues)
- 功能討論：[GitHub Discussions](https://github.com/Richie1129/SDLs_fullStack_remix/discussions)
- 授權條款：[LICENSE](LICENSE)（MIT）

專案維護者：蔡狄澄 Richie Tsai、郭俊傑 Jack Kuo
