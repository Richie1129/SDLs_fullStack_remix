---
description: 整合測試（Integration Test）標準流程與最佳實踐
---

# Integration Test 整合測試

## 概述

此 skill 提供整合測試的完整指引，驗證多個模組/服務之間的互動是否正確運作。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 開發工程師、QA 工程師 |
| **協作角色** | DevOps 工程師 |

---

## 1. 整合測試範圍

```
┌─────────────────────────────────────────┐
│              整合測試範圍                │
├─────────────────────────────────────────┤
│  • API 端點 → 服務 → 資料庫             │
│  • 服務 → 外部 API                      │
│  • 服務 → 訊息佇列                      │
│  • 服務 → 快取                          │
└─────────────────────────────────────────┘
```

## 2. 測試環境設定

### Docker Compose 測試環境

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # 使用記憶體加速

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

### Jest 配置

```javascript
// jest.integration.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterEnv: ['./tests/setup-integration.ts'],
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  testTimeout: 30000,
};
```

---

## 3. API 整合測試

### Supertest 範例

```typescript
// tests/api/users.integration.test.ts
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/infrastructure/database';

describe('Users API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/users', () => {
    it('should create user and return 201', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      
      // 驗證資料庫
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).not.toBeNull();
    });

    it('should return 409 when email exists', async () => {
      // Arrange
      await prisma.user.create({
        data: { email: 'test@example.com', name: 'Existing', password: 'hash' },
      });

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/users')
        .send({ email: 'test@example.com', name: 'New', password: 'Password123!' })
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user when exists', async () => {
      const user = await prisma.user.create({
        data: { email: 'test@example.com', name: 'Test', password: 'hash' },
      });

      const response = await request(app)
        .get(`/api/v1/users/${user.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(user.id);
    });

    it('should return 404 when not exists', async () => {
      await request(app)
        .get('/api/v1/users/non-existent-id')
        .expect(404);
    });
  });
});
```

---

## 4. 資料庫整合測試

### Transaction Rollback 模式

```typescript
// tests/setup-integration.ts
import { prisma } from '@/infrastructure/database';

beforeEach(async () => {
  // 開始交易
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // 回滾交易，保持資料庫乾淨
  await prisma.$executeRaw`ROLLBACK`;
});
```

### 獨立測試資料庫

```typescript
// tests/global-setup.ts
import { execSync } from 'child_process';

export default async () => {
  console.log('Setting up test database...');
  
  // 重置測試資料庫
  execSync('npx prisma migrate reset --force', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
};
```

---

## 5. 外部服務測試

### Mock Server (MSW)

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('https://api.stripe.com/v1/customers/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        email: 'customer@example.com',
      })
    );
  }),

  rest.post('https://api.sendgrid.com/v3/mail/send', (req, res, ctx) => {
    return res(ctx.status(202));
  }),
];

// tests/setup-integration.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Testcontainers

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('Database Integration', () => {
  let container: StartedPostgreSqlContainer;
  
  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test')
      .start();
      
    process.env.DATABASE_URL = container.getConnectionUri();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  // 測試...
});
```

---

## 6. 認證測試

```typescript
describe('Authenticated API', () => {
  let authToken: string;

  beforeAll(async () => {
    // 建立測試用戶並取得 token
    const user = await createTestUser();
    authToken = generateToken(user);
  });

  it('should access protected route with valid token', async () => {
    await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('should reject without token', async () => {
    await request(app)
      .get('/api/v1/me')
      .expect(401);
  });
});
```

---

## 7. 測試資料管理

### Factory Pattern

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '@/infrastructure/database';

export const userFactory = {
  build: (overrides = {}) => ({
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: 'hashedPassword',
    ...overrides,
  }),

  create: async (overrides = {}) => {
    return prisma.user.create({
      data: userFactory.build(overrides),
    });
  },

  createMany: async (count: number, overrides = {}) => {
    return Promise.all(
      Array.from({ length: count }, () => userFactory.create(overrides))
    );
  },
};

// 使用
const user = await userFactory.create({ status: 'active' });
const users = await userFactory.createMany(5);
```

---

## 8. CI/CD 整合

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
```

---

## 檢查清單

- [ ] 測試環境與生產環境隔離
- [ ] 每個測試獨立可執行
- [ ] 清理測試資料
- [ ] 外部服務有 Mock
- [ ] CI 中自動執行
- [ ] 測試時間 < 10 分鐘

---

## 相關 Skills

- [unit-test.md](./unit-test.md) - 單元測試
- [e2e-test.md](./e2e-test.md) - 端對端測試
- [test-strategy.md](./test-strategy.md) - 測試策略
