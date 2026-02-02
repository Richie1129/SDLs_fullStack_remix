---
description: 制定完整測試策略，包含測試金字塔、覆蓋率目標和自動化
---

# 測試策略 (Test Strategy)

## 概述
此 skill 協助制定全面的測試策略，涵蓋單元測試、整合測試、端對端測試、效能測試、安全測試等各個層面，定義測試覆蓋率目標、測試工具選擇、自動化策略和持續改進機制。

## 適用角色
- **主要負責**: QA 主管、測試架構師
- **協作角色**: 開發團隊、DevOps 工程師、產品經理

## 輸入需求
使用者需要提供：
- 產品類型和架構
- 品質要求和 SLA
- 團隊規模和技能
- 發布頻率
- 預算和時程限制

範例：`請幫我制定 [產品類型] 的測試策略，團隊 [規模]，要求 [品質目標]`

## 執行步驟

### 步驟 1: 定義測試目標
- 明確品質目標和標準
- 識別關鍵品質屬性
- 定義可接受的缺陷率
- 設定測試覆蓋率目標

### 步驟 2: 設計測試金字塔
- 規劃各層測試比例
- 定義單元測試範圍
- 定義整合測試範圍
- 定義 E2E 測試範圍

### 步驟 3: 選擇測試工具
- 評估測試框架
- 選擇自動化工具
- 選擇效能測試工具
- 選擇安全測試工具

### 步驟 4: 制定測試流程
- 定義測試生命週期
- 建立測試環境策略
- 設計缺陷管理流程
- 規劃回歸測試

### 步驟 5: 建立測試自動化
- 識別自動化候選
- 建立 CI/CD 整合
- 設定自動化執行排程
- 建立測試報告機制

### 步驟 6: 持續改進
- 建立測試指標追蹤
- 定期審查測試效果
- 優化測試流程
- 更新測試策略

## 輸出模板

```markdown
# 測試策略文件

**專案名稱**: [專案名稱]  
**版本**: 1.0  
**文件日期**: YYYY-MM-DD  
**負責人**: [QA 主管]  
**狀態**: 草稿 / 已核准

---

## 目錄

1. [測試目標與範圍](#1-測試目標與範圍)
2. [測試金字塔](#2-測試金字塔)
3. [測試類型](#3-測試類型)
4. [測試覆蓋率目標](#4-測試覆蓋率目標)
5. [測試工具與框架](#5-測試工具與框架)
6. [測試環境](#6-測試環境)
7. [測試流程](#7-測試流程)
8. [自動化策略](#8-自動化策略)
9. [缺陷管理](#9-缺陷管理)
10. [測試指標](#10-測試指標)
11. [風險與挑戰](#11-風險與挑戰)

---

## 1. 測試目標與範圍

### 1.1 測試目標

**主要目標**:
1. 確保產品功能符合需求規格
2. 驗證系統穩定性和可靠性
3. 保證使用者體驗品質
4. 提早發現和修正缺陷
5. 降低生產環境故障率

**品質標準**:
- 功能正確率: 99.9%
- 系統可用性: 99.9%
- 回應時間: P95 < 500ms
- 缺陷逃逸率: < 1%
- 測試覆蓋率: > 80%

### 1.2 測試範圍

**包含在內**:
- ✅ 核心業務功能
- ✅ API 端點
- ✅ 使用者介面
- ✅ 資料庫操作
- ✅ 第三方整合
- ✅ 效能和擴展性
- ✅ 安全性
- ✅ 相容性（瀏覽器、裝置）

**排除在外**:
- ❌ 第三方服務內部邏輯
- ❌ 已棄用的功能
- ❌ 原型或概念驗證程式碼

### 1.3 品質屬性

| 品質屬性 | 優先級 | 驗證方法 |
|---------|--------|---------|
| 功能性 | 🔴 高 | 單元測試、整合測試、E2E 測試 |
| 可靠性 | 🔴 高 | 穩定性測試、容錯測試 |
| 效能 | 🟡 中 | 負載測試、壓力測試 |
| 安全性 | 🔴 高 | 安全掃描、滲透測試 |
| 可用性 | 🟡 中 | 可用性測試、使用者測試 |
| 相容性 | 🟢 低 | 跨瀏覽器測試、裝置測試 |

---

## 2. 測試金字塔

### 2.1 測試金字塔模型

```
       ╱────────╲
      ╱  E2E 測試 ╲     10%  - 少量但關鍵
     ╱────────────╲     - 慢速、脆弱、昂貴
    ╱  整合測試    ╲    30%  - 中等數量
   ╱──────────────╲    - 中速、中等維護
  ╱   單元測試      ╲   60%  - 大量
 ╱──────────────────╲  - 快速、穩定、便宜
```

### 2.2 各層測試比例

| 測試層級 | 比例 | 數量 | 執行時間 | 維護成本 |
|---------|------|------|---------|---------|
| 單元測試 | 60% | ~1000+ | < 1 分鐘 | 低 |
| 整合測試 | 30% | ~300 | 1-5 分鐘 | 中 |
| E2E 測試 | 10% | ~50 | 5-30 分鐘 | 高 |

### 2.3 測試範圍分配

**單元測試 (60%)**:
- 業務邏輯函式
- 工具函式
- 資料模型
- 驗證邏輯
- 演算法

**整合測試 (30%)**:
- API 端點
- 資料庫操作
- 外部服務整合
- 檔案系統操作
- 訊息佇列

**E2E 測試 (10%)**:
- 關鍵使用者流程
- 端對端業務場景
- 跨系統整合
- 使用者介面互動

---

## 3. 測試類型

### 3.1 功能性測試

#### 單元測試 (Unit Testing)
**目的**: 驗證最小可測試單元的正確性

**範圍**:
- 獨立函式
- 類別方法
- 元件邏輯

**工具**: Jest, Mocha, Pytest, JUnit

**範例**:
```javascript
describe('calculateTotal', () => {
  it('should calculate total price correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 }
    ];
    
    const total = calculateTotal(items);
    
    expect(total).toBe(350);
  });
  
  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
  
  it('should handle negative quantities', () => {
    const items = [{ price: 100, quantity: -1 }];
    expect(() => calculateTotal(items)).toThrow();
  });
});
```

**最佳實踐**:
- ✅ 測試應該獨立、可重複
- ✅ 使用 AAA 模式（Arrange, Act, Assert）
- ✅ 一個測試只驗證一件事
- ✅ 使用有意義的測試名稱
- ✅ 使用 Mock 隔離外部依賴

---

#### 整合測試 (Integration Testing)
**目的**: 驗證多個模組間的互動

**範圍**:
- API 端點測試
- 資料庫整合
- 外部服務呼叫
- 模組間互動

**工具**: Supertest, Postman, REST Assured

**範例**:
```javascript
describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
    
    expect(response.body).toMatchObject({
      email: userData.email,
      name: userData.name
    });
    expect(response.body.password).toBeUndefined();
    
    // 驗證資料庫
    const user = await User.findOne({ email: userData.email });
    expect(user).toBeDefined();
  });
});
```

---

#### 端對端測試 (E2E Testing)
**目的**: 驗證完整的使用者流程

**範圍**:
- 關鍵業務流程
- 使用者介面互動
- 跨頁面導航
- 表單提交

**工具**: Cypress, Playwright, Selenium

**範例**:
```javascript
describe('User Login Flow', () => {
  it('should allow user to login successfully', () => {
    cy.visit('/login');
    
    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, Test User').should('be.visible');
  });
  
  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpass');
    cy.get('button[type="submit"]').click();
    
    cy.contains('Invalid credentials').should('be.visible');
    cy.url().should('include', '/login');
  });
});
```

---

### 3.2 非功能性測試

#### 效能測試 (Performance Testing)

**負載測試 (Load Testing)**:
- 目的: 驗證系統在預期負載下的表現
- 場景: 模擬正常用戶數量和操作
- 工具: Apache JMeter, k6, Gatling

**壓力測試 (Stress Testing)**:
- 目的: 找出系統的極限
- 場景: 逐步增加負載直到系統崩潰
- 目標: 找出瓶頸和極限容量

**尖峰測試 (Spike Testing)**:
- 目的: 驗證系統處理突發流量的能力
- 場景: 短時間內突然增加大量用戶

**浸泡測試 (Soak Testing)**:
- 目的: 驗證系統長時間運行的穩定性
- 場景: 持續運行數小時或數天
- 目標: 發現記憶體洩漏、資源耗盡

**效能指標**:
| 指標 | 目標值 | 測量方法 |
|------|--------|---------|
| 回應時間 (P95) | < 500ms | APM 工具 |
| 回應時間 (P99) | < 1000ms | APM 工具 |
| 吞吐量 | > 1000 req/s | 負載測試 |
| 錯誤率 | < 0.1% | 日誌分析 |
| CPU 使用率 | < 70% | 監控工具 |
| 記憶體使用率 | < 80% | 監控工具 |

---

#### 安全測試 (Security Testing)

**靜態應用程式安全測試 (SAST)**:
- 工具: SonarQube, ESLint security plugins
- 掃描原始碼找出安全漏洞
- 在開發階段執行

**動態應用程式安全測試 (DAST)**:
- 工具: OWASP ZAP, Burp Suite
- 在運行時測試應用程式
- 模擬攻擊場景

**依賴漏洞掃描**:
- 工具: npm audit, Snyk, Dependabot
- 檢查第三方套件的已知漏洞
- 自動化每日掃描

**滲透測試**:
- 頻率: 每季度或重大發布前
- 由安全專家執行
- 涵蓋 OWASP Top 10

**安全測試檢查清單**:
- [ ] SQL 注入防護
- [ ] XSS 防護
- [ ] CSRF 防護
- [ ] 認證和授權正確性
- [ ] 敏感資料加密
- [ ] 安全標頭配置
- [ ] 速率限制
- [ ] 輸入驗證

---

#### 相容性測試

**瀏覽器相容性**:
| 瀏覽器 | 版本 | 優先級 |
|--------|------|--------|
| Chrome | 最新 2 版 | 🔴 高 |
| Firefox | 最新 2 版 | 🟡 中 |
| Safari | 最新 2 版 | 🟡 中 |
| Edge | 最新 2 版 | 🟡 中 |
| IE 11 | - | 🟢 低（如需支援） |

**裝置相容性**:
- 桌面: Windows, macOS, Linux
- 行動裝置: iOS (最新 2 版), Android (最新 3 版)
- 螢幕尺寸: 320px - 3840px

**工具**: BrowserStack, Sauce Labs

---

## 4. 測試覆蓋率目標

### 4.1 程式碼覆蓋率

**整體目標**: > 80%

**細分目標**:
| 模組類型 | 覆蓋率目標 | 說明 |
|---------|-----------|------|
| 核心業務邏輯 | > 90% | 關鍵功能必須充分測試 |
| API 端點 | > 85% | 所有端點和主要路徑 |
| 工具函式 | > 95% | 純函式易於測試 |
| UI 元件 | > 70% | 重要互動和邏輯 |
| 配置和常數 | > 50% | 低優先級 |

**覆蓋率類型**:
- **行覆蓋率** (Line Coverage): 執行到的程式碼行
- **分支覆蓋率** (Branch Coverage): 所有 if/else 分支
- **函式覆蓋率** (Function Coverage): 呼叫到的函式
- **語句覆蓋率** (Statement Coverage): 執行的語句

**注意**: 100% 覆蓋率不等於完全正確，重點是測試品質而非數字

### 4.2 功能覆蓋率

**關鍵功能**: 100% 覆蓋
- 使用者認證和授權
- 支付流程
- 資料匯入/匯出
- 關鍵業務邏輯

**一般功能**: 80% 覆蓋
- 標準 CRUD 操作
- 報表生成
- 通知發送

**次要功能**: 50% 覆蓋
- 輔助功能
- 管理後台

---

## 5. 測試工具與框架

### 5.1 前端測試

**單元測試**:
- **框架**: Jest + React Testing Library
- **理由**: 官方推薦、社群支援好、易於使用

**E2E 測試**:
- **框架**: Cypress
- **理由**: 快速、可靠、除錯容易、視覺化測試執行

**視覺回歸測試**:
- **工具**: Percy, Chromatic
- **用途**: 檢測 UI 意外變更

### 5.2 後端測試

**單元測試**:
- **Node.js**: Jest, Mocha + Chai
- **Python**: Pytest
- **Java**: JUnit 5

**整合測試**:
- **API 測試**: Supertest, Postman/Newman
- **資料庫**: TestContainers（使用真實資料庫）

### 5.3 效能測試

**工具**: k6, Apache JMeter, Gatling

**選擇 k6 的理由**:
- ✅ 程式碼化測試腳本（JavaScript）
- ✅ CLI 友善，易於 CI/CD 整合
- ✅ 詳細的效能指標
- ✅ 支援分散式負載測試

**範例腳本**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 請求 < 500ms
    http_req_failed: ['rate<0.01'],   // 錯誤率 < 1%
  },
};

export default function () {
  let response = http.get('https://api.example.com/users');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### 5.4 安全測試

**SAST**: SonarQube, ESLint + security plugins
**DAST**: OWASP ZAP
**依賴掃描**: Snyk, npm audit

---

## 6. 測試環境

### 6.1 環境配置

| 環境 | 用途 | 資料 | 自動化測試 |
|------|------|------|-----------|
| **開發 (Dev)** | 開發人員本地測試 | 假資料 | 單元測試 |
| **測試 (Test)** | QA 測試、自動化測試 | 測試資料 | 整合測試、E2E |
| **預演 (Staging)** | 上線前驗證 | 脫敏真實資料 | 完整測試套件 |
| **生產 (Production)** | 正式環境 | 真實資料 | 煙霧測試 |

### 6.2 測試資料管理

**策略**:
- 使用資料工廠（Factory）生成測試資料
- 每次測試後清理資料
- 使用資料庫 Seed 建立初始資料
- 敏感資料脫敏

**範例** (JavaScript):
```javascript
// userFactory.js
const factory = require('factory-girl').factory;
const User = require('../models/User');

factory.define('user', User, {
  email: factory.sequence('User.email', (n) => `user${n}@example.com`),
  name: factory.chance('name'),
  age: factory.chance('age', { min: 18, max: 80 }),
});

// 使用
const user = await factory.create('user');
const users = await factory.createMany('user', 10);
```

---

## 7. 測試流程

### 7.1 測試生命週期

```
需求分析
    ↓
測試計畫 ──→ 測試設計
    ↓           ↓
測試環境準備 ← 測試案例開發
    ↓
測試執行
    ↓
缺陷記錄與追蹤
    ↓
回歸測試
    ↓
測試報告
```

### 7.2 測試執行排程

**每次 Commit**:
- 單元測試（< 1 分鐘）
- 程式碼風格檢查
- 靜態安全掃描

**每次 PR**:
- 完整單元測試
- 整合測試（API）
- 程式碼覆蓋率檢查

**每日（夜間）**:
- 完整 E2E 測試套件
- 視覺回歸測試
- 效能測試（輕量）
- 依賴漏洞掃描

**每週**:
- 完整效能測試
- 安全掃描（DAST）
- 相容性測試

**發布前**:
- 完整測試套件
- 探索性測試
- UAT（使用者驗收測試）

### 7.3 測試優先級

| 優先級 | 說明 | 執行頻率 |
|--------|------|---------|
| P0 - 煙霧測試 | 關鍵流程驗證 | 每次部署 |
| P1 - 高優先級 | 核心功能測試 | 每次 PR |
| P2 - 中優先級 | 重要功能測試 | 每日 |
| P3 - 低優先級 | 次要功能測試 | 每週 |

---

## 8. 自動化策略

### 8.1 自動化原則

**應該自動化**:
- ✅ 回歸測試
- ✅ 煙霧測試
- ✅ API 測試
- ✅ 單元測試
- ✅ 重複執行的測試
- ✅ 資料驅動測試

**不應該自動化**:
- ❌ 一次性測試
- ❌ 探索性測試
- ❌ 使用者體驗測試
- ❌ 視覺設計驗證
- ❌ 維護成本高的測試

### 8.2 CI/CD 整合

**GitHub Actions 範例**:
```yaml
name: Test Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Run integration tests
        run: npm run test:integration
  
  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
```

### 8.3 測試報告

**工具**: Allure, Jest HTML Reporter

**報告內容**:
- 測試執行總結
- 通過/失敗/跳過數量
- 覆蓋率報告
- 失敗測試詳情
- 趨勢圖表

---

## 9. 缺陷管理

### 9.1 缺陷生命週期

```
發現 → 記錄 → 分類 → 指派 → 修正 → 驗證 → 關閉
                                  ↓
                              重新開啟 (如驗證失敗)
```

### 9.2 缺陷嚴重性

| 等級 | 說明 | 處理時間 | 範例 |
|------|------|---------|------|
| 🔴 Critical | 系統崩潰、資料遺失 | 立即 | 無法登入、支付失敗 |
| 🟠 High | 主要功能無法使用 | 24 小時 | 搜尋不工作、無法提交表單 |
| 🟡 Medium | 功能異常但有替代方案 | 3 天 | 排序不正確、格式錯誤 |
| 🟢 Low | 輕微問題 | 下次發布 | 文字錯誤、對齊問題 |

### 9.3 缺陷報告模板

```markdown
## 缺陷摘要
[簡短描述問題]

## 環境
- 環境: 測試環境
- 版本: v1.2.0
- 瀏覽器: Chrome 120
- 作業系統: Windows 11

## 重現步驟
1. 登入系統
2. 前往使用者設定頁面
3. 點擊「儲存」按鈕
4. 觀察錯誤訊息

## 預期結果
設定應該成功儲存，顯示成功訊息

## 實際結果
顯示「發生錯誤」訊息，設定未儲存

## 嚴重性
🟠 High

## 優先級
P1

## 附件
- 截圖: [attached]
- 日誌: [attached]
- 影片: [link]
```

---

## 10. 測試指標

### 10.1 關鍵指標

**測試執行指標**:
- 測試通過率 = (通過數 / 總測試數) × 100%
  - 目標: > 95%
  
- 測試執行時間
  - 單元測試: < 1 分鐘
  - 整合測試: < 5 分鐘
  - E2E 測試: < 30 分鐘

**缺陷指標**:
- 缺陷發現率 = 每 1000 行程式碼的缺陷數
  - 目標: < 5 缺陷/1000 LOC
  
- 缺陷修正時間（平均）
  - Critical: < 2 小時
  - High: < 24 小時
  - Medium: < 3 天

- 缺陷逃逸率 = (生產環境發現缺陷數 / 總缺陷數) × 100%
  - 目標: < 1%

**覆蓋率指標**:
- 程式碼覆蓋率: > 80%
- 需求覆蓋率: > 95%
- 自動化覆蓋率: > 70%

### 10.2 測試儀表板

**追蹤內容**:
- 每日測試執行結果
- 覆蓋率趨勢
- 缺陷趨勢
- 測試執行時間趨勢
- 失敗測試 Top 10

**工具**: Grafana, Allure Reports

---

## 11. 風險與挑戰

### 11.1 常見風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 測試環境不穩定 | 高 | 容器化、基礎設施即程式碼 |
| 測試資料不足 | 中 | 資料工廠、資料脫敏工具 |
| 自動化測試脆弱 | 高 | 定期維護、使用穩定的選擇器 |
| 測試執行時間過長 | 中 | 並行執行、優化測試 |
| 技能不足 | 中 | 培訓、知識分享 |

### 11.2 持續改進計畫

**季度審查**:
- 檢視測試指標
- 識別測試缺口
- 優化測試流程
- 更新測試策略

**改進項目**:
- 減少測試執行時間
- 提高自動化覆蓋率
- 改善測試穩定性
- 提升團隊測試技能

---

## 附錄

### A. 測試檢查清單

**功能測試**:
- [ ] 所有 API 端點有測試
- [ ] 關鍵業務流程有 E2E 測試
- [ ] 邊界條件有測試
- [ ] 錯誤處理有測試

**非功能測試**:
- [ ] 效能測試已執行
- [ ] 安全掃描已完成
- [ ] 相容性測試已通過
- [ ] 無障礙測試已驗證

**測試品質**:
- [ ] 測試覆蓋率達標
- [ ] 無跳過的測試
- [ ] 測試命名清晰
- [ ] 測試獨立可重複

### B. 推薦資源

**書籍**:
- "The Art of Software Testing" by Glenford Myers
- "Growing Object-Oriented Software, Guided by Tests" by Steve Freeman

**線上資源**:
- [Testing JavaScript](https://testingjavascript.com/) by Kent C. Dodds
- [Cypress Documentation](https://docs.cypress.io/)
- [Jest Documentation](https://jestjs.io/)

---

**最後更新**: YYYY-MM-DD  
**版本**: 1.0  
**維護者**: [QA 主管]
```

---

## 品質檢查清單

- [ ] 測試目標明確且可衡量
- [ ] 測試金字塔比例合理
- [ ] 涵蓋所有重要測試類型
- [ ] 測試工具選擇適當
- [ ] 測試流程清晰可執行
- [ ] 自動化策略完整
- [ ] 測試指標定義明確
- [ ] CI/CD 整合規劃完善
- [ ] 已由開發和 QA 團隊審核

---

## 相關 Skills
- `unit-test.md` - 單元測試（詳細實作）
- `integration-test.md` - 整合測試（詳細實作）
- `e2e-test.md` - E2E 測試（詳細實作）
- `performance-test.md` - 效能測試（詳細實作）
- `bug-report.md` - Bug 報告（缺陷管理）
- `cicd-pipeline.md` - CI/CD 管線（測試自動化整合）

---

## 範例

### 輸入範例
```
請幫我制定電商平台的測試策略，
團隊有 5 名開發、2 名 QA，
要求 99.9% 可用性，每週發布。
```

### 輸出範例
[生成完整測試策略，包含：]
- **測試金字塔**: 60% 單元、30% 整合、10% E2E
- **覆蓋率目標**: 整體 > 80%，核心 > 90%
- **測試工具**: Jest, Supertest, Cypress, k6
- **自動化**: 單元測試每次 PR，E2E 每日執行
- **效能測試**: 每週執行負載測試，目標 < 500ms
- **發布前檢查**: 完整測試套件 + UAT
