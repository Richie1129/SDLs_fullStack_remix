# Phase 0 測試指南

> **重要**: 在開始測試前，請先閱讀此文件

---

## 🎯 測試目標

驗證 Phase 0 基礎設施的以下功能:
1. ✅ 前端批量發送機制
2. ✅ 後端批量接收端點
3. ✅ sendBeacon 保底機制
4. ✅ 自動重試機制
5. ✅ 資料庫正確寫入

---

## 📋 前置條件

- [x] 已完成 Phase 0 實作 (執行 `./verify-phase0.sh` 驗證)
- [ ] Docker 服務運行中
- [ ] 資料庫連線正常
- [ ] 前後端依賴已安裝

---

## 🚀 測試步驟

### 步驟 1: 啟動服務 (5 分鐘)

```bash
# 終端 1 - 後端
cd sdl-backend-main
npm install  # 如果尚未安裝
npm run dev

# 終端 2 - 前端
cd sdl-frontend-main
npm install  # 如果尚未安裝
npm run dev

# 終端 3 - 資料庫 (如需要)
docker compose up -d postgres
```

**預期結果**:
- 後端: `Server running on port 3000`
- 前端: `Local: http://localhost:5173/`

---

### 步驟 2: 執行後端自動測試 (3 分鐘)

```bash
cd sdl-backend-main

# 1. 先登入獲取 accessToken (使用 Postman 或瀏覽器開發者工具)
#    POST http://localhost:3000/api/user/login
#    { "email": "your@email.com", "password": "your_password" }
#    複製回應中的 accessToken

# 2. 設定環境變數
export TEST_ACCESS_TOKEN="eyJhbGci..."  # 替換為你的 token

# 3. 執行測試
node test-tracking-batch.js
```

**預期結果**:
```
🚀 Phase 0 批量審計端點測試
==========================================

🧪 測試 1: 基礎批量發送 (10 個事件)
✅ 成功! { ok: true, count: 10, skipped: 0 }
✅ 寫入數量正確: 10 個事件

🧪 測試 2: 無效輸入 (非陣列)
✅ 正確拒絕無效輸入

🧪 測試 3: 空陣列
✅ 成功 (空陣列應返回 count: 0)

... (7 個測試全部通過)

✅ 所有測試完成!
```

---

### 步驟 3: 前端手動測試 (5 分鐘)

#### 3.1 添加測試頁面路由

**選項 A: 臨時路由 (快速測試)**

在 `App.jsx` 中添加:
```jsx
import TrackingTestPage from './test/TrackingTestPage';

// 在 Routes 中添加
<Route path="/test-tracking" element={<TrackingTestPage />} />
```

**選項 B: 直接訪問 (需登入)**

如果已有路由系統，可直接將 TrackingTestPage 掛載到任意受保護路由下。

#### 3.2 訪問測試頁面

1. 開啟 http://localhost:5173/test-tracking (或你設定的路徑)
2. **登入系統** (必須，因為需要 accessToken)
3. 開啟瀏覽器開發者工具 (F12 → Console)

#### 3.3 執行測試

**依序點擊以下按鈕**:

1. **1️⃣ 測試單一事件**
   - 預期: Console 顯示 `[TrackingTest] ✅ 發送單一事件`
   - 等待 5 秒，應看到 `✅ [TrackingProvider] 批量發送成功: 1 個事件`

2. **2️⃣ 測試批量事件 (25 個)**
   - 預期: 立即觸發 2 次批量發送 (20 + 5 個)
   - Console 顯示:
     - `✅ [TrackingProvider] 批量發送成功: 20 個事件`
     - `✅ [TrackingProvider] 批量發送成功: 5 個事件`

3. **3️⃣ 測試立即刷新**
   - 預期: 不等 5 秒定時器，立即發送
   - Console 顯示 `✅ 立即刷新完成`

4. **4️⃣ 測試不同事件類型**
   - 預期: 發送 5 種不同的事件類型
   - 等待 5 秒後批量發送

5. **5️⃣ 測試大型 Metadata**
   - 預期: 發送包含 1KB+ 資料的事件
   - 正常發送，無錯誤

6. **6️⃣ 測試無效事件**
   - 預期: Console 顯示 `⚠️ [TrackingProvider] action 不可為空`
   - 不會發送到後端

---

### 步驟 4: 驗證資料庫寫入 (2 分鐘)

```bash
# 連線到 PostgreSQL
docker compose exec postgres psql -U postgres -d postgres

# 執行查詢
SELECT 
  action,
  targetType,
  targetId,
  actorId,
  actorName,
  source,
  timestamp
FROM audit_event
WHERE source = 'client'
ORDER BY timestamp DESC
LIMIT 50;
```

**預期結果**:
- 看到 40+ 筆測試事件 (來自步驟 2 和步驟 3)
- `source` 欄位應全部為 `'client'`
- `actorId` 應為你的使用者 ID
- `timestamp` 應為最近時間

**統計查詢** (可選):
```sql
SELECT action, COUNT(*) as count
FROM audit_event
WHERE source = 'client'
  AND timestamp >= NOW() - INTERVAL '10 minutes'
GROUP BY action
ORDER BY count DESC;
```

---

### 步驟 5: 測試 sendBeacon (關鍵!) (2 分鐘)

這是最重要的測試，驗證頁面關閉時事件不會丟失。

1. **訪問應用任意頁面** (如首頁、看板)
2. **觸發一些操作** (點擊、拖拽等) - 不要等待 5 秒刷新
3. **立即關閉分頁** (不是重新整理，是關閉!)
4. **重新開啟資料庫查詢**

```sql
SELECT * FROM audit_event
WHERE source = 'client'
  AND timestamp >= NOW() - INTERVAL '1 minute'
ORDER BY timestamp DESC;
```

**預期結果**:
- 所有在步驟 2 觸發的事件都已寫入
- 即使沒等 5 秒定時器或 20 個批量大小

**如何判斷成功**:
- 在步驟 2 觸發了 N 個事件
- 資料庫中應有 N 筆記錄
- `metadata` 欄位可能包含 `_clientId` (用於去重)

---

## ✅ 測試檢查清單

完成以下所有項目才算測試通過:

### 後端測試
- [ ] 基礎批量發送 (10 個事件) ✅
- [ ] 無效輸入被拒絕 ✅
- [ ] 空陣列正確處理 ✅
- [ ] 超過 100 個事件被拒絕 ✅
- [ ] 缺少 action 的事件被跳過 ✅
- [ ] 不同事件類型混合發送 ✅
- [ ] 資料庫查詢成功 ✅

### 前端測試
- [ ] 單一事件發送成功
- [ ] 批量事件觸發 2 次發送 (20+5)
- [ ] 立即刷新功能正常
- [ ] 不同事件類型發送成功
- [ ] 大型 metadata 正常處理
- [ ] 無效事件顯示警告

### 整合測試
- [ ] 資料庫看到 40+ 筆測試事件
- [ ] `source` 欄位全部為 'client'
- [ ] `actorId` 正確填入
- [ ] sendBeacon 測試成功 (頁面關閉時保證送達)

---

## 🐛 常見問題排查

### 問題 1: 後端測試顯示 401 Unauthorized

**原因**: accessToken 過期或無效

**解決**:
```bash
# 重新登入獲取新 token
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"your_password"}'

# 更新環境變數
export TEST_ACCESS_TOKEN="new_token_here"
```

---

### 問題 2: 前端 Console 沒看到批量發送日誌

**可能原因**:
1. 沒等夠 5 秒
2. 事件數量不足 20 個
3. TrackingProvider 沒正確整合

**排查**:
```bash
# 檢查 main.jsx 是否包含 TrackingProvider
grep -n "TrackingProvider" sdl-frontend-main/src/main.jsx

# 檢查瀏覽器 Console 是否有錯誤
```

---

### 問題 3: sendBeacon 測試失敗 (事件丟失)

**可能原因**:
1. 瀏覽器不支援 sendBeacon (很罕見)
2. 請求被 CORS 政策阻擋
3. 佇列大小超過 64KB

**排查**:
```javascript
// 在 Console 中測試 sendBeacon 支援
console.log('sendBeacon 支援:', 'sendBeacon' in navigator);

// 檢查 Network 面板是否有 /api/audit/batch 請求
```

---

### 問題 4: 資料庫查詢無結果

**可能原因**:
1. 資料庫連線問題
2. 事件寫入失敗 (檢查後端日誌)
3. 時間範圍錯誤

**排查**:
```sql
-- 檢查是否有任何 audit_event 記錄
SELECT COUNT(*) FROM audit_event;

-- 檢查所有來源
SELECT source, COUNT(*) FROM audit_event GROUP BY source;

-- 擴大時間範圍
SELECT * FROM audit_event 
WHERE source = 'client' 
ORDER BY timestamp DESC 
LIMIT 100;  -- 增加限制
```

---

## 📊 預期測試結果摘要

如果所有測試通過，你應該看到:

### Console 日誌
```
[TrackingTest] ✅ 發送單一事件: TEST_SINGLE_EVENT
✅ [TrackingProvider] 批量發送成功: 1 個事件

[TrackingTest] 📦 開始發送 25 個事件...
✅ [TrackingProvider] 批量發送成功: 20 個事件
✅ [TrackingProvider] 批量發送成功: 5 個事件

[TrackingTest] ✅ 發送 5 種不同類型事件
✅ [TrackingProvider] 批量發送成功: 5 個事件
```

### 後端日誌
```json
{"level":"info","count":10,"msg":"Batch audit events created"}
{"level":"info","count":20,"msg":"Batch audit events created"}
{"level":"info","count":5,"msg":"Batch audit events created"}
```

### 資料庫記錄
```
action               | count
---------------------|-------
TEST_BATCH_1         | 1
TEST_BATCH_2         | 1
...
KANBAN_TASK_CLICK    | 5
TEST_SINGLE_EVENT    | 1
```

---

## 🎉 測試完成後

恭喜！如果所有測試通過，Phase 0 實作驗證完成。

**下一步**:
1. 建立 Git commit:
   ```bash
   git add .
   git commit -m "feat: implement Phase 0 tracking infrastructure
   
   - Add TrackingProvider with EventBatcher
   - Add batch audit endpoint /api/audit/batch
   - Add sendBeacon fallback mechanism
   - Add comprehensive tests and documentation
   
   Refs: docs/PHASE0_IMPLEMENTATION_COMPLETE.md"
   ```

2. 可選: 部署到測試環境進行進一步驗證

3. 開始 Phase 1 實作 (身份驗證追蹤)

---

**文件版本**: v1.0  
**最後更新**: 2026-02-10  
**維護者**: SDL 開發團隊
