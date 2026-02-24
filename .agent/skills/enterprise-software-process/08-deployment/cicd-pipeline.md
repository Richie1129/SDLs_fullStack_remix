---
description: 建立 CI/CD 管線，實現自動化建置、測試和部署
---

# CI/CD 管線 (CI/CD Pipeline)

## 概述
此 skill 協助設計和實作完整的 CI/CD 管線，涵蓋持續整合（CI）、持續交付（CD）和持續部署的各個階段，包括程式碼檢查、自動化測試、建置打包、部署策略和回滾機制，實現快速、可靠的軟體交付。

## 適用角色
- **主要負責**: DevOps 工程師、SRE 工程師
- **協作角色**: 開發團隊、QA 團隊、系統架構師

## 輸入需求
使用者需要提供：
- 專案技術棧和架構
- 目標部署環境（雲端平台）
- 發布頻率和策略
- 測試要求
- 安全和合規需求

範例：`請幫我設計 [專案] 的 CI/CD 管線，部署到 [平台]`

## 執行步驟

### 步驟 1: 定義管線階段
- 規劃 CI 階段（建置、測試）
- 規劃 CD 階段（部署、驗證）
- 定義階段依賴關係
- 設定成功/失敗標準

### 步驟 2: 選擇 CI/CD 工具
- 評估 CI/CD 平台（GitHub Actions, GitLab CI, Jenkins）
- 選擇建置工具
- 選擇部署工具
- 選擇監控工具

### 步驟 3: 設計建置流程
- 配置建置環境
- 定義建置步驟
- 配置快取策略
- 設定產物管理

### 步驟 4: 整合測試流程
- 單元測試整合
- 整合測試整合
- E2E 測試整合
- 安全掃描整合

### 步驟 5: 設計部署流程
- 選擇部署策略（藍綠、金絲雀、滾動）
- 配置環境變數
- 設定部署腳本
- 建立回滾機制

### 步驟 6: 建立監控告警
- 配置部署監控
- 設定健康檢查
- 建立告警機制
- 設定通知渠道

## 輸出模板

```markdown
# CI/CD 管線文件

**專案名稱**: [專案名稱]  
**版本**: 1.0  
**文件日期**: YYYY-MM-DD  
**負責人**: [DevOps 主管]  
**狀態**: 草稿 / 已核准

---

## 目錄

1. [概述](#1-概述)
2. [CI/CD 架構](#2-cicd-架構)
3. [持續整合 (CI)](#3-持續整合-ci)
4. [持續交付/部署 (CD)](#4-持續交付部署-cd)
5. [部署策略](#5-部署策略)
6. [環境管理](#6-環境管理)
7. [安全與合規](#7-安全與合規)
8. [監控與告警](#8-監控與告警)
9. [故障處理](#9-故障處理)
10. [最佳實踐](#10-最佳實踐)

---

## 1. 概述

### 1.1 目標

**主要目標**:
- 自動化建置、測試和部署流程
- 縮短從程式碼提交到生產環境的時間
- 提高部署頻率和成功率
- 減少人為錯誤
- 快速反饋和快速回滾

**關鍵指標**:
- 部署頻率: 每天 > 10 次
- 部署成功率: > 95%
- 平均建置時間: < 10 分鐘
- 平均部署時間: < 5 分鐘
- 回滾時間: < 2 分鐘

### 1.2 工具選擇

| 類別 | 工具 | 用途 |
|------|------|------|
| CI/CD 平台 | GitHub Actions | 自動化工作流程 |
| 容器化 | Docker | 應用程式打包 |
| 容器編排 | Kubernetes | 容器管理和部署 |
| 產物儲存 | Docker Hub / ECR | 映像檔儲存 |
| 基礎設施 | Terraform | 基礎設施即程式碼 |
| 監控 | Datadog / Prometheus | 監控和告警 |
| 日誌 | ELK Stack | 日誌聚合 |

---

## 2. CI/CD 架構

### 2.1 整體架構圖

```
┌──────────────────────────────────────────────────────────┐
│                    開發階段                                │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                 持續整合 (CI)                              │
├──────────────────────────────────────────────────────────┤
│ Git Push → Build → Lint → Test → Security Scan → Package │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│              持續交付/部署 (CD)                            │
├──────────────────────────────────────────────────────────┤
│ Deploy to Dev → Test → Deploy to Staging → Test          │
│             ↓                                             │
│      Manual Approval (可選)                               │
│             ↓                                             │
│   Deploy to Production → Health Check → Monitor          │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                 監控與回饋                                 │
├──────────────────────────────────────────────────────────┤
│        Monitoring → Alerting → Feedback Loop             │
└──────────────────────────────────────────────────────────┘
```

### 2.2 管線觸發條件

| 觸發器 | 執行內容 | 目的 |
|--------|---------|------|
| Push to feature branch | CI only | 快速反饋 |
| Pull Request | CI + 預覽部署 | Code Review |
| Merge to develop | CI + Deploy to Dev | 整合測試 |
| Merge to main | CI + Deploy to Staging → Production | 發布 |
| Daily Schedule | 完整測試套件 + 安全掃描 | 定期檢查 |
| Manual Trigger | 任何階段 | 彈性控制 |

---

## 3. 持續整合 (CI)

### 3.1 CI 流程圖

```
Git Push
  ↓
檢出程式碼 (Checkout)
  ↓
設定環境 (Setup Environment)
  ↓
安裝依賴 (Install Dependencies) → 快取
  ↓
程式碼風格檢查 (Lint)
  ↓
單元測試 (Unit Tests)
  ↓
建置應用程式 (Build)
  ↓
整合測試 (Integration Tests)
  ↓
安全掃描 (Security Scan)
  ↓
建置 Docker 映像
  ↓
推送到映像倉庫
  ↓
通知結果
```

### 3.2 GitHub Actions 範例配置

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop, 'feature/**' ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Job 1: 程式碼品質檢查
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run Prettier check
        run: npm run format:check
  
  # Job 2: 單元測試
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: true
  
  # Job 3: 建置
  build:
    runs-on: ubuntu-latest
    needs: [lint, unit-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
          retention-days: 7
  
  # Job 4: 整合測試
  integration-test:
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
  
  # Job 5: 安全掃描
  security-scan:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
  
  # Job 6: 建置和推送 Docker 映像
  docker-build:
    runs-on: ubuntu-latest
    needs: [build, integration-test, security-scan]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Image digest
        run: echo ${{ steps.docker_build.outputs.digest }}
```

### 3.3 快取策略

**依賴快取**:
```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Docker 層快取**:
```yaml
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

### 3.4 品質門檻 (Quality Gates)

**阻止合併的條件**:
- ❌ Lint 檢查失敗
- ❌ 單元測試失敗
- ❌ 程式碼覆蓋率 < 80%
- ❌ 安全漏洞（High/Critical）
- ❌ 建置失敗

**警告但不阻止**:
- ⚠️ 效能下降 > 10%
- ⚠️ Bundle 大小增加 > 5%
- ⚠️ 程式碼複雜度過高

---

## 4. 持續交付/部署 (CD)

### 4.1 CD 流程圖

```
Docker Image Ready
  ↓
Deploy to Dev Environment
  ↓
Smoke Tests
  ↓
Deploy to Staging Environment
  ↓
E2E Tests + Load Tests
  ↓
Manual Approval (Production only)
  ↓
Deploy to Production (Canary/Blue-Green)
  ↓
Health Checks
  ↓
Monitor Metrics (5-15 minutes)
  ↓
Full Rollout or Rollback
```

### 4.2 部署配置範例

```yaml
name: CD Pipeline

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types:
      - completed
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment:
      name: staging
      url: https://staging.example.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster staging-cluster \
            --service app-service \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster staging-cluster \
            --services app-service
      
      - name: Run smoke tests
        run: |
          curl -f https://staging.example.com/health || exit 1
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Staging deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployed to *Staging*\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
  
  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://example.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to Production (Blue-Green)
        run: |
          # 部署到 Green 環境
          aws ecs update-service \
            --cluster production-cluster \
            --service app-service-green \
            --force-new-deployment
          
          # 等待穩定
          aws ecs wait services-stable \
            --cluster production-cluster \
            --services app-service-green
      
      - name: Health check
        run: |
          for i in {1..10}; do
            if curl -f https://green.example.com/health; then
              echo "Health check passed"
              exit 0
            fi
            sleep 30
          done
          exit 1
      
      - name: Switch traffic (Blue → Green)
        run: |
          # 使用 AWS ALB 切換流量
          aws elbv2 modify-rule \
            --rule-arn ${{ secrets.ALB_RULE_ARN }} \
            --actions Type=forward,TargetGroupArn=${{ secrets.GREEN_TG_ARN }}
      
      - name: Monitor for 10 minutes
        run: sleep 600
      
      - name: Verify metrics
        run: |
          # 檢查錯誤率、延遲等指標
          python scripts/check_metrics.py --threshold 0.01
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Production deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployed to *Production*\nVersion: ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 5. 部署策略

### 5.1 藍綠部署 (Blue-Green Deployment)

**概念**: 維護兩個相同的生產環境（藍色和綠色），一次只有一個對外服務

```
┌─────────────┐         ┌─────────────┐
│   Blue      │         │   Green     │
│ (Current)   │◄─ 100% ─┤ (New)       │
│   v1.0      │  Traffic│   v1.1      │
└─────────────┘         └─────────────┘
        ↓
     驗證 Green
        ↓
┌─────────────┐         ┌─────────────┐
│   Blue      │         │   Green     │
│   v1.0      │  0% ────┤   v1.1      │◄─ 100% Traffic
└─────────────┘         └─────────────┘
```

**優點**:
- ✅ 快速回滾（切換流量即可）
- ✅ 零停機時間
- ✅ 完整測試後再切換

**缺點**:
- ❌ 需要雙倍資源
- ❌ 資料庫遷移複雜

**適用場景**: 關鍵業務系統、需要快速回滾

---

### 5.2 金絲雀部署 (Canary Deployment)

**概念**: 逐步將流量從舊版本轉移到新版本

```
v1.0 (100%) ────→ v1.1 (10%) + v1.0 (90%)
                     ↓ 監控指標
                     ↓ 無問題
                  v1.1 (50%) + v1.0 (50%)
                     ↓
                  v1.1 (100%)
```

**流程**:
```yaml
階段 1: 5% 流量 → 新版本 (監控 30 分鐘)
階段 2: 25% 流量 → 新版本 (監控 30 分鐘)
階段 3: 50% 流量 → 新版本 (監控 30 分鐘)
階段 4: 100% 流量 → 新版本
```

**監控指標**:
- 錯誤率 < 1%
- P95 延遲 < 500ms
- CPU/記憶體使用正常
- 無異常日誌

**優點**:
- ✅ 降低風險（影響範圍小）
- ✅ 逐步驗證
- ✅ 資源利用率高

**缺點**:
- ❌ 部署時間較長
- ❌ 需要複雜的流量控制

**適用場景**: 高流量系統、風險較高的變更

---

### 5.3 滾動更新 (Rolling Update)

**概念**: 逐步替換實例，一次替換一部分

```
Instance 1: v1.0 → v1.1 ✓
Instance 2: v1.0 (運行中)
Instance 3: v1.0 (運行中)
    ↓
Instance 1: v1.1 ✓
Instance 2: v1.0 → v1.1 ✓
Instance 3: v1.0 (運行中)
    ↓
Instance 1: v1.1 ✓
Instance 2: v1.1 ✓
Instance 3: v1.0 → v1.1 ✓
```

**Kubernetes 配置**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # 最多超出 2 個 Pod
      maxUnavailable: 1  # 最多 1 個 Pod 不可用
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.1
```

**優點**:
- ✅ 零停機時間
- ✅ 資源利用率高
- ✅ Kubernetes 原生支援

**缺點**:
- ❌ 回滾較慢
- ❌ 兩個版本同時運行

**適用場景**: 一般應用、Kubernetes 環境

---

## 6. 環境管理

### 6.1 環境配置

| 環境 | 用途 | 部署頻率 | 資料 | 監控 |
|------|------|---------|------|------|
| Development | 開發測試 | 每次 Commit | 假資料 | 基礎 |
| Test | 自動化測試 | 每次 PR | 測試資料 | 基礎 |
| Staging | 預生產驗證 | 每日/每次合併 | 脫敏真實資料 | 完整 |
| Production | 正式服務 | 每週/按需 | 真實資料 | 完整 + 告警 |

### 6.2 環境變數管理

**使用 Secret 管理工具**: AWS Secrets Manager, HashiCorp Vault

**範例** (GitHub Actions):
```yaml
- name: Configure environment variables
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> $GITHUB_ENV
    echo "API_KEY=${{ secrets.API_KEY }}" >> $GITHUB_ENV
    echo "NODE_ENV=production" >> $GITHUB_ENV
```

**環境變數層級**:
1. 預設值（程式碼中）
2. 環境檔案（.env.example）
3. CI/CD 變數
4. Secret 管理工具（生產環境）

---

## 7. 安全與合規

### 7.1 安全檢查清單

**程式碼安全**:
- [ ] SAST 掃描（SonarQube）
- [ ] 依賴漏洞掃描（Snyk, npm audit）
- [ ] Secret 掃描（GitGuardian, TruffleHog）
- [ ] Licence 合規檢查

**容器安全**:
- [ ] 基礎映像掃描（Trivy, Clair）
- [ ] 容器配置掃描
- [ ] 映像簽名驗證

**基礎設施安全**:
- [ ] IAM 權限最小化
- [ ] 網路安全組配置
- [ ] 加密配置（傳輸和靜態）

### 7.2 審計與合規

**審計日誌**:
- 所有部署記錄（誰、何時、部署什麼）
- 環境變數變更記錄
- 配置變更記錄
- 存取記錄

**合規要求**:
- SOC 2: 變更管理、存取控制
- GDPR: 資料保護、隱私設計
- PCI DSS: 安全開發（如適用）

---

## 8. 監控與告警

### 8.1 部署監控

**關鍵指標**:
```yaml
部署指標:
  - 部署頻率
  - 部署成功率
  - 平均部署時間
  - 回滾次數

應用指標:
  - 錯誤率 (< 1%)
  - 回應時間 P95 (< 500ms)
  - 吞吐量
  - CPU/記憶體使用率

業務指標:
  - 活躍用戶數
  - 訂單轉換率
  - 關鍵操作成功率
```

### 8.2 告警規則

**Critical 告警**:
```yaml
- name: High Error Rate
  condition: error_rate > 5%
  duration: 5 minutes
  action: 
    - 立即通知 On-call 工程師
    - 自動觸發回滾

- name: Service Down
  condition: health_check_failed for 3 consecutive checks
  action:
    - 立即通知團隊
    - 觸發 PagerDuty
```

**Warning 告警**:
```yaml
- name: Elevated Response Time
  condition: p95_latency > 1000ms
  duration: 10 minutes
  action: 通知 Slack 頻道

- name: High CPU Usage
  condition: cpu_usage > 80%
  duration: 15 minutes
  action: 通知 DevOps 團隊
```

### 8.3 儀表板

**部署儀表板**:
- 部署時間軸
- 成功/失敗率
- 各環境狀態
- 當前版本資訊

**應用健康儀表板**:
- 錯誤率趨勢
- 回應時間分布
- 吞吐量
- 資源使用率

---

## 9. 故障處理

### 9.1 回滾策略

**自動回滾條件**:
- 健康檢查失敗 > 3 次
- 錯誤率 > 5%
- P95 延遲 > 2 秒
- 關鍵業務指標異常

**手動回滾流程**:
```bash
# 1. 識別問題版本
kubectl get deployments

# 2. 回滾到上一個版本
kubectl rollout undo deployment/app-deployment

# 3. 或回滾到特定版本
kubectl rollout undo deployment/app-deployment --to-revision=2

# 4. 監控回滾狀態
kubectl rollout status deployment/app-deployment

# 5. 驗證服務恢復
curl https://api.example.com/health
```

### 9.2 事件回應流程

```
檢測異常 (Alerting)
  ↓
評估影響範圍
  ↓
決定行動
  ├─ 回滾（如果是新部署導致）
  ├─ 緊急修復（Hotfix）
  └─ 降級服務（如無法快速修復）
  ↓
實施修復
  ↓
驗證恢復
  ↓
Post-mortem（事後檢討）
```

---

## 10. 最佳實踐

### 10.1 CI/CD 最佳實踐

1. **保持管線快速**
   - 單元測試 < 1 分鐘
   - 完整 CI < 10 分鐘
   - 使用快取加速

2. **失敗快速原則**
   - Lint 檢查放在最前面
   - 單元測試優先於整合測試
   - 盡早發現問題

3. **管線即程式碼**
   - 版本控制管線配置
   - Code Review 管線變更
   - 文件化管線邏輯

4. **環境一致性**
   - 使用容器化
   - 基礎設施即程式碼
   - 配置外部化

5. **安全優先**
   - Secret 不寫入程式碼
   - 最小權限原則
   - 定期安全掃描

### 10.2 部署最佳實踐

1. **小批次部署**
   - 頻繁小變更優於大變更
   - 降低風險
   - 加快反饋

2. **自動化優先**
   - 手動步驟最小化
   - 可重複執行
   - 減少人為錯誤

3. **可觀測性**
   - 完整的日誌記錄
   - 監控關鍵指標
   - 分散式追蹤

4. **快速回滾能力**
   - 一鍵回滾
   - 定期演練
   - 文件化流程

---

## 附錄

### A. Dockerfile 最佳實踐

```dockerfile
# 使用官方基礎映像
FROM node:18-alpine AS base

# 設定工作目錄
WORKDIR /app

# 多階段建置
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 最終映像
FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# 非 root 使用者
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# 暴露埠
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 啟動指令
CMD ["node", "dist/index.js"]
```

### B. Kubernetes Deployment 範例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
  labels:
    app: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### C. 推薦工具

**CI/CD 平台**:
- GitHub Actions
- GitLab CI/CD
- Jenkins
- CircleCI

**容器與編排**:
- Docker
- Kubernetes
- Helm

**監控**:
- Prometheus + Grafana
- Datadog
- New Relic

**日誌**:
- ELK Stack
- Loki
- CloudWatch

---

**最後更新**: YYYY-MM-DD  
**版本**: 1.0  
**維護者**: [DevOps 主管]
```

---

## 品質檢查清單

- [ ] CI 管線包含所有必要檢查
- [ ] CD 管線有適當的審核機制
- [ ] 部署策略符合業務需求
- [ ] 回滾機制完善且經過測試
- [ ] 監控和告警配置完整
- [ ] Secret 管理安全
- [ ] 文件完整且易於理解
- [ ] 已進行過故障演練
- [ ] 已由團隊審核

---

## 相關 Skills
- `git-workflow.md` - Git 工作流程（整合 CI/CD）
- `test-strategy.md` - 測試策略（測試自動化）
- `release-plan.md` - 發布計畫（部署流程）
- `infrastructure.md` - 基礎設施（IaC）
- `monitoring-setup.md` - 監控設定（監控告警）

---

## 範例

### 輸入範例
```
請幫我設計 Node.js API 專案的 CI/CD 管線，
部署到 AWS ECS，使用藍綠部署策略。
```

### 輸出範例
[生成完整 CI/CD 配置，包含：]
- **CI 階段**: Lint → Test → Build → Security Scan → Docker Build
- **CD 階段**: Deploy to Staging → Tests → Deploy to Production (Blue-Green)
- **工具**: GitHub Actions + Docker + AWS ECS
- **監控**: CloudWatch + SNS 告警
- **回滾**: 一鍵切換流量回舊版本
