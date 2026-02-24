---
name: enterprise-dev-workflow
description: "企業級軟體產品開發流程完整指南。涵蓋 10 個開發階段、63 個 skills：策略規劃、產品規劃、設計、架構、開發、測試、安全、部署、維運、數據分析。適用於：規劃新產品、撰寫 PRD、設計系統架構、進行 Code Review、安全審查、設置 CI/CD、效能測試、監控告警等。"
---

# 企業級軟體產品開發流程 - Claude Code Skills

這是一套完整的企業級軟體產品開發流程 Skills 系統，涵蓋從策略規劃到數據分析的完整生命週期。

## 📁 目錄結構

```
.claude/skills/企業級軟體產品開發流程/
├── 01-strategy/                    # 策略規劃階段 (4 skills)
├── 02-product-planning/            # 產品規劃階段 (5 skills)
├── 03-design/                      # 設計階段 (6 skills)
├── 04-architecture/                # 架構設計階段 (6 skills)
├── 05-development/                 # 開發階段 (7 skills)
├── 06-quality-assurance/           # 品質保證階段 (7 skills)
├── 07-security/                    # 安全階段 (6 skills)
├── 08-deployment/                  # 部署階段 (6 skills)
├── 09-operations/                  # 維運階段 (7 skills)
├── 10-analytics/                   # 數據分析階段 (5 skills)
└── templates/                      # 共用模板 (4 skills)
```

**總計**: 63 個 skills

---

## 🚀 快速開始

### 使用方式

在 Claude Code 中，輸入 `/` 即可看到所有可用的 skills。

### 典型工作流程

1. **策略階段**: 從市場研究開始 (`/market-research`)
2. **產品規劃**: 撰寫 PRD (`/prd`) 和用戶故事 (`/user-story`)
3. **設計**: 建立線框圖 (`/wireframe`) 和設計系統 (`/design-system`)
4. **架構**: 設計系統架構 (`/system-architecture`) 和 API (`/api-design`)
5. **開發**: 遵循編碼規範 (`/coding-standards`) 和 Git 工作流程 (`/git-workflow`)
6. **測試**: 執行各類測試 (`/unit-test`, `/e2e-test`)
7. **安全**: 進行安全審查 (`/security-review`) 和漏洞掃描
8. **部署**: 設置 CI/CD (`/cicd-pipeline`) 和發布計畫 (`/release-plan`)
9. **維運**: 監控設置 (`/monitoring-setup`) 和事件回應 (`/incident-response`)
10. **分析**: 追蹤指標 (`/tracking-plan`) 和 A/B 測試 (`/ab-test`)

---

## 📋 階段詳情

### 01-strategy (策略規劃)

- `market-research.md` - 市場研究分析 (TAM/SAM/SOM, 競爭分析)
- `competitor-analysis.md` - 競爭對手深入分析
- `business-case.md` - 商業論證 (ROI, NPV, 財務模型)
- `strategy-approval.md` - 策略審批文件和簡報

### 02-product-planning (產品規劃)

- `product-discovery.md` - 產品探索與驗證
- `user-story.md` - 用戶故事撰寫 (INVEST 原則)
- `prd.md` - 產品需求文件
- `requirements-prioritization.md` - 需求優先級排序 (MoSCoW, RICE)
- `roadmap.md` - 產品路線圖規劃

### 03-design (設計)

- `information-architecture.md` - 資訊架構設計
- `wireframe.md` - 線框圖規劃
- `design-system.md` - 設計系統建立
- `ui-specification.md` - UI 規格說明
- `content-design.md` - 內容設計
- `accessibility-checklist.md` - 無障礙檢查清單

### 04-architecture (架構設計)

- `system-architecture.md` - 系統架構設計
- `adr.md` - 架構決策記錄 (ADR)
- `data-model.md` - 資料模型設計
- `api-design.md` - API 設計 (RESTful/GraphQL)
- `infrastructure.md` - 基礎設施架構
- `tech-stack-evaluation.md` - 技術選型評估

### 05-development (開發)

- `dev-environment-setup.md` - 開發環境設置
- `coding-standards.md` - 程式碼規範
- `git-workflow.md` - Git 工作流程
- `frontend-component.md` - 前端元件開發
- `backend-service.md` - 後端服務開發
- `database-migration.md` - 資料庫遷移
- `code-review.md` - 程式碼審查

### 06-quality-assurance (品質保證)

- `test-strategy.md` - 測試策略
- `test-case.md` - 測試案例撰寫
- `unit-test.md` - 單元測試
- `integration-test.md` - 整合測試
- `e2e-test.md` - 端對端測試
- `performance-test.md` - 效能測試
- `bug-report.md` - 缺陷報告

### 07-security (安全)

- `threat-model.md` - 威脅模型
- `security-requirements.md` - 安全需求
- `security-review.md` - 安全審查
- `penetration-test.md` - 滲透測試計畫
- `vulnerability-report.md` - 漏洞報告
- `security-incident.md` - 安全事件處理

### 08-deployment (部署)

- `cicd-pipeline.md` - CI/CD 管線設計
- `release-plan.md` - 發布計畫
- `release-checklist.md` - 發布檢查清單
- `rollback-plan.md` - 回滾計畫
- `environment-config.md` - 環境配置
- `feature-flag.md` - 功能開關管理

### 09-operations (維運)

- `monitoring-setup.md` - 監控設置
- `alerting-rules.md` - 告警規則
- `runbook.md` - 維運手冊
- `incident-response.md` - 事件回應
- `postmortem.md` - 事後分析報告
- `capacity-planning.md` - 容量規劃
- `slo-definition.md` - SLO 定義

### 10-analytics (數據分析)

- `tracking-plan.md` - 追蹤計畫
- `metrics-definition.md` - 指標定義
- `ab-test.md` - A/B 測試設計
- `analytics-report.md` - 分析報告
- `dashboard-design.md` - 儀表板設計

### templates (共用模板)

- `document-template.md` - 通用文件模板
- `meeting-notes.md` - 會議記錄模板
- `decision-log.md` - 決策日誌模板
- `changelog.md` - 變更日誌模板

---

## 🎯 使用建議

### 針對不同角色

**產品經理**:
- 策略階段: market-research, business-case
- 規劃階段: product-discovery, prd, user-story, roadmap
- 分析階段: tracking-plan, metrics-definition, ab-test

**技術主管/架構師**:
- 架構階段: system-architecture, adr, api-design
- 開發階段: coding-standards, code-review
- 安全階段: security-review

**開發工程師**:
- 開發階段: dev-environment-setup, frontend-component, backend-service
- 測試階段: unit-test, integration-test
- 部署階段: cicd-pipeline

**QA 工程師**:
- 測試階段: test-strategy, test-case, e2e-test, performance-test
- 品質管理: bug-report

**DevOps/SRE**:
- 部署階段: cicd-pipeline, release-plan, environment-config
- 維運階段: monitoring-setup, incident-response, postmortem

**設計師**:
- 設計階段: information-architecture, wireframe, design-system, ui-specification

**資安工程師**:
- 安全階段: threat-model, security-review, penetration-test

---

## 📖 檔案格式說明

每個 skill 檔案遵循標準格式：

```markdown
---
description: [簡短描述，用於 /help 顯示]
---

# [Skill 名稱]

## 概述
[說明此 skill 解決什麼問題]

## 適用角色
[主要負責和協作角色]

## 輸入需求
[需要提供什麼資訊]

## 執行步驟
[詳細步驟說明]

## 輸出模板
[標準化輸出格式]

## 品質檢查清單
[驗收標準]

## 相關 Skills
[相關的其他 skills]

## 範例
[輸入/輸出範例]
```

---

## 🔄 Skills 間的關係

```
策略規劃 → 產品規劃 → 設計 → 架構設計 → 開發
    ↑                                           ↓
    └─── 數據分析 ← 維運 ← 部署 ← 安全 ← QA ←───┘
           │
           └──→ (持續回饋與迭代)
```

---

## 📊 RACI 矩陣範例

| 階段 | 產品經理 | 工程師 | 設計師 | QA | DevOps | 安全 |
|------|---------|--------|--------|-----|--------|------|
| 策略規劃 | A/R | C | C | I | I | C |
| 產品規劃 | A/R | C | C | C | I | C |
| 設計 | A | C | R | C | I | C |
| 架構設計 | I | A/R | C | C | R | R |
| 開發 | I | A/R | C | C | C | C |
| QA | C | R | I | A/R | C | C |
| 安全 | I | R | I | C | R | A/R |
| 部署 | C | R | I | C | A/R | R |
| 維運 | I | C | I | I | A/R | C |
| 分析 | A/R | C | C | I | I | I |

**R** = 負責執行 | **A** = 當責 | **C** = 諮詢 | **I** = 知會

---

## 🛠️ 維護與貢獻

### 檔案命名規則
- 使用 kebab-case（小寫字母，用連字號分隔）
- 例如：`user-story.md`、`api-design.md`

### 更新頻率
- 定期檢視和更新 skills
- 根據團隊回饋改進內容

### 版本控制
- 所有變更應記錄在 Git
- 重大變更應更新此 README

---

## 📝 授權

本 Skills 系統基於最佳實踐和業界標準建立，供團隊內部使用。

---

**最後更新**: 2026-01-18  
**版本**: 1.0  
**建立者**: SDL 開發團隊

---

## 💡 提示

- 使用 `/help` 查看所有可用 skills
- 多個 skills 可以串接使用，形成完整工作流程
- 每個 skill 都包含範例，可直接參考使用
- 遇到問題可查看相關 skills 的交叉參照

**祝您開發順利！ 🚀**
