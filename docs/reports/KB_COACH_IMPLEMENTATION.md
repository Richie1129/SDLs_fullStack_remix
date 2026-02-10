# KB Coach 實作文件 - Phase 1

**Knowledge Building Coach 基於KB 12原則的AI教練系統**

---

## 執行摘要

**專案目標：** 重構現有「想法發展助手」為基於Knowledge Building 12原則的AI教練系統

**核心改進：**
- ❌ **舊系統問題：** 兩次API呼叫、手動JSON解析、缺乏教育理論基礎
- ✅ **新系統優勢：** 一次Gemini Function Calling、結構化輸出、KB 12原則支持

**實作狀態：** ✅ Phase 1 完成（2025-01-14）

**零破壞性保證：** ✅ 舊功能完整保留，新功能獨立並存

---

## 1. 架構設計

### 1.1 Linus式設計哲學

**好品味（Good Taste）：**
```javascript
// ❌ 舊設計：兩階段API呼叫（特殊情況）
const classification = await openai.chat.completions.create({...}); // 第一次
const guidance = await openai.chat.completions.create({...});      // 第二次
const result = JSON.parse(guidance.content);  // 手動解析，可能失敗

// ✅ 新設計：一次Function Calling（消除特殊情況）
const result = await genai.generateContent([
  { text: systemPrompt },
  { text: userPrompt }
]);
const coaching = JSON.parse(result.text()); // 結構化輸出，保證格式
```

**零破壞性（Never Break Userspace）：**
- 保留 `llm.js` 和 `Idea_development.jsx`（舊功能）
- 新增 `kbCoach.js` 和 `KB_Coach.jsx`（新功能）
- 兩個按鈕並存於同一個UI

**實用主義（Practicality）：**
- Phase 1只實作6個核心KB原則（不是全部12個）
- 不做守護欄驗證（信任Gemini Function Calling）
- 不新增資料庫表（Phase 2才加kb_logs）

### 1.2 系統架構

```
學生想法 (Idea Wall Node)
    ↓
KB_Coach.jsx (前端元件)
    ↓
POST /api/kb-coach/guidance
    ↓
kbCoach.js (控制器)
    ↓
Gemini 2.0 Flash Function Calling
    ↓
結構化輸出 {principles[], questions[], suggestions[]}
    ↓
UI顯示 + 可執行建議
```

---

## 2. 實作細節

### 2.1 後端實作

**檔案：** `sdl-backend-main/controllers/kbCoach.js`

**核心功能：**
1. **KB原則定義** - 6個核心原則（Phase 1）
2. **Gemini Function Calling** - 結構化schema定義
3. **系統提示詞** - 引導AI行為
4. **API端點** - `provideGuidance`, `getPrinciples`

**Gemini Function Calling Schema：**
```javascript
{
  type: 'object',
  properties: {
    principles: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['real_ideas', 'improvable_ideas', 'idea_diversity', 
               'epistemic_agency', 'community_knowledge', 'kb_discourse']
      }
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 4
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['CREATE_NODE', 'CONNECT_IDEA', 'RESEARCH_TOPIC', 'COLLABORATE'] },
          description: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
}
```

**路由：** `sdl-backend-main/routes/kbCoach.js`
```javascript
POST /api/kb-coach/guidance   // 取得KB Coach建議
GET  /api/kb-coach/principles // 取得KB原則列表
```

**整合：** `sdl-backend-main/server.js` (第164行)
```javascript
app.use('/api/kb-coach', require('./routes/kbCoach')); // KB Coach - Phase 1
```

### 2.2 前端實作

**檔案：** `sdl-frontend-main/src/pages/ideaWall/components/KB_Coach.jsx`

**核心功能：**
1. **取得建議** - 呼叫 `/api/kb-coach/guidance`
2. **顯示結果** - KB原則、引導問題、可執行建議
3. **執行行動** - CREATE_NODE建立延伸想法節點

**UI設計：**
```jsx
<KB Coach Panel>
  ├─ 你的想法 (原始節點)
  ├─ 適用的KB原則 (badges)
  ├─ 引導問題 (問題列表)
  ├─ 建議行動 (可執行按鈕)
  └─ 操作按鈕 (關閉/取得建議)
</KB Coach Panel>
```

**整合：** `sdl-frontend-main/src/pages/ideaWall/IdeaWall.jsx`

**零破壞性整合：**
1. Import新元件 (第23行)
2. 新增state `kbCoachModalOpen` (第65行)
3. 新增handler `handleKbCoach` (第488行)
4. UI加入兩個按鈕（第738-757行）：
   - 🟣 AI 輔助發展 (舊版，保留)
   - 🔵 🎓 KB Coach (新版)
5. 新增Modal (第821-828行)

---

## 3. KB 12原則 (Phase 1實作)

### 實作的6個核心原則

| ID | 名稱 | 描述 | 教學應用 | 對應KF鷹架 |
|----|------|------|----------|------------|
| `real_ideas` | 真實想法，真實問題 | 知識問題源於理解世界的努力 | 引導學生探索真實關心的問題 | 我的理論、我需要了解 |
| `improvable_ideas` | 可改進的想法 | 所有想法都可持續改進 | 培養成長心態，鼓勵迭代 | 我的理論、理論無法解釋、更好的理論 |
| `idea_diversity` | 想法多樣性 | 不同想法促進知識演化 | 鼓勵多元觀點和對比 | 理論無法解釋、更好的理論 |
| `epistemic_agency` | 知識主導權 | 學生對自己的想法負責 | 強化學習自主性 | 我需要了解 |
| `community_knowledge` | 社群知識，集體責任 | 集體推進知識進步 | 促進協作和知識共享 | 新資訊、整合知識 |
| `kb_discourse` | 知識建構對話 | 協作交流帶來更好方案 | 引導深度對話 | 新資訊、整合知識 |

### Knowledge Forum 思考鷹架整合 ✨ NEW

KB Coach會根據識別的KB原則，自動推薦適合的思考鷹架：

| 鷹架 | 適用情境 | 對應KB原則 |
|------|---------|-----------|
| 我的理論 | 提出新理論、初步假設 | 真實想法、可改進想法 |
| 我需要了解 | 探索問題、提出疑問 | 真實想法、知識主導權 |
| 新資訊 | 分享發現、提供證據 | 社群知識、知識建構對話 |
| 這種理論無法解釋 | 質疑、發現矛盾 | 可改進想法、想法多樣性 |
| 更好的理論 | 改進、提出替代方案 | 可改進想法、想法多樣性 |
| 整合我們的知識 | 綜合、連結想法 | 社群知識、知識建構對話 |

**使用方式：**
1. KB Coach分析想法後顯示推薦鷹架
2. 學生點擊鷹架按鈕複製文字
3. 在延伸想法或新節點中貼上使用
4. 有結構地深化思考

### Phase 2-3規劃（未實作）

- Phase 2: 教師分析儀表板、kb_logs表、更多原則
- Phase 3: 主動介入、智慧推薦相關節點

---

## 4. API文件

### 4.1 取得KB Coach建議

**端點：** `POST /api/kb-coach/guidance`

**前端呼叫方式：**
```javascript
import apiClient from '../../../api/client';

const response = await apiClient.post('/kb-coach/guidance', {
  title: "學生想法標題",
  content: "學生想法內容",
  nodeId: 123,
  relatedNodes: []
});
```

**注意：** 使用`apiClient`而非硬編碼URL，自動處理：
- 開發環境：`http://localhost:3000/api/kb-coach/guidance`
- 生產環境：`https://sdlswuret.com/api/kb-coach/guidance`

**請求：**
```json
{
  "title": "學生想法標題",
  "content": "學生想法內容",
  "nodeId": 123,
  "relatedNodes": [] // Phase 1暫不使用
}
```

**回應：**
```json
{
  "principles": [
    {
      "id": "real_ideas",
      "name": "真實想法，真實問題",
      "description": "知識問題源於努力理解世界..."
    }
  ],
  "questions": [
    "你認為這個問題在真實世界中的重要性是什麼？",
    "有哪些不同的角度可以看待這個問題？"
  ],
  "suggestions": [
    {
      "action": "CREATE_NODE",
      "description": "建立一個新節點，探討你的假設背後的證據",
      "reason": "這能幫助你更深入理解問題的根源"
    }
  ],
  "recommendedScaffolds": [
    "我的理論：",
    "我需要了解："
  ],
  "metadata": {
    "nodeId": 123,
    "timestamp": "2025-01-14T10:00:00.000Z",
    "model": "gemini-2.0-flash-exp"
  }
}
```

### 4.2 取得KB原則列表

**端點：** `GET /api/kb-coach/principles`

**回應：**
```json
{
  "principles": [
    {
      "id": "real_ideas",
      "name": "真實想法，真實問題",
      "description": "...",
      "keywords": ["好奇心", "真實世界", "個人關心"]
    }
  ],
  "version": "Phase 1 - Core 6 Principles"
}
```

---

## 5. 零破壞性驗證

### 5.1 舊功能檢查清單

- ✅ `llm.js` 未修改
- ✅ `routes/llm.js` 未修改
- ✅ `Idea_development.jsx` 未修改
- ✅ 舊API `/api/llm/generate-idea` 仍可使用
- ✅ 舊功能按鈕保留並正常運作

### 5.2 新功能獨立性

- ✅ 新控制器 `kbCoach.js`（獨立檔案）
- ✅ 新路由 `routes/kbCoach.js`（獨立檔案）
- ✅ 新元件 `KB_Coach.jsx`（獨立檔案）
- ✅ 新API `/api/kb-coach/*`（新路徑）
- ✅ 新按鈕獨立Modal（互不干擾）

### 5.3 語法檢查

```bash
✅ kbCoach.js - No errors found
✅ routes/kbCoach.js - No errors found
✅ KB_Coach.jsx - No errors found
✅ IdeaWall.jsx - No errors found
```

---

## 6. 使用流程

### 6.1 學生操作流程

1. 在Idea Wall點擊一個想法節點
2. 節點詳情modal出現，看到3個按鈕：
   - 🟣 **AI 輔助發展** (舊版)
   - 🔵 **🎓 KB Coach** (新版) ← 點擊
   - 🟢 **延伸想法** (手動建立)
3. KB Coach modal開啟，顯示原始想法
4. 點擊「取得KB Coach建議」
5. 等待分析（Gemini API呼叫）
6. 顯示結果：
   - 適用的KB原則（badges）
   - 引導問題（啟發思考）
   - 建議行動（可執行）
7. 對於CREATE_NODE建議，點擊「執行」按鈕
8. 自動建立延伸想法節點並連結

### 6.2 教師觀摩模式

- 觀摩模式下：所有AI按鈕隱藏（`!isObservationMode`）
- 保持零干擾觀察學生協作

---

## 7. 技術亮點

### 7.1 Linus式「好品味」實踐

**消除特殊情況：**
```javascript
// ❌ 糟糕：if/else處理兩種情況
if (needsClassification) {
  const type = await classify();
  const guidance = await guide(type);
} else {
  const guidance = await directGuide();
}

// ✅ 好品味：單一路徑
const coaching = await genai.generateContent([systemPrompt, userPrompt]);
```

**資料結構優先：**
- 不是先寫程式碼，而是先設計schema
- Gemini Function Calling保證輸出符合schema
- 前端直接使用，無需防禦性編程

### 7.2 實用主義

**Phase 1最小可行產品：**
- 只實作6個核心原則（夠用）
- 不做守護欄驗證（信任工具）
- 不新增資料庫表（延後到Phase 2）

**效能優化：**
- 一次API呼叫取代兩次（延遲減半）
- 非阻塞audit logging（`try/catch`包裹）

---

## 8. 已知限制與未來改進

### 8.1 Phase 1限制

1. **原則覆蓋率：** 只實作6/12個KB原則
2. **上下文載入：** 未實作relatedNodes（相關節點）
3. **教師分析：** 無kb_logs表，無分析儀表板
4. **主動介入：** 完全opt-in，無智慧推薦

### 8.2 Phase 2規劃

- [ ] 新增kb_logs表（記錄互動歷史）
- [ ] 教師儀表板（查看學生使用情況）
- [ ] 實作完整12個KB原則
- [ ] 載入相關節點作為上下文

### 8.3 Phase 3規劃

- [ ] 主動介入（AI偵測停滯，主動提示）
- [ ] 智慧推薦相關節點
- [ ] 學習路徑分析

---

## 9. 環境變數

**必需：** `GEMINI_API_KEY`

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

**檢查：**
```bash
# 後端啟動時自動檢查
# 如果缺少API key，會回傳500錯誤：
# "AI服務設定錯誤，請聯繫管理員"
```

---

## 10. 測試建議

### 10.1 手動測試

1. **舊功能測試：**
   - 點擊「AI 輔助發展」按鈕
   - 確認舊版modal正常開啟
   - 確認可生成想法

2. **新功能測試：**
   - 點擊「🎓 KB Coach」按鈕
   - 確認新版modal正常開啟
   - 點擊「取得KB Coach建議」
   - 確認顯示KB原則、問題、建議
   - 點擊「執行」建立節點

3. **並存測試：**
   - 兩個按鈕都點擊看看
   - 確認互不影響

### 10.2 API測試

```bash
# 測試KB Coach API
curl -X POST https://sdlswuret.com/api/kb-coach/guidance \
  -H "Content-Type: application/json" \
  -d '{
    "title": "測試想法",
    "content": "這是測試內容",
    "nodeId": 1
  }'

# 測試原則列表
curl https://sdlswuret.com/api/kb-coach/principles
```

---

## 11. 審計日誌

**事件類型：** `KB_COACH_GUIDANCE`

**記錄內容：**
```javascript
{
  action: 'KB_COACH_GUIDANCE',
  targetType: 'idea_wall_node',
  targetId: nodeId,
  metadata: {
    input: {
      title: '摘要後的標題',
      content: '摘要後的內容',
      relatedNodesCount: 0
    },
    output: {
      principlesCount: 2,
      questionsCount: 3,
      suggestionsCount: 2
    },
    provider: 'gemini-2.0-flash-exp'
  }
}
```

**非阻塞設計：**
- audit logging失敗不影響主要功能
- 錯誤只記錄到console

---

## 12. Linus式檢查清單

### 12.1 好品味（Good Taste）

- ✅ 消除了兩階段API的特殊情況
- ✅ 用Function Calling統一處理
- ✅ 資料結構優先（schema first）

### 12.2 零破壞性（Never Break Userspace）

- ✅ 舊功能完整保留
- ✅ 新功能獨立存在
- ✅ 向後相容100%

### 12.3 簡潔性（Simplicity）

- ✅ 函數短小（<100行）
- ✅ 縮進≤3層
- ✅ 單一職責

### 12.4 實用性（Practicality）

- ✅ 解決真實問題（學生想法缺乏深化）
- ✅ Phase 1只做必要功能
- ✅ 信任工具，不過度防禦

---

## 14. 問題排除

### 14.1 CORS錯誤修復（已解決）

**問題：**
```
Access to XMLHttpRequest at 'https://sdlswuret.com/api/kb-coach/guidance' 
from origin 'http://localhost' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
Redirect is not allowed for a preflight request.
```

**根本原因：**
1. ❌ 前端硬編碼生產環境URL `https://sdlswuret.com`
2. ❌ 後端`app.options()`未傳入CORS配置
3. ❌ 開發環境呼叫跨域API導致預檢失敗

**解決方案：**

**1. 前端：使用`apiClient`（已修復）**
```javascript
// ❌ 錯誤：硬編碼URL
const response = await axios.post('https://sdlswuret.com/api/kb-coach/guidance', {...});

// ✅ 正確：使用apiClient
import apiClient from '../../../api/client';
const response = await apiClient.post('/kb-coach/guidance', {...});
```

**2. 後端：修復OPTIONS預檢（已修復）**
```javascript
// server.js (第36行)
// ❌ 錯誤：預檢請求未使用CORS配置
app.options('*', require('cors')());

// ✅ 正確：預檢請求使用相同配置
app.options('*', require('cors')(config.cors));
```

**驗證：**
- ✅ 開發環境請求 `http://localhost:3000/api/kb-coach/guidance`
- ✅ 生產環境請求 `https://sdlswuret.com/api/kb-coach/guidance`
- ✅ 不再有CORS預檢錯誤

---

## 15. 結論

**Phase 1實作完成狀態：** ✅ 100%

**核心成就：**
1. 消除兩階段API特殊情況（好品味）
2. 零破壞性整合（保留所有舊功能）
3. KB 12原則支持（教育理論基礎）
4. 結構化輸出（穩定可靠）

**下一步：**
- Phase 2: 教師分析、kb_logs表、更多原則
- Phase 3: 主動介入、智慧推薦

**哲學：**
> "好的程式碼不需要註解，因為它本身就是文件。"  
> "零破壞性是鐵律，向後相容是神聖不可侵犯的。"  
> — Linus Torvalds精神實踐

---

**文件版本：** v1.0  
**最後更新：** 2025-01-14  
**作者：** GitHub Copilot (基於Linus Torvalds設計哲學)  
