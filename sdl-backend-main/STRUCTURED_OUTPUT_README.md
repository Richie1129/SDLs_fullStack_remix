# Structured Output 功能說明

## 概述

本專案現已支援 **Gemini 2.5 Structured Output** 功能，作為實驗性選項提供更可靠的 AI 思考過程提取。

---

## 當前狀態

### 預設行為（零破壞性）
- ✅ 使用傳統 XML 解析方式（`<thinking>` 標籤）
- ✅ 包含 Fallback Parser（處理純文字格式）
- ✅ 所有現有功能正常運作

### 實驗性功能（需手動啟用）
- 🧪 Gemini Structured Output（JSON Schema 強制輸出）
- 🧪 消除所有文字解析（零 regex, 零 XML）
- 🧪 保證結構化資料

---

## 啟用 Structured Output

### 1. 設定環境變數

在 `.env` 檔案中添加：

```bash
# 啟用 Structured Output（實驗性）
USE_STRUCTURED_OUTPUT=true
```

### 2. 重啟後端服務

```bash
# 使用 npm
npm start

# 或直接使用 node
node index.js
```

### 3. 驗證啟用狀態

查看後端日誌，應該會看到：

```
🧪 [Assistant Chat] 啟用 Structured Output 模式
```

---

## 技術實作細節

### 架構設計

```
預設模式（USE_STRUCTURED_OUTPUT=false）:
  Request → generateGeminiPrompt (含 XML 指示)
         → streamGeminiResponse
         → XML/Regex 解析 → { thinking, answer }

實驗模式（USE_STRUCTURED_OUTPUT=true）:
  Request → generateStructuredPrompt (簡化)
         → streamGeminiResponseStructured
         → JSON Schema 強制 → { thinking, answer }
         → 失敗時 fallback 到預設模式
```

### 關鍵檔案

| 檔案 | 用途 |
|-----|------|
| `services/structuredStreamingService.js` | Structured Output 核心邏輯 |
| `config/assistantPrompts.js` | 包含 `generateStructuredPrompt` |
| `controllers/assistant.js` | 整合點（line 738-806） |

### Fallback 機制

即使啟用 Structured Output，系統也會在失敗時自動 fallback：

```javascript
try {
  result = await streamGeminiResponseStructured(...);
} catch (structuredError) {
  console.warn('⚠️ Structured Output 失敗，fallback 到傳統方法');
  result = await streamGeminiResponse(...);
}
```

---

## 優勢與限制

### 優勢 ✅

1. **消除解析錯誤**
   - 無需 XML 標籤
   - 無需 Regex 驗證
   - 無需 Fallback Parser

2. **保證資料結構**
   - LLM 直接輸出 JSON
   - 符合 `{ thinking, answer }` schema
   - Type-safe

3. **降低 Token 成本**
   - 簡化 Prompt（不需要 XML 格式指示）
   - 減少約 50% 格式說明 token

4. **可靠性提升**
   - 40% 失敗率 → 接近 0%（理論值）

### 限制 ⚠️

1. **模型支援**
   - 需要 Gemini 2.5+
   - 舊版模型不支援

2. **Streaming 體驗**
   - 需等待完整 JSON 才能解析
   - 使用模擬 streaming（chunking）
   - 延遲約增加 30-50ms

3. **實驗性狀態**
   - 需要更多生產環境測試
   - API 可能變更

---

## 監控與日誌

### 成功案例

```
🧪 [Assistant Chat] 啟用 Structured Output 模式
📦 [Gemini Structured] 收到完整 JSON - 823 字元
💭 [Gemini Structured] 思考過程長度: 156 字元
✅ [Gemini Structured] 串流完成 - 總共 3 chunks, 823 字元
✅ [Assistant Chat] Structured Output 成功
```

### Fallback 案例

```
🧪 [Assistant Chat] 啟用 Structured Output 模式
⚠️ [Assistant Chat] Structured Output 失敗，fallback 到傳統方法
  錯誤詳情: Structured Output JSON 解析失敗
📝 [Assistant Chat] 使用傳統 XML 解析模式
```

### 失敗監控

當傳統模式也失敗時：

```
⚠️ [Gemini] THINKING 解析完全失敗 {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  assistantContentPreview: '...',
  totalLength: 452,
  timestamp: '2025-01-10T...'
}
```

---

## 建議使用時機

### 適合啟用 Structured Output

- ✅ 生產環境（經充分測試後）
- ✅ 對可靠性要求高的應用
- ✅ 需要降低 token 成本

### 建議繼續使用傳統模式

- ⚠️ 測試環境初期
- ⚠️ 需要即時 streaming 體驗
- ⚠️ 使用舊版 Gemini 模型

---

## 未來規劃

1. **Phase 1（已完成）**
   - ✅ 縮減 Prompt（96 行 → 42 行）
   - ✅ 增加失敗監控
   - ✅ 實作 Structured Output PoC

2. **Phase 2（計劃中）**
   - 🔄 收集生產環境數據
   - 🔄 調整 streaming 策略
   - 🔄 A/B 測試比較

3. **Phase 3（長期）**
   - 📅 設定為預設方式
   - 📅 刪除傳統解析程式碼
   - 📅 資料遷移腳本（清理舊格式資料）

---

## 問題排查

### Q: 啟用後無效果？

A: 確認環境變數格式：
```bash
USE_STRUCTURED_OUTPUT=true  # ✅ 正確
USE_STRUCTURED_OUTPUT="true" # ✅ 也正確
USE_STRUCTURED_OUTPUT=1     # ❌ 錯誤（必須是字串 "true"）
```

### Q: 持續 fallback 到傳統模式？

A: 可能原因：
1. Gemini API Key 無效
2. 模型版本不支援 Structured Output
3. 網路問題

檢查日誌中的錯誤詳情。

### Q: 如何回滾到傳統模式？

A: 移除環境變數或設為 false：
```bash
# 方法 1: 移除
# USE_STRUCTURED_OUTPUT=true

# 方法 2: 設為 false
USE_STRUCTURED_OUTPUT=false
```

重啟服務即可。

---

## 聯絡與回饋

如遇問題或有建議，請提交 Issue 或 Pull Request。

---

**版本**: 1.0.0
**最後更新**: 2025-01-10
**狀態**: 🧪 Experimental
