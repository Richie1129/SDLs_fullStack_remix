# Refresh Token 實作計畫

**日期**: 2025-10-11  
**狀態**: 實作階段  
**預估時間**: 2 工作日  
**風險等級**: 🟢 LOW - 零破壞性向後相容

---

## 一、核心設計 - "Good programmers worry about data structures"

### 問題
- 現狀: JWT 24h 過期 → 強制重新登入
- 影響: 跨天使用、長時間編輯中斷

### 方案
- Access Token: 1h (短期、高頻更新)
- Refresh Token: 7d (長期、可撤銷)
- 自動刷新: 前端 interceptor 透明處理

### 設計原則
1. **Never break userspace**: 所有現有 API 零改動
2. **向後相容**: 舊前端繼續工作 (只是 1h 要重登)
3. **消除特殊情況**: Token 過期不再是"異常"，而是正常流程

---

## 二、資料結構

### 新增 Database Table
```sql
-- 簡潔、純粹、只關心業務邏輯
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,  -- UUID 只需 36，留緩衝
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_token (token),
  INDEX idx_user_expires (user_id, expires_at)
);
-- ❌ 移除 device_info: 這是日誌，不是業務資料
-- 要記錄裝置資訊？用 audit_log 表
```

### JWT Payload (不變)
```javascript
// Access Token (1h)
{
  account: string,
  userId: number,
  role: string,
  exp: timestamp
}
```

### API Response (Login)
```javascript
// 向後相容：舊前端忽略 refreshToken
{
  accessToken: string,     // JWT (1h)
  refreshToken: string,    // UUID (7d, optional for old frontend)
  account: string,
  email: string,
  ...
}
```

---

## 三、認證流程

### Before (現狀)
```
Login → JWT (24h) → API 請求 → Token 過期 → 401 → 跳轉登入
```

### After (改進)
```
Login → JWT (1h) + RefreshToken (7d)
  ↓
API 請求 → Token 有效 → Success
  ↓
Token 過期 → Interceptor 檢測 → 自動 Refresh → 重試請求 → Success
  ↓
RefreshToken 過期 → 跳轉登入
```

**關鍵**: 對現有 API 完全透明，只在 interceptor 層處理

---

## 四、零破壞性分析

### Backend (86 個受保護端點)
```javascript
// 所有 route 使用此模式
router.xxx('/path', validateToken, controller.xxx);

// validateToken 邏輯不變
// 只是 JWT expiresIn 從 24h → 1h
// 所有 controller 依賴 req.userId，不變
```

**改動**: ❌ 零改動  
**依賴**: AuthMiddleware.validateToken() 設置 req.userId  
**影響**: ✅ 無影響

### 權限系統
```javascript
// PermissionGuard, projectViewingMiddleware
// 依賴 req.userId (由 validateToken 設置)

const userId = req.userId; // 來源不變
```

**改動**: ❌ 零改動  
**影響**: ✅ 無影響

### Frontend
```javascript
// 舊邏輯: 401 → 清除 localStorage → 跳轉登入
// 新邏輯: 401 → 嘗試 refresh → 成功則重試 → 失敗才跳轉

// 向後相容：舊前端不儲存 refreshToken
// 只是變成 1h 重登，功能不受影響
```

**改動**: ✅ 增強 (不破壞)  
**影響**: ✅ 無影響

---

## 五、實作步驟

### Phase 0: 準備 (0.5h)
```bash
# 創建分支
git checkout -b feature/refresh-token

# 環境變數 (先不修改現有值)
echo "JWT_EXPIRES_IN=24h" >> .env
echo "JWT_REFRESH_EXPIRES_IN=7d" >> .env
```

---

### Phase 1: Database (0.5h)

#### Task 1.1: Migration
**檔案**: `sdl-backend-main/migrations/YYYYMMDD-create-refresh-tokens.js`

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.STRING(128),  // 從 255 改為 128
        allowNull: false,
        unique: true
      },
      // ❌ 移除 deviceInfo
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('refresh_tokens', ['token']);
    await queryInterface.addIndex('refresh_tokens', ['userId', 'expiresAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('refresh_tokens');
  }
};
```

**執行**:
```bash
npm run migrate
```

#### Task 1.2: Model
**檔案**: `sdl-backend-main/models/refresh_token.js` (新)

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(128),  // 從 255 改為 128
    allowNull: false,
    unique: true
  },
  // ❌ 移除 deviceInfo
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: false
});

module.exports = RefreshToken;
```

#### Task 1.3: User 關聯
**檔案**: `sdl-backend-main/models/user.js`

```javascript
// 在檔案末尾加入
const RefreshToken = require('./refresh_token');

User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens',
  onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});
```

**驗收**:
```bash
# 檢查 DB
psql -d your_db -c "\d refresh_tokens"
```

---

### Phase 2: Backend API (2h)

#### Task 2.1: Config
**檔案**: `sdl-backend-main/config/index.js`

```javascript
// JWT 配置
get jwt() {
    return {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 3600,  // 秒數，不是字串
        refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800  // 7天 = 604800秒
    };
}
```

#### Task 2.2: 更新 Login
**檔案**: `sdl-backend-main/controllers/user.js`

```javascript
const crypto = require('crypto');
const RefreshToken = require('../models/refresh_token');

exports.loginUser = async (req, res) => {
    try {
        const { account, password } = req.body;

        // 現有登入邏輯...
        const user = await User.findOne({ where: { account } });
        // ... 驗證密碼等

        // 生成 Access Token (不變)
        const accessToken = sign(
            { account: user.account, userId: user.id, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        // 生成 Refresh Token (新增)
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 天

        await RefreshToken.create({
            userId: user.id,
            token: refreshToken,
            // ❌ 移除 deviceInfo
            expiresAt
        });

        // 返回 (向後相容)
        res.status(200).json({
            accessToken,
            refreshToken,  // 新增，舊前端會忽略
            account: user.account,
            email: user.email,
            username: user.username,
            role: user.role
            // ... 其他不變
        });

    } catch (err) {
        // 錯誤處理不變
    }
};
```

#### Task 2.3: Auth Controller
**檔案**: `sdl-backend-main/controllers/auth.js` (新)

```javascript
const { sign } = require('jsonwebtoken');
const config = require('../config');
const RefreshToken = require('../models/refresh_token');
const User = require('../models/user');
const { Op } = require('sequelize');

/**
 * POST /auth/refresh
 * 刷新 Access Token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                code: 'MISSING_REFRESH_TOKEN',
                message: 'Refresh Token 是必需的'
            });
        }

        // 查找並驗證
        const tokenRecord = await RefreshToken.findOne({
            where: {
                token: refreshToken,
                expiresAt: { [Op.gt]: new Date() }
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'account', 'role']
            }]
        });

        if (!tokenRecord) {
            return res.status(401).json({
                code: 'REFRESH_TOKEN_EXPIRED',
                message: 'Refresh Token 已過期或無效'
            });
        }

        // 生成新 Access Token
        const accessToken = sign(
            {
                account: tokenRecord.user.account,
                userId: tokenRecord.user.id,
                role: tokenRecord.user.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.status(200).json({
            accessToken,
            expiresIn: 3600 // 1 hour
        });

    } catch (err) {
        console.error('[Refresh Token Error]', err);
        res.status(500).json({
            code: 'REFRESH_FAILED',
            message: '刷新 Token 失敗'
        });
    }
};

/**
 * POST /auth/logout
 * 撤銷 Refresh Token
 */
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await RefreshToken.destroy({ where: { token: refreshToken } });
        }

        res.status(200).json({ message: '登出成功' });
    } catch (err) {
        console.error('[Logout Error]', err);
        res.status(500).json({ message: '登出失敗' });
    }
};

/**
 * 撤銷用戶所有 Token (密碼重設後調用)
 */
exports.revokeAllTokens = async (userId) => {
    await RefreshToken.destroy({ where: { userId } });
};

/**
 * 清理過期 Token (定時任務)
 */
exports.cleanupExpiredTokens = async () => {
    const deleted = await RefreshToken.destroy({
        where: { expiresAt: { [Op.lt]: new Date() } }
    });
    console.log(`[Cleanup] Removed ${deleted} expired tokens`);
};
```

#### Task 2.4: Routes
**檔案**: `sdl-backend-main/routes/auth.js` (新)

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
```

**檔案**: `sdl-backend-main/server.js`

```javascript
// 註冊 route
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// ❌ 移除 setInterval 清理任務
// 改用 crontab 或 pg_cron (見 Phase 4)
```

#### Task 2.5: 密碼重設整合
**檔案**: `sdl-backend-main/controllers/passwordReset.js`

```javascript
const { revokeAllTokens } = require('./auth');

// 在 resetPassword 成功後
await User.update(
    { password: hashedPassword },
    { where: { id: resetToken.User.id } }
);

// 撤銷所有 Refresh Token
await revokeAllTokens(resetToken.User.id);
```

**驗收**:
```bash
# 測試 Login
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{"account":"test","password":"test123"}'

# 應返回 accessToken + refreshToken

# 測試 Refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# 應返回新 accessToken
```

---

### Phase 3: Frontend (2h)

#### Task 3.1: 更新 Login
**檔案**: `sdl-frontend-main/src/pages/login/Login.jsx`

```javascript
onSuccess: (res) => {
    console.log(res);
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken); // 新增
    localStorage.setItem("account", res.data.account);
    localStorage.setItem("email", res.data.email);
    // ... 其他不變
}
```

#### Task 3.2: API Interceptor (核心)
**檔案**: `sdl-frontend-main/src/api/client.js`

```javascript
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

// Request Interceptor (不變)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['accessToken'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - 簡化版本
// ❌ 移除 failedQueue 邏輯 (過度設計，先不做併發處理)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 🟢 消除特殊情況: 401 就是 401，不需要檢查 code
    if (error.response?.status === 401 && !error.config.__isRetry) {
      error.config.__isRetry = true;  // 防止無限重試

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.clear();
        window.location.assign('/login');
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        error.config.headers['accessToken'] = newAccessToken;

        // 重試原始請求
        return apiClient(error.config);

      } catch (refreshError) {
        localStorage.clear();
        window.location.assign('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### Task 3.3: Logout
**檔案**: `sdl-frontend-main/src/api/auth.js` (新)

```javascript
import apiClient from './client';

export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.error('Logout API failed', err);
    }
  }

  localStorage.clear();
  window.location.assign('/login');
};
```

**檔案**: `sdl-frontend-main/src/components/Header.jsx`

```javascript
import { logout } from '../api/auth';

// 登出按鈕
const handleLogout = async () => {
  await logout();
};
```

**驗收**:
```javascript
// 1. 登入
// 2. 修改 JWT_EXPIRES_IN=10 (10秒，測試用)
// 3. 等待 10s
// 4. 發起任意 API 請求
// 預期: 自動 refresh，請求成功，無跳轉

// 5. 刪除 refreshToken from localStorage
// 6. 等待 10s
// 7. 發起 API 請求
// 預期: 跳轉登入
```

---

### Phase 4: 切換到 1h Token + 清理任務 (0.5h)

#### Task 4.1: 修改環境變數
```bash
# .env
JWT_EXPIRES_IN=3600       # 1小時 = 3600秒 (從 86400 改為 3600)
JWT_REFRESH_EXPIRES_IN=604800  # 7天 = 604800秒
```

#### Task 4.2: 設定定時清理 (用 crontab，不是 setInterval)
```bash
# 方案 1: 使用系統 crontab
crontab -e
# 加入: 每 6 小時執行一次
0 */6 * * * psql -d sdl_db -U your_user -c "DELETE FROM refresh_tokens WHERE expires_at < NOW()"

# 方案 2: 使用 pg_cron (如果 PostgreSQL 有安裝)
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 */6 * * *',
  $$DELETE FROM refresh_tokens WHERE expires_at < NOW()$$
);
```

#### Task 4.3: 重啟服務
```bash
# Backend
npm run dev

# Frontend
npm run dev
```

**驗收**:
```bash
# 登入後檢查 JWT payload
# 在 jwt.io 解碼 accessToken
# exp 應該是當前時間 + 3600 秒
```

---

### Phase 5: 上線與監控 (1h)

#### Task 5.1: Production 配置
```bash
# .env.production
JWT_SECRET=strong-random-secret
JWT_EXPIRES_IN=3600       # 1小時 (秒數)
JWT_REFRESH_EXPIRES_IN=604800  # 7天 (秒數)
```

#### Task 5.2: 監控
```javascript
// 在 auth controller 加日誌
console.log(`[Refresh] User ${user.id} at ${new Date()}`);
```

**觀察指標**:
- Refresh API 調用頻率
- Token 過期錯誤數量
- refresh_tokens 表大小

#### Task 5.3: 回滾計畫
```bash
# 如果有問題:
# 1. 修改 .env
JWT_EXPIRES_IN=86400  # 24小時 = 86400秒

# 2. 重啟服務
pm2 restart backend

# 3. 前端可選：移除 auto-refresh 邏輯
# 恢復舊的 401 → 登入跳轉
```

---

## 六、測試清單

### 功能測試
- [ ] 登入獲取 accessToken + refreshToken
- [ ] Token 過期自動 refresh
- [ ] Refresh 成功後 API 請求成功
- [ ] Refresh Token 過期後跳轉登入
- [ ] 登出撤銷 refresh token
- [ ] 密碼重設撤銷所有 token

### 併發測試
- [ ] ~~3 個 API 同時過期，只觸發 1 次 refresh~~ (過度設計，暫時不測)

### 向後相容
- [ ] 舊前端（不傳 refreshToken）仍可登入
- [ ] 所有現有 API 正常運作

### 安全測試
- [ ] 無效 refresh token 返回 401
- [ ] 過期 refresh token 返回 401
- [ ] 密碼重設後舊 token 無效

---

## 七、影響範圍總結

### Backend
- **AuthMiddleware**: ❌ 零改動
- **86 個受保護端點**: ❌ 零改動
- **權限系統** (PermissionGuard): ❌ 零改動
- **Controllers**: ❌ 零改動

### Frontend
- **ProtectedRoute**: ❌ 零改動
- **API Client**: ✅ 增強 (interceptor)
- **Login/Register**: ✅ 增強 (儲存 refreshToken)

### Database
- **新增**: refresh_tokens 表
- **現有表**: ❌ 零改動

---

## 八、Linus 最終判斷 (修正後)

### ✅ 符合標準的部分

**1. Good Taste**
- ✅ 消除特殊情況: Token 過期不再是"異常"，而是正常流程
- ✅ 資料結構清晰: 無狀態 JWT + 有狀態 Refresh Token
- ✅ Interceptor 簡化: 移除過度的併發處理

**2. Never Break Userspace**
- ✅ 所有現有 API 零改動
- ✅ 舊前端向後相容

**3. Simplicity**
- ✅ 核心代碼 < 200 行 (移除 device_info 和 failedQueue 後)
- ✅ 只加 1 表、2 API、1 interceptor 邏輯
- ✅ 清理任務用 cron，不污染 app server

**4. Practical**
- ✅ 解決真實問題: 跨天使用、長時間編輯
- ✅ 安全性提升: Token 洩漏窗口從 24h → 1h

### 🔧 已修正的問題

1. ❌ **移除 device_info** - 日誌不該混在業務資料裡
2. ❌ **移除 failedQueue** - 過早優化，先解決真實問題
3. ❌ **移除 setInterval** - 用 cron，不是 app server 定時任務
4. ✅ **JWT_EXPIRES_IN 改為秒數** - 3600，不是 "1h"
5. ✅ **Token 長度改為 128** - UUID 只需 36，留緩衝
6. ✅ **簡化 interceptor** - 消除 code === 'TOKEN_EXPIRED' 檢查

### 🎯 Verdict
**"減肥完成。現在可以 ship 了。"**

---

## 九、時間規劃

| Phase | 時間 | 負責人 |
|-------|------|--------|
| Phase 0: 準備 | 0.5h | Dev |
| Phase 1: Database | 0.5h | Backend |
| Phase 2: Backend API | 2h | Backend |
| Phase 3: Frontend | 2h | Frontend |
| Phase 4: 切換 1h | 0.5h | Dev |
| Phase 5: 上線監控 | 1h | DevOps |
| **總計** | **6.5h** | **~1 工作日** |

---

**下一步**: 開始 Phase 0 - 創建 feature branch
