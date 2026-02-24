# 忘記密碼功能實作指南

## 概要

本專案已完成忘記密碼功能的完整實作，包含：
- 安全的密碼重設 token 系統
- 郵件發送服務
- 完整的 API 端點
- 資料庫遷移

## Linus 式設計原則

### 1. 好品味 (Good Taste)
- 統一錯誤回應防止用戶探測
- 自動清理過期 token 無需手動管理
- 一次性 token 設計消除狀態複雜度

### 2. Never Break Userspace
- 新增獨立的 `password_reset_tokens` 表
- 不修改現有 `users` 表結構
- 向後相容的環境變數配置

### 3. 簡潔性
- 3 個核心 API：請求→驗證→重設
- UUID token 取代複雜的簽名機制
- 24 小時過期，用後即刪

## 已實作的檔案

### 後端檔案
```
sdl-backend-main/
├── models/password_reset_token.js      # 資料模型
├── controllers/passwordReset.js        # 業務邏輯
├── routes/passwordReset.js             # API 路由
├── services/emailService.js            # 郵件服務
├── migrations/xxx-create-password-reset-tokens.js  # 資料庫遷移
├── .env                                # 環境變數 (更新)
└── .env.example                        # 環境變數範本 (更新)
```

### API 端點

| 方法 | 端點 | 功能 |
|------|------|------|
| POST | `/api/auth/forgot-password` | 請求密碼重設 |
| GET  | `/api/auth/reset-password/:token` | 驗證 token 有效性 |
| POST | `/api/auth/reset-password` | 重設密碼 |

## 環境配置

### 1. 設定郵件服務

在 `.env` 檔案中配置：

```bash
# === Email 設定 ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password          # Gmail 需使用應用程式密碼
EMAIL_FROM=SDL學習平台 <your-email@gmail.com>
FRONTEND_URL=http://localhost:5173     # 前端 URL
```

### 2. Gmail 設定步驟

1. 開啟 Gmail 兩步驟驗證
2. 生成應用程式密碼：
   - 進入 Google 帳戶設定
   - 安全性 → 兩步驟驗證 → 應用程式密碼
   - 選擇「郵件」→ 生成密碼
3. 將生成的密碼填入 `EMAIL_PASS`

### 3. 其他郵件提供商

**Outlook/Hotmail:**
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

**Yahoo:**
```bash
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

## 資料庫遷移

已執行的遷移會創建以下結構：

```sql
CREATE TABLE "password_reset_tokens" (
  "id" SERIAL PRIMARY KEY,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## API 使用範例

### 1. 請求密碼重設

```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

const result = await response.json();
// result: { success: true, message: "如果該 email 存在於系統中，重設密碼郵件已發送" }
```

### 2. 驗證 Token

```javascript
const response = await fetch(`/api/auth/reset-password/${token}`);
const result = await response.json();

if (result.success) {
  console.log('Token 有效，可以重設密碼');
  console.log('Email:', result.email);
}
```

### 3. 重設密碼

```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'reset-token-here',
    newPassword: 'newpassword123'
  })
});

const result = await response.json();
// result: { success: true, message: "密碼重設成功" }
```

## 前端實作建議

### 1. 忘記密碼頁面

```jsx
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();
    setMessage(result.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="請輸入電子郵件地址"
        required
      />
      <button type="submit">發送重設郵件</button>
      {message && <p>{message}</p>}
    </form>
  );
};
```

### 2. 重設密碼頁面

```jsx
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  // 從 URL 取得 token
  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('密碼不一致');
      return;
    }

    if (password.length < 8) {
      setMessage('密碼至少需要 8 個字元');
      return;
    }

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password })
    });

    const result = await response.json();
    setMessage(result.message);

    if (result.success) {
      // 跳轉到登入頁面
      setTimeout(() => window.location.href = '/login', 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="新密碼"
        minLength="8"
        required
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="確認新密碼"
        minLength="8"
        required
      />
      <button type="submit">重設密碼</button>
      {message && <p>{message}</p>}
    </form>
  );
};
```

## 安全特性

### 1. Token 安全
- UUID v4 生成（128 位隨機性）
- 24 小時自動過期
- 使用後立即刪除
- 資料庫唯一索引防止衝突

### 2. 防止用戶探測
- 無論 email 是否存在，都回傳相同訊息
- 防止惡意用戶探測系統中的有效帳號

### 3. 密碼強度
- 最少 8 個字元要求
- bcrypt 加密（成本係數 10）
- 覆寫原密碼 hash

### 4. 限流建議
可在 Nginx 或 Express 層級加入限流：

```javascript
// 使用 express-rate-limit
const rateLimit = require('express-rate-limit');

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 3, // 最多 3 次請求
  message: '請求過於頻繁，請稍後再試'
});

app.use('/api/auth/forgot-password', passwordResetLimiter);
```

## 生產環境部署

### 1. 環境變數檢查清單

- [ ] `EMAIL_HOST` - SMTP 主機
- [ ] `EMAIL_PORT` - SMTP 埠口
- [ ] `EMAIL_USER` - SMTP 用戶名
- [ ] `EMAIL_PASS` - SMTP 密碼（應用程式密碼）
- [ ] `EMAIL_FROM` - 發件人顯示名稱
- [ ] `FRONTEND_URL` - 前端域名

### 2. SSL/TLS 配置

生產環境必須使用 HTTPS：

```bash
FRONTEND_URL=https://yourdomain.com
```

### 3. 監控建議

- 監控郵件發送失敗率
- 追蹤密碼重設請求頻率
- 設置過期 token 清理日誌

## 故障排除

### 1. 郵件發送失敗

**症狀**: 500 錯誤，郵件發送失敗
**檢查**:
- Gmail 是否開啟兩步驟驗證
- 是否使用應用程式密碼（不是登入密碼）
- 防火牆是否阻擋 SMTP 連線
- 檢查 EMAIL_HOST 和 EMAIL_PORT 設定

### 2. Token 無效錯誤

**症狀**: 400 錯誤，無效或已過期的重設連結
**檢查**:
- Token 是否已過期（24 小時）
- Token 是否已被使用（一次性）
- 資料庫連線是否正常

### 3. 密碼更新失敗

**症狀**: 密碼重設後仍無法登入
**檢查**:
- bcrypt 版本相容性
- 密碼 hash 是否正確更新
- 登入邏輯是否使用相同的 bcrypt.compare

## 總結

✅ **完成項目:**
- 安全的密碼重設機制
- 專業的郵件模板
- 完整的錯誤處理
- 資料庫遷移和索引優化
- 統一的 API 設計

🔧 **待完成項目:**
- 前端頁面實作
- 限流機制
- 郵件配置測試

這個實作遵循 Linus 的設計哲學：簡潔、實用、不破壞現有系統，並提供了生產級別的安全性和使用體驗。