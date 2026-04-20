# Admin Dashboard 實作計畫

**Branch：** `feature/admin-dashboard`
**建立日期：** 2026-04-20
**狀態：** 待 confirm 後開工

---

## 1. Scope（範圍）

最高權限 admin 帳號（`admintsai`）可執行兩項操作：

1. **重設任一用戶密碼** — 不受班級限制，產生臨時密碼回傳
2. **切換任一用戶 AI 功能開關** — `users.ai_enabled` boolean，全有/全無

附加：
- 獨立的 `docker-compose.admin.yml` 環境，不污染 dev DB
- CLI recovery 腳本（通關密碼救回 admin 密碼）
- 所有 admin 操作寫 audit log

---

## 2. 獨立環境設計（docker-compose.admin.yml）

完全獨立的 Docker 環境，避免影響 dev DB。

| 服務 | dev port | admin port |
|------|----------|------------|
| nginx | 8080 | **8081** |
| frontend | 5174 | **5175** |
| postgres | 5433 | **5434** |
| minio API | 9002 | **9004** |
| minio Console | 9003 | **9005** |
| pgadmin | 5556 | **5557** |

- **project name：** `sdl_admin`（`name: sdl_admin`）
- **DB volume：** `postgres_data_admin`（全新空 DB，migrations 自動跑）
- **MinIO volume：** `minio_data_admin`
- **不含 prometheus / grafana / token-cleanup**（admin env 不需要效能監控）
- env 變數沿用 `.env`（同一支），但 port 不衝突

**啟動方式：**
```bash
docker compose -f docker-compose.admin.yml up --build
# 訪問 http://localhost:8081
```

**完全移除：**
```bash
docker compose -f docker-compose.admin.yml down -v  # -v 刪除 volume
```

---

## 3. 資料庫變更（Migration）

### 3.1 新增欄位

**檔案：** `sdl-backend-main/migrations/20260420000001-add-ai-enabled-to-users.js`

```sql
ALTER TABLE users
  ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_users_ai_enabled ON users(ai_enabled);
```

- **預設 true**：不影響現有用戶行為
- **Rollback：** `down()` 移除欄位與 index

### 3.2 不加 CHECK constraint
`users.role` 維持 TEXT 自由值。理由：現有資料可能有未預期的 role 值（例如空字串、historical data），加 CHECK 有破壞風險。由 application layer 控制即可。

---

## 4. 後端（API）設計

### 4.1 新檔案

| 檔案 | 用途 |
|------|------|
| `middleware/requireAdmin.js` | role 檢查 middleware |
| `controllers/adminController.js` | admin 專用 controller |
| `routes/admin.js` | admin 路由表 |
| `services/aiAccessService.js` | `isAiEnabled(userId)` 查詢 helper |
| `scripts/hash-recovery.js` | CLI：將通關密碼 hash 後印出 |
| `scripts/admin-recover.js` | CLI：用通關密碼重設 admin 密碼 |
| `scripts/seed-admin.js` | CLI：建立/更新 `admintsai` 帳號 |

### 4.2 API 端點

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/admin/users` | 列用戶（搜尋 + role 篩選 + 分頁） |
| PUT | `/api/admin/users/:userId/reset-password` | admin 重設密碼（臨時密碼流程） |
| PATCH | `/api/admin/users/:userId/ai-access` | 切換 `ai_enabled` |

**列表回應範例：**
```json
{
  "users": [
    { "id": 1, "account": "admintsai", "username": "管理員",
      "role": "admin", "class": null, "ai_enabled": true,
      "last_login_at": "2026-04-20T10:00:00Z" }
  ],
  "total": 127,
  "page": 1,
  "pageSize": 20
}
```

**Query params：**
- `keyword` — 模糊比對 account / username
- `role` — student / teacher / admin / all
- `page` — 預設 1
- `pageSize` — 預設 20，可用 1/10/20/50/100

### 4.3 修改既有檔案（最小化）

| 檔案 | 改動 |
|------|------|
| `server.js` 或 `routes/index.js` | 掛載 `app.use('/api/admin', adminRouter)` |
| 各 AI controller（見第 6 節） | 加 `checkAiEnabled` 檢查 |

---

## 5. 前端設計

### 5.1 新檔案

```
sdl-frontend-main/src/
├── pages/
│   └── Admin/
│       ├── AdminDashboard.jsx        # 主頁面（/admin）
│       └── UserTable.jsx             # 用戶列表表格
├── components/
│   └── Admin/
│       ├── ResetPasswordModal.jsx    # 重設密碼 modal
│       └── AiToggleSwitch.jsx        # AI 開關元件
└── api/
    └── admin.js                      # admin API client
```

### 5.2 路由

- `/admin` — Admin Dashboard（僅 `role === 'admin'` 可訪問）
- 若非 admin → redirect to `/login`

### 5.3 登入入口
沿用現有 `/login` 頁面。登入後：
- `role === 'admin'` → redirect `/admin`
- 其他 role → 照現有邏輯

### 5.4 用戶列表欄位
`id | account | username | role | class | ai_enabled | last_login_at | 操作`

操作欄：`[重設密碼]` `[AI: 開/關]` 兩個按鈕。

### 5.5 分頁選項
dropdown：`1 / 10 / 20 / 50 / 100`，預設 20。

### 5.6 被關閉 AI 的用戶體驗
前端按下 AI 按鈕後由後端回 `403 { error: 'AI_DISABLED' }`，前端顯示 toast：「AI 功能已停用，請聯絡管理員」。

---

## 6. AI 功能擋點（各 controller 各自擋）

在每個 AI controller 呼叫 LLM 之前，先查 `aiAccessService.isAiEnabled(req.userId)`。

### 6.1 需要加檢查的 controller
| 檔案 | 功能 |
|------|------|
| `controllers/sdlCoach.js` | 自主學習助手（`SDL_COACH_ASK`） |
| `controllers/kbCoach.js` | KB Coach |
| `controllers/llm_5R.js` | 5Rs 分析 |
| `controllers/llm.js` | Idea 生成 |
| `controllers/aiTaskAssistantController.js` | AI Task Assistant |
| `controllers/rag_message.js` | RAG 對話 |

（實作時會再檢查一次，若有遺漏補上。）

### 6.2 統一 pattern

```js
const { isAiEnabled } = require('../services/aiAccessService');

// 在 controller 入口加：
if (!(await isAiEnabled(req.userId))) {
  return res.status(403).json({ error: 'AI_DISABLED', message: 'AI 功能已停用' });
}
```

---

## 7. Recovery 機制

### 7.1 流程

```
[Admin 忘記密碼]
      ↓
[你登入 server，docker exec 進 api 容器]
      ↓
[跑 node scripts/admin-recover.js]
      ↓
[輸入通關密碼（stdin，不顯示）]
      ↓
[腳本 bcrypt compare 對 .env 的 ADMIN_RECOVERY_HASH]
      ↓
[通過 → 產生新臨時密碼印在 terminal]
      ↓
[Admin 用臨時密碼登入並自行修改]
```

### 7.2 腳本配對

**`scripts/hash-recovery.js`**（你一次性使用）
```bash
node scripts/hash-recovery.js '你的通關密碼'
# 輸出：$2b$10$xxx...
# 你手動貼進 .env 的 ADMIN_RECOVERY_HASH
```

**`scripts/admin-recover.js`**（緊急救援用）
- 互動式 prompt（不從 argv 讀，避免留在 shell history）
- 驗證通過才重設，寫 audit log `ADMIN_RECOVERY_TRIGGERED`

### 7.3 .env 新增變數（不提交 git）
```
ADMIN_RECOVERY_HASH=$2b$10$...  # 你自己加
```

---

## 8. Audit Log

admin 的每個操作都寫 audit log，action 命名：

| Action | 觸發時機 |
|--------|----------|
| `ADMIN_DASHBOARD_VIEW` | 進入 `/admin` 頁面（GET `/api/admin/users`） |
| `ADMIN_PASSWORD_RESET_BY_ADMIN` | 與 teacher 版 `ADMIN_PASSWORD_RESET` 區分 |
| `ADMIN_AI_ACCESS_TOGGLE` | 切換 `ai_enabled`，metadata 記錄 before/after |
| `ADMIN_RECOVERY_TRIGGERED` | CLI 腳本成功重設 admin 密碼 |

---

## 9. Commit 分割（5 個 commit）

| 順序 | Commit 訊息 | 涵蓋檔案 |
|------|-------------|----------|
| 1 | `feat: 新增 admin 環境 docker-compose.admin.yml` | `docker-compose.admin.yml` |
| 2 | `feat: 新增 users.ai_enabled 欄位與 migration` | migration 檔 + `models/user.js` |
| 3 | `feat: 新增 requireAdmin middleware 與 admin seed/recovery 腳本` | middleware + 3 個 scripts + `.env.example` 註解 |
| 4 | `feat: 新增 admin 用戶管理 API（列表、重設密碼、切換 AI）` | adminController + admin routes + aiAccessService + server.js 掛載 |
| 5 | `feat: 各 AI controller 加上 ai_enabled 檢查` | 6 個 AI controller |
| 6 | `feat: 新增 admin 前端儀表板頁面` | 前端所有新檔 |

出事可只 revert 特定 commit。

---

## 10. Rollback 指引

### 10.1 放棄整個 feature
```bash
git checkout master
git branch -D feature/admin-dashboard
docker compose -f docker-compose.admin.yml down -v  # 清掉 admin env
```

### 10.2 部分 revert
```bash
git revert <commit-hash>  # 針對單一 commit
```

### 10.3 只回滾 DB schema（保留程式碼）
```bash
docker compose -f docker-compose.admin.yml exec api npm run migrate:undo
```

---

## 11. 尚未決定的事（開工前仍需你確認）

**無。** 前面對話已全部確認。若你 confirm 此 plan，我直接開始 commit 1。

---

## 12. 開工順序檢查表

- [ ] 建立 `docker-compose.admin.yml`（commit 1）
- [ ] 啟動 admin env 確認 DB 可連（手動驗證）
- [ ] Migration `ai_enabled`（commit 2）
- [ ] middleware + scripts（commit 3）
- [ ] 你跑 `hash-recovery.js` 自己貼 hash 進 `.env`
- [ ] 你跑 `seed-admin.js` 建立 `admintsai`（密碼從 env 讀）
- [ ] admin API（commit 4）
- [ ] 用 curl 測 API（列表 + 重設 + 切 AI）
- [ ] AI controller 擋點（commit 5）
- [ ] 前端頁面（commit 6）
- [ ] 整合測試：從 `/login` 登入 admintsai → 訪問 `/admin` → 操作各功能
