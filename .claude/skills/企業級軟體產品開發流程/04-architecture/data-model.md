---
description: 設計資料模型，定義實體、關係和資料庫結構
---

# 資料模型設計 (Data Model Design)

## 概述
此 skill 協助設計完整的資料模型，包括概念模型、邏輯模型和物理模型，定義實體、屬性、關係和約束，確保資料結構符合業務需求並具有良好的效能和可維護性。

## 適用角色
- **主要負責**: 資料庫架構師、後端工程師、系統架構師
- **協作角色**: 業務分析師、產品經理、DBA

## 輸入需求
使用者需要提供：
- 業務需求和使用案例
- 主要實體和關係描述
- 資料量估計
- 效能需求
- 現有系統整合需求（如有）

範例：`請幫我設計電商系統的資料模型，包含用戶、商品、訂單`

## 執行步驟

### 步驟 1: 需求分析
- 識別業務實體
- 了解業務規則
- 收集資料量預估

### 步驟 2: 概念模型設計
- 定義核心實體
- 識別實體關係
- 繪製 ERD 草圖

### 步驟 3: 邏輯模型設計
- 細化屬性
- 定義主鍵和外鍵
- 正規化處理

### 步驟 4: 物理模型設計
- 選擇資料類型
- 定義索引策略
- 考慮分區和分片

### 步驟 5: 驗證與優化
- 查詢效能驗證
- 資料完整性檢查
- 團隊審核

## 輸出模板

```markdown
# 資料模型設計文件

**專案名稱**: [專案名稱]
**版本**: 1.0
**設計者**: [設計者姓名]
**最後更新**: YYYY-MM-DD
**狀態**: 草稿 / 審核中 / 已核准

---

## 目錄

1. [概述](#1-概述)
2. [概念模型](#2-概念模型)
3. [邏輯模型](#3-邏輯模型)
4. [物理模型](#4-物理模型)
5. [索引策略](#5-索引策略)
6. [資料遷移](#6-資料遷移)
7. [效能考量](#7-效能考量)

---

## 1. 概述

### 1.1 業務背景
[描述業務背景和資料模型的目的]

### 1.2 設計目標
- **效能目標**: [查詢效能要求]
- **擴展目標**: [資料量成長預估]
- **一致性**: [ACID 要求]

### 1.3 範圍
**包含**:
- [實體 1]
- [實體 2]
- [實體 3]

**不包含**:
- [不在範圍內的項目]

### 1.4 假設和約束
| 項目 | 說明 |
|------|------|
| 資料庫 | PostgreSQL 15 |
| 預估資料量 | 1000 萬筆/年 |
| 最大查詢時間 | P99 < 100ms |

---

## 2. 概念模型

### 2.1 核心實體

| 實體 | 說明 | 預估數量 |
|------|------|----------|
| User | 系統使用者 | 100 萬 |
| Product | 商品 | 10 萬 |
| Order | 訂單 | 1000 萬/年 |
| OrderItem | 訂單項目 | 3000 萬/年 |

### 2.2 實體關係圖 (ERD)

```
┌─────────────┐       ┌─────────────┐
│    User     │       │   Product   │
├─────────────┤       ├─────────────┤
│ id          │       │ id          │
│ email       │       │ name        │
│ name        │       │ price       │
│ created_at  │       │ stock       │
└──────┬──────┘       └──────┬──────┘
       │                     │
       │ 1:N                 │ 1:N
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│    Order    │       │ OrderItem   │
├─────────────┤       ├─────────────┤
│ id          │◄──────│ order_id    │
│ user_id     │  1:N  │ product_id  │
│ total       │       │ quantity    │
│ status      │       │ price       │
└─────────────┘       └─────────────┘
```

### 2.3 實體關係說明

| 關係 | 類型 | 說明 |
|------|------|------|
| User → Order | 1:N | 一個用戶可有多筆訂單 |
| Order → OrderItem | 1:N | 一筆訂單可有多個項目 |
| Product → OrderItem | 1:N | 一個商品可出現在多個訂單項目 |

---

## 3. 邏輯模型

### 3.1 User (使用者)

| 欄位 | 說明 | 類型 | 必填 | 唯一 | 預設值 |
|------|------|------|------|------|--------|
| id | 主鍵 | UUID | ✓ | ✓ | gen_uuid() |
| email | 電子郵件 | VARCHAR(255) | ✓ | ✓ | - |
| password_hash | 密碼雜湊 | VARCHAR(255) | ✓ | - | - |
| name | 姓名 | VARCHAR(100) | ✓ | - | - |
| phone | 電話 | VARCHAR(20) | - | - | NULL |
| avatar_url | 頭像網址 | VARCHAR(500) | - | - | NULL |
| status | 狀態 | ENUM | ✓ | - | 'active' |
| role | 角色 | ENUM | ✓ | - | 'user' |
| email_verified_at | 驗證時間 | TIMESTAMP | - | - | NULL |
| created_at | 建立時間 | TIMESTAMP | ✓ | - | NOW() |
| updated_at | 更新時間 | TIMESTAMP | ✓ | - | NOW() |

**狀態 ENUM**: `active`, `inactive`, `suspended`, `deleted`
**角色 ENUM**: `user`, `admin`, `super_admin`

**業務規則**:
- Email 必須唯一且符合格式
- 密碼經過 bcrypt 雜湊處理
- 軟刪除：status 改為 'deleted'

---

### 3.2 Product (商品)

| 欄位 | 說明 | 類型 | 必填 | 唯一 | 預設值 |
|------|------|------|------|------|--------|
| id | 主鍵 | UUID | ✓ | ✓ | gen_uuid() |
| sku | 商品編號 | VARCHAR(50) | ✓ | ✓ | - |
| name | 商品名稱 | VARCHAR(255) | ✓ | - | - |
| description | 描述 | TEXT | - | - | NULL |
| price | 售價 | DECIMAL(10,2) | ✓ | - | - |
| cost | 成本 | DECIMAL(10,2) | - | - | NULL |
| stock | 庫存 | INTEGER | ✓ | - | 0 |
| category_id | 分類 ID | UUID | - | - | NULL |
| status | 狀態 | ENUM | ✓ | - | 'draft' |
| images | 圖片 | JSONB | - | - | '[]' |
| attributes | 屬性 | JSONB | - | - | '{}' |
| created_at | 建立時間 | TIMESTAMP | ✓ | - | NOW() |
| updated_at | 更新時間 | TIMESTAMP | ✓ | - | NOW() |

**狀態 ENUM**: `draft`, `active`, `inactive`, `archived`

**JSONB 結構**:
```json
// images
["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"]

// attributes
{
  "color": "紅色",
  "size": "M",
  "weight": "500g"
}
```

---

### 3.3 Order (訂單)

| 欄位 | 說明 | 類型 | 必填 | 唯一 | 預設值 |
|------|------|------|------|------|--------|
| id | 主鍵 | UUID | ✓ | ✓ | gen_uuid() |
| order_number | 訂單編號 | VARCHAR(20) | ✓ | ✓ | 自動生成 |
| user_id | 用戶 ID | UUID | ✓ | - | - |
| status | 狀態 | ENUM | ✓ | - | 'pending' |
| subtotal | 小計 | DECIMAL(10,2) | ✓ | - | - |
| discount | 折扣 | DECIMAL(10,2) | ✓ | - | 0 |
| shipping_fee | 運費 | DECIMAL(10,2) | ✓ | - | 0 |
| total | 總計 | DECIMAL(10,2) | ✓ | - | - |
| shipping_address | 配送地址 | JSONB | ✓ | - | - |
| payment_method | 付款方式 | VARCHAR(50) | - | - | NULL |
| paid_at | 付款時間 | TIMESTAMP | - | - | NULL |
| shipped_at | 出貨時間 | TIMESTAMP | - | - | NULL |
| completed_at | 完成時間 | TIMESTAMP | - | - | NULL |
| notes | 備註 | TEXT | - | - | NULL |
| created_at | 建立時間 | TIMESTAMP | ✓ | - | NOW() |
| updated_at | 更新時間 | TIMESTAMP | ✓ | - | NOW() |

**狀態 ENUM**: `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `refunded`

**訂單編號格式**: `ORD-YYYYMMDD-XXXXX` (例: ORD-20240118-00001)

**shipping_address JSONB**:
```json
{
  "name": "王小明",
  "phone": "0912345678",
  "address": "台北市中正區忠孝東路100號",
  "postal_code": "100"
}
```

---

### 3.4 OrderItem (訂單項目)

| 欄位 | 說明 | 類型 | 必填 | 唯一 | 預設值 |
|------|------|------|------|------|--------|
| id | 主鍵 | UUID | ✓ | ✓ | gen_uuid() |
| order_id | 訂單 ID | UUID | ✓ | - | - |
| product_id | 商品 ID | UUID | ✓ | - | - |
| product_name | 商品名稱快照 | VARCHAR(255) | ✓ | - | - |
| product_sku | 商品編號快照 | VARCHAR(50) | ✓ | - | - |
| quantity | 數量 | INTEGER | ✓ | - | - |
| unit_price | 單價 | DECIMAL(10,2) | ✓ | - | - |
| subtotal | 小計 | DECIMAL(10,2) | ✓ | - | - |
| created_at | 建立時間 | TIMESTAMP | ✓ | - | NOW() |

**設計考量**:
- 保留商品快照（名稱、SKU、價格），即使商品更新也不影響歷史訂單
- subtotal = quantity × unit_price

---

## 4. 物理模型

### 4.1 建表 DDL

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin', 'super_admin')),
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(10,2) CHECK (cost >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id UUID REFERENCES categories(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    images JSONB DEFAULT '[]'::jsonb,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded')),
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. 索引策略

### 5.1 索引設計

| 表格 | 索引名稱 | 欄位 | 類型 | 用途 |
|------|----------|------|------|------|
| users | idx_users_email | email | UNIQUE | 登入查詢 |
| users | idx_users_status | status | B-tree | 狀態篩選 |
| products | idx_products_sku | sku | UNIQUE | SKU 查詢 |
| products | idx_products_status | status | B-tree | 狀態篩選 |
| products | idx_products_category | category_id | B-tree | 分類篩選 |
| products | idx_products_name_gin | name | GIN | 全文搜尋 |
| orders | idx_orders_user | user_id | B-tree | 用戶訂單查詢 |
| orders | idx_orders_status | status | B-tree | 狀態篩選 |
| orders | idx_orders_created | created_at | B-tree | 時間排序 |
| order_items | idx_order_items_order | order_id | B-tree | 訂單明細查詢 |

### 5.2 索引 DDL

```sql
-- Users
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created ON users(created_at);

-- Products
CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('chinese', name));

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

---

## 6. 資料遷移

### 6.1 遷移策略

| 階段 | 說明 | 時間 |
|------|------|------|
| 1 | 建立新表結構 | T+0 |
| 2 | 資料同步（雙寫） | T+1 ~ T+7 |
| 3 | 驗證資料完整性 | T+8 |
| 4 | 切換讀取來源 | T+9 |
| 5 | 停止舊表寫入 | T+10 |

### 6.2 回滾計畫

1. 保留舊表 30 天
2. 維持雙寫機制可快速切換
3. 準備回滾腳本

---

## 7. 效能考量

### 7.1 查詢優化

**常見查詢模式**:

```sql
-- 用戶訂單列表（高頻）
SELECT * FROM orders
WHERE user_id = ? AND status = ?
ORDER BY created_at DESC
LIMIT 20;
-- 已有複合索引 idx_orders_user_status

-- 商品搜尋
SELECT * FROM products
WHERE status = 'active'
  AND to_tsvector('chinese', name) @@ to_tsquery('chinese', ?)
LIMIT 20;
-- 使用 GIN 索引

-- 訂單詳情（含項目）
SELECT o.*, oi.*
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = ?;
```

### 7.2 分區策略

對於 orders 表，當資料量超過 1000 萬筆時，建議按時間分區：

```sql
CREATE TABLE orders (
    -- columns...
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

### 7.3 容量規劃

| 表格 | 預估行數 | 平均行大小 | 預估大小 |
|------|----------|------------|----------|
| users | 100 萬 | 500 bytes | 500 MB |
| products | 10 萬 | 1 KB | 100 MB |
| orders | 1000 萬/年 | 500 bytes | 5 GB/年 |
| order_items | 3000 萬/年 | 200 bytes | 6 GB/年 |

---

## 附錄

### A. JSONB 查詢範例

```sql
-- 查詢紅色商品
SELECT * FROM products
WHERE attributes->>'color' = '紅色';

-- 查詢配送到台北的訂單
SELECT * FROM orders
WHERE shipping_address->>'address' LIKE '台北市%';
```

### B. 正規化說明

本設計採用第三正規化 (3NF)，除以下例外：
- OrderItem 保留 product_name, product_sku（反正規化，確保歷史記錄不受商品更新影響）
- User 的 shipping_address 使用 JSONB（彈性欄位）

---

**最後更新**: YYYY-MM-DD
**版本**: 1.0
**設計者**: [設計者姓名]
```

---

## 品質檢查清單

- [ ] 所有實體都有明確定義
- [ ] 關係和基數正確
- [ ] 資料類型合適
- [ ] 必填/唯一約束正確
- [ ] 索引策略完整
- [ ] 效能需求可達成
- [ ] 考慮資料成長
- [ ] 遷移計畫可行

---

## 相關 Skills
- `adr.md` - 架構決策記錄
- `database-migration.md` - 資料庫遷移
- `api-design.md` - API 設計（資料格式）
- `backend-service.md` - 後端服務開發
