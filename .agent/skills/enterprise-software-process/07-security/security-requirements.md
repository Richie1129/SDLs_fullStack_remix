---
description: 安全需求（Security Requirements）標準流程與最佳實踐
---

# Security Requirements 安全需求

## 概述

此 skill 提供安全需求定義指引，確保系統從設計階段就考慮安全性。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 安全工程師、架構師 |
| **協作角色** | 產品經理、開發工程師 |

---

## 1. 安全需求分類

### 認證 (Authentication)

| 需求 ID | 需求描述 | 優先級 |
|---------|---------|--------|
| SEC-AUTH-001 | 支援多因素認證 (MFA) | P0 |
| SEC-AUTH-002 | 密碼強度：最少 8 字元，含大小寫、數字 | P0 |
| SEC-AUTH-003 | 登入失敗 5 次後鎖定帳號 15 分鐘 | P0 |
| SEC-AUTH-004 | Session 過期時間 30 分鐘無活動 | P1 |
| SEC-AUTH-005 | 支援 OAuth 2.0 / OIDC | P1 |

### 授權 (Authorization)

| 需求 ID | 需求描述 | 優先級 |
|---------|---------|--------|
| SEC-AUTHZ-001 | 實作 RBAC 角色權限控制 | P0 |
| SEC-AUTHZ-002 | API 端點須驗證權限 | P0 |
| SEC-AUTHZ-003 | 敏感操作需記錄審計日誌 | P0 |

### 資料保護

| 需求 ID | 需求描述 | 優先級 |
|---------|---------|--------|
| SEC-DATA-001 | 個人資料加密儲存 (AES-256) | P0 |
| SEC-DATA-002 | 傳輸中加密 (TLS 1.2+) | P0 |
| SEC-DATA-003 | 密碼使用 bcrypt 雜湊 | P0 |
| SEC-DATA-004 | 信用卡資料符合 PCI-DSS | P0 |
| SEC-DATA-005 | 備份資料加密 | P1 |

### 輸入驗證

| 需求 ID | 需求描述 | 優先級 |
|---------|---------|--------|
| SEC-INPUT-001 | 所有輸入參數化處理 (防 SQL Injection) | P0 |
| SEC-INPUT-002 | 輸出編碼 (防 XSS) | P0 |
| SEC-INPUT-003 | 檔案上傳類型/大小限制 | P0 |
| SEC-INPUT-004 | API 請求速率限制 | P1 |

---

## 2. OWASP Top 10 對應

| 風險 | 對應需求 |
|------|---------|
| Injection | SEC-INPUT-001 |
| Broken Authentication | SEC-AUTH-001~005 |
| Sensitive Data Exposure | SEC-DATA-001~005 |
| XSS | SEC-INPUT-002 |
| Broken Access Control | SEC-AUTHZ-001~003 |
| Security Misconfiguration | SEC-CONFIG-* |

---

## 3. 合規需求

### GDPR (歐盟)

- [ ] 用戶資料可匯出
- [ ] 用戶可請求刪除資料
- [ ] 資料外洩 72 小時內通報
- [ ] Cookie 同意機制

### 個資法 (台灣)

- [ ] 蒐集目的明確告知
- [ ] 提供查詢/更正/刪除機制
- [ ] 安全維護措施

---

## 4. 需求驗證矩陣

| 需求 | 驗證方式 | 測試案例 |
|------|---------|---------|
| SEC-AUTH-001 | 功能測試 | TC-SEC-001 |
| SEC-AUTH-003 | 整合測試 | TC-SEC-003 |
| SEC-DATA-001 | 程式碼審查 + 滲透測試 | PT-001 |
| SEC-INPUT-001 | 自動化掃描 | SAST-001 |

---

## 輸出模板

```markdown
# 安全需求規格

## 專案：[專案名稱]

## 認證需求
| ID | 描述 | 優先級 | 狀態 |
|----|------|--------|------|
| SEC-AUTH-001 | MFA 支援 | P0 | ✅ |

## 資料保護需求
[...]

## 合規需求
[...]
```

---

## 檢查清單

- [ ] 覆蓋 OWASP Top 10
- [ ] 符合法規要求
- [ ] 每個需求可驗證
- [ ] 與威脅模型對應

---

## 相關 Skills

- [threat-model.md](./threat-model.md) - 威脅建模
- [security-review.md](./security-review.md) - 安全審查
