# TrackingProvider 使用指南 (Phase 0)

> **實作日期**: 2026-02-10  
> **版本**: Phase 0 - 基礎設施  
> **目的**: 提供統一、高效的前端事件追蹤機制

---

## 📋 摘要

根據 [AUDIT_COVERAGE_REPORT.md](./AUDIT_COVERAGE_REPORT.md) 的建議，已完成 **Phase 0 基礎設施**實作：

✅ **前端**: TrackingProvider + EventBatcher  
✅ **後端**: `/api/audit/batch` 批量接收端點  
✅ **整合**: 已整合到應用根部 ([main.jsx](../sdl-frontend-main/src/main.jsx))

## 🎯 解決的問題

### Phase 0 之前的問題

- ❌ 每個追蹤事件都是獨立 HTTP 請求
- ❌ 無全局追蹤架構，各元件各自呼叫
- ❌ 頁面離開時可能丟失事件
- ❌ 無重試機制
- ❌ 難以統一管理追蹤邏輯

### Phase 0 之後的改善

- ✅ **批量發送**: 20 個事件/批，減少網路請求
- ✅ **定時刷新**: 每 5 秒自動刷新
- ✅ **sendBeacon 保底**: 頁面離開時保證送達
- ✅ **自動重試**: 失敗最多重試 3 次
- ✅ **全局 Context**: 透過 `useTracking()` Hook 統一使用
- ✅ **自動上下文**: 自動注入 userId, url, timestamp

---

## 🚀 使用方式

### 基礎使用 (推薦)

```jsx
import { useTracking } from '@/providers/TrackingProvider';

function MyComponent() {
  const { track } = useTracking();
  
  const handleClick = (taskId) => {
    // 追蹤點擊事件
    track('KANBAN_TASK_CLICK', 'task', taskId, { 
      projectId: 123,
      extra: 'some data' 
    });
  };
  
  return <button onClick={() => handleClick(456)}>點擊任務</button>;
}
```

### track() 參數說明

```javascript
track(action, targetType, targetId, metadata)
```

| 參數 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `action` | string | ✅ | 動作碼 (大寫蛇形) | `'KANBAN_TASK_CLICK'` |
| `targetType` | string | ❌ | 目標類型 | `'task'`, `'node'`, `'user'` |
| `targetId` | string/number/null | ❌ | 目標 ID | `123`, `'abc'`, `null` |
| `metadata` | object | ❌ | 額外資料 | `{ projectId: 123 }` |

### 自動注入的欄位

TrackingProvider 會自動為每個事件注入：

```javascript
{
  url: window.location.pathname,        // 當前頁面路徑
  timestamp: new Date().toISOString(),  // 事件時間戳
  userId: getCurrentUserId(),           // 當前使用者 ID
  _ts: Date.now(),                      // 客戶端時間戳
  _clientId: 'unique-id'                // 用於去重
}
```

---

## 📖 使用範例

### 範例 1: 看板任務點擊

```jsx
// CarditemRefactored.jsx
import { useTracking } from '@/providers/TrackingProvider';

function CarditemRefactored({ task, projectId }) {
  const { track } = useTracking();
  
  const handleTaskClick = () => {
    track('KANBAN_TASK_CLICK', 'task', task.id, { 
      projectId,
      taskTitle: task.title 
    });
    
    // 原有邏輯...
  };
  
  return <div onClick={handleTaskClick}>...</div>;
}
```

### 範例 2: 想法牆節點拖拽

```jsx
// useVisNetwork.js
import { useTracking } from '@/providers/TrackingProvider';

function useVisNetwork() {
  const { track } = useTracking();
  
  const handleNodeDrag = (nodeId, position) => {
    track('IDEAWALL_NODE_DRAG', 'node', nodeId, {
      projectId,
      position: { x: position.x, y: position.y }
    });
  };
  
  // ...
}
```

### 範例 3: 表單提交

```jsx
// LoginForm.jsx
import { useTracking } from '@/providers/TrackingProvider';

function LoginForm() {
  const { track } = useTracking();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 追蹤登入嘗試
    track('LOGIN_SUBMIT', 'user', null, {
      method: 'email',
      timestamp: new Date().toISOString()
    });
    
    // 登入邏輯...
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 範例 4: 立即刷新 (關鍵操作)

```jsx
import { useTracking } from '@/providers/TrackingProvider';

function CriticalOperation() {
  const { track, flush } = useTracking();
  
  const handleCriticalAction = async () => {
    track('PAYMENT_SUBMIT', 'payment', null, { amount: 100 });
    
    // 立即刷新，不等定時器
    await flush();
    
    // 繼續執行...
  };
  
  return <button onClick={handleCriticalAction}>支付</button>;
}
```

---

## ⚙️ 配置參數

在 [TrackingProvider.jsx](../sdl-frontend-main/src/providers/TrackingProvider.jsx) 中可調整：

```javascript
const batcher = new EventBatcher({
  maxBatchSize: 20,        // 批量大小 (預設 20)
  flushIntervalMs: 5000,   // 刷新間隔 (預設 5 秒)
  endpoint: '/api/audit/batch',  // 後端端點
  maxRetries: 3            // 最大重試次數
});
```

### 效能影響預估

| 場景 | Phase 0 之前 | Phase 0 之後 | 改善 |
|------|-------------|-------------|------|
| 50 個事件/分鐘 | 50 HTTP 請求 | 3-10 批量請求 | 80-94% ↓ |
| 200 個事件/分鐘 | 200 HTTP 請求 | 10-24 批量請求 | 88-95% ↓ |
| 頁面離開時 | 可能丟失 | sendBeacon 保證送達 | 100% 送達 |

---

## 🔍 後端實作

### 端點: `POST /api/audit/batch`

**位置**: [sdl-backend-main/routes/auditClient.js](../sdl-backend-main/routes/auditClient.js)

**請求格式**:

```json
{
  "events": [
    {
      "action": "KANBAN_TASK_CLICK",
      "targetType": "task",
      "targetId": "123",
      "projectId": "456",
      "metadata": { "extra": "data" },
      "_ts": 1707561234567,
      "_clientId": "abc123"
    }
  ]
}
```

**回應格式**:

```json
{
  "ok": true,
  "count": 10,       // 成功寫入數量
  "skipped": 0       // 跳過的無效事件
}
```

**驗證規則**:

- ✅ events 必須是陣列
- ✅ 最多 100 個事件/請求
- ✅ 每個事件必須有 `action` 欄位
- ✅ 自動注入 `actorId`, `ip`, `userAgent`
- ✅ 使用 `bulkCreate()` 批量寫入

---

## 🧪 測試驗證

### 手動測試步驟

1. **啟動服務**
   ```bash
   cd sdl-backend-main && npm run dev
   cd sdl-frontend-main && npm run dev
   ```

2. **開啟瀏覽器控制台**
   - F12 → Console

3. **觸發追蹤事件**
   - 隨意點擊應用中的按鈕/連結
   - 觀察控制台輸出:
     ```
     ✅ [TrackingProvider] 批量發送成功: 5 個事件
     ```

4. **查詢資料庫**
   ```sql
   SELECT * FROM audit_event 
   WHERE source = 'client' 
   ORDER BY timestamp DESC 
   LIMIT 20;
   ```

### 測試 sendBeacon (頁面離開)

1. 開啟應用，觸發一些事件
2. **關閉分頁** (不是重新整理)
3. 檢查資料庫，應該看到所有事件都已寫入

---

## 📊 監控與除錯

### 前端日誌

所有追蹤相關日誌都有 `[TrackingProvider]` 前綴：

```javascript
// 成功
✅ [TrackingProvider] 批量發送成功: 10 個事件

// sendBeacon 成功
✅ [TrackingProvider] sendBeacon 成功發送 5 個事件

// 重試
♻️ [TrackingProvider] 將重試 3 個事件

// 失敗
❌ [TrackingProvider] 批量發送失敗: Error: HTTP 500
```

### 後端日誌 (Pino)

```javascript
// 成功
{ "level": "info", "count": 10, "msg": "Batch audit events created" }

// 跳過無效事件
{ "level": "warn", "event": {...}, "msg": "Skipping event without action" }

// 失敗
{ "level": "error", "err": {...}, "msg": "batch audit failed" }
```

### 常見問題

**Q: 為什麼控制台沒有看到發送日誌？**  
A: 批量發送是定時執行的 (預設 5 秒)，或達到 20 個事件時觸發。試著多點擊幾次。

**Q: sendBeacon 失敗怎麼辦？**  
A: sendBeacon 有大小限制 (~64KB)，超過會失敗。可調低 `maxBatchSize` 或增加 `flushIntervalMs`。

**Q: 如何在 TrackingProvider 外使用？**  
A: 會收到警告並返回空函式，不會報錯。但強烈建議只在 TrackingProvider 內使用。

---

## 🔄 與舊 API 的兼容

### 舊寫法仍然可用

```javascript
// ✅ 仍然支援
import { postClientAuditEvent } from '@/api/audit';
await postClientAuditEvent({ 
  action: 'TASK_CREATE', 
  targetType: 'task', 
  targetId: 123 
});
```

### 新寫法 (推薦)

```javascript
// ✅ 推薦使用 (批量、自動重試、sendBeacon)
import { useTracking } from '@/providers/TrackingProvider';
const { track } = useTracking();
track('TASK_CREATE', 'task', 123);
```

### 何時使用舊 API？

- **伺服器端渲染 (SSR)** 場景
- **非 React 元件** (如純 JS 工具函式)
- **需要等待回應** 的場景 (如驗證追蹤是否成功)

---

## 📝 後續 Phase 規劃

根據 [AUDIT_COVERAGE_REPORT.md](./AUDIT_COVERAGE_REPORT.md)：

- **Phase 1**: 🔴 身份驗證 + 密碼重設 (後端 6 個端點加 logAudit)
- **Phase 2**: 🔴 Socket.IO 聊天 + 公告 (Socket handler 加 logAudit)
- **Phase 3**: 🟠 專案權限 + 檔案 + 成員 (後端路由級中間件)
- **Phase 4**: 🟠 前端 data-track 標記 (看板 + 想法牆核心元素)
- **Phase 5**: 🟡 反思 + 提交 + 首頁 (擴展 data-track)
- **Phase 6**: 🟡 隱私合規 (分層同意、資料保留政策)

---

## 🎉 完成狀態

| 項目 | 狀態 |
|------|------|
| TrackingProvider.jsx | ✅ 已實作 |
| EventBatcher 類別 | ✅ 已實作 |
| useTracking Hook | ✅ 已實作 |
| 後端 /api/audit/batch | ✅ 已實作 |
| 整合到 main.jsx | ✅ 已完成 |
| 文件與範例 | ✅ 本文件 |
| 測試驗證 | ⏳ 待執行 |

**實作者**: AI Assistant (Claude)  
**審核者**: 待審核  
**最後更新**: 2026-02-10
