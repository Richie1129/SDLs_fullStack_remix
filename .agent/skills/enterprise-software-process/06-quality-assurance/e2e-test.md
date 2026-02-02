---
description: 端對端測試（E2E Test）標準流程與最佳實踐
---

# E2E Test 端對端測試

## 概述

此 skill 提供端對端測試指引，模擬真實用戶操作流程，驗證整個系統的功能正確性。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | QA 工程師 |
| **協作角色** | 開發工程師、產品經理 |

---

## 1. 測試工具選擇

| 工具 | 特點 | 適用場景 |
|------|------|---------|
| **Playwright** | 跨瀏覽器、自動等待 | 推薦首選 |
| **Cypress** | 開發者體驗佳 | 單瀏覽器為主 |
| **Puppeteer** | Chrome/Node 原生 | 需求簡單 |

---

## 2. Playwright 範例

### 安裝與配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

### 登入流程測試

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('登入失敗');
  });
});
```

### 購物流程測試

```typescript
test.describe('Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 登入
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('user can complete purchase', async ({ page }) => {
    // 瀏覽商品
    await page.goto('/products');
    await page.click('[data-testid="product-1"]');
    
    // 加入購物車
    await page.click('button:has-text("加入購物車")');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // 結帳
    await page.goto('/cart');
    await page.click('button:has-text("結帳")');
    
    // 填寫資訊
    await page.fill('[name="address"]', '台北市信義區...');
    await page.click('button:has-text("確認訂單")');
    
    // 驗證完成
    await expect(page).toHaveURL(/\/orders\/.+/);
    await expect(page.locator('h1')).toContainText('訂單完成');
  });
});
```

---

## 3. Page Object Model

```typescript
// tests/e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// 使用
test('login test', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 4. 測試資料管理

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

type Fixtures = {
  loginPage: LoginPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  authenticatedPage: async ({ page }, use) => {
    // 自動登入
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
});
```

---

## 5. CI/CD 整合

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 檢查清單

- [ ] 覆蓋關鍵用戶流程
- [ ] 使用 Page Object Model
- [ ] 跨瀏覽器測試
- [ ] 失敗時自動截圖/錄影
- [ ] CI 中自動執行

---

## 相關 Skills

- [integration-test.md](./integration-test.md) - 整合測試
- [test-case.md](./test-case.md) - 測試案例設計
