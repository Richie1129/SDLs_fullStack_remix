---
description: 安全審查（Security Review）標準流程與最佳實踐
---

# Security Review 安全審查

## 概述

此 skill 提供程式碼安全審查指引，識別潛在安全漏洞，確保開發符合安全標準。

## 適用角色

| 角色 | 職責 |
|------|------|
| **審查者** | 安全工程師、資深開發 |
| **提交者** | 開發工程師 |

---

## 1. 審查觸發條件

| 條件 | 優先級 |
|------|--------|
| 認證/授權相關變更 | 🔴 必審 |
| 加密/密碼處理 | 🔴 必審 |
| 新 API 端點 | 🟠 建議審 |
| 資料庫查詢變更 | 🟠 建議審 |
| 第三方套件更新 | 🟡 視情況 |

---

## 2. 安全審查檢查項目

### 認證與授權

```typescript
// ❌ 不安全
app.get('/admin/users', (req, res) => {
  // 沒有權限檢查
  return getAllUsers();
});

// ✅ 安全
app.get('/admin/users', 
  authenticate,
  authorize(['admin']),
  (req, res) => {
    return getAllUsers();
  }
);
```

### SQL Injection

```typescript
// ❌ 危險
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ 安全
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

### XSS

```typescript
// ❌ 危險
element.innerHTML = userInput;

// ✅ 安全
element.textContent = userInput;
// 或使用 DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);
```

### 敏感資料

```typescript
// ❌ 洩露敏感資訊
console.log({ user, password });
return res.json({ user, password });

// ✅ 安全
const { password, ...safeUser } = user;
return res.json({ user: safeUser });
```

### CSRF

```typescript
// ✅ 啟用 CSRF 保護
app.use(csrf({ cookie: true }));

// 表單中包含 token
<input type="hidden" name="_csrf" value={csrfToken} />
```

---

## 3. 自動化工具

### SAST (靜態分析)

```yaml
# .github/workflows/security.yml
- name: Run Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/security-audit
      p/owasp-top-ten
```

### 依賴掃描

```bash
# npm audit
npm audit --audit-level=high

# Snyk
snyk test
```

### Secret 掃描

```yaml
- name: GitLeaks
  uses: gitleaks/gitleaks-action@v2
```

---

## 4. 安全審查流程

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ 自動掃描 │ → │ 人工審查 │ → │ 核准/拒絕│
└─────────┘    └─────────┘    └─────────┘
     │              │
     └── 高風險 ────┘
```

---

## 5. 審查報告

```markdown
# 安全審查報告

## PR #123: 新增支付功能

### 審查結果：⚠️ 需修改

### 發現問題

| 嚴重度 | 檔案 | 行 | 問題 | 建議 |
|--------|------|-----|------|------|
| 🔴 高 | payment.ts | 45 | 未驗證金額 | 加入伺服器端驗證 |
| 🟠 中 | api.ts | 23 | 缺少 Rate Limit | 加入限流中介軟體 |

### 核准條件
1. 修復高風險問題
2. 新增單元測試
```

---

## 檢查清單

### 審查前
- [ ] 了解變更範圍
- [ ] 確認涉及敏感功能

### 審查項目
- [ ] 認證/授權正確
- [ ] 輸入驗證完整
- [ ] 無硬編碼密鑰
- [ ] 錯誤訊息安全
- [ ] 依賴無已知漏洞

---

## 相關 Skills

- [../05-development/code-review.md](../05-development/code-review.md) - Code Review
- [vulnerability-report.md](./vulnerability-report.md) - 漏洞報告
