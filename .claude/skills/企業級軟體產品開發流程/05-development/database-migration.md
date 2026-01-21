---
description: 資料庫遷移（Database Migration）標準流程與最佳實踐
---

# Database Migration 資料庫遷移

## 概述

此 skill 提供資料庫 Schema 變更的完整指引，包含遷移檔案管理、版本控制、向前/向後相容性、零停機部署策略，確保資料庫變更安全且可追蹤。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 後端工程師、DBA |
| **協作角色** | DevOps 工程師 |
| **審核人員** | 技術主管、DBA |

## 輸入需求

- [ ] 資料模型變更需求
- [ ] 現有資料庫 Schema
- [ ] 預估資料量/影響範圍
- [ ] 上線時間窗口

---

## 1. 遷移工具選擇

### 1.1 常用遷移工具比較

| 工具 | 語言/框架 | 特點 |
|------|----------|------|
| **Prisma Migrate** | Node.js/TypeScript | Schema-first, 型別安全 |
| **Knex.js** | Node.js | 靈活的 Query Builder |
| **TypeORM** | TypeScript | Entity-first, 自動生成 |
| **Flyway** | Java/多語言 | SQL-based, 企業級 |
| **Alembic** | Python/SQLAlchemy | 功能完整 |
| **golang-migrate** | Go | 輕量級, SQL-based |

### 1.2 Prisma Migrate 範例專案結構

```
prisma/
├── schema.prisma           # 資料模型定義
├── migrations/
│   ├── 20240115_init/
│   │   └── migration.sql
│   ├── 20240120_add_user_avatar/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts                 # 初始資料
```

---

## 2. 遷移檔案命名規範

### 2.1 命名格式

```
<timestamp>_<action>_<description>

範例：
20240115100000_create_users_table
20240120143000_add_avatar_to_users
20240125090000_create_orders_table
20240130160000_add_index_on_orders_user_id
20240201120000_alter_products_add_sku
```

### 2.2 動作動詞

| 動詞 | 說明 | 範例 |
|------|------|------|
| `create` | 建立表格 | `create_users_table` |
| `add` | 新增欄位/索引 | `add_email_to_users` |
| `alter` | 修改欄位 | `alter_price_precision` |
| `drop` | 刪除表格/欄位 | `drop_legacy_logs` |
| `rename` | 重新命名 | `rename_users_name_to_full_name` |
| `create_index` | 建立索引 | `create_index_on_orders_status` |

---

## 3. 遷移檔案撰寫

### 3.1 基本結構（SQL）

```sql
-- migrations/20240120_create_orders_table.sql

-- ==========================================
-- Migration: create_orders_table
-- Author: engineering-team
-- Date: 2024-01-20
-- Description: 建立訂單表格與相關索引
-- ==========================================

-- Up Migration
BEGIN;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
    shipping_address JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 觸發器：自動更新 updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS '訂單主表';
COMMENT ON COLUMN orders.status IS '訂單狀態：pending/processing/completed/cancelled';

COMMIT;

-- Down Migration (Rollback)
-- DROP TABLE IF EXISTS orders CASCADE;
```

### 3.2 Prisma Schema 範例

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  avatar    String?  // 新增的欄位
  status    UserStatus @default(ACTIVE)
  orders    Order[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Order {
  id            String      @id @default(uuid())
  userId        String      @map("user_id")
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  status        OrderStatus @default(PENDING)
  totalAmount   Decimal     @default(0) @map("total_amount") @db.Decimal(12, 2)
  currency      String      @default("TWD") @db.VarChar(3)
  items         OrderItem[]
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("orders")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}
```

### 3.3 Knex.js 遷移範例

```javascript
// migrations/20240120143000_create_orders.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 建立 enum type
  await knex.raw(`
    CREATE TYPE order_status AS ENUM (
      'pending', 'processing', 'completed', 'cancelled'
    )
  `);

  // 建立表格
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.specificType('status', 'order_status').notNullable().defaultTo('pending');
    table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    table.string('currency', 3).notNullable().defaultTo('TWD');
    table.jsonb('shipping_address');
    table.text('notes');
    table.timestamps(true, true);

    // 索引
    table.index('user_id');
    table.index('status');
    table.index(['created_at'], 'idx_orders_created_at_desc', { 
      storageEngineIndexType: 'desc' 
    });
  });

  // 觸發器
  await knex.raw(`
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('orders');
  await knex.raw('DROP TYPE IF EXISTS order_status');
};
```

---

## 4. 常見遷移場景

### 4.1 新增欄位（安全）

```sql
-- ✅ 安全：新增可為 NULL 的欄位
ALTER TABLE users ADD COLUMN avatar VARCHAR(255);

-- ✅ 安全：新增有預設值的欄位
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- ⚠️ 注意：新增 NOT NULL 欄位需要預設值
ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';
```

### 4.2 修改欄位（需謹慎）

```sql
-- ✅ 安全：擴大欄位長度
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(200);

-- ⚠️ 危險：縮小欄位長度（可能資料截斷）
-- 必須先驗證現有資料
SELECT MAX(LENGTH(name)) FROM users;
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(50);

-- ⚠️ 危險：改變欄位型別
-- 步驟 1: 新增新欄位
ALTER TABLE products ADD COLUMN price_new DECIMAL(12, 4);
-- 步驟 2: 遷移資料
UPDATE products SET price_new = price::DECIMAL(12, 4);
-- 步驟 3: 應用程式同時讀寫新舊欄位（過渡期）
-- 步驟 4: 重命名欄位
ALTER TABLE products DROP COLUMN price;
ALTER TABLE products RENAME COLUMN price_new TO price;
```

### 4.3 重命名欄位（向後相容）

```sql
-- 步驟 1: 新增新欄位並複製資料
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
UPDATE users SET full_name = name;

-- 步驟 2: 建立觸發器同步資料（過渡期）
CREATE OR REPLACE FUNCTION sync_user_name()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.full_name = COALESCE(NEW.full_name, NEW.name);
    NEW.name = COALESCE(NEW.name, NEW.full_name);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_user_name_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sync_user_name();

-- 步驟 3: 應用程式切換到新欄位
-- 步驟 4: 移除舊欄位和觸發器
DROP TRIGGER sync_user_name_trigger ON users;
DROP FUNCTION sync_user_name();
ALTER TABLE users DROP COLUMN name;
```

### 4.4 刪除欄位（三階段）

```sql
-- 階段 1: 標記為廢棄（程式碼不再使用）
COMMENT ON COLUMN users.legacy_field IS 'DEPRECATED: Will be removed in v2.5';

-- 階段 2: 新增 NOT NULL 約束為可選（如原本為 NOT NULL）
ALTER TABLE users ALTER COLUMN legacy_field DROP NOT NULL;

-- 階段 3: 刪除欄位（確認無使用後）
ALTER TABLE users DROP COLUMN legacy_field;
```

### 4.5 大表新增索引（不鎖表）

```sql
-- ⚠️ 危險：會鎖表
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ✅ 安全：CONCURRENTLY 不鎖表
-- 注意：不能在交易中執行
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);

-- 如果建立失敗，需要手動清理
-- DROP INDEX CONCURRENTLY IF EXISTS idx_orders_created_at;
```

---

## 5. 零停機遷移策略

### 5.1 擴展/收縮模式（Expand-Contract Pattern）

```
┌─────────────────────────────────────────────────────────────┐
│                 Expand-Contract Pattern                      │
└─────────────────────────────────────────────────────────────┘

Phase 1: EXPAND（擴展）
┌───────────────────────────────────────┐
│ Database                              │
│ ┌───────────┐   ┌───────────┐        │
│ │ old_column│ + │ new_column│        │  兩個欄位同時存在
│ └───────────┘   └───────────┘        │
└───────────────────────────────────────┘
         ↓
┌───────────────────────────────────────┐
│ Application v1                        │
│ - 寫入兩個欄位                         │
│ - 讀取新欄位（fallback 舊欄位）         │
└───────────────────────────────────────┘

Phase 2: MIGRATE（遷移資料）
┌───────────────────────────────────────┐
│ Background Job                        │
│ UPDATE table SET new = old            │
│ WHERE new IS NULL                     │  批次遷移歷史資料
└───────────────────────────────────────┘

Phase 3: CONTRACT（收縮）
┌───────────────────────────────────────┐
│ Application v2                        │
│ - 只使用新欄位                         │
└───────────────────────────────────────┘
         ↓
┌───────────────────────────────────────┐
│ Database                              │
│ ┌───────────┐                        │
│ │ new_column│  刪除舊欄位              │
│ └───────────┘                        │
└───────────────────────────────────────┘
```

### 5.2 雙寫策略（Dual Write）

```typescript
// services/user.service.ts

class UserService {
  // 過渡期：雙寫新舊欄位
  async updateUserName(userId: string, name: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: name,      // 舊欄位
        fullName: name,  // 新欄位
      },
    });
  }

  // 過渡期：讀取新欄位，fallback 舊欄位
  async getUserName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, fullName: true },
    });
    return user?.fullName ?? user?.name ?? '';
  }
}
```

### 5.3 批次資料遷移

```typescript
// scripts/migrate-user-names.ts

async function migrateUserNames() {
  const BATCH_SIZE = 1000;
  let processedCount = 0;
  let hasMore = true;

  console.log('Starting user name migration...');

  while (hasMore) {
    // 批次查詢需要遷移的記錄
    const users = await prisma.user.findMany({
      where: {
        fullName: null,
        name: { not: null },
      },
      take: BATCH_SIZE,
      select: { id: true, name: true },
    });

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    // 批次更新
    await prisma.$transaction(
      users.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { fullName: user.name },
        })
      )
    );

    processedCount += users.length;
    console.log(`Migrated ${processedCount} users...`);

    // 避免過度負載
    await sleep(100);
  }

  console.log(`Migration complete. Total: ${processedCount} users`);
}
```

---

## 6. 遷移流程

### 6.1 開發流程

```
┌─────────────────────────────────────────────────────────────┐
│                      遷移開發流程                            │
└─────────────────────────────────────────────────────────────┘

1. 建立遷移檔案
   $ npx prisma migrate dev --name add_avatar_to_users
   或
   $ npx knex migrate:make add_avatar_to_users

2. 撰寫遷移 SQL / 修改 Schema

3. 本地測試
   $ npx prisma migrate dev
   $ npm run test:migration

4. 提交 PR
   - 遷移檔案
   - 相關程式碼變更
   - 測試案例

5. Code Review
   - DBA 審核 SQL
   - 效能影響評估

6. 合併與部署
   - CI/CD 自動執行遷移
```

### 6.2 部署順序

```
┌─────────────────────────────────────────────────────────────┐
│                      部署順序原則                            │
└─────────────────────────────────────────────────────────────┘

新增欄位/表格：Migration → Application
  1. 先執行 migration
  2. 再部署新版應用程式

刪除欄位/表格：Application → Migration
  1. 先部署不使用該欄位的應用程式
  2. 確認無問題後，再執行 migration 刪除

修改欄位：Expand → Migrate → Contract
  1. 新增新欄位（expand）
  2. 部署雙寫版本
  3. 遷移歷史資料
  4. 部署只用新欄位版本（contract）
  5. 刪除舊欄位
```

---

## 7. Rollback 策略

### 7.1 Rollback 腳本

```sql
-- migrations/20240120_add_avatar_to_users_rollback.sql

-- Rollback: add_avatar_to_users
-- ⚠️ WARNING: 執行前確認不會遺失重要資料

BEGIN;

-- 備份資料（如需要）
CREATE TABLE users_avatar_backup AS
SELECT id, avatar FROM users WHERE avatar IS NOT NULL;

-- 執行 rollback
ALTER TABLE users DROP COLUMN IF EXISTS avatar;

COMMIT;

-- 驗證
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'avatar';
-- 預期結果：0
```

### 7.2 自動 Rollback

```yaml
# .github/workflows/migrate.yml

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Run migrations
        run: |
          npx prisma migrate deploy
        continue-on-error: true
        id: migrate

      - name: Verify migration
        if: steps.migrate.outcome == 'success'
        run: |
          npm run db:verify

      - name: Rollback on failure
        if: steps.migrate.outcome == 'failure' || failure()
        run: |
          echo "Migration failed, initiating rollback..."
          npx prisma migrate reset --force
          # 或執行自定義 rollback
          npm run db:rollback
```

---

## 輸出模板

```markdown
# Database Migration Request

## 基本資訊
- **遷移名稱**: [20240120_add_avatar_to_users]
- **申請人**: [工程師名稱]
- **預計執行時間**: [2024-01-25 02:00 UTC]
- **預估執行時長**: [< 1 分鐘]
- **影響表格**: [users]
- **影響資料量**: [約 10 萬筆]

## 變更內容

### Schema 變更
```sql
ALTER TABLE users ADD COLUMN avatar VARCHAR(255);
```

### Rollback 腳本
```sql
ALTER TABLE users DROP COLUMN avatar;
```

## 風險評估

| 項目 | 評估 |
|------|------|
| 鎖表風險 | 🟢 低（新增可 NULL 欄位） |
| 資料遺失 | 🟢 無 |
| 相容性 | 🟢 向後相容 |
| 效能影響 | 🟢 無 |

## 部署順序
1. [ ] 執行 migration
2. [ ] 部署新版應用程式
3. [ ] 驗證功能正常

## 核准
- [ ] DBA 審核
- [ ] Tech Lead 核准
```

---

## 檢查清單

### 遷移開發
- [ ] 遷移檔案命名符合規範
- [ ] 包含 rollback 腳本
- [ ] 本地測試通過
- [ ] 考慮向後相容性
- [ ] 大資料量已測試效能

### 部署前
- [ ] 已備份資料庫
- [ ] 已確認維護時間窗口
- [ ] Rollback 腳本已驗證
- [ ] 監控告警已就緒

### 部署後
- [ ] 驗證 Schema 正確
- [ ] 應用程式功能正常
- [ ] 效能指標正常
- [ ] 無錯誤日誌

---

## 相關 Skills

- [backend-service.md](./backend-service.md) - 後端服務開發
- [../04-architecture/data-model.md](../04-architecture/data-model.md) - 資料模型設計
- [../08-deployment/release-checklist.md](../08-deployment/release-checklist.md) - 發布檢查清單
- [../08-deployment/rollback-plan.md](../08-deployment/rollback-plan.md) - 回滾計畫
