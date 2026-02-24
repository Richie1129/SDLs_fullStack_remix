# KB Coach 歷史記錄功能 - 快速部署指南

## 🚀 快速開始（5 分鐘）

### Step 1: 執行資料庫遷移

```bash
cd sdl-backend-main
npm run migrate
```

預期輸出：
```
Sequelize CLI [Node: 18.x.x, CLI: 6.x.x, ORM: 6.x.x]

Loaded configuration file "config/config.json".
Using environment "development".
== 20260206000000-create-kb-coach-history: migrating =======
== 20260206000000-create-kb-coach-history: migrated (0.123s)
```

### Step 2: 重啟後端服務

```bash
# 開發模式
npm run dev

# 或生產模式
npm start
```

### Step 3: 測試功能

```bash
# 測試基本功能
node test-kb-coach-fallback.js

# 測試歷史記錄功能
node test-kb-coach-fallback.js --history

# 測試所有 Agent 類型
node test-kb-coach-fallback.js --all
```

---

## ✨ 新功能總覽

### 1. 自動儲存歷史記錄
每次使用 KB Coach 時，系統會自動儲存：
- AI 的完整回應（思考過程 + 內容 + 建議行動）
- 使用的模型（GPT-OSS / Gemma-3 / Gemini）
- 回應時間、上下文數量等效能指標

### 2. 前端歷史記錄面板
在 KB Coach 介面中：
- 點擊右上角「📜 歷史」按鈕
- 查看最近 10 筆 AI 建議
- 點擊任一項目即可重新查看完整內容

### 3. API 端點
```
GET /api/kb-coach/history          # 查詢列表
GET /api/kb-coach/history/:id      # 查詢詳情
```

---

## 📊 資料表結構

### kb_coach_histories

| 欄位 | 類型 | 說明 |
|-----|------|------|
| id | INTEGER | 主鍵 |
| project_id | INTEGER | 專案 ID |
| node_id | INTEGER | 節點 ID |
| user_id | INTEGER | 使用者 ID |
| agent_type | STRING | IMPROVER/SYNTHESIZER/DEVIL |
| model_used | STRING | 實際使用的模型 |
| node_title | TEXT | 節點標題（快取） |
| node_content | TEXT | 節點內容（快取） |
| thinking_process | TEXT | AI 思考過程 |
| response_content | TEXT | AI 回應內容 |
| suggested_actions | JSON | 建議行動列表 |
| context_count | INTEGER | 上下文節點數量 |
| response_time_ms | INTEGER | 回應時間（毫秒） |
| session_id | STRING | 會話 ID |
| created_at | TIMESTAMP | 創建時間 |

---

## 🔍 查詢範例

### 查詢特定節點的歷史
```bash
curl "http://localhost:3000/api/kb-coach/history?nodeId=123&limit=10"
```

### 查詢特定專案的歷史
```bash
curl "http://localhost:3000/api/kb-coach/history?projectId=1&limit=20"
```

### 查詢特定 Agent 類型的歷史
```bash
curl "http://localhost:3000/api/kb-coach/history?agentType=IMPROVER&limit=10"
```

### 查詢單筆詳情
```bash
curl "http://localhost:3000/api/kb-coach/history/1"
```

---

## 🎨 前端使用說明

### 使用者操作流程

1. **開啟 KB Coach**
   - 在 Idea Wall 中點擊任意節點
   - 選擇「AI 協作夥伴」

2. **查看歷史記錄**
   - 點擊右上角「📜 歷史」按鈕
   - 系統會載入該節點的歷史記錄

3. **重現過往建議**
   - 點擊任一歷史項目
   - 立即顯示該次的完整 AI 建議

4. **繼續互動**
   - 可以給予回饋（有幫助 / 需改進）
   - 或選擇其他 Agent 獲得新建議

---

## 📈 監控與分析

### 查看模型使用統計
```sql
SELECT 
  model_used,
  COUNT(*) as usage_count,
  AVG(response_time_ms) as avg_response_time
FROM kb_coach_histories
GROUP BY model_used;
```

### 查看 Agent 使用趨勢
```sql
SELECT 
  DATE(created_at) as date,
  agent_type,
  COUNT(*) as usage_count
FROM kb_coach_histories
GROUP BY DATE(created_at), agent_type
ORDER BY date DESC;
```

### 查看最活躍的節點
```sql
SELECT 
  node_id,
  node_title,
  COUNT(*) as interaction_count
FROM kb_coach_histories
WHERE node_id IS NOT NULL
GROUP BY node_id, node_title
ORDER BY interaction_count DESC
LIMIT 10;
```

---

## ⚠️ 常見問題

### Q: 歷史記錄無法顯示？
**A:** 確認以下步驟：
1. 資料庫遷移已執行：`npm run migrate:status`
2. 後端服務已重啟
3. 瀏覽器開發者工具中查看 API 回應

### Q: 歷史記錄是否會佔用太多空間？
**A:** 每筆記錄約 2-5 KB，可以設定定期清理策略：
```sql
-- 刪除 30 天前的記錄
DELETE FROM kb_coach_histories 
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Q: 可以匯出歷史記錄嗎？
**A:** 目前透過 API 可以取得 JSON 格式，未來版本會新增 Markdown 匯出功能。

---

## 🔧 進階設定

### 調整歷史記錄顯示數量

修改 `KB_Coach.jsx`:
```javascript
const loadHistory = async () => {
    const response = await apiClient.get('/kb-coach/history', {
        params: {
            nodeId: nodeInfo.id,
            limit: 20  // 改為 20 筆
        }
    });
};
```

### 添加歷史記錄過濾

後端 controller 已支援多種篩選條件：
- `projectId` - 專案篩選
- `userId` - 使用者篩選
- `agentType` - Agent 類型篩選
- `limit` - 數量限制

---

**部署完成！🎉**

如有問題，請查看：
- 後端日誌: `docker compose logs -f api`
- 前端日誌: 瀏覽器開發者工具 Console
- 資料庫狀態: `npm run migrate:status`

---

**版本**: v1.0  
**最後更新**: 2026-02-06  
**維護者**: SDL 開發團隊
