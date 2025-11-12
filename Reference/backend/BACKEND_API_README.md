# AI 專案助手文檔

這個目錄包含 AI 專案助手的完整設計文檔和測試指南。

---

## 📚 版本演進

### [v2.3 - 階段完成狀態整合](./v2.3-stage-completion.md) ★ 當前版本
**日期**: 2025-01-12
**核心功能**: 整合階段完成狀態，AI 能精確判斷進度和遺漏項目

**解決的問題**:
- ❌ v2.2 只顯示最近 5 條提交，看不到完整提交歷史
- ❌ 階段結構與提交記錄分離，AI 需自行拼湊
- ❌ 無法判斷欄位完整性（哪些已填、哪些遺漏）

**新增功能**:
- ✅ 整合所有階段的提交狀態
- ✅ 檢查每個子階段的欄位完整性
- ✅ 計算完成度百分比
- ✅ 精確識別遺漏項目

**變更檔案**:
- `controllers/assistant.js`: 新增 `getStageCompletionStatus()` 函數
- `config/promptBuilder.js`: 更新 Prompt v2.3
- `config/assistantPrompts.js`: 同步更新 Prompt v2.3
- `controllers/submit.js`: 新增快取失效觸發

---

### [v2.2 - 階段感知 AI](./v2.2-stage-aware.md)
**日期**: 2025-01-11
**核心功能**: 整合完整階段結構，AI 能判斷任務是否超前或落後

**解決的問題**:
- ❌ v2.1 不知道專案有階段/子階段結構
- ❌ 無法判斷學生是否在做未來階段的任務
- ❌ 無法提醒學生按照正確順序完成專案

**新增功能**:
- ✅ 查詢完整 Process → Stage → Sub_stage 結構
- ✅ AI 能看到所有階段的定義和需填寫欄位
- ✅ 能判斷看板任務是否屬於未來階段
- ✅ 能提醒學生先完成當前階段

**變更檔案**:
- `controllers/assistant.js`: 新增 `getCompleteStageStructure()` 函數
- `config/promptBuilder.js`: 更新 Prompt v2.2
- `config/assistantPrompts.js`: 同步更新 Prompt v2.2

---

### [v2.1 - AI 顧問能力升級](./v2.1-advisor-upgrade.md)
**日期**: 2025-01-10
**核心功能**: 從「只能回答問題」提升到「能分析、建議、評估」

**解決的問題**:
- ❌ v2.0 只能回答簡單查詢（例如：「我有幾張卡片？」）
- ❌ 無法給予學生建議或指導
- ❌ 無法主動發現問題和遺漏

**新增功能**:
- ✅ 增強 AI 角色定義（advisor 角色）
- ✅ 能夠分析專案進度
- ✅ 能夠識別問題和遺漏
- ✅ 能夠提供建議和指導
- ✅ 清楚說明操作步驟（但不直接執行）

**變更檔案**:
- `config/assistantPrompts.js`: 更新 `ASSISTANT_ROLE` 和回答準則

---

## 🧪 測試與維護

### [測試指南](./testing-guide.md)
測試場景、預期行為、和測試方法

**包含內容**:
- v2.1 測試場景（顧問能力）
- v2.2 測試場景（階段感知）
- 預期 AI 回答範例
- 測試檢查清單

---

## 📊 技術架構總覽

### 資料流程

```
使用者提問
    ↓
Express API (/assistant/chat)
    ↓
controllers/assistant.js
    ↓
    ├─→ getProjectContext() ────→ 並行查詢 6 個資料源
    │   ├─ getStageMeta()              (當前階段資訊)
    │   ├─ getCompleteStageStructure() (完整階段結構) ← v2.2
    │   ├─ getStageCompletionStatus()  (階段完成狀態) ← v2.3
    │   ├─ getKanbanSnapshot()         (看板任務)
    │   ├─ getIdeaWallSnapshot()       (想法牆)
    │   └─ getSubmissions()            (提交記錄)
    │
    ├─→ PromptBuilder ─────────→ 組裝 Prompt (v2.0 優化)
    │
    └─→ callGeminiAPI() ────────→ Gemini 2.5 Flash
         │
         └─→ 串流回傳結果
```

### 快取機制

- **策略**: 5 分鐘 TTL，使用 JavaScript Map
- **失效觸發**:
  - Task 變更（新增、更新、刪除、移動）
  - Column 變更（新增、重排、刪除）
  - Submit 提交成功 ← v2.3 新增

### 效能指標

| 版本 | 資料庫查詢 | Prompt Tokens | 延遲 |
|------|----------|--------------|------|
| v2.1 | 4 個並行 | ~3500 | ~180ms |
| v2.2 | 5 個並行 | ~4500 | ~200ms |
| v2.3 | 6 個並行 | ~6000 | ~200ms |

---

## 🚀 未來規劃

### v2.4 - Function Calling 快速路徑（計畫中）
針對簡單查詢增加快速路徑，節省 90% tokens

### Phase 2 - Function Calling 執行操作（長期）
AI 能直接執行操作（創建任務、更新狀態、移動任務）

---

## 🎯 設計哲學

所有版本遵循 **Linus Torvalds 設計哲學**：

1. **資料結構優先**: "Bad programmers worry about the code. Good programmers worry about data structures."
2. **消除特殊情況**: "好代碼沒有特殊情況"
3. **簡單實用**: "如果實作需要超過 3 層縮進，重新設計它"
4. **零破壞性**: "Never break userspace" - 所有版本完全向後相容

---

## 📝 維護建議

### 新增功能時
1. 先撰寫設計文檔（follow v2.3 格式）
2. 明確定義問題和解決方案
3. 評估破壞性和效能影響
4. 實作前先 review 設計

### 文檔更新
- 每個重大版本建立獨立文檔
- 記錄設計決策和權衡
- 保留 Linus 式評價（幫助未來理解「為什麼」）

---

**文檔維護者**: AI Assistant (Claude)
**最後更新**: 2025-01-12
