---
description: 告警規則（Alerting Rules）標準流程與最佳實踐
---

# Alerting Rules 告警規則

## 概述

此 skill 提供告警規則設定指引，確保能及時通知團隊處理問題。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | DevOps、SRE |
| **回應者** | On-call 工程師 |

---

## 1. 告警嚴重度

| 等級 | 定義 | 回應時間 | 通知方式 |
|------|------|---------|---------|
| **Critical** | 服務中斷 | 立即 | 電話 + Slack |
| **Warning** | 需要關注 | 1 小時 | Slack |
| **Info** | 資訊性 | 下次上班 | Email |

---

## 2. Prometheus 告警規則

```yaml
# alerts.yml
groups:
  - name: api-server
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"

      - alert: PodNotReady
        expr: kube_pod_status_ready{condition="false"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} not ready"
```

---

## 3. 常見告警規則

### 應用程式

| 告警 | 條件 | 嚴重度 |
|------|------|--------|
| 高錯誤率 | Error > 1% | Critical |
| 高延遲 | P95 > 1s | Warning |
| 請求量驟降 | Drop > 50% | Warning |

### 基礎設施

| 告警 | 條件 | 嚴重度 |
|------|------|--------|
| CPU 高 | > 80% 5min | Warning |
| 記憶體高 | > 85% | Warning |
| 硬碟滿 | > 90% | Critical |
| Pod 重啟 | > 3 次/小時 | Warning |

### 資料庫

| 告警 | 條件 | 嚴重度 |
|------|------|--------|
| 連線池滿 | > 90% | Warning |
| 慢查詢多 | > 10/min | Warning |
| 複寫延遲 | > 10s | Critical |

---

## 4. 通知整合

### PagerDuty

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<SERVICE_KEY>'
        severity: critical
```

### Slack

```yaml
receivers:
  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ .Status }}: {{ .CommonAnnotations.summary }}'
```

---

## 5. 告警管理

### 避免告警疲勞

- 設定合理閾值
- 使用 `for` 避免抖動
- 分級通知
- 定期審查告警

### 靜默 (Silence)

```yaml
# 維護期間靜默
matchers:
  - name: alertname
    value: HighCPU
duration: 2h
comment: "計劃性維護"
```

---

## 檢查清單

- [ ] 關鍵服務有告警
- [ ] 嚴重度定義清楚
- [ ] 通知管道已設定
- [ ] On-call 輪值已排
- [ ] 告警有對應 Runbook

---

## 相關 Skills

- [monitoring-setup.md](./monitoring-setup.md) - 監控設定
- [incident-response.md](./incident-response.md) - 事件回應
- [runbook.md](./runbook.md) - Runbook
