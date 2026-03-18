# 專案助理完整指南

## 📋 目錄

1. [快速開始](#快速開始)
2. [功能概述](#功能概述)
3. [使用方式](#使用方式)
4. [技術細節](#技術細節)
5. [除錯指南](#除錯指南)
6. [常見問題](#常見問題)

---

## 快速開始

### 最快 5 分鐘上手

#### 方式 1：在看板頁面使用（推薦）

1. **進入看板頁面**
   - 前往任何專案的看板（Kanban）頁面

2. **打開聊天視窗**
   - 點擊聊天按鈕（通常在右下角或側邊）

3. **切換到專案助理**
   - 在聊天視窗上方點擊「🤖 專案助理」分頁

4. **開始對話**
   - 點擊範例問題，或直接輸入你的問題

**就這樣！** AI 會即時回答，一個字一個字顯示。

#### 方式 2：使用示範頁面

1. 打開瀏覽器前往：`http://localhost/assistant-demo?projectId=1`
2. 開始提問

### 環境準備（僅需一次）

1. **確認有 Gemini API Key**

打開 `sdl-backend-main/.env`，確認有：
```bash
GEMINI_API_KEY=你的API金鑰
```

如果沒有：
- 前往：https://makersuite.google.com/app/apikey
- 點「Create API Key」
- 複製金鑰並貼到 `.env`

2. **重啟後端**（如果有改 .env）
```bash
docker compose restart api
```

---

## 功能概述

### ✨ 主要特色

#### 1. **Streaming 即時回應**
- AI 逐字顯示，不用等待
- 類似 ChatGPT 的體驗
- 體驗更流暢

#### 2. **完整專案分析**
AI 會自動分析：
- ✅ 看板任務（標題、內容、負責人）
- ✅ 想法牆節點（想法內容、作者）
- ✅ 提交記錄（階段、提交內容）
- ✅ 對話歷史（最近討論）
- ✅ 專案階段資訊

#### 3. **個人化稱呼**
- AI 會稱呼你的名字（例如：「蔡狄澄，...」）
- 讓對話更有溫度

#### 4. **雙 AI 支援**
- 🟢 **Gemini**（預設）- 快速、免費額度高
- 🔵 **OpenAI GPT-4o-mini**（備選）- 品質穩定

#### 5. **快速問題按鈕**
- 點擊範例問題立即發送
- 無需手動輸入

### 📊 新舊版本比較

| 項目 | 舊版 | 新版 Streaming |
|------|------|---------------|
| 回應方式 | 一次性回傳 | 逐字串流 |
| 等待時間 | 5-10 秒 | 0.5 秒開始顯示 |
| 使用者體驗 | 需等待 | 即時反饋 |
| 個人化稱呼 | ❌ | ✅ |
| 快速問題 | ❌ | ✅ 可點擊 |
| 向後相容 | ✅ | ✅ 0 破壞 |

---

## 使用方式

### 🎯 可以問的問題範例

1. **專案進度**
   - 「我的專案進度如何？」
   - 「專案目前在哪個階段？」

2. **看板任務**
   - 「看板上有哪些任務？」
   - 「哪些任務還沒完成？」
   - 「誰負責了哪些任務？」

3. **想法牆**
   - 「想法牆裡有什麼想法？」
   - 「最近新增了哪些想法？」

4. **提交記錄**
   - 「最近有什麼提交記錄？」
   - 「這個階段提交了什麼？」

5. **尋求建議**
   - 「我下一步應該做什麼？」
   - 「給我一些建議」

### 💻 程式碼使用

#### 方式 1：使用現成組件（最簡單）

```jsx
import AssistantChatStreaming from '../components/AssistantChatStreaming';

function MyPage() {
  return (
    <AssistantChatStreaming
      projectId={123}
      provider="gemini"  // 可選，預設 "gemini"
      embedded={false}   // 可選，是否嵌入模式
    />
  );
}
```

#### 方式 2：使用 Hook（完全自訂 UI）

```jsx
import { useAssistantChat } from '../hooks/useAssistantChat';

function MyChat() {
  const { messages, sendMessage, isLoading } = useAssistantChat();

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      <button
        onClick={() => sendMessage(123, '你好', 'gemini')}
        disabled={isLoading}
      >
        {isLoading ? '送出中...' : '送出'}
      </button>
    </div>
  );
}
```

#### Hook 提供的功能

- `messages` - 所有對話訊息陣列
- `isLoading` - 是否正在載入中
- `error` - 錯誤訊息（如果有）
- `sendMessage(projectId, message, provider)` - 發送訊息
- `clearMessages()` - 清空對話
- `retryLastMessage(projectId, provider)` - 重試上一則

### 🎨 客製化選項

#### 改變 AI 提供者

```jsx
<AssistantChatStreaming
  projectId={123}
  provider="openai"  // 改用 OpenAI GPT
/>
```

#### 嵌入模式（無標題列）

```jsx
<AssistantChatStreaming
  projectId={123}
  embedded={true}  // 嵌入模式，適合整合到現有介面
/>
```

#### 自訂樣式

```jsx
<AssistantChatStreaming
  projectId={123}
  className="w-full h-[500px]"  // 加入自訂 Tailwind class
/>
```

---

## 技術細節

### 🏗️ 架構設計

```
使用者問問題
    ↓
前端 (React)
    ↓ POST /api/assistant/chat
後端 Controller
    ↓ 聚合專案資料
    ├─ 看板任務
    ├─ 想法牆
    ├─ 提交記錄
    └─ 對話歷史
    ↓
Streaming Service
    ↓ Server-Sent Events (SSE)
AI API (Gemini/OpenAI)
    ↓ 逐字回傳
前端即時顯示
```

### 📂 檔案結構

```
SDLs_fullStack_remix/
├── sdl-backend-main/
│   ├── services/
│   │   └── streamingService.js       ✨ Streaming 服務
│   ├── controllers/
│   │   └── assistant.js              ✏️ chatWithStreaming 函數
│   └── routes/
│       └── assistant.js              ✏️ /chat 路由
│
└── sdl-frontend-main/
    ├── src/
    │   ├── hooks/
    │   │   └── useAssistantChat.js   ✨ React Hook
    │   ├── components/
    │   │   └── AssistantChatStreaming.jsx  ✨ UI 組件
    │   └── pages/
    │       ├── Kanban/components/
    │       │   └── DraggableImage/components/
    │       │       ├── ChatWindow.jsx     ✏️ 新增專案助理分頁
    │       │       └── ChatContent.jsx    ✏️ 整合組件
    │       └── AssistantDemo.jsx      ✨ 示範頁面
```

### 🔌 API 規格

#### 新的 Streaming Endpoint

```
POST /api/assistant/chat
```

**請求格式：**
```json
{
  "projectId": 123,
  "message": "我的專案進度如何？",
  "provider": "gemini"  // 可選，預設 "gemini"
}
```

**回應格式（Server-Sent Events）：**
```
data: {"type":"content","content":"蔡"}
data: {"type":"content","content":"狄"}
data: {"type":"content","content":"澄"}
data: {"type":"content","content":"，"}
...
data: {"type":"done","message":"Stream completed"}
```

**錯誤回應：**
```
data: {"type":"error","error":"錯誤訊息"}
```

### 🔧 Streaming 實作原理

#### 後端（SSE）
```javascript
// 設定 SSE headers
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // 關閉 nginx buffering

// 逐塊發送
for await (const chunk of stream) {
  res.write(`data: ${JSON.stringify({
    type: 'content',
    content: chunk.text()
  })}\n\n`);
}

res.end();
```

#### 前端（Fetch + ReadableStream）
```javascript
const response = await fetch('/api/assistant/chat', { ... });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  // 解析並即時更新 UI
}
```

### 🎯 向後相容性

**100% 向後相容，不破壞現有功能！**

- 舊 API: `POST /api/assistant/guidance` ✅ 保留
- 新 API: `POST /api/assistant/chat` ✅ 新增

兩者可以並存使用。

---

## 除錯指南

### 🔍 修復的問題

#### 1. 滾動問題
**症狀：** Streaming 時畫面一直抖動

**原因：** 每次訊息內容更新都觸發滾動

**解決：**
```javascript
// 只監聽訊息數量變化，不監聽內容變化
useEffect(() => {
  const timer = setTimeout(() => scrollToBottom(true), 50);
  return () => clearTimeout(timer);
}, [messages.length, isLoading]); // ✅ 只監聽數量
```

#### 2. AI 訊息更新錯誤
**症狀：** 訊息顯示位置錯誤

**原因：** 固定索引在非同步更新時不準確

**解決：**
```javascript
// 總是更新最後一條 assistant 訊息
setMessages(prev => {
  const newMessages = [...prev];
  const lastIndex = newMessages.length - 1;
  if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
    newMessages[lastIndex] = {
      ...newMessages[lastIndex],
      content: aiResponse
    };
  }
  return newMessages;
});
```

#### 3. Gemini API 404 錯誤
**症狀：** `models/gemini-1.5-flash is not found`

**原因：** 舊版模型名稱

**解決：** 已更新為 `gemini-3.1-flash-lite-preview`

### 📊 除錯日誌

#### 前端 Console 日誌

發送訊息時應該看到：
```
🚀 [前端] 發送請求到: /api/assistant/chat
📦 [前端] 請求參數: {projectId: 69, message: "...", provider: "gemini"}
✅ [前端] 開始接收 SSE 串流...
✅ [前端] 串流完成 - 收到 X 個 chunks，總共 XXX 個字元
```

#### 後端 Docker 日誌

```bash
docker logs sdls_fullstack_remix-api-1 -f
```

應該看到：
```
🤖 [Assistant Chat] 收到請求: {...}
📂 [Assistant Chat] 開始取得專案資料...
✅ [Assistant Chat] 專案資料取得成功: xxx
📊 [Assistant Chat] 開始撈取專案詳細資料...
✅ [Assistant Chat] 所有資料撈取完成
👤 [Assistant Chat] 使用者名字: xxx
🚀 [Assistant Chat] 使用 Gemini 開始串流...
🤖 [Gemini] 開始串流回應 - 使用模型: gemini-3.1-flash-lite-preview
✅ [Gemini] generateContentStream 回應成功
✅ [Gemini] 串流完成 - 總共 xx 個 chunks, xxx 個字元
```

### ✅ 驗證 Streaming 效果

- ✅ 文字應該逐字顯示（而不是一次全部出現）
- ✅ 對話框應該保持在底部（不會往上跳）
- ✅ AI 回應開頭應該有使用者名字

### 🔧 目前配置

**後端模型：**
- Gemini: `gemini-3.1-flash-lite-preview` (預設)
- OpenAI: `gpt-4o-mini` (備選)

**前端設定：**
- Provider: `gemini`
- API Base URL: `/api` (透過 nginx 代理)

---

## 常見問題

### Q: 專案助理和科學助手有什麼不同？

**A:**
- **科學助手**：專注於科學問題解答
- **專案助理**：分析**你的專案資料**，提供專案相關建議

### Q: 為什麼選擇 Gemini 而不是 OpenAI？

**A:**
- Gemini 速度快、免費額度高
- 適合高頻使用
- 如需要可以改成 `provider="openai"`

### Q: 資料會被上傳到哪裡？

**A:**
- 專案資料會傳送到 Gemini API 進行分析
- 只傳送必要資料（任務標題、內容摘要等）
- 不會永久儲存在第三方

### Q: 可以同時使用科學助手和專案助理嗎？

**A:**
- 可以！隨時切換分頁即可
- 兩者獨立運作，互不影響

### Q: 為什麼 AI 不回答？

**A:** 檢查這些：
1. 後端有沒有啟動？ `docker ps`
2. `.env` 有 `GEMINI_API_KEY` 嗎？
3. 瀏覽器 Console 有沒有錯誤訊息？
4. 網路有沒有通？

### Q: 如何切換到 OpenAI（GPT）？

**A:**
1. 在組件加 `provider="openai"`
2. 確認 `.env` 有 `OPENAI_API_KEY`

### Q: 可以改變 AI 回答的語氣嗎？

**A:** 可以！

修改 `sdl-backend-main/controllers/assistant.js` 的 prompt：

```javascript
// 找到這段（約第 708 行）
const prompt = `你是一個專案助理 AI，專門協助使用者了解和管理他們的學習專案。

## 使用者資訊：
- 使用者名字：${userName}

## 回答準則：
1. **務必在回答開頭稱呼使用者的名字**
2. 根據實際專案資料回答
3. 使用繁體中文
4. 語氣要友善、專業，像個好夥伴
...
`;
```

改成你想要的語氣，例如：
```javascript
const prompt = `你是一個超級熱情的專案助理 AI！用最有活力的方式協助 ${userName}！
`;
```

### Q: Connection Refused 錯誤怎麼辦？

**A:**
- **原因**：前端直接訪問 `localhost:3000`
- **解決**：使用 `/api` 路徑（由 nginx 代理）
- **檢查**：`nginx.conf` 中的 `/api/` 路徑配置

### Q: 沒有 Streaming 效果怎麼辦？

**A:** 檢查：
1. 瀏覽器 Console 是否有錯誤
2. 後端日誌是否顯示串流開始和完成
3. 是否正確解析 SSE 格式
4. nginx 是否開啟 buffering（應該關閉）

### Q: 舊的 AssistantChat 組件還能用嗎？

**A:** 可以！舊的完全不受影響。
- 舊的：`AssistantChat.jsx`（保留）
- 新的：`AssistantChatStreaming.jsx`（新功能）

---

## 🚀 下一步擴展

### 可能的改進方向

- [ ] 支援語音輸入
- [ ] 支援檔案上傳分析
- [ ] 新增對話歷史記錄
- [ ] 支援多輪深度對話
- [ ] 對話歷史搜尋
- [ ] 對話匯出功能

---

## 📝 總結

### 現在你擁有了

- ✅ **即時 Streaming 回應** - 不用等待
- ✅ **完整專案分析** - 看板、想法牆、提交記錄
- ✅ **個人化體驗** - AI 會稱呼你的名字
- ✅ **快速提問** - 點擊範例問題立即發送
- ✅ **無縫整合** - 與現有功能並存
- ✅ **雙 AI 支援** - Gemini + OpenAI
- ✅ **完整除錯** - 詳細日誌幫助排查問題

### 開始使用

**最快方式：**
1. 進入看板頁面
2. 打開聊天視窗
3. 切換到「🤖 專案助理」分頁
4. 開始提問！

**程式碼整合：**
```jsx
import AssistantChatStreaming from '../components/AssistantChatStreaming';

<AssistantChatStreaming projectId={123} />
```

---

## 📞 需要協助？

### 檢查清單

- [ ] 後端有啟動嗎？`docker ps`
- [ ] 前端有啟動嗎？
- [ ] `.env` 有 `GEMINI_API_KEY` 嗎？
- [ ] 瀏覽器 Console 有錯誤嗎？
- [ ] Network tab 看得到 `/api/assistant/chat` 請求嗎？

### 查看錯誤訊息

1. **後端錯誤：** `docker logs sdls_fullstack_remix-api-1 -f`
2. **前端錯誤：** F12 → Console
3. **網路錯誤：** F12 → Network → 找 `chat` 請求

### 重要檔案位置

- 後端服務：`sdl-backend-main/services/streamingService.js`
- 後端控制器：`sdl-backend-main/controllers/assistant.js`
- 前端 Hook：`sdl-frontend-main/src/hooks/useAssistantChat.js`
- 前端組件：`sdl-frontend-main/src/components/AssistantChatStreaming.jsx`

---

**祝使用愉快！** 🎉
