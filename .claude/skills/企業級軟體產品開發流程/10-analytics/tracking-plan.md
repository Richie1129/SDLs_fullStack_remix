---
description: 埋點計畫（Tracking Plan）標準流程與最佳實踐
---

# Tracking Plan 埋點計畫

## 概述

此 skill 提供數據埋點計畫指引，確保收集正確的用戶行為數據。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 產品經理、數據分析師 |
| **實作者** | 前端/後端工程師 |

---

## 1. 埋點類型

| 類型 | 說明 | 範例 |
|------|------|------|
| **頁面瀏覽** | 用戶訪問頁面 | page_view |
| **點擊事件** | 用戶點擊元素 | button_click |
| **表單事件** | 表單互動 | form_submit |
| **交易事件** | 商業行為 | purchase |
| **系統事件** | 自動觸發 | session_start |

---

## 2. 命名規範

### 事件命名

```
[object]_[action]

範例：
product_view        # 查看商品
cart_add           # 加入購物車
order_create       # 建立訂單
button_click       # 按鈕點擊
```

### 屬性命名

```
[object]_[property]

範例：
product_id         # 商品 ID
product_name       # 商品名稱
product_price      # 商品價格
```

---

## 3. Tracking Plan 模板

```markdown
# Tracking Plan - [功能名稱]

## 版本資訊
- 版本: v1.0
- 更新日期: 2024-01-20
- 負責人: @product-manager

---

## 事件清單

### product_view (商品瀏覽)

| 屬性 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| product_id | string | ✅ | 商品 ID | "SKU123" |
| product_name | string | ✅ | 商品名稱 | "無線耳機" |
| product_price | number | ✅ | 價格 | 2990 |
| category | string | ✅ | 分類 | "3C" |
| source | string | ❌ | 來源 | "homepage" |

**觸發時機**: 用戶進入商品詳情頁

---

### cart_add (加入購物車)

| 屬性 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| product_id | string | ✅ | 商品 ID | "SKU123" |
| quantity | number | ✅ | 數量 | 2 |
| price | number | ✅ | 單價 | 2990 |

**觸發時機**: 點擊「加入購物車」按鈕成功後
```

---

## 4. 實作範例

### 前端 (Analytics SDK)

```typescript
// 通用追蹤函數
function track(eventName: string, properties: Record<string, any>) {
  analytics.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    platform: 'web',
    session_id: getSessionId(),
  });
}

// 使用
track('product_view', {
  product_id: 'SKU123',
  product_name: '無線耳機',
  product_price: 2990,
  category: '3C',
});

track('cart_add', {
  product_id: 'SKU123',
  quantity: 2,
  price: 2990,
});
```

### 後端事件

```typescript
// 伺服器端追蹤
async function trackServerEvent(
  userId: string,
  eventName: string,
  properties: Record<string, any>
) {
  await analytics.track({
    userId,
    event: eventName,
    properties,
    timestamp: new Date(),
  });
}

// 購買完成事件
await trackServerEvent(userId, 'order_completed', {
  order_id: order.id,
  total_amount: order.total,
  item_count: order.items.length,
});
```

---

## 5. 驗證與 QA

### 驗證清單

- [ ] 事件名稱正確
- [ ] 必填屬性都有值
- [ ] 資料類型正確
- [ ] 觸發時機正確

### 測試工具

- Chrome DevTools
- Segment Debugger
- Amplitude Event Explorer
- GA4 DebugView

---

## 檢查清單

- [ ] 事件命名符合規範
- [ ] 屬性定義完整
- [ ] 有觸發時機說明
- [ ] QA 驗證通過
- [ ] 文件已同步

---

## 相關 Skills

- [metrics-definition.md](./metrics-definition.md) - 指標定義
- [analytics-report.md](./analytics-report.md) - 分析報告
