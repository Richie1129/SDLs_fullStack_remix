# Token 說明文件

本專案使用**兩種不同的 tokens**，它們有完全不同的用途和設定方式。

---

## 🔐 Token 對照表

| Token 名稱 | 用途 | 誰使用 | 何時需要 | 設定位置 |
|-----------|------|--------|---------|---------|
| **JWT_SECRET** | 用戶身份驗證 | 所有登入的用戶 | 每次登入/驗證 | `.env` Line 21 |
| **METRICS_TOKEN** | 監控 API 保護 | 管理員/開發者 | 查看監控數據時 | `.env` Line 31 |

---

## 1️⃣ JWT_SECRET - 用戶身份驗證

### 用途
簽署和驗證 JWT (JSON Web Tokens)，用於用戶登入系統。

### 當前值
```bash
JWT_SECRET=1112c25be07de8dd7cbdeb752596df7b28dc6698ac5d47e8cda7c1395a247ec4
```

### 工作流程
```
用戶登入
    ↓
後端驗證帳號密碼
    ↓
使用 JWT_SECRET 生成 Token
    ↓
返回 Token 給前端
    ↓
前端每次請求帶上 Token
    ↓
後端用 JWT_SECRET 驗證 Token
```

### 使用範例
```javascript
// 登入時生成 token
const token = jwt.sign(
  { userId: 123, account: 'stone881129' },
  JWT_SECRET,  // ← 使用這個 secret
  { expiresIn: '1h' }
);

// 驗證時解密 token
const decoded = jwt.verify(
  token,
  JWT_SECRET  // ← 使用同一個 secret
);
```

### 相關 API
- `POST /api/users/login` - 登入（生成 JWT）
- `POST /api/auth/refresh` - 刷新 token
- 所有需要驗證的 API（透過 `authMiddleware`）

### ⚠️ 重要提醒
- **絕對不要外洩** JWT_SECRET
- **不要 commit 到 Git**（已在 `.gitignore`）
- 如果洩漏，立即更換（會導致所有用戶需要重新登入）

---

## 2️⃣ METRICS_TOKEN - 監控 API 保護

### 用途
保護 `/api/metrics` 端點，防止未授權者查看系統監控數據。

### 當前值（Development）
```bash
METRICS_TOKEN=dev-monitoring-token-please-change-in-production
```

### 工作流程
```
開發者想查看監控數據
    ↓
訪問 /api/metrics
    ↓
後端檢查環境
    ├─ Development: 直接放行（無需 token）
    └─ Production: 檢查 X-Metrics-Token header
        ├─ Token 正確: 返回監控數據
        └─ Token 錯誤: 403 Forbidden
```

### 使用範例

**Development（不需要 token）**:
```bash
# 直接訪問，無需 token
curl http://localhost/api/metrics
```

**Production（需要 token）**:
```bash
# 必須提供 X-Metrics-Token header
curl -H "X-Metrics-Token: dev-monitoring-token-please-change-in-production" \
     https://your-production-domain.com/api/metrics
```

### 相關 API
- `GET /api/metrics` - 完整監控數據
- `GET /api/metrics/performance` - API 效能數據
- `GET /api/metrics/memory` - 記憶體數據
- `POST /api/metrics/reset` - 重置統計

### 🔧 Production 設定建議

#### Step 1: 生成強隨機 token
```bash
openssl rand -hex 32
# 輸出範例: a1b2c3d4e5f6...（請使用你生成的值）
```

#### Step 2: 更新 `.env`
```bash
# 替換掉預設的 dev token
METRICS_TOKEN=your-generated-random-token-here
```

#### Step 3: 重啟服務
```bash
docker compose restart api
```

#### Step 4: 驗證
```bash
# 應該被拒絕（錯誤的 token）
curl -H "X-Metrics-Token: wrong-token" \
     https://your-domain.com/api/metrics
# → 403 Forbidden

# 應該成功（正確的 token）
curl -H "X-Metrics-Token: your-generated-random-token-here" \
     https://your-domain.com/api/metrics
# → 返回監控數據
```

### ⚠️ 重要提醒
- Development 預設 token 只是佔位符
- **Production 必須更換為強隨機 token**
- 不要使用 JWT_SECRET 作為 METRICS_TOKEN（完全不同的用途）
- 只分享給需要查看監控數據的管理員

---

## 📊 權限對照表

| 操作 | 需要的 Token | 誰可以執行 |
|------|-------------|-----------|
| 登入系統 | ❌ 無（但會生成 JWT） | 所有用戶 |
| 訪問業務 API | ✅ JWT Token（自動帶在 header） | 登入的用戶 |
| 查看監控數據（Dev） | ❌ 無 | 所有開發者 |
| 查看監控數據（Prod） | ✅ METRICS_TOKEN | 管理員/DevOps |

---

## 🔍 常見問題

### Q1: 可以用 JWT_SECRET 來訪問 /api/metrics 嗎？
**A**: 不行！這是兩個完全不同的系統。

- **JWT_SECRET**: 用於加密/解密用戶身份 token
- **METRICS_TOKEN**: 用於簡單的字串比對驗證

### Q2: Development 為什麼不需要 METRICS_TOKEN？
**A**: 開發環境安全性較低，為了方便調試。

程式碼邏輯：
```javascript
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  return next();  // 直接放行
}
```

### Q3: 忘記 METRICS_TOKEN 怎麼辦？
**A**: 兩種方法：

**方法 1**: 查看 `.env` 文件
```bash
grep METRICS_TOKEN .env
```

**方法 2**: 切換到 Development 模式（無需 token）
```bash
export NODE_ENV=development
docker compose restart api
curl http://localhost/api/metrics  # 無需 token
```

### Q4: 多個管理員如何共享 METRICS_TOKEN？
**A**:
- 使用密碼管理工具（如 1Password, LastPass）
- 或設定環境變數，不要寫在程式碼中

### Q5: 需要定期更換 tokens 嗎？

**JWT_SECRET**:
- 理論上不需要（除非洩漏）
- 更換會導致所有用戶重新登入

**METRICS_TOKEN**:
- 建議每 3-6 個月更換一次
- 更換不影響用戶，只影響管理員訪問監控 API

---

## 📝 設定檢查清單

### 初次設定
- [ ] 確認 `.env` 文件存在
- [ ] 確認 `JWT_SECRET` 已設定（用戶登入需要）
- [ ] 確認 `METRICS_TOKEN` 已設定（監控 API 需要）
- [ ] 確認 `docker-compose.yml` 有引入 `METRICS_TOKEN`
- [ ] 測試 `/api/metrics` 可以訪問

### Production 部署前
- [ ] 生成新的強隨機 `METRICS_TOKEN`
- [ ] 更新 `.env` 文件
- [ ] 設定 `NODE_ENV=production`
- [ ] 測試沒有 token 會被拒絕
- [ ] 測試正確 token 可以訪問
- [ ] 將 token 分享給需要的管理員

---

## 🔗 相關文件

- [監控系統使用指南](./MONITORING.md) - 監控系統完整文檔
- [JWT 設定說明](./JWT_CONFIG.md) - JWT 詳細配置（TODO）
- [環境變數完整清單](../.env.example) - 所有環境變數說明（TODO）

---

**最後更新**: 2025-10-18
**版本**: v1.0.0
