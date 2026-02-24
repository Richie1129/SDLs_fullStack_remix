---
description: 指標定義（Metrics Definition）標準流程與最佳實踐
---

# Metrics Definition 指標定義

## 概述

此 skill 提供業務指標與產品指標定義指引，確保團隊對關鍵指標有共識。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 產品經理、數據分析師 |
| **協作角色** | 開發工程師 |

---

## 1. 指標分類

### 北極星指標 (North Star Metric)

- 衡量產品核心價值
- 全公司聚焦
- 範例：DAU、月交易額

### AARRR 海盜指標

| 階段 | 指標 |
|------|------|
| **Acquisition** | 新用戶註冊數 |
| **Activation** | 完成首次關鍵動作 |
| **Retention** | 7/30 日留存率 |
| **Revenue** | ARPU、LTV |
| **Referral** | 推薦轉換率 |

---

## 2. 指標定義模板

```yaml
metric:
  name: daily_active_users
  display_name: 日活用戶 (DAU)
  description: 每日有登入行為的獨立用戶數
  
  definition:
    numerator: COUNT(DISTINCT user_id)
    denominator: null
    time_grain: daily
    filters:
      - event_type = 'login'
      
  dimensions:
    - platform: [ios, android, web]
    - country
    - user_segment
    
  owner: product-team
  data_source: event_logs
  
  targets:
    - period: monthly
      value: 100000
      
  alerts:
    - condition: drop > 10%
      severity: warning
```

---

## 3. 常見指標公式

### 留存率

```sql
-- N 日留存率
SELECT 
  cohort_date,
  COUNT(DISTINCT CASE WHEN day_n_active THEN user_id END) 
  / COUNT(DISTINCT user_id) AS retention_rate
FROM user_cohorts
GROUP BY cohort_date;
```

### 轉換率

```sql
-- 漏斗轉換率
SELECT
  COUNT(DISTINCT CASE WHEN step = 'view' THEN user_id END) AS view,
  COUNT(DISTINCT CASE WHEN step = 'add_cart' THEN user_id END) AS add_cart,
  COUNT(DISTINCT CASE WHEN step = 'purchase' THEN user_id END) AS purchase
FROM funnel_events;
```

### ARPU / LTV

```sql
-- ARPU (Average Revenue Per User)
SELECT SUM(revenue) / COUNT(DISTINCT user_id) AS arpu
FROM transactions
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

-- LTV = ARPU × 平均生命週期
```

---

## 4. 指標文件

```markdown
# 指標字典

## 用戶指標

### DAU (日活用戶)
- **定義**: 當日有任意互動行為的獨立用戶數
- **計算**: COUNT(DISTINCT user_id) WHERE date = today
- **來源**: event_logs 表
- **維度**: platform, country

### MAU (月活用戶)
- **定義**: 當月有任意互動行為的獨立用戶數
- **計算**: COUNT(DISTINCT user_id) WHERE date IN current_month

---

## 業務指標

### GMV (總交易額)
- **定義**: 平台總成交金額
- **計算**: SUM(order_amount) WHERE status = 'completed'
```

---

## 5. 指標治理

- 避免虛榮指標 (Vanity Metrics)
- 確保定義一致性
- 定期審查指標有效性
- 建立指標變更流程

---

## 檢查清單

- [ ] 指標有明確定義
- [ ] 計算邏輯有文件
- [ ] 有對應的儀表板
- [ ] 設定合理目標
- [ ] 團隊理解一致

---

## 相關 Skills

- [tracking-plan.md](./tracking-plan.md) - 埋點計畫
- [dashboard-design.md](./dashboard-design.md) - 儀表板設計
