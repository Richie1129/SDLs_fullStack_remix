---
description: 滲透測試（Penetration Test）標準流程與最佳實踐
---

# Penetration Test 滲透測試

## 概述

此 skill 提供滲透測試指引，模擬真實攻擊來評估系統安全性。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 安全工程師、滲透測試員 |
| **協作角色** | DevOps、開發工程師 |

---

## 1. 測試類型

| 類型 | 說明 |
|------|------|
| **黑箱** | 無系統資訊，模擬外部攻擊者 |
| **灰箱** | 部分資訊（如帳號），模擬內部威脅 |
| **白箱** | 完整存取權，深度安全審計 |

---

## 2. 測試範圍

### 授權範圍文件

```markdown
## 滲透測試授權書

### 測試目標
- 網站：https://app.example.com
- API：https://api.example.com
- IP 範圍：10.0.1.0/24

### 排除項目
- 第三方服務（Stripe, SendGrid）
- 生產資料庫直接存取
- DoS/DDoS 攻擊

### 測試時間
- 開始：2024-01-20 00:00
- 結束：2024-01-25 23:59
- 時區：UTC+8

### 緊急聯絡人
- Security: security@example.com
- DevOps: devops@example.com
```

---

## 3. 測試方法論 (PTES)

```
1. 情報蒐集 → 2. 威脅建模 → 3. 漏洞分析 → 4. 利用 → 5. 後滲透 → 6. 報告
```

### 階段說明

| 階段 | 活動 |
|------|------|
| **情報蒐集** | 網域、子網域、技術堆疊識別 |
| **漏洞分析** | 自動掃描 + 手動測試 |
| **利用** | 驗證漏洞可被利用 |
| **後滲透** | 權限提升、橫向移動 |
| **報告** | 文件化發現與建議 |

---

## 4. 常用工具

| 類別 | 工具 |
|------|------|
| 掃描 | Nmap, Nessus, Burp Suite |
| Web | OWASP ZAP, SQLMap, Nikto |
| 密碼 | John the Ripper, Hashcat |
| 網路 | Wireshark, tcpdump |

---

## 5. Web 測試清單

### OWASP Top 10 測試

- [ ] A01: Broken Access Control
- [ ] A02: Cryptographic Failures
- [ ] A03: Injection
- [ ] A04: Insecure Design
- [ ] A05: Security Misconfiguration
- [ ] A06: Vulnerable Components
- [ ] A07: Authentication Failures
- [ ] A08: Data Integrity Failures
- [ ] A09: Logging Failures
- [ ] A10: SSRF

---

## 6. 報告模板

```markdown
# 滲透測試報告

## 執行摘要
- 測試期間發現 3 個高風險、5 個中風險漏洞
- 建議立即修復高風險問題

## 漏洞發現

### 1. SQL Injection (高風險)
- **位置**: /api/v1/users?id=
- **影響**: 可讀取任意資料表
- **證據**: [截圖]
- **建議**: 使用參數化查詢

### 2. [其他漏洞...]

## 修復建議優先序
1. [P0] SQL Injection
2. [P0] IDOR
3. [P1] XSS
```

---

## 檢查清單

### 測試前
- [ ] 取得書面授權
- [ ] 確認測試範圍
- [ ] 設定測試環境
- [ ] 通知相關團隊

### 測試後
- [ ] 清理測試資料
- [ ] 撰寫完整報告
- [ ] 安排修復討論會議

---

## 相關 Skills

- [threat-model.md](./threat-model.md) - 威脅建模
- [vulnerability-report.md](./vulnerability-report.md) - 漏洞報告
