---
description: 程式碼審查（Code Review）標準流程與最佳實踐
---

# Code Review 程式碼審查

## 概述

此 skill 提供程式碼審查的完整指引，包含審查流程、審查重點、評論規範、工具使用，確保程式碼品質、知識共享，並建立團隊良好的協作文化。

## 適用角色

| 角色 | 職責 |
|------|------|
| **審查者（Reviewer）** | 資深工程師、技術主管、同儕開發者 |
| **提交者（Author）** | 開發工程師 |
| **核准者（Approver）** | 有權限合併 PR 的資深成員 |

## Code Review 目標

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Review 價值                          │
├──────────────────┬──────────────────┬──────────────────────┤
│   品質保證        │   知識傳遞        │   協作文化           │
├──────────────────┼──────────────────┼──────────────────────┤
│ • 發現 Bug        │ • 學習新技術      │ • 建立信任           │
│ • 改善設計        │ • 了解系統架構    │ • 統一風格           │
│ • 確保標準        │ • 分享經驗        │ • 促進溝通           │
│ • 維護安全        │ • 跨領域學習      │ • 團隊成長           │
└──────────────────┴──────────────────┴──────────────────────┘
```

---

## 1. Pull Request 準備（Author）

### 1.1 PR 提交前檢查清單

```markdown
## 自我審查清單（提交前必須完成）

### 程式碼品質
- [ ] 程式碼已通過本地編譯/建置
- [ ] 所有單元測試通過
- [ ] Lint 檢查無錯誤
- [ ] 已移除 console.log / debug 程式碼
- [ ] 已移除註解掉的無用程式碼

### 功能完整性
- [ ] 功能符合需求規格
- [ ] 邊界條件已處理
- [ ] 錯誤情況已處理

### 文件與測試
- [ ] 重要的商業邏輯已加註解
- [ ] 公開 API 已有 JSDoc/文件
- [ ] 新增相應的測試案例
- [ ] README 已更新（如需要）
```

### 1.2 PR 標題與描述模板

```markdown
## PR 標題格式
<type>(<scope>): <subject>

範例：
feat(user): 新增用戶大頭貼上傳功能
fix(order): 修正訂單金額計算錯誤
refactor(auth): 重構認證模組

---

## PR 描述模板

### 📋 變更類型
- [ ] ✨ 新功能 (feature)
- [ ] 🐛 Bug 修復 (fix)
- [ ] ♻️ 重構 (refactor)
- [ ] 📝 文件更新 (docs)
- [ ] 🎨 程式碼風格 (style)
- [ ] ⚡ 效能優化 (perf)
- [ ] ✅ 測試相關 (test)
- [ ] 🔧 建置/配置 (chore)

### 🎯 關聯 Issue
Closes #[issue number]

### 📝 變更說明
[簡述這個 PR 做了什麼變更，以及為什麼需要這個變更]

### 🔍 變更細節
- 新增/修改了哪些主要檔案
- 主要的邏輯變更
- 重要的決策說明

### 🧪 測試方式
[說明如何測試這個變更]

1. 執行 `npm run test`
2. 手動測試步驟：
   - Step 1: ...
   - Step 2: ...

### 📸 截圖（如適用）
[UI 相關變更請附上 before/after 截圖]

### ⚠️ 注意事項
[任何審查者需要特別注意的地方]

### ✅ 核准條件
- [ ] 至少 2 位審查者核准
- [ ] CI 測試全部通過
- [ ] 無合併衝突
```

### 1.3 PR 大小建議

| PR 大小 | 行數範圍 | 建議 |
|--------|---------|------|
| 🟢 小型 | < 200 行 | 理想大小，容易審查 |
| 🟡 中型 | 200-400 行 | 可接受，需要清楚說明 |
| 🟠 大型 | 400-800 行 | 考慮拆分 |
| 🔴 超大 | > 800 行 | 必須拆分 |

---

## 2. 審查流程與時間

### 2.1 審查流程

```
┌─────────────────────────────────────────────────────────────┐
│                      Code Review 流程                        │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 1. PR 創建          │ → Author 完成自我審查後提交 PR
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 自動檢查         │ → CI/CD Pipeline 執行（lint, test, build）
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 指派審查者        │ → CODEOWNERS 自動或手動指派
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 審查開始         │ → Reviewer 審查程式碼並提出意見
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 討論與修改       │ → Author 回應並修改
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 6. 核准             │ → 所有必要核准者 Approve
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ 7. 合併             │ → Squash and Merge（建議）
└─────────────────────┘
```

### 2.2 回應時間標準

| 優先度 | 標籤 | 首次回應 | 完成審查 |
|-------|------|---------|---------|
| 🔴 緊急 | `urgent` | < 2 小時 | < 4 小時 |
| 🟠 高 | `high-priority` | < 4 小時 | < 1 工作天 |
| 🟢 一般 | - | < 1 工作天 | < 2 工作天 |

---

## 3. 審查重點

### 3.1 必審項目（Security & Critical）

```typescript
// ❌ 安全問題
// SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`; // 危險！

// ✅ 修正
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);

// ❌ XSS 漏洞
element.innerHTML = userInput; // 危險！

// ✅ 修正
element.textContent = userInput;

// ❌ 敏感資訊外洩
console.log('Password:', password); // 絕對禁止！
const response = { user, password }; // 回傳敏感資料！

// ❌ 硬編碼密鑰
const API_KEY = 'sk-1234567890abcdef'; // 禁止！

// ✅ 修正
const API_KEY = process.env.API_KEY;
```

### 3.2 設計與架構

```typescript
// ❌ 違反單一職責
class UserService {
  async createUser() { /* ... */ }
  async sendEmail() { /* ... */ }  // 不應該在這裡
  async generateReport() { /* ... */ }  // 不應該在這裡
}

// ✅ 修正：職責分離
class UserService {
  constructor(
    private emailService: EmailService,
    private reportService: ReportService,
  ) {}
  
  async createUser() {
    const user = await this.userRepository.create(data);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}

// ❌ 過度耦合
async function processOrder(order: Order) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [order.userId]);
  const inventory = await fetch('http://inventory-service/check');
  await sendSlackNotification(order);
  // 直接依賴太多外部資源
}

// ✅ 修正：依賴注入
class OrderProcessor {
  constructor(
    private userService: UserService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
  ) {}
  
  async process(order: Order) {
    const user = await this.userService.findById(order.userId);
    const available = await this.inventoryService.check(order.items);
    await this.notificationService.notify(order);
  }
}
```

### 3.3 程式碼品質

```typescript
// ❌ 魔術數字
if (user.age >= 18) { /* ... */ }
setTimeout(callback, 86400000);

// ✅ 使用常數
const ADULT_AGE = 18;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
if (user.age >= ADULT_AGE) { /* ... */ }
setTimeout(callback, ONE_DAY_MS);

// ❌ 過長函數（超過 50 行）
async function processUserRegistration(data) {
  // 100+ 行的程式碼...
}

// ✅ 拆分成小函數
async function processUserRegistration(data) {
  const validData = await validateInput(data);
  const user = await createUser(validData);
  await sendWelcomeEmail(user);
  await notifyAdmins(user);
  return user;
}

// ❌ 命名不清
const d = new Date();
const list = getItems();
function proc(x) { /* ... */ }

// ✅ 清楚命名
const createdAt = new Date();
const activeProducts = getActiveProducts();
function processPayment(payment) { /* ... */ }
```

### 3.4 錯誤處理

```typescript
// ❌ 吞掉錯誤
try {
  await riskyOperation();
} catch (e) {
  // 空的 catch
}

// ❌ 無效處理
try {
  await riskyOperation();
} catch (e) {
  console.log(e); // 只是印出來
}

// ✅ 正確處理
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  
  if (error instanceof ValidationError) {
    throw new BadRequestError(error.message);
  }
  
  throw new InternalError('操作失敗，請稍後再試');
}
```

### 3.5 效能考量

```typescript
// ❌ N+1 查詢問題
const users = await User.findAll();
for (const user of users) {
  const orders = await Order.findByUserId(user.id); // N 次查詢
}

// ✅ 使用 JOIN 或批次查詢
const users = await User.findAll({
  include: [{ model: Order }],
});

// ❌ 記憶體洩漏風險
const cache = {};
function addToCache(key, value) {
  cache[key] = value; // 無限增長
}

// ✅ 使用 LRU 或設定上限
import LRU from 'lru-cache';
const cache = new LRU({ max: 1000, ttl: 3600000 });
```

---

## 4. 評論規範

### 4.1 評論前綴標籤

| 標籤 | 含義 | 是否必須修改 |
|------|------|------------|
| `[MUST]` | 必須修改才能核准 | ✅ 必須 |
| `[SHOULD]` | 強烈建議修改 | ⚠️ 建議 |
| `[CONSIDER]` | 可以考慮 | ❌ 可選 |
| `[NIT]` | 小建議（Nitpick） | ❌ 可選 |
| `[QUESTION]` | 疑問/需要解釋 | 📝 需回應 |
| `[PRAISE]` | 表揚好的做法 | 🎉 無需回應 |

### 4.2 好的評論範例

```markdown
# ✅ 好的評論

## [MUST] 安全問題
這裡直接拼接 SQL 字串可能導致 SQL Injection。
建議使用 parameterized query：

```typescript
const result = await db.query(
  'SELECT * FROM users WHERE role = $1',
  [role]
);
```

## [SHOULD] 效能優化
這個迴圈內的資料庫查詢會造成 N+1 問題。
可以考慮使用 `findAll` 搭配 `include` 一次查詢。

## [QUESTION] 邏輯確認
為什麼這裡需要加 7 天？這個商業邏輯是在哪個需求文件中定義的？

## [PRAISE] 👍
這個錯誤處理機制設計得很好，清楚區分不同類型的錯誤，
而且有完整的 logging。

## [NIT] 命名建議
`data` 這個變數名可以更具體一些，例如 `orderData` 或 `paymentInfo`
```

### 4.3 避免的評論方式

```markdown
# ❌ 不好的評論

## 太過簡略
"這不對"
"改一下"
"錯了"

## 帶有攻擊性
"這段程式碼寫得很糟"
"為什麼你要這樣寫？"
"這明顯是錯的"

## 沒有建設性
"我不喜歡這個方法"
"這可以更好"
"這效能可能很慢"

# ✅ 改善後

## 具體且友善
"這裡的邏輯可能需要調整，因為當 `status` 為 null 時會拋出異常。
你可以考慮加上 null check：`if (status != null && status === 'active')`"
```

---

## 5. 自動化工具

### 5.1 GitHub Actions PR 檢查

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v4

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
```

### 5.2 CODEOWNERS 設定

```
# .github/CODEOWNERS

# 全域規則 - 所有檔案
* @team-lead

# 後端程式碼
/src/api/ @backend-team
/src/services/ @backend-team @senior-backend

# 前端程式碼
/frontend/src/ @frontend-team

# 資料庫相關
/migrations/ @dba-team @backend-team

# 安全相關
/src/auth/ @security-team
/src/middleware/auth* @security-team

# 基礎設施
/docker/ @devops-team
/k8s/ @devops-team
/.github/ @devops-team

# 敏感設定
*.env* @tech-lead @security-team
```

### 5.3 PR Template

```markdown
<!-- .github/pull_request_template.md -->

## 📋 變更類型
<!-- 勾選適用的選項 -->
- [ ] ✨ 新功能 (Feature)
- [ ] 🐛 Bug 修復 (Bugfix)
- [ ] ♻️ 重構 (Refactor)
- [ ] 📝 文件 (Documentation)
- [ ] ⚡ 效能優化 (Performance)

## 🎯 關聯 Issue
<!-- 連結相關 Issue -->
Closes #

## 📝 變更說明
<!-- 描述這個 PR 的目的和主要變更 -->


## 🧪 測試方式
<!-- 說明如何測試這個變更 -->


## ✅ Author 自我檢查
<!-- 提交前請確認 -->
- [ ] 程式碼符合專案 coding style
- [ ] 自我審查過程式碼
- [ ] 已新增/更新測試
- [ ] 所有測試通過
- [ ] 已更新相關文件

## 📸 截圖（如適用）
<!-- UI 變更請附上截圖 -->

```

---

## 6. 審查者指南

### 6.1 審查步驟

```markdown
1. **理解背景**（2 分鐘）
   - 閱讀 PR 標題和描述
   - 了解關聯的 Issue/需求
   - 確認變更類型

2. **高層次瀏覽**（5 分鐘）
   - 查看檔案變更列表
   - 確認修改範圍合理
   - 識別複雜度高的檔案

3. **詳細審查**（依變更大小）
   - 審查重點區域（商業邏輯、API）
   - 檢查安全相關程式碼
   - 驗證錯誤處理

4. **測試驗證**（如需要）
   - 本地 checkout 並測試
   - 確認測試案例完整性

5. **提供回饋**
   - 使用標準評論格式
   - 提供具體改進建議
   - 指出優秀之處
```

### 6.2 審查決策

```
┌─────────────────────────────────────────────────────────────┐
│                      審查決策流程                            │
└─────────────────────────────────────────────────────────────┘

                    開始審查
                       │
                       ▼
            ┌─────────────────────┐
            │   有安全問題？       │
            └─────────────────────┘
                 │         │
              是 │         │ 否
                 ▼         ▼
          Request Changes  │
                          ▼
            ┌─────────────────────┐
            │   有嚴重 Bug？       │
            └─────────────────────┘
                 │         │
              是 │         │ 否
                 ▼         ▼
          Request Changes  │
                          ▼
            ┌─────────────────────┐
            │ 違反架構/設計原則？   │
            └─────────────────────┘
                 │         │
              是 │         │ 否
                 ▼         ▼
          Request Changes  │
                          ▼
            ┌─────────────────────┐
            │  只有 NIT/CONSIDER？ │
            └─────────────────────┘
                 │         │
              是 │         │ 否
                 ▼         ▼
             Approve    Comment
          (附帶建議)   (等待修改)
```

---

## 常見問題

### Q1: PR 太大怎麼辦？
要求 Author 拆分成多個小 PR。可以按功能模組、按層級（資料層→服務層→API層）、或按步驟（infrastructure→feature→tests）拆分。

### Q2: 意見不同怎麼處理？
1. 先用文字溝通，說明理由
2. 引用團隊規範或文件佐證
3. 如無法達成共識，安排同步會議
4. 必要時由技術主管做最終決定

### Q3: 審查太慢怎麼辦？
1. 設定回應時間 SLA 並追蹤
2. 使用工具（Slack Bot）提醒待審查 PR
3. 若審查者忙碌，可以 @ 其他人協助

---

## 檢查清單

### Reviewer 檢查清單
- [ ] PR 大小合理（< 400 行）
- [ ] 測試涵蓋主要變更
- [ ] 沒有安全漏洞
- [ ] 符合程式碼規範
- [ ] 商業邏輯正確
- [ ] 錯誤處理完善
- [ ] 沒有效能問題
- [ ] 文件/註解完整

### Author 回應檢查清單
- [ ] 回應所有 [MUST] 評論
- [ ] 回應或修正 [SHOULD] 評論
- [ ] 解答所有 [QUESTION]
- [ ] 感謝 [PRAISE] 並學習

---

## 相關 Skills

- [coding-standards.md](./coding-standards.md) - 程式碼規範
- [git-workflow.md](./git-workflow.md) - Git 工作流程
- [../06-quality-assurance/unit-test.md](../06-quality-assurance/unit-test.md) - 單元測試
- [../07-security/security-review.md](../07-security/security-review.md) - 安全審查
