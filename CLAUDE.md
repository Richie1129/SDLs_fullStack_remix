# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 模型使用規則

| 情境 | 使用模型 |
|------|----------|
| 問題分析、規劃、架構設計、研究調查 | `opus`（透過 Agent tool 指定 `model: "opus"`） |
| 程式碼實作、檔案編輯、bug 修復、簡單搜尋 | `sonnet`（預設，不需切換） |

## 專案概述

SDL (Self-Directed Learning) 全端學習平台，結合科學探究五階段方法論（定標→擇策→監評→調節→學習歷程）、AI 輔助學習分析與協作工具。

**技術堆疊:** React 18 + Vite 5 + TailwindCSS + Socket.io | Node.js + Express + PostgreSQL + Sequelize v6 + Socket.io v4.6 | MinIO | Google Gemini | Docker Compose + Nginx

## 常用開發指令

```bash
# 本地開發（主要指令）— 所有 docker compose 指令都需加 -f docker-compose.dev.yml
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml logs -f api     # 後端日誌
docker compose -f docker-compose.dev.yml restart api     # 重啟服務
docker exec sdl_dev-api-1 npm run migrate                # 執行遷移

# 前端（sdl-frontend-main/）
npm run dev          # 開發伺服器
npm run build        # 生產建構
npm test             # 測試

# 後端（sdl-backend-main/）
npm run dev          # nodemon 開發伺服器
npm run migrate      # 執行遷移
npm run migrate:undo # 回滾遷移
```

## 設計系統

**必須遵循 `sdl-frontend-main/DESIGN_SYSTEM.md`。** 以下是最常違反的規則：

- 間距用語意化 token（`p-component-md`, `gap-stack-sm`），**禁止任意數值**
- 字體用語意化大小（`text-h1` ~ `text-caption`），**禁止固定數值**
- Hover 效果用 `hover:bg-xxx/90 hover:shadow-lg`，**禁止 `scale` 或 `translateY`**
- 動畫速度用 `duration-fast`/`duration-normal`/`duration-slow`
- 響應式必須包含 `md:` 中間斷點，**禁止從 sm 直接跳 lg**
- **UI/UX 佈局變更必須同步調整各裝置尺寸** — 任何新增或修改佈局（間距、高度、寬度、flex 配置等），都必須確認 sm / md / lg 斷點下的表現，不能只寫一個固定值

## Skills

| 指令 | 用途 |
|------|------|
| `/commit` | 繁體中文 commit + push + 驗證 |
| `/debug` | 收集 Docker/DB/env 環境快照 |
| `/feature <描述>` | 確認互動模型與受影響檔案 |
| `/auth-sync` | 比對並同步 auth 頁面樣式 |

## Git 規範

- commit 訊息一律**繁體中文**（技術術語除外）
- 使用 `/commit` skill 執行完整流程
- push 後用 `git log --oneline -1` 與 `git ls-remote origin HEAD` 比對 hash 確認同步

## 程式碼規範

### 最高原則：不能影響現有資料

任何修復或重構：
- 確保現有資料完整性不受影響
- 新增驗證須向下相容既有資料
- DB schema 變更須提供可回滾的 migration
- API 回應格式變更須同步前端所有使用處

### 專案特有規則

- **禁止使用「§」符號**（包含文件、commit 訊息、程式註解）— 章節引用改寫「第 N 節」「第 N.M 節」；遇到既有文件含 §，一併改掉
- **未來工作寫 `future-list.md`**（專案根目錄）— 「目前不做、未來可能做」的項目統一進此檔，不要再另外在 plan 文件開 backlog 章節；plan 文件最多寫「詳見 `future-list.md` F00X」引用
- **禁止在 UI 使用 emoji** — 圖示一律用 `react-icons`
- **Auth 頁面一致性** — 修改 `Login.jsx`/`Register.jsx`/`ForgotPassword.jsx`/`ResetPassword.jsx` 任一頁時，主動同步其他頁面（共用 `customgreen` + `duration-normal` + `h-screen overflow-hidden`）
- **多步驟 UX** — 實作前先確認：預填選取 vs 自動執行？按鈕文字？
- **禁止 JSX 內 IIFE** — 變數提取放 return 之前的 const

### 資料庫 seed 腳本

撰寫前必須：讀 model 列出 `allowNull: false` 必填欄位 → 確認來源資料皆有值 → 先跑 3 筆測試

## 實作前的強制思考

撰寫跨層功能前，先輸出防禦清單：
- error path 是什麼？
- 涉及哪些跨層邊界？資料格式/ID 會變嗎？
- 依賴了哪些外部假設？（事件名稱、payload 結構、另一層的行為）

## 實作後的自我審查

- Error path 是否有接線漏掉（寫了 rollback 但沒呼叫者）
- 假設是否已驗證（實際讀過對應程式碼）
- 跨層狀態是否一致（ID 替換、快取更新）

發現問題直接修正，不輸出有已知缺陷的版本。

**正式 Code Review**：使用 Agent tool 執行 `everything-claude-code:code-reviewer`。

## 已知地雷

- **Socket 事件名稱**：前端 listener 必須實際讀 handler 確認，不得假設命名規則
- **樂觀更新回滾**：error payload 必須包含 tempId，前端才能定位要回滾的節點
- **React Query ↔ vis-network ID 同步**：confirmCreate 的 tempId→realId 替換會被 diff 解讀成「刪除＋新增」，需特別處理
- **Error handler 接線**：寫了 rollback 函式後，同一個 PR 必須確認有地方呼叫它
