---
description: Runbook 操作手冊標準流程與最佳實踐
---

# Runbook 操作手冊

## 概述

此 skill 提供 Runbook 撰寫指引，確保 On-call 能快速處理常見問題。

## 適用角色

| 角色 | 職責 |
|------|------|
| **撰寫者** | SRE、開發工程師 |
| **使用者** | On-call 工程師 |

---

## 1. Runbook 結構

```markdown
# [告警名稱] Runbook

## 摘要
[一句話描述問題]

## 嚴重度
[Critical/Warning/Info]

## 影響
[服務/用戶影響]

## 診斷步驟
1. 檢查 X
2. 查看 Y

## 緩解步驟
1. 執行 A
2. 驗證 B

## 升級條件
[何時需要升級]

## 相關資源
- Dashboard: [連結]
- Logs: [查詢]
```

---

## 2. 範例 Runbook

```markdown
# 高錯誤率 (HighErrorRate) Runbook

## 摘要
API 服務錯誤率超過 1%

## 嚴重度
Critical

## 影響
用戶可能遇到請求失敗

## 診斷步驟

### 1. 確認錯誤類型
\`\`\`bash
# 查看最近錯誤
kubectl logs -l app=api --tail=100 | grep ERROR

# Kibana 查詢
level:error AND service:api-server
\`\`\`

### 2. 檢查依賴服務
- [ ] 資料庫連線狀態
- [ ] Redis 狀態
- [ ] 第三方 API 狀態

### 3. 查看最近變更
\`\`\`bash
kubectl rollout history deployment/api
\`\`\`

## 緩解步驟

### 方案 A: 回滾最近部署
\`\`\`bash
kubectl rollout undo deployment/api
\`\`\`

### 方案 B: 重啟服務
\`\`\`bash
kubectl rollout restart deployment/api
\`\`\`

### 方案 C: 擴容
\`\`\`bash
kubectl scale deployment/api --replicas=5
\`\`\`

## 驗證
- 錯誤率降至 < 0.1%
- 健康檢查通過

## 升級條件
- 15 分鐘無法緩解
- 根因不明

## 相關資源
- Dashboard: [Grafana 連結]
- Logs: [Kibana 連結]
- Contact: @backend-team
```

---

## 3. Runbook 清單

| 告警 | Runbook |
|------|---------|
| HighErrorRate | [error-rate.md](./runbooks/error-rate.md) |
| HighLatency | [latency.md](./runbooks/latency.md) |
| DatabaseDown | [database.md](./runbooks/database.md) |
| DiskFull | [disk-full.md](./runbooks/disk-full.md) |

---

## 4. 維護指南

- 每次事件後更新 Runbook
- 季度審查 Runbook 有效性
- 新服務上線必須有 Runbook

---

## 檢查清單

- [ ] 步驟可執行
- [ ] 命令可複製貼上
- [ ] 有驗證方式
- [ ] 有升級路徑

---

## 相關 Skills

- [incident-response.md](./incident-response.md) - 事件回應
- [alerting-rules.md](./alerting-rules.md) - 告警規則
