# Phase 3 驗證指南：即時通知與 Feedback Loop

## 📋 Phase 3 功能概覽

Phase 3 實作了「即時 Socket 通知 + Feedback 回饋機制」，完成了 AI-Scaffold Orchestrator 的完整閉環：

```
學生發文 → Node Hook → Orchestrator 分析 → Socket 即時通知 → Toast 提醒 → KB Coach Modal
                                                                    ↓
                                               學生使用 AI 建議 → 點擊 👍/👎 → Feedback 儲存
```

---

## 🧪 測試步驟

### 測試 1：Socket 通知流程

**前置條件：**
- 後端 `docker compose up -d` 啟動中
- 前端 `npm run dev` 啟動中
- 至少有一個專案和 IdeaWall

**步驟：**

1. 打開瀏覽器 DevTools → Network → WS（WebSocket）標籤
2. 進入一個專案的 IdeaWall 頁面
3. 觀察 Console，應看到：`📡 Socket connected...`
4. 新增一個想法貼文（內容可以是任何主題）
5. 當 Orchestrator 決定介入時，應看到：
   - Console: `🔔 AI Coach Suggestion received`
   - Toast 通知：「🤖 AI 助教有建議...」

**預期結果：**
- Socket 連線成功
- Orchestrator 決策時發送 `aiCoachSuggestion` 事件
- 前端顯示 Toast 通知

### 測試 2：KB Coach 建議的 Agent 自動觸發

**步驟：**

1. 當收到 Toast 通知時，點擊「查看建議」按鈕
2. KB Coach Modal 應該開啟
3. 觀察被建議的 Agent 按鈕是否自動高亮
4. AI 應該自動開始分析（顯示 Loading 狀態）

**預期結果：**
- Modal 開啟並帶入 `suggestedAgent` prop
- 對應的 Agent 按鈕自動觸發
- AI 開始處理並回傳建議

### 測試 3：Feedback 機制

**步驟：**

1. 等待 KB Coach 回傳建議內容
2. 在建議內容下方應該看到：
   ```
   這個建議對你有幫助嗎？  [👍 有幫助]  [👎 需改進]
   ```
3. 點擊其中一個按鈕
4. 觀察 Console，應看到 Socket emit `aiCoachFeedback` 事件
5. 按鈕區域應變成「✓ 感謝回饋！」

**預期結果：**
- Feedback 按鈕顯示正常
- 點擊後發送 Socket 事件
- UI 更新為「已回饋」狀態

### 測試 4：Feedback 資料庫儲存

**步驟：**

1. 在送出 Feedback 後，檢查後端 Console
2. 應看到：`👍 AI Feedback recorded: helpful for IMPROVER in project X`
3. 檢查資料庫 `ai_feedback` 表

```sql
SELECT * FROM ai_feedback ORDER BY created_at DESC LIMIT 5;
```

**預期結果：**
- 資料庫中有對應的 Feedback 記錄
- 欄位包含：projectId, ideaWallId, nodeId, agentType, feedbackType

### 測試 5：API 統計端點

**步驟：**

1. 使用 Postman 或 cURL 測試 API：

```bash
# 取得所有回饋統計
curl http://localhost:3001/api/kb-coach/feedback/stats

# 取得特定專案的回饋統計
curl http://localhost:3001/api/kb-coach/feedback/stats?projectId=1
```

**預期結果：**
```json
{
  "IMPROVER": { "helpful": 3, "not_helpful": 1 },
  "SYNTHESIZER": { "helpful": 2, "not_helpful": 0 },
  "DEVIL": { "helpful": 1, "not_helpful": 2 },
  "total": { "helpful": 6, "not_helpful": 3 }
}
```

---

## 🔧 Debug 指南

### Socket 連線問題

如果 Toast 通知沒有出現：

1. 檢查 Console 是否有 Socket 連線錯誤
2. 確認後端的 Socket.io 設定正確
3. 檢查是否有加入正確的 Room：
   ```javascript
   // 前端應該在進入 IdeaWall 時執行：
   socket.emit('join_project', projectId);
   ```

### Orchestrator 未發送通知

1. 確認 `server.js` 有注入 Socket.io：
   ```javascript
   const { setSocketIO } = require('./services/orchestrator');
   setSocketIO(io);
   ```

2. 檢查 Orchestrator 是否在冷卻期：
   ```bash
   curl http://localhost:3001/api/kb-coach/orchestrator/status/{ideaWallId}
   ```

3. 手動觸發 Orchestrator 測試：
   ```bash
   curl -X POST http://localhost:3001/api/kb-coach/orchestrator/analyze \
     -H "Content-Type: application/json" \
     -d '{"ideaWallId": 1, "projectId": 1}'
   ```

### Feedback 未儲存

1. 檢查 `ai_feedback` Model 是否正確同步：
   ```javascript
   // 在 index.js 或啟動腳本中確認
   AiFeedback.sync({ alter: true });
   ```

2. 檢查 Socket 事件名稱是否一致：
   - 前端發送：`aiCoachFeedback`
   - 後端監聽：`aiCoachFeedback`

---

## 📊 Phase 3 新增檔案

### 後端
| 檔案 | 用途 |
|------|------|
| `sockets/handlers/aiCoachHandler.js` | Socket 事件處理 |
| `models/ai_feedback.js` | Feedback 資料模型 |

### 後端修改
| 檔案 | 修改內容 |
|------|----------|
| `sockets/socketManager.js` | 註冊 AI Coach Handler |
| `services/orchestrator.js` | 新增 `setSocketIO()`, `notifyFrontend()` |
| `server.js` | 注入 Socket.io 到 Orchestrator |
| `controllers/kbCoach.js` | 新增 `saveFeedback()`, `getFeedbackStats()` |
| `routes/kbCoach.js` | 新增 `/feedback` 路由 |

### 前端修改
| 檔案 | 修改內容 |
|------|----------|
| `pages/ideaWall/IdeaWall.jsx` | Socket 監聽 + Toast 通知 |
| `pages/ideaWall/components/KB_Coach.jsx` | 接收建議 Agent + Feedback UI |

---

## ✅ 驗收標準

- [ ] Socket 連線正常，能接收 `aiCoachSuggestion` 事件
- [ ] Toast 通知正確顯示，含「查看建議」按鈕
- [ ] KB Coach Modal 能接收 `suggestedAgent` 並自動觸發
- [ ] Feedback 按鈕（👍/👎）顯示正常
- [ ] Feedback 能正確儲存到資料庫
- [ ] Feedback 統計 API 回傳正確數據
- [ ] 無 Console 錯誤

---

## 🚀 下一步

Phase 3 完成後，AI-Scaffold Orchestrator 已具備完整的即時監控與回饋循環。下一階段可以考慮：

1. **Phase 4: 智能學習**
   - 利用 Feedback 數據訓練更好的介入時機判斷
   - A/B Testing 不同的 Agent 策略

2. **Phase 5: 教師儀表板**
   - 可視化 Orchestrator 決策歷史
   - 回饋統計趨勢圖
   - 手動調整介入參數
