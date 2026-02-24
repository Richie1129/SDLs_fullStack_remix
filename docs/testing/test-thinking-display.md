# Thinking Display 修復 - 測試指南

## 修改內容摘要

### 1. 強化 Prompt（`sdl-backend-main/config/promptBuilder.js`）

**修改前**：
```javascript
const THINKING_INSTRUCTION = `
## 回答格式要求：
每次回答必須包含兩部分：
1. **思考過程**（使用 XML 標籤）：...
2. **正式答案**：...
```

**修改後**：
```javascript
const THINKING_INSTRUCTION = `
## ⚠️ 強制要求：回答格式（不可省略）
你的每次回答**必須**嚴格遵循以下格式，缺少任何部分將被視為錯誤：

### 第一部分：思考過程（必填）
<thinking>
- 問題分析：[使用者的核心問題是什麼？]
- 資料來源：[我使用了哪些專案資料？具體列出]
- 推理過程：[我如何從資料得出結論？邏輯鏈是什麼？]
- 結論方向：[答案的核心要點是什麼？]
</thinking>

### ⚠️ 嚴格規則：
1. **必須**包含完整的 <thinking>...</thinking> 標籤
2. **必須**在標籤內包含所有 4 個項目
3. **禁止**省略標籤，即使問題很簡單

### 正確範例：...
### 錯誤範例（禁止）：...
```

**改進點**：
- ✅ 更明確的強制性語氣（"必須"、"禁止"）
- ✅ 添加警告符號（⚠️）增加視覺強調
- ✅ 提供正確和錯誤範例對比
- ✅ 詳細說明 4 個必填項目
- ✅ 明確禁止省略標籤

---

### 2. 改進 XML 解析（`sdl-backend-main/services/streamingService.js`）

**修改前**：
```javascript
// 嚴格匹配 <thinking> 和 </thinking>
if (buffer.includes('<thinking>') && !inThinking) {
  const parts = buffer.split('<thinking>');
  // ...
}
```

**修改後**：
```javascript
// 支援更寬鬆的格式：<thinking>, <Thinking>, < thinking >, etc.
const thinkingStartRegex = /<thinking\s*>/i;
const thinkingEndRegex = /<\/thinking\s*>/i;

if (thinkingStartRegex.test(buffer) && !inThinking) {
  const match = buffer.match(thinkingStartRegex);
  const splitIndex = match.index + match[0].length;
  // 使用正則匹配，更精確地分割
  // ...
}
```

**改進點**：
- ✅ 支援大小寫不敏感（`<Thinking>`, `<THINKING>` 都可以）
- ✅ 允許標籤內有空格（`< thinking >`, `<thinking >`）
- ✅ 更精確的分割邏輯（使用 `match.index` 而非 `split`）
- ✅ 添加詳細日誌（`🔍 偵測到標籤`, `💭 思考內容預覽`）

**同時修改了**：
- OpenAI streaming 解析（第 83-145 行）
- Gemini streaming 解析（第 290-355 行）

---

### 3. 添加前端 Debug 日誌（`sdl-frontend-main/src/hooks/useAssistantChat.js`）

**新增日誌**：

```javascript
// 1. 收到 thinking 時的詳細日誌
if (data.type === 'thinking' && data.content) {
  console.log(`💭 [前端] 收到思考過程 - ${aiThinking.length} 個字元`);
  console.log(`💭 [前端] 思考內容預覽:`, aiThinking.substring(0, 100) + '...');
  
  // 更新後確認
  console.log(`✅ [前端] thinking 已更新到 message:`, {
    hasThinking: !!newMessages[lastIndex].thinking,
    thinkingLength: newMessages[lastIndex].thinking?.length || 0
  });
}

// 2. 串流結束時的最終檢查
else if (data.type === 'done') {
  console.log(`🔍 [前端] 最終檢查 - thinking 狀態:`, {
    hasThinking: !!lastMessage.thinking,
    thinkingLength: lastMessage.thinking?.length || 0,
    thinkingPreview: lastMessage.thinking?.substring(0, 50) || '(無)'
  });
  
  // 如果 thinking 遺失，強制更新
  if (!lastMessage.thinking && aiThinking) {
    console.warn(`⚠️ [前端] 偵測到 thinking 遺失，強制更新`);
    // 強制更新邏輯...
  }
}
```

**改進點**：
- ✅ 每個關鍵點都有 console.log
- ✅ 提供預覽內容（前 50-100 字元）
- ✅ 最終檢查機制（防止 state 更新失敗）
- ✅ 異常情況自動修復（強制更新）

---

## 測試步驟

### 階段 1：後端測試

#### 1.1 重啟後端服務

```bash
cd /home/richie1129/SDLs_fullStack_remix/sdl-backend-main
npm start
```

#### 1.2 檢查日誌輸出

發送一條測試訊息後，檢查後端 console：

**預期看到**：
```
🤖 [Gemini] 開始串流回應 - 使用模型: gemini-2.5-flash
📝 [Gemini] Prompt 長度: XXXX 字元
✅ [Gemini] generateContentStream 回應成功
🔍 [Gemini] 偵測到 <thinking> 標籤，開始收集思考內容
💭 [Gemini] 思考過程長度: XXX 字元
💭 [Gemini] 思考內容預覽: - 問題分析：...
```

**如果看到**：
```
⚠️ [Gemini] 未偵測到 <thinking> 標籤，嘗試 fallback parsing...
```
→ AI 沒有生成 thinking 標籤，需要進一步診斷

---

### 階段 2：前端測試

#### 2.1 重啟前端服務

```bash
cd /home/richie1129/SDLs_fullStack_remix/sdl-frontend-main
npm run dev
```

#### 2.2 打開瀏覽器 Console

1. 打開開發者工具（F12）
2. 切換到 Console 面板
3. 發送一條測試訊息：「我的專案進度如何？」

#### 2.3 檢查 Console 輸出

**預期看到**：
```
💭 [前端] 收到思考過程 - 234 個字元
💭 [前端] 思考內容預覽: - 問題分析：使用者詢問專案進度...
✅ [前端] thinking 已更新到 message: { hasThinking: true, thinkingLength: 234 }
✅ [前端] 串流完成 - 收到 15 個 chunks
📊 [前端] 思考: 234 字元, 答案: 567 字元
🔍 [前端] 最終檢查 - thinking 狀態: { hasThinking: true, thinkingLength: 234, thinkingPreview: '...' }
```

**如果看到**：
```
⚠️ [前端] 偵測到 thinking 遺失，強制更新
```
→ State 更新有問題，但會自動修復

---

#### 2.4 檢查 UI 顯示

**預期結果**：
- ✅ AI 回覆上方出現黃色虛線框的「💭 AI 思考過程」區塊
- ✅ 點擊可展開/收合
- ✅ 內容包含「問題分析」、「資料來源」、「推理過程」、「結論方向」

**如果沒有顯示**：
1. 檢查 Console 是否有 `hasThinking: true`
2. 檢查 React DevTools 中 message 物件是否有 `thinking` 欄位
3. 檢查 Elements 面板是否有渲染 ThinkingBlock 元件

---

### 階段 3：Network 面板檢查

#### 3.1 檢查 SSE 事件

1. 打開 Network 面板
2. 發送訊息
3. 找到 `/api/assistant/chat` 請求
4. 點擊進入，切換到「EventStream」或「Response」標籤頁

**預期看到**：
```
data: {"type":"thinking","content":"- 問題分析：...\n- 資料來源：...\n- 推理過程：...\n- 結論方向：..."}

data: {"type":"content","content":"張三，您的專案..."}

data: {"type":"content","content":"目前進度..."}

data: {"type":"done"}
```

**關鍵檢查**：
- ✅ 有 `type: 'thinking'` 事件
- ✅ `content` 內容完整（包含 4 個項目）
- ✅ 在正式答案之前發送

---

## 測試案例

### 測試案例 1：基本功能測試

**測試訊息**：「我的專案進度如何？」

**預期結果**：
1. 後端日誌顯示偵測到 `<thinking>` 標籤
2. 前端 Console 顯示收到 thinking（200+ 字元）
3. UI 上方顯示黃色「AI 思考過程」區塊
4. 展開後可看到完整的 4 個項目

---

### 測試案例 2：多輪對話測試

**步驟**：
1. 發送：「我的專案進度如何？」
2. 發送：「我的看板任務有哪些？」
3. 發送：「階段 1 的完成度是多少？」

**預期結果**：
- 每條 AI 回覆都有獨立的思考過程
- 思考內容針對不同問題有所不同
- 不會出現思考內容混淆或遺失

---

### 測試案例 3：Fallback 機制測試

**如何觸發**：
暫時修改 Prompt，移除 `<thinking>` 標籤要求，看 fallback 是否生效

**後端日誌預期**：
```
⚠️ [Gemini] 未偵測到 <thinking> 標籤，嘗試 fallback parsing...
🔧 [Fallback Parser] 使用 Pattern 1 偵測到 thinking
✅ Fallback 成功解析到思考內容
```

---

### 測試案例 4：錯誤格式容錯測試

**可能的變異格式**：
- `<Thinking>` （大寫）
- `< thinking >` （有空格）
- `<thinking >` （結束有空格）

**預期結果**：
- ✅ 都能正確解析
- ✅ 後端日誌顯示「偵測到 <thinking> 標籤」
- ✅ 前端正常顯示

---

## 問題診斷

### 問題 1：後端沒有偵測到 `<thinking>` 標籤

**症狀**：
```
⚠️ [Gemini/OpenAI] 未偵測到 <thinking> 標籤
⚠️ [Gemini/OpenAI] THINKING 解析完全失敗
```

**可能原因**：
1. AI 模型不遵循 Prompt 指示
2. Prompt 被其他指示覆蓋
3. Model 版本不支援

**解決方法**：
1. 檢查 `promptBuilder.js` 是否正確修改
2. 嘗試切換 model（例如從 gemini-2.5-flash 到 gpt-4o-mini）
3. 檢查 `systemInstruction` 是否與 `THINKING_INSTRUCTION` 衝突
4. 考慮啟用 Structured Output（強制 JSON 格式）

---

### 問題 2：前端沒有收到 thinking 事件

**症狀**：
後端日誌顯示「思考過程長度: XXX 字元」，但前端 Console 沒有「收到思考過程」

**可能原因**：
1. SSE 連線中斷
2. 前端 JSON 解析失敗
3. CORS 問題

**解決方法**：
1. 檢查 Network 面板的 SSE 事件
2. 檢查 Console 是否有 Parse Error
3. 確認後端 `res.write()` 格式正確
4. 檢查 CORS 設定

---

### 問題 3：前端收到但沒有顯示

**症狀**：
Console 顯示「hasThinking: true」，但 UI 沒有黃色區塊

**可能原因**：
1. ThinkingBlock 組件未正確渲染
2. CSS 樣式問題（display: none 等）
3. React 條件渲染邏輯錯誤

**解決方法**：
1. 檢查 Elements 面板，搜尋 `thinking-block`
2. 檢查 React DevTools 中的組件樹
3. 檢查 `ChatContent.jsx` 的條件渲染：
   ```javascript
   {!isUser && message.thinking && (
     <ThinkingBlock content={message.thinking} />
   )}
   ```
4. 暫時移除條件，強制顯示測試組件

---

### 問題 4：thinking 內容為空字串

**症狀**：
```
🔍 [前端] 最終檢查: { hasThinking: true, thinkingLength: 0 }
```

**可能原因**：
1. AI 生成空的 `<thinking></thinking>` 標籤
2. 解析時 trim() 移除了所有內容
3. 標籤內只有空白字元

**解決方法**：
1. 檢查後端日誌的「思考內容預覽」
2. 修改 Prompt 要求「禁止空內容」
3. 在 ThinkingBlock 中添加檢查：
   ```javascript
   if (!content || content.trim() === '') {
     return null;
   }
   ```

---

## 監控指標

### 建議追蹤的指標

1. **Thinking 顯示率**：
   ```javascript
   const thinkingRate = (有 thinking 的訊息數 / 總 AI 訊息數) * 100;
   ```
   - 目標：> 95%

2. **Fallback 使用率**：
   ```javascript
   const fallbackRate = (使用 fallback 的次數 / 總請求數) * 100;
   ```
   - 目標：< 5%

3. **平均 Thinking 長度**：
   - 目標：150-300 字元

4. **解析失敗率**：
   - 目標：< 1%

---

## 回滾計劃

如果修改後出現問題，可以快速回滾：

```bash
# 回滾 promptBuilder.js
cd /home/richie1129/SDLs_fullStack_remix/sdl-backend-main/config
git checkout promptBuilder.js

# 回滾 streamingService.js
cd /home/richie1129/SDLs_fullStack_remix/sdl-backend-main/services
git checkout streamingService.js

# 回滾 useAssistantChat.js
cd /home/richie1129/SDLs_fullStack_remix/sdl-frontend-main/src/hooks
git checkout useAssistantChat.js

# 重啟服務
npm start
```

---

## 下一步優化（可選）

### 1. 啟用 Structured Output

**優勢**：
- 100% 保證回傳 thinking
- 消除 XML 解析需求
- 更穩定的輸出

**修改**：
```javascript
// assistant.js
const useStructuredOutput = provider === 'gemini'; // 改為 true
```

### 2. 添加監控儀表板

- 追蹤 thinking 顯示率
- 追蹤 fallback 使用情況
- 自動告警解析失敗案例

### 3. 優化 Prompt

- A/B 測試不同的 Prompt 版本
- 分析哪種措辭能最有效提高 AI 遵從率

---

## 總結

**修改檔案**：
1. `sdl-backend-main/config/promptBuilder.js` - 強化 Prompt
2. `sdl-backend-main/services/streamingService.js` - 改進 XML 解析
3. `sdl-frontend-main/src/hooks/useAssistantChat.js` - 添加 Debug 日誌

**預期效果**：
- Thinking 顯示率從 ~50% 提升到 ~90%+
- 支援更多變的標籤格式
- 更詳細的 Debug 資訊

**測試重點**：
1. 檢查後端日誌（是否偵測到標籤）
2. 檢查前端 Console（是否收到 thinking）
3. 檢查 UI 顯示（黃色區塊是否出現）
4. 檢查 Network 面板（SSE 事件是否正確）

**如有問題**：
參考「問題診斷」章節逐步排查
