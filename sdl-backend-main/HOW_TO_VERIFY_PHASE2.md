# 如何驗證 Phase 2 Orchestrator 正在運作

## 方法 1: 後端日誌驗證

### 啟動後端並開啟日誌
```bash
cd sdl-backend-main
npm start
```

### 在前端發布新貼文後，你應該會看到：

```
🔔 [Hook] New node created, triggering Orchestrator...
🧠 [Orchestrator] Analyzing ideaWall 123 in project 456...
🧠 [Orchestrator] Decision: TRIGGER - 淺層討論（深度分數: 30）- 需要引導深化
🤖 [Orchestrator] Triggering IMPROVER...
```

或者：

```
🧠 [Orchestrator] Decision: WAIT - 討論品質良好（深度: 75, 多樣性: 80）- 暫不介入
```

或者：

```
🧠 [Orchestrator] Decision: COOLDOWN - 仍在冷卻中（剩餘 15 分鐘）
```

## 方法 2: 檢查資料庫審計日誌

Phase 2 會記錄每次決策到 `audit_events` 表：

```sql
SELECT * FROM audit_events 
WHERE action = 'ORCHESTRATOR_DECISION' 
ORDER BY createdAt DESC 
LIMIT 10;
```

你會看到：
- `metadata.decision`: "TRIGGER" 或 "WAIT" 或 "COOLDOWN"
- `metadata.role`: "IMPROVER" / "SYNTHESIZER" / "DEVIL"
- `metadata.reason`: 決策理由
- `metadata.analysis`: 討論品質分數

## 方法 3: 強制觸發測試

### 建立測試腳本驗證自動分析

```bash
# 在 sdl-backend-main 目錄下
node tests/orchestrator.test.js
```

應該看到所有測試通過：
```
✅ Test 1: 淺層討論應觸發 Idea Improver
✅ Test 2: 同溫層應觸發 Devil's Advocate
✅ Test 3: 資訊過載應觸發 Synthesizer
✅ Test 4: 健康討論應保持靜默
✅ Test 5: 冷卻機制基本功能
```

## 方法 4: 手動觸發 Orchestrator (Debug 用)

在 Node.js REPL 中測試：

```javascript
const { orchestrate } = require('./services/orchestrator');

// 假設 ideaWallId = 1, projectId = 1
orchestrate(1, 1).then(result => {
    console.log('Decision:', result);
});
```

## Phase 2 vs Phase 1 差異表

| 特性 | Phase 1 | Phase 2 |
|------|---------|---------|
| 觸發方式 | 手動點擊按鈕 | 學生發文自動觸發 |
| 前端可見 | ✅ 顯示建議 | ❌ 只有後端日誌 |
| 決策邏輯 | 人工選擇 Agent | 自動分析選擇 |
| 冷卻機制 | ❌ 無 | ✅ 20分鐘或3篇貼文 |
| 討論品質分析 | ❌ 無 | ✅ Depth/Diversity/Convergence |
| 審計日誌 | 手動觸發記錄 | 自動決策記錄 |

## 為什麼前端看不到 Phase 2？

**因為 Phase 2 只完成了「大腦」，還沒有「嘴巴」。**

Phase 2 實作了：
- ✅ 自動監測 (Hook in createNode)
- ✅ 自動分析 (Discussion Analyzer)
- ✅ 自動決策 (Orchestrator)
- ✅ 冷卻機制 (Cooldown Manager)

Phase 3 才會實作：
- ❌ 前端通知 (Socket.io 即時推送)
- ❌ UI 顯示 "AI 正在分析..."
- ❌ 自動發布建議到討論區
- ❌ 學生可以對 AI 建議按讚/倒讚

## 下一步：Phase 3 整合

Phase 3 會讓 AI 建議「自動出現」在討論區，而不是等你點按鈕。

屆時的體驗：
1. 學生 A 發了一篇淺層討論
2. 系統自動分析（背景）
3. 前端跳出通知：「AI 助教正在思考...」
4. 3 秒後，AI 的引導問題自動出現在討論串中
5. 學生可以點讚/回應 AI 的建議
