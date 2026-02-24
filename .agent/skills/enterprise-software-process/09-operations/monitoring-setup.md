---
description: 監控設定（Monitoring Setup）標準流程與最佳實踐
---

# Monitoring Setup 監控設定

## 概述

此 skill 提供系統監控設定指引，確保能及時發現問題。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | DevOps、SRE |
| **協作角色** | 開發工程師 |

---

## 1. 監控層級

```
應用程式監控 (APM)
    ↓
基礎設施監控
    ↓
日誌監控
    ↓
用戶體驗監控 (RUM)
```

---

## 2. 關鍵指標

### 黃金指標 (Four Golden Signals)

| 指標 | 定義 | 目標 |
|------|------|------|
| **Latency** | 回應時間 | P99 < 500ms |
| **Traffic** | 請求量 | 追蹤趨勢 |
| **Errors** | 錯誤率 | < 0.1% |
| **Saturation** | 資源使用率 | < 80% |

### RED 方法 (服務)

- **R**ate - 每秒請求數
- **E**rrors - 錯誤請求數
- **D**uration - 請求延遲

### USE 方法 (資源)

- **U**tilization - 使用率
- **S**aturation - 飽和度
- **E**rrors - 錯誤數

---

## 3. 工具選擇

| 領域 | 工具 |
|------|------|
| Metrics | Prometheus, Datadog |
| Logs | ELK, Loki, CloudWatch |
| Traces | Jaeger, Zipkin |
| APM | New Relic, Datadog APM |

---

## 4. Prometheus 設定

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-server'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
```

### 應用程式指標

```typescript
import { Counter, Histogram, register } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 5. Grafana 儀表板

```json
{
  "title": "API Server",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [{
        "expr": "rate(http_requests_total[5m])"
      }]
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
      }]
    }
  ]
}
```

---

## 6. 日誌採集

### Fluent Bit

```yaml
# fluent-bit.yaml
[INPUT]
    Name              tail
    Path              /var/log/app/*.log
    Parser            json

[OUTPUT]
    Name              es
    Host              elasticsearch
    Port              9200
    Index             app-logs
```

---

## 檢查清單

- [ ] 四大黃金指標已監控
- [ ] 關鍵服務有健康檢查
- [ ] 日誌有集中收集
- [ ] 儀表板已建立
- [ ] 告警規則已設定

---

## 相關 Skills

- [alerting-rules.md](./alerting-rules.md) - 告警規則
- [slo-definition.md](./slo-definition.md) - SLO 定義
