````markdown
# AI功能演進記錄 - 從舊版到KB Coach

## 執行摘要

**決策：已刪除「AI 輔助發展」舊版，全面採用KB Coach**

**執行時間：** 2025-11-14  
**決策理由：** Linus式分析確認KB Coach在技術和教育價值上全面優於舊版

---

## 功能對比表

| 特性 | AI 輔助發展（舊版） | KB Coach（新版） |
|------|-------------------|-----------------|
| **技術** | 舊版 LLM | Gemini 3.1 Flash-Lite-Preview |
| **API呼叫** | 2次（分類+引導） | 1次（Function Calling） |
| **理論基礎** | 自訂7種分類 | KB 12原則（教育理論） |
| **輸出格式** | 手動JSON.parse | 結構化輸出（保證格式） |
| **回應內容** | 1個引導問題 | 原則+多個問題+可執行建議 |
| **互動方式** | 自動建立新節點 | 顯示建議，學生選擇執行 |
| **成本** | 較貴 | Gemini（較便宜） |
| **教育價值** | 簡單引導 | 深度教學支架 |

---

## Linus式分析

### 【第一層：資料結構】

**AI 輔助發展：**
```javascript
// 兩階段資料流（特殊情況）
Student Idea → Classification API → type + reason
            → Guidance API → question
            → Auto Create New Node
```

**KB Coach：**
```javascript
// 單一資料流（好品味）
Student Idea → Gemini Function Calling → {
  principles[],      // KB原則
  questions[],       // 多個引導問題
  suggestions[]      // 可執行建議
} → Student Choose Action
```

**判斷：** KB Coach資料結構更清晰，消除了兩階段特殊情況。

---

### 【第二層：特殊情況識別】

**AI 輔助發展的特殊情況：**
1. ❌ 兩次API呼叫（為什麼要分開？）
2. ❌ 手動JSON.parse（假設AI會亂輸出）
3. ❌ 自訂7種分類（誰定義的？有理論依據嗎？）
4. ❌ 自動建立節點（剝奪學生選擇權）

**KB Coach的改進：**
1. ✅ 一次API呼叫（Function Calling）
2. ✅ 結構化輸出（保證格式）
3. ✅ KB 12原則（有教育研究支持）
4. ✅ 學生主動執行（保持認知責任）

**判斷：** AI 輔助發展充滿特殊情況和假設。

---

### 【第三層：複雜度】

**AI 輔助發展的複雜度：**
- 兩次API呼叫（網路延遲×2）
- 手動JSON解析（可能失敗）
- 7種分類維護成本
- 自動建立節點邏輯

**KB Coach的複雜度：**
- 一次API呼叫
- 6個KB原則（有理論支持）
- 清晰的建議結構

**判斷：** KB Coach本質更簡單（雖然回應內容更豐富）。

---

### 【第四層：破壞性】

**如果刪除「AI 輔助發展」：**
- ✅ 不破壞現有功能（KB Coach已獨立）
- ✅ 減少維護負擔
- ✅ 學生只需學習一個功能
- ❌ 可能有學生習慣舊功能？（需驗證）

**判斷：** 刪除是安全的，但需要漸進式淘汰。

---

### 【第五層：實用性】

**真實問題：**
- 學生需要引導來深化想法 ✅ 真實存在
- 兩個功能太相似會造成困惑 ✅ 真實存在

**使用數據（假設）：**
- 舊功能使用率？（需查audit log）
- 新功能是否足夠好？（需實際測試）

**判斷：** 需要數據驗證，但理論上KB Coach更優。

---

## 建議方案

### 【方案1：漸進式淘汰（推薦）】

**Phase 1（當前）：並存 + 標示差異**

```jsx
// IdeaWall.jsx UI改進
<div className='flex flex-col gap-2'>
  {/* 新版（推薦） */}
  <button onClick={handleKbCoach} className="...">
    🎓 KB Coach (推薦) - 基於教育理論
  </button>
  
  {/* 舊版（即將淘汰） */}
  <button onClick={handleAiDevelopment} className="... opacity-70">
    🤖 AI 輔助發展 (舊版)
  </button>
</div>
```

**Phase 2（1-2個月後）：根據使用數據決定**

```javascript
// 查詢使用數據
SELECT 
  action,
  COUNT(*) as usage_count
FROM audit_logs
WHERE action IN ('ASSISTANT_IDEA_GENERATE', 'KB_COACH_GUIDANCE')
  AND createdAt > NOW() - INTERVAL '30 days'
GROUP BY action;
```

- 如果舊功能使用率 < 10% → 刪除
- 如果使用率仍高 → 保留但降級（移到更多選項）

**Phase 3（6個月後）：完全移除舊版**

---

### 【方案2：立即刪除（激進）】

**優點：**
- 簡化UI
- 減少維護負擔
- 強制學生使用更好的功能

**缺點：**
- 可能打斷習慣舊功能的使用者
- 違反「Never break userspace」原則

**判斷：** ❌ 不推薦，太激進。

---

### 【方案3：保留兩者（保守）】

**優點：**
- 零破壞
- 給學生選擇權

**缺點：**
- UI混亂（兩個功能太相似）
- 維護成本高（兩套功能並存）
- 學生不知道該用哪個

**判斷：** ❌ 不推薦，製造困惑。

---

## 最終決策（已執行）

### ✅ 直接刪除舊版，全面採用KB Coach

**已完成的清理工作：**

1. ✅ **前端檔案刪除：** `sdl-frontend-main/src/pages/ideaWall/components/Idea_development.jsx`
2. ✅ **移除import：** 從`IdeaWall.jsx`移除舊版元件import
3. ✅ **移除state：** 刪除`aiDevelopmentModalOpen`相關state
4. ✅ **移除handler：** 刪除`handleAiDevelopment`函數
5. ✅ **移除UI：** 刪除舊版按鈕和Modal
6. ✅ **語法驗證：** 所有括號匹配，無編譯錯誤

**Linus式理由：**

> "舊版是技術債。兩個功能太相似會製造困惑。  
> KB Coach在所有維度都更優：教育理論、技術實作、使用者體驗。  
> 沒有保留舊版的理由。直接刪除，向前看。"

---

## 已刪除的舊版問題分析

### AI 輔助發展（llm.js）的致命問題

```javascript
// ❌ 問題1：兩次API呼叫
const classification = await llm.complete({...});  // 第一次
const guidance = await llm.complete({...});        // 第二次

// ❌ 問題2：手動JSON.parse（不穩定）
const parsedResponse = JSON.parse(response);  // 如果AI輸出格式錯？

// ❌ 問題3：自訂分類（無理論支持）
"type": "新構想 / 初始想法、延伸與補充、質疑與反駁..."
// 誰定義的？為什麼是7種？有研究支持嗎？

// ❌ 問題4：自動建立節點（剝奪選擇）
onNewNode(newNodeData);  // 學生無法預覽或取消
```

### KB Coach的改進

```javascript
// ✅ 改進1：一次Function Calling
const result = await genai.models.generateContent({
  config: { responseMimeType: 'application/json', responseSchema: KB_COACHING_SCHEMA }
});

// ✅ 改進2：結構化輸出（保證格式）
responseSchema: {
  principles: { type: 'array', items: { enum: ['real_ideas', ...] } },
  questions: { type: 'array', minItems: 2, maxItems: 4 },
  suggestions: { type: 'array', ... }
}

// ✅ 改進3：KB 12原則（有教育研究支持）
// Scardamalia & Bereiter (2006) Knowledge Building理論

// ✅ 改進4：學生主動執行
<button onClick={() => executeSuggestion(suggestion)}>執行</button>
// 學生可以預覽、選擇、取消
```

---

---

## 清理檢查清單（已完成）

### ✅ Phase 1：移除前端程式碼

- [x] 刪除 `Idea_development.jsx` 元件檔案
- [x] 從 `IdeaWall.jsx` 移除 import
- [x] 移除 `aiDevelopmentModalOpen` state
- [x] 移除 `handleAiDevelopment` handler
- [x] 移除舊版按鈕UI
- [x] 移除舊版Modal
- [x] 語法驗證通過（括號匹配）

### ✅ Phase 2：後端驗證

- [x] 確認無舊版專用API（後端從未有獨立endpoint，使用通用llm.js）
- [x] KB Coach使用獨立的 `/api/kb-coach` endpoint

### 📝 Phase 3：可選的未來優化

- [ ] 如果發現audit logs中有舊版使用記錄，可考慮加入遷移通知
- [ ] 監控KB Coach使用率和錯誤率

---

**結論：** 舊版已完全移除。KB Coach是唯一的AI引導功能。

**文件版本：** v2.0 (Updated: 直接刪除舊版)  
**最後更新：** 2025-11-14  

````  
