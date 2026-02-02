---
description: 開發環境設定標準流程與最佳實踐
---

# Dev Environment Setup 開發環境設定

## 概述

此 skill 提供開發環境設定的完整指引，確保團隊成員能快速、一致地建立開發環境。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 新進工程師、開發工程師 |
| **協作角色** | DevOps 工程師、技術主管 |

---

## 1. 系統需求

### 硬體需求

| 項目 | 最低需求 | 建議配置 |
|------|---------|---------|
| CPU | 4 核心 | 8 核心+ |
| RAM | 8 GB | 16 GB+ |
| 硬碟 | 50 GB SSD | 100 GB+ NVMe |

### 作業系統支援

| 作業系統 | 版本 | 支援狀態 |
|---------|------|---------|
| macOS | 12.0+ | ✅ 完整支援 |
| Windows | 11 / 10 (WSL2) | ✅ 完整支援 |
| Ubuntu | 22.04 LTS | ✅ 完整支援 |

---

## 2. 基礎工具安裝

### macOS 環境

```bash
# 安裝 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 基礎工具
brew install git curl jq

# 版本管理
brew install asdf

# 容器工具
brew install --cask docker
brew install docker-compose kubectl

# IDE
brew install --cask visual-studio-code
```

### Windows (WSL2)

```powershell
# 啟用 WSL2
wsl --install -d Ubuntu-22.04

# 安裝工具
winget install Microsoft.VisualStudioCode
winget install Docker.DockerDesktop
```

### 版本管理（asdf）

```bash
# 安裝 plugins
asdf plugin add nodejs
asdf plugin add python

# 安裝版本
asdf install nodejs 20.10.0
asdf global nodejs 20.10.0

# 專案版本控制
echo "nodejs 20.10.0" > .tool-versions
```

---

## 3. 專案初始化

### 快速設定腳本

```bash
#!/bin/bash
# scripts/setup-project.sh

set -e

echo "🚀 Setting up project..."

# 檢查先決條件
command -v node &> /dev/null || { echo "❌ Node.js required"; exit 1; }
command -v docker &> /dev/null || { echo "❌ Docker required"; exit 1; }

# 安裝依賴
npm ci

# 設定環境變數
[ ! -f .env ] && cp .env.example .env

# 啟動資料庫
docker-compose up -d postgres redis

# 執行遷移
npm run db:migrate

echo "✅ Setup complete! Run: npm run dev"
```

### 環境變數

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://dev:devpassword@localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
```

---

## 4. Docker 開發環境

### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: myapp_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
```

### 常用命令

```bash
# 啟動服務
docker-compose -f docker-compose.dev.yml up -d

# 查看日誌
docker-compose logs -f postgres

# 進入容器
docker exec -it myapp-postgres psql -U dev -d myapp_dev

# 清理
docker-compose down -v
```

---

## 5. IDE 設定 (VS Code)

### settings.json

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2
}
```

### 建議擴充套件

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "eamodio.gitlens",
    "ms-azuretools.vscode-docker",
    "prisma.prisma"
  ]
}
```

### Debug 設定

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:debug"],
      "port": 9229
    }
  ]
}
```

---

## 6. 問題排解

### 診斷腳本

```bash
#!/bin/bash
echo "🔍 Environment diagnostics..."

# Node.js
node --version || echo "❌ Node.js not installed"

# Docker
docker info &> /dev/null && echo "✅ Docker running" || echo "❌ Docker not running"

# 資料庫
pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL not accessible"
```

### 常見問題

| 問題 | 解決方案 |
|------|---------|
| 埠號被佔用 | `lsof -i :3000` 找出並終止 |
| npm install 失敗 | `rm -rf node_modules && npm ci` |
| Docker 無法啟動 | 確認 Docker Desktop 已啟動 |
| 資料庫連線失敗 | `docker-compose up -d postgres` |

---

## 檢查清單

### 新人入職
- [ ] 取得專案存取權限
- [ ] 安裝必要軟體
- [ ] Clone 專案並執行設定
- [ ] 驗證環境可運行
- [ ] 完成第一個任務

---

## 相關 Skills

- [coding-standards.md](./coding-standards.md) - 程式碼規範
- [git-workflow.md](./git-workflow.md) - Git 工作流程
