---
description: SLO 定義（SLO Definition）標準流程與最佳實踐
---

# SLO Definition SLO 定義

## 概述

此 skill 提供服務等級目標 (SLO) 定義指引，作為可靠性工程的基礎。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | SRE、產品經理 |
| **協作角色** | 開發工程師 |

---

## 1. 術語定義

| 術語 | 定義 |
|------|------|
| **SLI** | Service Level Indicator - 服務品質指標 |
| **SLO** | Service Level Objective - 服務等級目標 |
| **SLA** | Service Level Agreement - 服務等級協議 |
| **Error Budget** | 允許的錯誤預算 |

```
SLI (量測) → SLO (目標) → SLA (承諾)
```

---

## 2. 常見 SLI

| 類型 | SLI | 計算方式 |
|------|-----|---------|
| **可用性** | 成功請求比例 | 成功/(成功+失敗) |
| **延遲** | 回應時間 | P50, P95, P99 |
| **正確性** | 正確回應比例 | 正確/總數 |
| **吞吐量** | 請求處理速率 | RPS |

---

## 3. SLO 定義模板

```yaml
service: user-api
version: 1.0

slos:
  - name: availability
    description: API 可用性
    sli:
      type: availability
      good_events: "http_requests_total{status!~'5..'}"
      total_events: "http_requests_total"
    target: 99.9%
    window: 30d

  - name: latency
    description: API 回應時間
    sli:
      type: latency
      threshold: 500ms
      percentile: 95
    target: 99%
    window: 30d

error_budget:
  availability:
    monthly_budget: 43.2m  # 30天 * 0.1%
    alerts:
      - consumed: 50%
        severity: warning
      - consumed: 80%
        severity: critical
```

---

## 4. 目標制定原則

### 可用性目標參考

| 目標 | 月停機時間 | 適用場景 |
|------|-----------|---------|
| 99% | 7.3 小時 | 內部工具 |
| 99.9% | 43 分鐘 | 一般服務 |
| 99.95% | 22 分鐘 | 重要服務 |
| 99.99% | 4.3 分鐘 | 關鍵服務 |

### 延遲目標參考

| 服務類型 | P50 | P95 | P99 |
|---------|-----|-----|-----|
| 即時 API | 50ms | 200ms | 500ms |
| 批次處理 | 1s | 5s | 10s |
| 報表產生 | 5s | 30s | 60s |

---

## 5. Error Budget 管理

### 預算消耗速率

```
如果 SLO = 99.9%，月預算 = 43.2 分鐘

Week 1: 消耗 10 分鐘 → 剩餘 33.2 分鐘
Week 2: 消耗 5 分鐘 → 剩餘 28.2 分鐘
Week 3: 消耗 20 分鐘 → 剩餘 8.2 分鐘 ⚠️
Week 4: 預算緊張，凍結非必要變更
```

### Error Budget 政策

| 剩餘預算 | 行動 |
|---------|------|
| > 50% | 正常開發 |
| 25-50% | 謹慎變更 |
| < 25% | 凍結變更、專注穩定性 |
| 耗盡 | 停止功能開發 |

---

## 6. SLO 儀表板

```yaml
# Grafana Dashboard
panels:
  - title: "SLO: Availability"
    type: gauge
    query: |
      sum(rate(http_requests_total{status!~"5.."}[30d])) 
      / sum(rate(http_requests_total[30d]))
    thresholds:
      - value: 0.999
        color: green
      - value: 0.995
        color: yellow
      - value: 0
        color: red

  - title: "Error Budget Remaining"
    type: stat
    query: |
      1 - ((1 - (sum(rate(http_requests_total{status!~"5.."}[30d])) 
      / sum(rate(http_requests_total[30d])))) / (1 - 0.999))
```

---

## 檢查清單

- [ ] 關鍵服務有定義 SLO
- [ ] SLI 可量測
- [ ] 目標合理可達成
- [ ] 有 Error Budget 監控
- [ ] 團隊共識

---

## 相關 Skills

- [monitoring-setup.md](./monitoring-setup.md) - 監控設定
- [alerting-rules.md](./alerting-rules.md) - 告警規則
