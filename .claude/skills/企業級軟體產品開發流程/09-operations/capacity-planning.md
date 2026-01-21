---
description: 容量規劃（Capacity Planning）標準流程與最佳實踐
---

# Capacity Planning 容量規劃

## 概述

此 skill 提供容量規劃指引，確保系統能應對預期和突發流量。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | SRE、DevOps |
| **協作角色** | 產品經理、開發工程師 |

---

## 1. 規劃週期

| 類型 | 週期 | 內容 |
|------|------|------|
| 年度 | Q4 | 下年度預算、架構規劃 |
| 季度 | 每季 | 調整資源、審查趨勢 |
| 事件 | 隨時 | 大型活動準備 |

---

## 2. 關鍵指標收集

### 流量指標

| 指標 | 說明 |
|------|------|
| 日活用戶 (DAU) | 每日活躍用戶數 |
| 峰值 QPS | 最高每秒請求數 |
| 平均回應時間 | P50/P95/P99 |

### 資源指標

| 指標 | 閾值 |
|------|------|
| CPU 使用率 | < 70% (峰值) |
| 記憶體使用率 | < 80% |
| 網路 I/O | < 70% |
| 磁碟使用率 | < 80% |

---

## 3. 容量計算

### 計算公式

```
所需實例 = 峰值 QPS / 單實例處理能力 × 安全係數

範例：
- 峰值 QPS: 10,000
- 單實例處理: 1,000 QPS
- 安全係數: 1.5

所需實例 = 10,000 / 1,000 × 1.5 = 15 個
```

### 成長預測

```
未來容量 = 現有容量 × (1 + 成長率) ^ 月數

範例：
- 現有 QPS: 5,000
- 月成長率: 10%
- 6 個月後: 5,000 × 1.1^6 = 8,857 QPS
```

---

## 4. 容量規劃文件

```markdown
# 容量規劃報告 - 2024 Q1

## 現況分析

### 流量趨勢
| 月份 | DAU | 峰值 QPS |
|------|-----|---------|
| 10月 | 50K | 3,000 |
| 11月 | 55K | 3,500 |
| 12月 | 60K | 4,000 |

### 資源使用
| 資源 | 現有 | 使用率 |
|------|------|--------|
| API Pod | 5 | 65% |
| RDS | db.r5.large | 70% |
| Redis | cache.m5.large | 50% |

## 需求預測

### 業務目標
- Q1 目標 DAU: 80K
- 預估峰值 QPS: 6,000

### 特殊事件
- 春節活動: 預期 2x 流量

## 建議調整

| 資源 | 現有 | 建議 | 原因 |
|------|------|------|------|
| API Pod | 5 | 8 | 成長 + 安全餘量 |
| RDS | r5.large | r5.xlarge | CPU 需求增加 |

## 預算估算
- 月增加成本: $500 USD
```

---

## 5. 自動擴容

### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 檢查清單

- [ ] 收集歷史流量數據
- [ ] 預測成長趨勢
- [ ] 考慮特殊事件
- [ ] 設定自動擴容
- [ ] 定期審查調整

---

## 相關 Skills

- [monitoring-setup.md](./monitoring-setup.md) - 監控設定
- [slo-definition.md](./slo-definition.md) - SLO 定義
