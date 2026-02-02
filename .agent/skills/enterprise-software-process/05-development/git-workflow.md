---
description: 定義 Git 分支策略、Commit 規範和協作流程
---

# Git 工作流程 (Git Workflow)

## 概述
此 skill 協助建立標準化的 Git 工作流程，包括分支策略、Commit 訊息規範、Pull Request 流程、版本發布流程和團隊協作最佳實踐，確保程式碼管理有序且易於追蹤。

## 適用角色
- **主要負責**: 技術主管、所有開發人員
- **協作角色**: DevOps 工程師、QA 工程師

## 輸入需求
使用者需要提供：
- 團隊規模和組織結構
- 發布頻率和週期
- 環境配置（開發、測試、生產）
- 現有 Git 流程（如有）
- CI/CD 整合需求

範例：`請幫我制定適合 [團隊規模] 團隊的 Git 工作流程`

## 執行步驟

### 步驟 1: 選擇分支策略
- 評估團隊規模和發布頻率
- 選擇合適的分支模型（Git Flow、GitHub Flow、Trunk-Based）
- 定義各分支的用途和生命週期

### 步驟 2: 制定 Commit 規範
- 選擇 Commit 訊息格式（Conventional Commits）
- 定義 Commit 類型和範圍
- 設定 Commit 驗證規則

### 步驟 3: 定義 PR 流程
- 建立 PR 模板
- 設定審核規則和核准者
- 定義合併策略

### 步驟 4: 規劃版本發布
- 定義版本號規則（Semantic Versioning）
- 建立發布檢查清單
- 設計 Hotfix 流程

### 步驟 5: 設定自動化
- 配置 Git Hooks
- 整合 CI/CD
- 設定自動化檢查

## 輸出模板

```markdown
# Git 工作流程文件

**專案名稱**: [專案名稱]  
**版本**: 1.0  
**文件日期**: YYYY-MM-DD  
**負責人**: [技術主管]  
**狀態**: 草稿 / 已核准

---

## 目錄

1. [分支策略](#1-分支策略)
2. [Commit 規範](#2-commit-規範)
3. [Pull Request 流程](#3-pull-request-流程)
4. [版本發布](#4-版本發布)
5. [Hotfix 流程](#5-hotfix-流程)
6. [最佳實踐](#6-最佳實踐)
7. [Git 指令參考](#7-git-指令參考)
8. [常見問題](#8-常見問題)

---

## 1. 分支策略

### 1.1 分支模型選擇

**採用**: GitHub Flow（簡化版）

**理由**:
- ✅ 適合持續部署
- ✅ 流程簡單易懂
- ✅ 適合中小型團隊
- ✅ 支援快速迭代

### 1.2 分支類型

#### 主分支（Long-lived Branches）

##### main（或 master）
- **用途**: 生產環境程式碼
- **保護**: ✅ 受保護，禁止直接推送
- **部署**: 自動部署到生產環境
- **穩定性**: 必須隨時可部署
- **規則**:
  - 只能通過 PR 合併
  - 需要至少 2 人審核
  - 必須通過所有 CI 檢查
  - 必須通過 QA 驗證

##### develop（可選）
- **用途**: 開發整合分支
- **保護**: ✅ 受保護
- **部署**: 自動部署到測試環境
- **規則**:
  - 只能通過 PR 合併
  - 需要至少 1 人審核
  - 必須通過 CI 檢查

#### 功能分支（Short-lived Branches）

##### feature/*
- **命名**: `feature/user-authentication`, `feature/order-management`
- **來源**: 從 `main` 或 `develop` 分支
- **合併到**: `develop` 或 `main`
- **生命週期**: 1-7 天
- **命名規則**:
  ```
  feature/[issue-number]-[brief-description]
  
  範例:
  feature/123-add-login-page
  feature/456-implement-payment-gateway
  ```

##### bugfix/*
- **命名**: `bugfix/fix-login-error`, `bugfix/correct-calculation`
- **來源**: 從 `develop` 分支
- **合併到**: `develop`
- **生命週期**: 1-3 天

##### hotfix/*
- **命名**: `hotfix/critical-security-fix`
- **來源**: 從 `main` 分支
- **合併到**: `main` 和 `develop`
- **優先級**: 🔴 最高
- **生命週期**: 幾小時內

##### release/*
- **命名**: `release/v1.2.0`
- **來源**: 從 `develop` 分支
- **合併到**: `main` 和 `develop`
- **用途**: 準備新版本發布

### 1.3 分支生命週期圖

```
main (生產)     ─────●─────────────●──────────●────→
                      ↑             ↑          ↑
                      │             │          │
develop (開發)  ──●───┴───●─────●───┴──●───────┴───→
                  │       ↑     ↑      ↑
                  │       │     │      │
feature/login     └───●───┘     │      │
                                │      │
feature/payment        ─────●───┘      │
                                       │
bugfix/error-fix              ─────●───┘
```

### 1.4 分支保護規則

**main 分支**:
```yaml
保護設定:
  - 禁止直接推送: true
  - 需要 PR 審核: true
  - 最少審核人數: 2
  - 審核者不可為作者: true
  - 需要通過狀態檢查: true
  - 需要最新分支: true
  - 禁止強制推送: true
  - 禁止刪除: true
```

**develop 分支**:
```yaml
保護設定:
  - 禁止直接推送: true
  - 需要 PR 審核: true
  - 最少審核人數: 1
  - 需要通過狀態檢查: true
  - 禁止強制推送: true
```

---

## 2. Commit 規範

### 2.1 Conventional Commits

**格式**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**範例**:
```
feat(auth): add login functionality

Implement user authentication using JWT tokens.
Add login form component and API integration.

Closes #123
```

### 2.2 Commit 類型（Type）

| Type | 說明 | 範例 |
|------|------|------|
| feat | 新功能 | `feat(user): add user profile page` |
| fix | 修正 Bug | `fix(api): correct data validation error` |
| docs | 文件變更 | `docs(readme): update installation guide` |
| style | 格式調整（不影響程式碼執行） | `style: format code with prettier` |
| refactor | 重構（不是新功能也不是修 Bug） | `refactor(auth): simplify login logic` |
| perf | 效能優化 | `perf(api): optimize database queries` |
| test | 新增或修改測試 | `test(user): add unit tests for UserService` |
| chore | 雜項（建置工具、依賴更新等） | `chore: update dependencies` |
| ci | CI/CD 變更 | `ci: add automated deployment workflow` |
| build | 建置系統變更 | `build: update webpack config` |
| revert | 回退 Commit | `revert: revert "feat: add new feature"` |

### 2.3 Scope（範圍）

**常見範圍**:
- `auth`: 認證模組
- `api`: API 相關
- `ui`: 使用者介面
- `db`: 資料庫
- `config`: 配置檔案
- `deps`: 依賴套件

**範例**:
```
feat(auth): add OAuth login
fix(api): handle timeout errors
docs(readme): update API documentation
```

### 2.4 Subject（主旨）

**規則**:
- 使用現在式、祈使語氣（"add" 不是 "added" 或 "adds"）
- 不要大寫首字母（除非是專有名詞）
- 結尾不要句號
- 限制在 50 字元內

**範例**:
```
✅ 好:
add user authentication
fix memory leak in UserService
update API documentation

❌ 不好:
Added user authentication.
Fixes memory leak
Updated the API documentation.
```

### 2.5 Body（內文）

**規則**:
- 與 subject 空一行
- 72 字元換行
- 說明「什麼」和「為什麼」，而非「如何」

**範例**:
```
fix(auth): prevent token expiry race condition

Previously, the token refresh mechanism had a race condition where
multiple requests could trigger simultaneous refresh attempts,
causing some requests to fail.

This fix implements a mutex lock to ensure only one refresh
operation occurs at a time.
```

### 2.6 Footer（頁尾）

**用途**:
- 關聯 Issue
- 標註 Breaking Changes

**範例**:
```
Closes #123
Fixes #456, #789

BREAKING CHANGE: API endpoint `/users` now requires authentication.
Clients must include a valid JWT token in the Authorization header.
```

### 2.7 完整 Commit 範例

```
feat(api): add user search endpoint

Implement a new REST API endpoint for searching users by name, email,
or role. The endpoint supports pagination and filtering.

Features:
- Fuzzy search on name and email fields
- Role-based filtering
- Pagination with configurable page size
- Sorting by multiple fields

Performance considerations:
- Added database indexes on frequently searched fields
- Implemented query result caching (5-minute TTL)

Closes #234
Refs #456

BREAKING CHANGE: The old `/search-users` endpoint is deprecated and
will be removed in v2.0. Migrate to `/users/search` instead.
```

---

## 3. Pull Request 流程

### 3.1 建立 PR 前檢查清單

- [ ] 程式碼符合 Coding Standards
- [ ] 所有測試通過
- [ ] 新功能有對應的測試
- [ ] 更新相關文件
- [ ] Commit 訊息符合規範
- [ ] 沒有合併衝突
- [ ] 已在本地測試功能

### 3.2 PR 標題規範

**格式**: 與 Commit 訊息相同

```
feat(auth): add OAuth2 login support
fix(api): resolve data validation error
docs: update API documentation
```

### 3.3 PR 描述模板

```markdown
## 變更摘要
[簡要描述此 PR 的變更內容]

## 變更類型
- [ ] 🚀 新功能 (feature)
- [ ] 🐛 Bug 修正 (fix)
- [ ] 📝 文件變更 (docs)
- [ ] 💎 程式碼重構 (refactor)
- [ ] ⚡ 效能優化 (perf)
- [ ] ✅ 測試 (test)
- [ ] 🔧 其他 (chore)

## 相關 Issue
Closes #[issue_number]

## 變更詳情
### 新增
- [新增的功能或檔案]

### 修改
- [修改的功能或檔案]

### 刪除
- [刪除的功能或檔案]

## 測試
### 測試步驟
1. [步驟 1]
2. [步驟 2]
3. [步驟 3]

### 測試結果
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] 手動測試通過

## 截圖/影片（如適用）
[貼上截圖或影片連結]

## 檢查清單
- [ ] 程式碼遵循專案規範
- [ ] 已新增/更新測試
- [ ] 已更新文件
- [ ] 無合併衝突
- [ ] CI 檢查通過

## 額外說明
[其他需要說明的資訊]
```

### 3.4 PR 審核流程

```
1. 開發者建立 PR
   ↓
2. 自動 CI 檢查
   - 程式碼風格檢查
   - 單元測試
   - 整合測試
   - 安全掃描
   ↓
3. Code Review（至少 1-2 人）
   - 邏輯正確性
   - 程式碼品質
   - 效能影響
   - 安全性
   ↓
4. 修改回饋（如需要）
   ↓
5. 核准（Approve）
   ↓
6. 合併到目標分支
   ↓
7. 刪除功能分支
   ↓
8. 自動部署（如配置）
```

### 3.5 Code Review 指南

#### 審核者責任
- 在 24 小時內回應 PR
- 提供建設性回饋
- 檢查程式碼邏輯和品質
- 確認測試覆蓋率

#### 審核重點
- **功能性**: 是否符合需求
- **可讀性**: 程式碼是否易懂
- **可維護性**: 是否易於修改
- **效能**: 是否有效能問題
- **安全性**: 是否有安全漏洞
- **測試**: 測試是否充分

#### 回饋類型標籤
```
💬 Comment: 普通意見或問題
🔧 Suggestion: 改進建議（非必須）
⚠️ Issue: 需要修正的問題
🚨 Blocker: 必須修正才能合併
✅ Approved: 核准
```

### 3.6 合併策略

**採用**: Squash and Merge（推薦）

**理由**:
- ✅ 保持 main 分支歷史清晰
- ✅ 每個 PR 一個 Commit
- ✅ 易於追蹤和回退

**其他選項**:
- **Merge Commit**: 保留所有 Commit 歷史（適合大型功能）
- **Rebase and Merge**: 線性歷史（適合小型變更）

---

## 4. 版本發布

### 4.1 語意化版本（Semantic Versioning）

**格式**: `MAJOR.MINOR.PATCH`

**範例**: `v1.2.3`

**規則**:
- **MAJOR** (1.x.x): 不相容的 API 變更
- **MINOR** (x.2.x): 新增功能（向後相容）
- **PATCH** (x.x.3): Bug 修正（向後相容）

**範例**:
```
v1.0.0 → v1.0.1: 修正 Bug
v1.0.1 → v1.1.0: 新增功能
v1.1.0 → v2.0.0: 破壞性變更
```

### 4.2 發布流程

```
1. 建立 release 分支
   git checkout -b release/v1.2.0 develop

2. 更新版本號
   - package.json
   - CHANGELOG.md
   - 其他配置檔案

3. 提交版本更新
   git commit -m "chore: bump version to 1.2.0"

4. 建立 PR 到 main
   - 標題: "Release v1.2.0"
   - 包含 Changelog

5. 測試和驗證
   - 完整測試
   - UAT

6. 合併到 main
   git checkout main
   git merge --no-ff release/v1.2.0

7. 建立 Git Tag
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0

8. 合併回 develop
   git checkout develop
   git merge --no-ff release/v1.2.0

9. 刪除 release 分支
   git branch -d release/v1.2.0

10. 部署到生產環境
```

### 4.3 Changelog 格式

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] - 2024-01-18

### Added
- User authentication with OAuth2 support
- Search functionality with fuzzy matching
- Export data to CSV format

### Changed
- Improved API response time by 40%
- Updated UI design for better UX
- Upgraded dependencies to latest versions

### Fixed
- Fixed memory leak in background service
- Corrected date formatting in reports
- Resolved CORS issue in production

### Security
- Patched XSS vulnerability in user input
- Updated authentication token expiry

### Deprecated
- `/api/old-endpoint` will be removed in v2.0

### Removed
- Removed legacy compatibility code

## [1.1.0] - 2024-01-01
...
```

---

## 5. Hotfix 流程

### 5.1 緊急修正流程

```
1. 從 main 建立 hotfix 分支
   git checkout -b hotfix/fix-critical-bug main

2. 修正問題
   [實作修正]

3. 測試驗證
   [確保修正有效]

4. 更新版本號（PATCH）
   v1.2.0 → v1.2.1

5. 提交
   git commit -m "fix: resolve critical security issue"

6. 合併到 main
   git checkout main
   git merge --no-ff hotfix/fix-critical-bug

7. 建立 Tag
   git tag -a v1.2.1 -m "Hotfix: critical security fix"

8. 合併到 develop
   git checkout develop
   git merge --no-ff hotfix/fix-critical-bug

9. 刪除 hotfix 分支
   git branch -d hotfix/fix-critical-bug

10. 立即部署
```

### 5.2 Hotfix 時間要求

| 嚴重性 | 回應時間 | 修正時間 | 部署時間 |
|--------|---------|---------|---------|
| 🔴 Critical | 15 分鐘 | 2 小時 | 立即 |
| 🟡 High | 1 小時 | 4 小時 | 當天 |
| 🟢 Medium | 4 小時 | 1 天 | 下次發布 |

---

## 6. 最佳實踐

### 6.1 Commit 最佳實踐

**頻繁 Commit**:
```bash
# ✅ 好：小而頻繁的 Commit
git commit -m "feat(api): add user model"
git commit -m "feat(api): add user repository"
git commit -m "feat(api): add user service"

# ❌ 不好：一次大 Commit
git commit -m "feat: implement entire user module"
```

**原子性 Commit**:
```bash
# ✅ 好：每個 Commit 只做一件事
git commit -m "fix(auth): resolve token expiry issue"

# ❌ 不好：混合多個變更
git commit -m "fix auth and update docs and refactor code"
```

### 6.2 分支管理

**及時刪除已合併分支**:
```bash
# 查看已合併的分支
git branch --merged

# 刪除本地分支
git branch -d feature/old-feature

# 刪除遠端分支
git push origin --delete feature/old-feature
```

**保持分支更新**:
```bash
# 定期從 main 更新功能分支
git checkout feature/my-feature
git rebase main  # 或 git merge main
```

### 6.3 避免的做法

**❌ 不要直接推送到 main**:
```bash
# 錯誤
git push origin main

# 正確：通過 PR
# 1. 推送到功能分支
# 2. 建立 Pull Request
# 3. Code Review
# 4. 合併
```

**❌ 不要強制推送到共享分支**:
```bash
# 危險！
git push -f origin develop

# 只在個人分支可以使用
git push -f origin feature/my-branch
```

**❌ 不要 Commit 敏感資訊**:
```bash
# 絕不 commit:
# - .env 檔案
# - 密碼或 API Key
# - 個人資訊

# 使用 .gitignore
echo ".env" >> .gitignore
```

---

## 7. Git 指令參考

### 7.1 日常操作

```bash
# 建立並切換分支
git checkout -b feature/new-feature

# 查看狀態
git status

# 暫存變更
git add .
git add specific-file.js

# 提交
git commit -m "feat: add new feature"

# 推送
git push origin feature/new-feature

# 拉取最新
git pull origin main

# 切換分支
git checkout main
```

### 7.2 分支管理

```bash
# 列出所有分支
git branch -a

# 刪除本地分支
git branch -d feature/old-feature

# 刪除遠端分支
git push origin --delete feature/old-feature

# 重新命名分支
git branch -m old-name new-name
```

### 7.3 歷史查看

```bash
# 查看 Commit 歷史
git log
git log --oneline
git log --graph --oneline --all

# 查看特定檔案的歷史
git log -- path/to/file

# 查看變更
git diff
git diff main feature/new-feature
```

### 7.4 復原操作

```bash
# 復原未暫存的變更
git checkout -- file.js

# 復原已暫存的變更
git reset HEAD file.js

# 修改最後一次 Commit
git commit --amend

# 回退 Commit（保留變更）
git reset --soft HEAD~1

# 回退 Commit（不保留變更）
git reset --hard HEAD~1

# 回退特定 Commit
git revert <commit-hash>
```

### 7.5 進階操作

```bash
# Rebase
git rebase main
git rebase -i HEAD~3  # 互動式 rebase

# Squash Commits
git rebase -i HEAD~3
# 在編輯器中將 "pick" 改為 "squash"

# Cherry-pick
git cherry-pick <commit-hash>

# Stash（暫存工作區）
git stash
git stash pop
git stash list
```

---

## 8. 常見問題

### Q1: 如何處理合併衝突？

```bash
# 1. 拉取最新變更
git pull origin main

# 2. 解決衝突
# 手動編輯衝突檔案，移除衝突標記
<<<<<<< HEAD
你的變更
=======
別人的變更
>>>>>>> main

# 3. 標記為已解決
git add conflict-file.js

# 4. 完成合併
git commit
```

### Q2: 不小心 Commit 到錯誤的分支？

```bash
# 1. 複製 Commit hash
git log  # 找到 commit hash

# 2. 切換到正確的分支
git checkout correct-branch

# 3. Cherry-pick 該 Commit
git cherry-pick <commit-hash>

# 4. 回到錯誤的分支並回退
git checkout wrong-branch
git reset --hard HEAD~1
```

### Q3: 如何修改已推送的 Commit 訊息？

```bash
# 如果尚未有人基於此 Commit 工作：
git commit --amend
git push -f origin feature-branch

# 如果已有人基於此工作：
# 不建議修改，而是建立新 Commit 補充說明
```

### Q4: 如何同步 Fork 的專案？

```bash
# 1. 添加上游遠端
git remote add upstream https://github.com/original/repo.git

# 2. 拉取上游變更
git fetch upstream

# 3. 合併到本地 main
git checkout main
git merge upstream/main

# 4. 推送到你的 Fork
git push origin main
```

---

## 附錄

### A. Git Hooks 配置

#### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# 執行 Linter
npm run lint

# 執行測試
npm test

# 檢查 Commit 訊息格式（在 commit-msg hook）
```

#### Commit-msg Hook
```bash
#!/bin/sh
# .git/hooks/commit-msg

commit_msg=$(cat $1)
pattern="^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,50}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo "錯誤: Commit 訊息格式不符合規範"
  echo "格式: <type>(<scope>): <subject>"
  exit 1
fi
```

### B. .gitignore 模板

```gitignore
# 依賴
node_modules/
vendor/

# 環境變數
.env
.env.local
.env.production

# 日誌
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# 作業系統
.DS_Store
Thumbs.db

# 建置產物
dist/
build/
*.min.js
*.min.css

# 測試
coverage/
.nyc_output/
```

### C. 推薦工具

- **Git GUI**: GitKraken, SourceTree, GitHub Desktop
- **Commit 輔助**: Commitizen
- **Changelog 生成**: conventional-changelog
- **Hooks 管理**: Husky
- **Commit 驗證**: commitlint

---

**最後更新**: YYYY-MM-DD  
**版本**: 1.0  
**維護者**: [技術主管]
```

---

## 品質檢查清單

- [ ] 分支策略明確且適合團隊
- [ ] Commit 規範詳細且有範例
- [ ] PR 流程完整可執行
- [ ] 版本發布流程清晰
- [ ] Hotfix 流程明確且有時間要求
- [ ] 提供完整的 Git 指令參考
- [ ] 有常見問題解答
- [ ] 包含自動化工具配置
- [ ] 已由團隊審核並同意

---

## 相關 Skills
- `coding-standards.md` - 程式碼規範（配合使用）
- `code-review.md` - 程式碼審查（PR Review）
- `cicd-pipeline.md` - CI/CD 管線（自動化整合）
- `release-plan.md` - 發布計畫（版本發布）

---

## 範例

### 輸入範例
```
請幫我制定適合 15 人團隊的 Git 工作流程，
每週發布一次，使用 GitHub。
```

### 輸出範例
[生成完整工作流程文件，包含：]
- **分支策略**: GitHub Flow + develop 分支
- **Commit 規範**: Conventional Commits
- **PR 流程**: 至少 2 人審核，Squash Merge
- **發布流程**: 每週五從 develop 發布到 main
- **Hotfix 流程**: 緊急修正流程和時間要求
- **自動化**: Husky + commitlint + GitHub Actions
