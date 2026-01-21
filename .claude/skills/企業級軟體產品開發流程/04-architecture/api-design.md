---
description: 設計 RESTful API，包含 OpenAPI 規格、認證授權和最佳實踐
---

# API 設計規範 (API Design)

## 概述
此 skill 協助設計符合業界標準的 RESTful API，包括資源設計、URL 規劃、HTTP 方法使用、狀態碼定義、請求/回應格式、認證授權機制、錯誤處理、版本控制和 OpenAPI 規格文件撰寫。

## 適用角色
- **主要負責**: 後端工程師、API 架構師
- **協作角色**: 前端工程師、產品經理、技術文件撰寫者

## 輸入需求
使用者需要提供：
- 功能需求和業務邏輯
- 資料模型（Entity Relationship）
- 非功能需求（效能、安全性）
- 預期的 API 使用場景
- 客戶端類型（Web、Mobile、第三方）

範例：`請幫我設計 [功能模組] 的 API，需要支援 [操作列表]`

## 執行步驟

### 步驟 1: 資源識別與建模
- 從業務需求中識別資源（Resources）
- 定義資源之間的關係（一對一、一對多、多對多）
- 確定資源的屬性和欄位
- 設計資源的層級結構

### 步驟 2: URL 設計
- 使用名詞複數表示集合資源（`/users`）
- 使用 ID 表示單一資源（`/users/{id}`）
- 使用巢狀 URL 表示關係（`/users/{id}/orders`）
- 使用查詢參數實現篩選、排序、分頁
- 遵循 RESTful 命名慣例

### 步驟 3: HTTP 方法映射
- GET: 查詢資源（Safe & Idempotent）
- POST: 建立資源
- PUT: 完整更新資源（Idempotent）
- PATCH: 部分更新資源
- DELETE: 刪除資源（Idempotent）

### 步驟 4: 請求與回應設計
- 定義請求體（Request Body）Schema
- 定義回應體（Response Body）Schema
- 統一錯誤回應格式
- 設計分頁回應結構
- 定義 HTTP 狀態碼使用規則

### 步驟 5: 認證與授權
- 選擇認證機制（JWT、OAuth 2.0、API Key）
- 設計權限控制策略（RBAC、ABAC）
- 定義 API 存取範圍（Scopes）
- 實作速率限制（Rate Limiting）

### 步驟 6: 版本控制策略
- 選擇版本控制方法（URL、Header、Query Param）
- 定義版本升級策略
- 規劃向後相容性
- 設定棄用（Deprecation）政策

### 步驟 7: OpenAPI 文件撰寫
- 使用 OpenAPI 3.0+ 規格
- 定義所有端點、參數、回應
- 添加範例和說明
- 生成互動式 API 文件（Swagger UI）

## 輸出模板

```markdown
# API 設計文件

**API 名稱**: [API 名稱]  
**版本**: v1.0  
**基礎 URL**: https://api.example.com/v1  
**文件日期**: YYYY-MM-DD  
**負責人**: [姓名、職稱]  
**狀態**: 草稿 / 審核中 / 已核准

---

## 目錄

1. [概述](#1-概述)
2. [設計原則](#2-設計原則)
3. [認證與授權](#3-認證與授權)
4. [通用規範](#4-通用規範)
5. [資源端點設計](#5-資源端點設計)
6. [錯誤處理](#6-錯誤處理)
7. [版本控制](#7-版本控制)
8. [效能優化](#8-效能優化)
9. [安全性](#9-安全性)
10. [OpenAPI 規格](#10-openapi-規格)
11. [附錄](#11-附錄)

---

## 1. 概述

### 1.1 API 目的
[描述此 API 的主要目的和使用場景]

### 1.2 目標受眾
- **Web 應用程式**: [說明]
- **行動應用程式**: [說明]
- **第三方整合**: [說明]

### 1.3 核心功能
1. [功能 1]: [簡述]
2. [功能 2]: [簡述]
3. [功能 3]: [簡述]

### 1.4 技術規格

| 項目 | 規格 |
|------|------|
| 協定 | HTTPS |
| 架構風格 | RESTful |
| 資料格式 | JSON |
| 認證方式 | JWT Bearer Token |
| 字元編碼 | UTF-8 |
| 時間格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |

---

## 2. 設計原則

### 2.1 RESTful 原則

1. **資源導向**: 所有端點都代表資源，使用名詞而非動詞
2. **無狀態**: 每個請求包含完整資訊，伺服器不儲存客戶端狀態
3. **可快取**: 回應明確標示是否可快取
4. **統一介面**: 一致的 URL 結構和回應格式
5. **分層系統**: 支援負載平衡、快取層等中介層

### 2.2 命名規範

**URL 命名**:
- ✅ 使用小寫字母
- ✅ 使用連字號（-）分隔單字
- ✅ 複數名詞表示集合（`/users`）
- ✅ 避免動詞（❌ `/getUser` → ✅ `GET /users/{id}`）

**範例**:
```
GET    /users              # 獲取用戶列表
GET    /users/{id}         # 獲取單一用戶
POST   /users              # 建立新用戶
PUT    /users/{id}         # 完整更新用戶
PATCH  /users/{id}         # 部分更新用戶
DELETE /users/{id}         # 刪除用戶
GET    /users/{id}/orders  # 獲取用戶的訂單列表
```

### 2.3 資料命名

**JSON 欄位命名**:
- ✅ 使用 camelCase（`firstName`, `createdAt`）
- ✅ 布林值使用 `is`, `has`, `can` 前綴（`isActive`, `hasPermission`）
- ✅ 日期時間使用 ISO 8601 格式
- ✅ ID 使用 `id` 或 `{resource}Id`

**範例**:
```json
{
  "id": 123,
  "firstName": "Alice",
  "lastName": "Chen",
  "email": "alice@example.com",
  "isActive": true,
  "createdAt": "2024-01-18T10:30:00Z",
  "updatedAt": "2024-01-18T12:45:00Z"
}
```

---

## 3. 認證與授權

### 3.1 認證機制

**JWT Bearer Token**:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token 結構**:
```json
{
  "sub": "user_id_123",
  "iat": 1705574400,
  "exp": 1705578000,
  "role": "admin",
  "permissions": ["user.read", "user.write"]
}
```

**Token 生命週期**:
- Access Token: 15 分鐘
- Refresh Token: 7 天

### 3.2 認證端點

#### POST /auth/login
登入並獲取 Token

**請求**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**回應**:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "refresh_token_abc123",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### POST /auth/refresh
刷新 Access Token

**請求**:
```json
{
  "refreshToken": "refresh_token_abc123"
}
```

**回應**:
```json
{
  "accessToken": "eyJhbGci...",
  "expiresIn": 900
}
```

#### POST /auth/logout
登出並撤銷 Token

**請求**:
```json
{
  "refreshToken": "refresh_token_abc123"
}
```

**回應**:
```json
{
  "message": "Logout successful"
}
```

### 3.3 授權模型

**RBAC (Role-Based Access Control)**:

| 角色 | 權限 |
|------|------|
| admin | 所有權限 |
| manager | user.*, order.*, product.read |
| user | profile.read, profile.update, order.create |
| guest | product.read |

**權限檢查範例**:
```javascript
// Middleware
function requirePermissions(...permissions) {
  return (req, res, next) => {
    const userPermissions = req.user.permissions;
    const hasPermission = permissions.every(p => 
      userPermissions.includes(p)
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions"
      });
    }
    
    next();
  };
}

// 使用
router.get('/admin/users', 
  requirePermissions('user.read', 'admin.access'),
  getUsers
);
```

### 3.4 速率限制

| 客戶端類型 | 限制 |
|-----------|------|
| 未認證 | 100 請求/小時/IP |
| 已認證 | 1000 請求/小時/用戶 |
| Premium | 10000 請求/小時/用戶 |

**回應標頭**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705578000
```

**超過限制回應**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 3600
}
```

---

## 4. 通用規範

### 4.1 HTTP 方法使用

| 方法 | 用途 | 是否冪等 | 是否安全 | 請求體 | 回應體 |
|------|------|---------|---------|--------|--------|
| GET | 查詢資源 | ✅ | ✅ | ❌ | ✅ |
| POST | 建立資源 | ❌ | ❌ | ✅ | ✅ |
| PUT | 完整替換資源 | ✅ | ❌ | ✅ | ✅ |
| PATCH | 部分更新資源 | ❌ | ❌ | ✅ | ✅ |
| DELETE | 刪除資源 | ✅ | ❌ | ❌ | ✅ |
| HEAD | 獲取標頭 | ✅ | ✅ | ❌ | ❌ |
| OPTIONS | 獲取支援的方法 | ✅ | ✅ | ❌ | ✅ |

### 4.2 HTTP 狀態碼

#### 2xx 成功

| 狀態碼 | 說明 | 使用場景 |
|--------|------|---------|
| 200 OK | 請求成功 | GET, PUT, PATCH 成功 |
| 201 Created | 資源已建立 | POST 建立資源成功 |
| 202 Accepted | 請求已接受，處理中 | 異步操作 |
| 204 No Content | 成功但無回應內容 | DELETE 成功 |

#### 4xx 客戶端錯誤

| 狀態碼 | 說明 | 使用場景 |
|--------|------|---------|
| 400 Bad Request | 請求格式錯誤 | 驗證失敗、缺少必要參數 |
| 401 Unauthorized | 未認證 | Token 缺失或無效 |
| 403 Forbidden | 已認證但無權限 | 權限不足 |
| 404 Not Found | 資源不存在 | 資源 ID 不存在 |
| 405 Method Not Allowed | 方法不允許 | 端點不支援此 HTTP 方法 |
| 409 Conflict | 資源衝突 | 唯一性約束違反 |
| 422 Unprocessable Entity | 語義錯誤 | 業務邏輯驗證失敗 |
| 429 Too Many Requests | 速率限制 | 超過請求次數限制 |

#### 5xx 伺服器錯誤

| 狀態碼 | 說明 | 使用場景 |
|--------|------|---------|
| 500 Internal Server Error | 伺服器內部錯誤 | 未預期的錯誤 |
| 502 Bad Gateway | 閘道錯誤 | 上游服務失敗 |
| 503 Service Unavailable | 服務不可用 | 維護中或超載 |
| 504 Gateway Timeout | 閘道逾時 | 上游服務逾時 |

### 4.3 查詢參數

#### 分頁

```
GET /users?page=2&limit=20
```

**參數**:
- `page`: 頁碼（從 1 開始）
- `limit`: 每頁資料數（預設 20，最大 100）

**回應**:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

#### 篩選

```
GET /products?category=electronics&minPrice=1000&maxPrice=5000
```

**支援的運算子**:
- 等於: `field=value`
- 範圍: `minField=value&maxField=value`
- 包含: `field=value1,value2`（OR）
- 模糊搜尋: `search=keyword`

#### 排序

```
GET /users?sort=createdAt:desc,name:asc
```

**格式**: `field:order`
- `asc`: 升序
- `desc`: 降序

#### 欄位選擇

```
GET /users?fields=id,name,email
```

**用途**: 減少回應大小，只返回需要的欄位

#### 完整範例

```
GET /products?
  category=electronics&
  minPrice=1000&
  maxPrice=5000&
  sort=price:asc&
  page=1&
  limit=20&
  fields=id,name,price,image
```

### 4.4 標頭規範

**請求標頭**:
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
X-Request-ID: {uuid}
Accept-Language: zh-TW
```

**回應標頭**:
```http
Content-Type: application/json; charset=utf-8
X-Request-ID: {uuid}
X-Response-Time: 45ms
Cache-Control: no-cache, no-store, must-revalidate
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

---

## 5. 資源端點設計

### 5.1 用戶資源 (Users)

#### GET /users
獲取用戶列表

**查詢參數**:
- `page`: 頁碼
- `limit`: 每頁數量
- `role`: 角色篩選
- `search`: 搜尋關鍵字（姓名或 Email）

**回應 200 OK**:
```json
{
  "data": [
    {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### GET /users/{id}
獲取單一用戶詳細資料

**路徑參數**:
- `id`: 用戶 ID

**回應 200 OK**:
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "firstName": "Alice",
  "lastName": "Chen",
  "role": "admin",
  "isActive": true,
  "permissions": ["user.read", "user.write"],
  "profile": {
    "bio": "Software Engineer",
    "avatar": "https://cdn.example.com/avatars/1.jpg",
    "location": "Taipei, Taiwan"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-18T10:00:00Z"
}
```

**錯誤回應 404 Not Found**:
```json
{
  "error": "Not Found",
  "message": "User with id 999 not found"
}
```

---

#### POST /users
建立新用戶

**請求**:
```json
{
  "username": "bob",
  "email": "bob@example.com",
  "password": "SecureP@ssw0rd",
  "firstName": "Bob",
  "lastName": "Lin",
  "role": "user"
}
```

**驗證規則**:
- `username`: 必填，3-20 字元，字母數字
- `email`: 必填，有效的 Email 格式
- `password`: 必填，至少 8 字元，包含大小寫字母、數字和特殊符號
- `role`: 選填，預設 `user`

**回應 201 Created**:
```json
{
  "id": 2,
  "username": "bob",
  "email": "bob@example.com",
  "firstName": "Bob",
  "lastName": "Lin",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-18T10:30:00Z"
}
```

**錯誤回應 400 Bad Request**:
```json
{
  "error": "Validation Error",
  "message": "Invalid input",
  "details": [
    {
      "field": "email",
      "message": "Email already exists"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

#### PUT /users/{id}
完整更新用戶（需提供所有欄位）

**請求**:
```json
{
  "username": "alice_updated",
  "email": "alice.new@example.com",
  "firstName": "Alice",
  "lastName": "Chen",
  "role": "admin",
  "isActive": true
}
```

**回應 200 OK**:
```json
{
  "id": 1,
  "username": "alice_updated",
  "email": "alice.new@example.com",
  "firstName": "Alice",
  "lastName": "Chen",
  "role": "admin",
  "isActive": true,
  "updatedAt": "2024-01-18T11:00:00Z"
}
```

---

#### PATCH /users/{id}
部分更新用戶（只需提供要更新的欄位）

**請求**:
```json
{
  "isActive": false
}
```

**回應 200 OK**:
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "firstName": "Alice",
  "lastName": "Chen",
  "role": "admin",
  "isActive": false,
  "updatedAt": "2024-01-18T11:15:00Z"
}
```

---

#### DELETE /users/{id}
刪除用戶（軟刪除）

**回應 204 No Content**:
（無內容）

**錯誤回應 403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "Cannot delete your own account"
}
```

---

### 5.2 巢狀資源範例

#### GET /users/{userId}/orders
獲取用戶的訂單列表

**回應 200 OK**:
```json
{
  "data": [
    {
      "id": 101,
      "userId": 1,
      "total": 1500.00,
      "status": "completed",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### POST /users/{userId}/orders
為用戶建立訂單

**請求**:
```json
{
  "items": [
    {
      "productId": 10,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "No. 1, Sec. 1, Roosevelt Rd.",
    "city": "Taipei",
    "postalCode": "100"
  }
}
```

**回應 201 Created**:
```json
{
  "id": 102,
  "userId": 1,
  "items": [...],
  "total": 800.00,
  "status": "pending",
  "createdAt": "2024-01-18T12:00:00Z"
}
```

---

## 6. 錯誤處理

### 6.1 統一錯誤格式

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2024-01-18T12:00:00Z",
  "path": "/api/v1/users",
  "requestId": "abc-123-def-456"
}
```

### 6.2 常見錯誤範例

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-18T12:00:00Z"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource",
  "requiredPermission": "admin.access",
  "timestamp": "2024-01-18T12:00:00Z"
}
```

#### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "resource": "User",
  "id": 999,
  "timestamp": "2024-01-18T12:00:00Z"
}
```

#### 422 Unprocessable Entity
```json
{
  "error": "Validation Error",
  "message": "The request data is invalid",
  "details": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    },
    {
      "field": "age",
      "message": "Age must be at least 18",
      "code": "MIN_VALUE",
      "value": 15
    }
  ],
  "timestamp": "2024-01-18T12:00:00Z"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later.",
  "requestId": "abc-123-def-456",
  "timestamp": "2024-01-18T12:00:00Z"
}
```

**注意**: 生產環境不應暴露詳細的錯誤堆疊或敏感資訊

---

## 7. 版本控制

### 7.1 版本控制策略

**選擇**: URL 路徑版本控制

**格式**: `/api/v{version}/{resource}`

**範例**:
```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

**理由**:
- ✅ 簡單明確
- ✅ 容易快取
- ✅ 支援多版本並存

### 7.2 版本升級規則

**語意化版本**:
- `v1.0`: 主版本，破壞性變更
- `v1.1`: 次版本，新增功能（向後相容）
- `v1.1.1`: 修訂版本，錯誤修正

**破壞性變更**:
- 移除端點
- 移除請求/回應欄位
- 改變資料類型
- 改變驗證規則（更嚴格）

**非破壞性變更**:
- 新增端點
- 新增選填欄位
- 放寬驗證規則

### 7.3 棄用政策

**棄用流程**:
1. 在回應標頭中標示棄用
2. 提前 6 個月公告
3. 在文件中明確標示
4. 提供遷移指南
5. 設定截止日期

**棄用標頭**:
```http
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: <https://docs.example.com/migration>; rel="deprecation"
```

---

## 8. 效能優化

### 8.1 快取策略

**快取標頭**:
```http
Cache-Control: public, max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 18 Jan 2024 10:00:00 GMT
```

**快取規則**:
- 靜態資源: `max-age=31536000` (1 年)
- 公開資料: `public, max-age=3600` (1 小時)
- 私有資料: `private, max-age=300` (5 分鐘)
- 敏感資料: `no-cache, no-store, must-revalidate`

**條件請求**:
```http
GET /users/1
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# 資料未變更
HTTP/1.1 304 Not Modified
```

### 8.2 壓縮

**支援的壓縮**:
- gzip
- brotli

**請求標頭**:
```http
Accept-Encoding: gzip, deflate, br
```

**回應標頭**:
```http
Content-Encoding: gzip
Vary: Accept-Encoding
```

### 8.3 分頁最佳化

**游標分頁** (Cursor-Based):
適合即時資料流

```
GET /posts?cursor=eyJpZCI6MTAwfQ&limit=20
```

**回應**:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "hasNext": true
  }
}
```

---

## 9. 安全性

### 9.1 HTTPS 強制
- 所有 API 必須使用 HTTPS
- HTTP 請求自動重導向到 HTTPS
- 使用 HSTS 標頭

### 9.2 CORS 設定

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### 9.3 輸入驗證
- 使用 Schema 驗證（Joi、Zod）
- 驗證所有輸入資料
- 清理和過濾輸入
- 防止 SQL 注入（使用 ORM）
- 防止 XSS 攻擊（輸出編碼）

### 9.4 敏感資料處理
- 密碼使用 bcrypt 加密
- 敏感資料加密儲存
- 日誌遮蔽敏感資訊
- 不在 URL 中傳遞敏感資料

---

## 10. OpenAPI 規格

### 10.1 OpenAPI 文件結構

```yaml
openapi: 3.0.3
info:
  title: Example API
  version: 1.0.0
  description: RESTful API for Example Application
  contact:
    name: API Support
    email: api@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server

tags:
  - name: Users
    description: User management endpoints
  - name: Auth
    description: Authentication endpoints

paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of users
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
      security:
        - bearerAuth: []

    post:
      summary: Create user
      description: Create a new user
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      security:
        - bearerAuth: []

  /users/{id}:
    get:
      summary: Get user
      description: Retrieve a single user by ID
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      security:
        - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          example: 1
        username:
          type: string
          example: alice
        email:
          type: string
          format: email
          example: alice@example.com
        role:
          type: string
          enum: [admin, user, guest]
          example: user
        isActive:
          type: boolean
          example: true
        createdAt:
          type: string
          format: date-time
          example: 2024-01-01T00:00:00Z
      required:
        - id
        - username
        - email

    CreateUserRequest:
      type: object
      properties:
        username:
          type: string
          minLength: 3
          maxLength: 20
        email:
          type: string
          format: email
        password:
          type: string
          format: password
          minLength: 8
        role:
          type: string
          enum: [admin, user]
          default: user
      required:
        - username
        - email
        - password

    UserListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean

    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
        timestamp:
          type: string
          format: date-time
      required:
        - error
        - message
```

---

## 11. 附錄

### 11.1 HTTP 狀態碼完整列表

[參考第 4.2 節]

### 11.2 最佳實踐檢查清單

- [ ] 所有端點使用 HTTPS
- [ ] 實作認證和授權
- [ ] 實作速率限制
- [ ] 統一的錯誤回應格式
- [ ] 完整的 OpenAPI 文件
- [ ] API 版本控制
- [ ] 輸入驗證
- [ ] 輸出過濾（不暴露敏感資料）
- [ ] CORS 設定
- [ ] 日誌記錄（含請求 ID）
- [ ] 監控和告警
- [ ] 效能測試
- [ ] 安全測試

### 11.3 參考資源

- [OpenAPI Specification](https://swagger.io/specification/)
- [REST API Design Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [JSON API Specification](https://jsonapi.org/)

---

## 審核與核准

| 角色 | 姓名 | 簽名 | 日期 | 意見 |
|------|------|------|------|------|
| API 架構師 | | | | |
| 後端主管 | | | | |
| 安全專家 | | | | |
| 前端主管 | | | | |

**狀態**: ✅ 已核准 / 🔄 需修改 / ❌ 已拒絕

**核准日期**: YYYY-MM-DD
```

---

## 品質檢查清單

- [ ] 所有端點都遵循 RESTful 原則
- [ ] URL 命名一致且語意化
- [ ] HTTP 方法使用正確
- [ ] 狀態碼使用恰當
- [ ] 錯誤回應格式統一
- [ ] 認證授權機制完整
- [ ] 速率限制已實作
- [ ] 版本控制策略明確
- [ ] 完整的 OpenAPI 規格文件
- [ ] API 安全性考量完整
- [ ] 效能優化策略（快取、壓縮）
- [ ] 已提供完整範例
- [ ] 已由前後端團隊審核

---

## 相關 Skills
- `system-architecture.md` - 系統架構設計（整體架構）
- `data-model.md` - 資料模型設計（資料庫設計）
- `security-requirements.md` - 安全需求（安全規範）
- `backend-service.md` - 後端服務開發（實作）

---

## 範例

### 輸入範例
```
請幫我設計「電商平台」的訂單管理 API，
需要支援建立訂單、查詢訂單、更新訂單狀態、取消訂單。
```

### 輸出範例
[生成完整 API 文件，包含：]
- **端點列表**:
  - `POST /orders` - 建立訂單
  - `GET /orders` - 查詢訂單列表
  - `GET /orders/{id}` - 查詢單一訂單
  - `PATCH /orders/{id}` - 更新訂單狀態
  - `DELETE /orders/{id}` - 取消訂單
- **完整的請求/回應範例**
- **驗證規則**
- **權限控制**
- **錯誤處理**
- **OpenAPI 規格**
