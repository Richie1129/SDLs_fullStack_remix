---
description: 效能測試（Performance Test）標準流程與最佳實踐
---

# Performance Test 效能測試

## 概述

此 skill 提供效能測試指引，包含負載測試、壓力測試、效能基準建立，確保系統在預期負載下穩定運行。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | QA 工程師、效能工程師 |
| **協作角色** | DevOps、後端工程師 |

---

## 1. 測試類型

| 類型 | 目的 | 方法 |
|------|------|------|
| **負載測試** | 驗證正常負載下效能 | 模擬預期並發用戶 |
| **壓力測試** | 找出系統極限 | 持續增加負載直到崩潰 |
| **浸泡測試** | 驗證長時間穩定性 | 持續負載數小時/天 |
| **峰值測試** | 驗證突發流量 | 模擬瞬間流量高峰 |

---

## 2. 效能指標

| 指標 | 定義 | 目標值 |
|------|------|--------|
| **Response Time** | 請求回應時間 | P95 < 500ms |
| **Throughput** | 每秒請求數 (RPS) | > 1000 RPS |
| **Error Rate** | 錯誤請求比例 | < 0.1% |
| **Concurrent Users** | 同時在線用戶 | > 10,000 |

---

## 3. 測試工具

### K6 (推薦)

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // 升壓到 100 用戶
    { duration: '5m', target: 100 },  // 維持 5 分鐘
    { duration: '1m', target: 0 },    // 降壓
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% 請求 < 500ms
    http_req_failed: ['rate<0.01'],    // 錯誤率 < 1%
  },
};

export default function () {
  const response = http.get('http://localhost:3000/api/v1/products');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### 執行測試

```bash
# 執行負載測試
k6 run tests/performance/load-test.js

# 輸出 HTML 報告
k6 run --out json=results.json tests/performance/load-test.js
```

---

## 4. 壓力測試腳本

```javascript
// tests/performance/stress-test.js
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 400 },  // 持續增加
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },  // 維持峰值
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  // 模擬用戶操作
  http.get('http://localhost:3000/api/v1/products');
  sleep(Math.random() * 3);
  
  http.post('http://localhost:3000/api/v1/orders', 
    JSON.stringify({ productId: '123', quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

## 5. 前端效能測試

### Lighthouse CI

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/products'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Web Vitals 監控

```typescript
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

---

## 6. 資料庫效能測試

```sql
-- 使用 EXPLAIN ANALYZE 分析查詢
EXPLAIN ANALYZE
SELECT o.*, u.name as user_name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at > NOW() - INTERVAL '30 days';

-- 預期：Execution Time < 100ms
```

---

## 7. 測試報告

```markdown
# 效能測試報告

## 測試摘要
- 測試日期：2024-01-20
- 測試環境：Staging
- 測試時長：30 分鐘

## 測試結果

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| P95 Response Time | < 500ms | 320ms | ✅ |
| Throughput | > 1000 RPS | 1,250 RPS | ✅ |
| Error Rate | < 0.1% | 0.02% | ✅ |
| Max Concurrent | 10,000 | 12,500 | ✅ |

## 發現問題
1. `/api/v1/search` 在高負載時 P99 超過 1s
2. 資料庫連線池在 500 並發時達到上限

## 建議優化
1. 搜尋 API 加入快取
2. 增加 DB 連線池大小
```

---

## 檢查清單

- [ ] 定義效能指標和目標
- [ ] 準備測試資料
- [ ] 測試環境與生產環境相似
- [ ] 監控系統資源（CPU/Memory）
- [ ] 記錄並分析結果
- [ ] 建立效能基準線

---

## 相關 Skills

- [../09-operations/monitoring-setup.md](../09-operations/monitoring-setup.md) - 監控設定
- [../09-operations/capacity-planning.md](../09-operations/capacity-planning.md) - 容量規劃
