# 程式碼審查報告 - 錯誤處理與系統穩定性分析

**審查日期**: 2025-10-11
**審查者**: Linus Torvalds 模式
**審查範圍**: Backend Controllers + Frontend API & Components

---

## 【核心判斷】

🔴 **嚴重性評級**: CRITICAL
**總體評分**: 6/10 (勉強及格但有重大隱患)

這次審查發現了幾個 **「程式碼炸彈」** - 在生產環境中會導致系統崩潰的致命缺陷。好消息是錯誤處理的**資料結構設計良好**，壞消息是**實作不一致且有漏洞**。

---

## 【關鍵洞見】

### 1. **資料結構分析** ✅ GOOD TASTE

```javascript
// 這是好設計 - 統一的錯誤碼結構
const DAILY_ERROR_CODES = {
  EMPTY_TITLE: { code: 'EMPTY_TITLE', en: '...', zh: '...' }
}
```

**讚賞**：
- 前後端使用同一套錯誤碼定義 → **消除了「翻譯」特殊情況**
- `createErrorResponse()` 封裝了錯誤格式 → 符合 DRY 原則
- 雙語支援 (en/zh) → 國際化友善

**Linus 會說**：
> "This is how error handling SHOULD be done. One source of truth, no special cases for different languages."

---

### 2. **複雜度審查** 🔴 BAD

發現了 **3 種不同的錯誤處理模式**：

#### 模式 A：標準模式 (daily.js) ✅
```javascript
const errorResponse = createErrorResponse('EMPTY_TITLE');
return res.status(400).json(errorResponse);
```

#### 模式 B：混亂模式 (submit.js) ⚠️
```javascript
return res.status(400).send({ message: 'Content is required | 請填寫表單內容' });
```

#### 模式 C：災難模式 (stage.js) 💣
```javascript
const sub_stageId = stage[0].sub_stage[currentSubStage-1];  // 💥 無邊界檢查
```

**Linus 會說**：
> "Three different ways to handle errors? This is a fucking mess. Pick ONE and stick with it."

---

### 3. **破壞性分析** 🔴 CRITICAL ISSUES

#### 💣 **問題 1: stage.js - 陣列越界炸彈**

**位置**: [stage.js:20-42](sdl-backend-main/controllers/stage.js#L20-L42)

**原始程式碼**:
```javascript
const stageId = process[0].stage[currentStage-1];  // 💥 沒檢查 process[0] 是否存在
const sub_stageId = stage[0].sub_stage[currentSubStage-1];  // 💥 沒檢查陣列邊界
```

**問題**:
1. `process[0]` 可能是 `undefined` → `Cannot read property 'stage' of undefined`
2. `currentStage-1` 可能超出陣列範圍 → 返回 `undefined`
3. `stage[0].sub_stage[currentSubStage-1]` 鏈式崩潰 → 整個系統掛掉

**實際影響**:
- 使用者輸入錯誤的階段編號 → **500 錯誤，系統崩潰**
- 資料庫資料不一致 → **無法復原，需要人工介入**
- 其他功能受影響 → **違反「Never break userspace」原則**

**修復方案**: 已修復，加入完整的邊界檢查

---

#### ⚠️ **問題 2: submit.js - Transaction Rollback 不完整**

**位置**: [submit.js:131-135](sdl-backend-main/controllers/submit.js#L131-L135)

**原始程式碼**:
```javascript
try { await t.rollback(); } catch (_) {}  // 🤔 吞掉錯誤是正確的嗎？
```

**問題**:
- 如果 rollback 失敗，資料庫可能處於**不一致狀態**
- 無法得知 rollback 失敗的原因 (連接斷開? 死鎖?)
- 使用者看到「提交失敗」但資料庫可能已部分寫入

**建議改進**:
```javascript
try {
    await t.rollback();
} catch (rollbackError) {
    console.error('❌❌❌ CRITICAL: Transaction rollback failed:', rollbackError);
    // 這裡應該觸發監控警報 (例如 Sentry, CloudWatch)
}
```

---

#### ⚠️ **問題 3: assistant.js - LLM 失敗的降級策略不完整**

**位置**: [assistant.js:381-388](sdl-backend-main/controllers/assistant.js#L381-L388)

**原始程式碼**:
```javascript
} catch (error) {
    console.error('LLM analysis failed, using fallback | LLM 分析失敗，使用基本統計:', error);
    return generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta });
}
```

**問題**:
- 降級到基本統計是好的 ✅
- 但**沒有通知使用者**正在使用降級版本 ❌
- 使用者可能誤以為是完整的 AI 分析結果

**建議改進**:
```javascript
return {
    ...generateBasicSummaries({ kanban, ideaWall, submissions, stageMeta }),
    degradedMode: true,
    warning: "AI 服務暫時不可用，目前顯示基本統計資料"
};
```

---

### 4. **前端錯誤處理** ✅ 整體良好

**讚賞的部分**:

1. **extractErrorMessage()** 處理完整 [dailyErrorCodes.js:264-304](sdl-frontend-main/src/constants/dailyErrorCodes.js#L264-L304)
   ```javascript
   // 多層 fallback 機制
   if (messageZh) return messageZh;
   if (errorCode) return getErrorMessage(errorCode, message);
   if (message) return getErrorMessage(null, message);
   return DAILY_ERROR_CODES.UNKNOWN_ERROR.zh;
   ```

2. **Reflection.jsx** 使用 toast 顯示錯誤訊息 ✅
   - 使用者在任何錯誤情況下都能看到提示
   - 錯誤不會導致頁面崩潰

**需要改進的部分**:

1. **announcement.js / project.js** 缺少統一的錯誤處理
   ```javascript
   // 目前
   catch (error) {
       console.error("Failed to get announcements | 無法獲取公告列表:", error);
       throw error;  // 直接拋出，上層需要處理
   }

   // 建議
   catch (error) {
       console.error("Failed to get announcements:", error);
       throw {
           code: error.response?.data?.errorCode || 'UNKNOWN_ERROR',
           message: extractErrorMessage(error)
       };
   }
   ```

---

## 【Linus 式方案】

### ✅ 第一優先：修復 stage.js 炸彈 (已完成)

**修復內容**:
- 加入 5 層防護檢查 (參數、process、stage、sub_stage、邊界)
- 每一層失敗都有明確的錯誤訊息
- 所有錯誤路徑都返回正確的 HTTP 狀態碼

**修復效果**:
```diff
- const stageId = process[0].stage[currentStage-1];
+ if (!process || process.length === 0) {
+     return res.status(404).json({ error: 'Process not found' });
+ }
+ if (currentStage > process[0].stage.length) {
+     return res.status(400).json({ error: 'Invalid stage index' });
+ }
+ const stageId = process[0].stage[currentStage-1];
```

---

### 🔄 第二優先：統一錯誤處理格式

**submit.js 需要改進**:
```diff
- return res.status(400).send({ message: 'Content is required | 請填寫表單內容' });
+ const errorResponse = createErrorResponse('EMPTY_CONTENT');
+ return res.status(400).json(errorResponse);
```

**為什麼重要**?
1. 前端 `extractErrorMessage()` 期望特定格式 (`errorCode`, `message`, `messageZh`)
2. 目前的 `{ message: '...' }` 格式會走 fallback 路徑，效率低
3. 未來新增錯誤碼時，`submit.js` 會被遺漏

---

### 📊 第三優先：加入監控和警報

**關鍵錯誤需要即時通知**:
```javascript
// 在 assistant.js 中
if (result?.provider === 'fallback') {
    // 發送警報到 Sentry / CloudWatch
    logger.warn('LLM_FALLBACK', { projectId, reason: error.message });
}

// 在 submit.js 中
catch (rollbackError) {
    logger.critical('TRANSACTION_ROLLBACK_FAILED', {
        submitId,
        originalError: err.message,
        rollbackError: rollbackError.message
    });
}
```

---

## 【測試建議】

### 單元測試重點

#### 1. **stage.js 邊界測試** (高優先級)
```javascript
describe('getSubStage', () => {
    it('應該拒絕不存在的 projectId', async () => {
        const res = await request(app)
            .post('/stage/substage')
            .send({ projectId: 999999, currentStage: 1, currentSubStage: 1 });
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('Process not found');
    });

    it('應該拒絕超出範圍的 stage 索引', async () => {
        const res = await request(app)
            .post('/stage/substage')
            .send({ projectId: 1, currentStage: 999, currentSubStage: 1 });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid stage index');
    });
});
```

#### 2. **submit.js Transaction 測試**
```javascript
it('應該在檔案上傳失敗後正確 rollback', async () => {
    // Mock MinIO 上傳失敗
    minioClient.putObject.mockRejectedValue(new Error('Connection timeout'));

    const res = await request(app)
        .post('/submit')
        .attach('file', 'test.pdf')
        .send({ projectId: 1, content: 'test' });

    expect(res.status).toBe(500);

    // 驗證資料庫沒有留下部分記錄
    const submits = await Submit.findAll({ where: { projectId: 1 } });
    expect(submits.filter(s => s.content === 'test').length).toBe(0);
});
```

#### 3. **前端錯誤處理測試**
```javascript
describe('extractErrorMessage', () => {
    it('應該正確提取後端標準格式錯誤', () => {
        const error = {
            response: {
                data: { errorCode: 'EMPTY_TITLE', messageZh: '請輸入標題' }
            }
        };
        expect(extractErrorMessage(error)).toBe('請輸入標題');
    });

    it('應該處理網路錯誤', () => {
        const error = { message: 'Network Error' };
        expect(extractErrorMessage(error)).toBe('網路連接失敗');
    });
});
```

---

## 【程式碼品味評分】

### 🟢 好品味的部分 (Good Taste)

1. **錯誤碼統一管理** (dailyErrorCodes.js)
   - 單一資料來源 (Single Source of Truth)
   - 前後端共用相同定義
   - 評分: **9/10** (扣 1 分因為 submit.js 沒用)

2. **daily.js 錯誤處理**
   - 一致的錯誤格式
   - 完整的 try-catch 覆蓋
   - 評分: **8/10** (扣 2 分因為 audit 錯誤被忽略)

3. **Reflection.jsx 錯誤顯示**
   - 使用者友善的 toast 提示
   - 不會讓錯誤導致頁面崩潰
   - 評分: **8/10** (扣 2 分因為部分錯誤訊息太技術性)

### 🟡 勉強湊合的部分 (Acceptable)

1. **submit.js 錯誤處理**
   - 有 try-catch 但格式不統一
   - Transaction rollback 吞掉錯誤
   - 評分: **6/10**

2. **assistant.js LLM 降級**
   - 有 fallback 機制 ✅
   - 但不通知使用者 ❌
   - 評分: **6/10**

### 🔴 垃圾的部分 (Garbage)

1. **stage.js (原始版本)**
   - 零邊界檢查
   - 生產環境炸彈
   - 評分: **2/10** (已修復後 → **7/10**)

2. **announcement.js / project.js 錯誤處理**
   - 只有 `console.error` + `throw`
   - 沒有使用錯誤碼系統
   - 評分: **4/10**

---

## 【致命問題總結】

| 問題 | 嚴重性 | 位置 | 狀態 |
|------|--------|------|------|
| 陣列越界炸彈 | 🔴 CRITICAL | stage.js:20-42 | ✅ 已修復 |
| Transaction rollback 吞錯誤 | 🟡 WARNING | submit.js:133 | ⏳ 待改進 |
| LLM 降級無提示 | 🟡 WARNING | assistant.js:387 | ⏳ 待改進 |
| 錯誤格式不統一 | 🟡 WARNING | submit.js:15 | ⏳ 待改進 |
| 缺少監控警報 | 🟡 WARNING | 全域 | ⏳ 待實作 |

---

## 【Linus 的最終評語】

> **"The error handling structure is beautiful. The implementation is a fucking disaster."**

翻譯：
- 錯誤碼的設計是對的 ✅
- 但執行不一致，有漏洞 ❌

**核心問題**：你們設計了一套很棒的錯誤處理系統，然後只有 50% 的程式碼在用它。

**類比**：這就像 Linux 核心有了完美的錯誤回傳機制 (`-EINVAL`, `-ENOENT`)，結果有一半的驅動程式還在用 `return NULL` 和 `panic()`。

**修復建議的優先級**：
1. ✅ **已修復**: stage.js 炸彈 (會導致系統崩潰)
2. 🔄 **本週內**: 統一 submit.js 錯誤格式
3. 📊 **兩週內**: 加入 LLM 降級提示
4. 🔍 **一個月內**: 建立監控和警報系統

---

## 【實用主義建議】

### 不要過度設計

你們已經有了 `DAILY_ERROR_CODES`，不需要再設計新的錯誤處理系統。

**錯誤的方向** ❌:
```javascript
class ErrorHandler {
    constructor() { this.errors = new Map(); }
    register(code, handler) { ... }
    handle(error) { ... }
}
```

**正確的方向** ✅:
```javascript
// 就用現有的 createErrorResponse()，確保所有地方都用它
const errorResponse = createErrorResponse('EMPTY_CONTENT');
return res.status(getHttpStatusByErrorCode('EMPTY_CONTENT')).json(errorResponse);
```

### 測試重點

**不要測試**：
- 錯誤碼的文字內容 (這會隨時改變)
- HTTP 狀態碼是否「符合 RESTful 規範」

**應該測試**：
- 邊界條件會返回錯誤 (而不是崩潰)
- 錯誤訊息格式一致 (包含 `errorCode`, `message`, `messageZh`)
- Transaction rollback 真的有復原資料

---

## 【總結】

**優點**：
1. ✅ 錯誤碼系統設計優良
2. ✅ 前端有完整的錯誤提取邏輯
3. ✅ daily.js 執行得很好

**缺點**：
1. ❌ stage.js 有生產環境炸彈 (已修復)
2. ❌ 錯誤處理格式不統一 (submit.js, announcement.js)
3. ❌ 缺少監控和警報機制

**最重要的教訓**：

> **"設計一套好系統很容易，讓團隊每個人都用它才是難的。"**

你們的錯誤處理系統不是技術問題，是**執行一致性**的問題。

**Linus 的建議**：
1. 建立 Code Review Checklist: "是否使用 `createErrorResponse()`?"
2. 建立 ESLint 規則: 禁止 `res.status(400).send({ message: '...' })`
3. 建立自動化測試: 驗證所有 API 錯誤回應格式

---

**報告結束。程式碼已修復。繼續前進。**

*"Talk is cheap. Show me the code." - Linus Torvalds*
