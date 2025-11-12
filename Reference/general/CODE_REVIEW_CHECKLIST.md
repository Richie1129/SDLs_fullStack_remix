# Code Review Checklist - 錯誤處理標準

## 🎯 目的

確保專案中所有的錯誤處理遵循統一標準，避免出現**不一致的錯誤格式**導致前端無法正確處理。

---

## ✅ Backend Controller 檢查項目

### 1. 錯誤碼導入檢查

**必須項目**：
```javascript
// ✅ 正確：在檔案開頭導入
const { createErrorResponse, getHttpStatusByErrorCode } = require('../constants/dailyErrorCodes');

// ❌ 錯誤：沒有導入錯誤處理模組
```

**檢查指令**：
```bash
# 檢查是否有檔案沒有導入錯誤處理模組
grep -L "createErrorResponse" sdl-backend-main/controllers/*.js
```

---

### 2. 錯誤回應格式檢查

**標準格式**：
```javascript
// ✅ 正確：使用統一的錯誤格式
const errorResponse = createErrorResponse('ERROR_CODE', optionalMessage);
const statusCode = getHttpStatusByErrorCode('ERROR_CODE');
return res.status(statusCode).json(errorResponse);

// ❌ 錯誤：直接使用字串
return res.status(400).send({ message: '錯誤訊息' });

// ❌ 錯誤：不一致的格式
return res.status(400).json({ error: '錯誤訊息' });
```

**常見錯誤模式**：
- `res.send()` 應該改為 `res.json()`
- `{ message: '...' }` 應該改為 `createErrorResponse()`
- 硬編碼的狀態碼應該改為 `getHttpStatusByErrorCode()`

**檢查指令**：
```bash
# 查找不符合標準的錯誤回應
grep -n "res\.status.*\.send" sdl-backend-main/controllers/*.js
grep -n "message:.*\|" sdl-backend-main/controllers/*.js
```

---

### 3. Try-Catch 覆蓋檢查

**必須項目**：
```javascript
// ✅ 正確：所有 async 函數都有 try-catch
exports.someFunction = async (req, res) => {
    try {
        // 業務邏輯
    } catch (error) {
        console.error("❌ 操作失敗:", error);
        const errorResponse = createErrorResponse('OPERATION_FAILED', error.message);
        const statusCode = getHttpStatusByErrorCode('OPERATION_FAILED');
        return res.status(statusCode).json(errorResponse);
    }
};

// ❌ 錯誤：沒有 try-catch，錯誤會導致整個系統崩潰
exports.someFunction = async (req, res) => {
    const data = await Model.findAll(); // 💣 沒有錯誤處理
    res.json(data);
};
```

---

### 4. Transaction Rollback 檢查

**標準格式**：
```javascript
// ✅ 正確：rollback 失敗時記錄關鍵錯誤
try {
    await t.rollback();
} catch (rollbackError) {
    console.error('❌❌❌ CRITICAL: Transaction rollback failed:', {
        originalError: err.message,
        rollbackError: rollbackError.message,
        contextData: {...},
        timestamp: new Date().toISOString()
    });
    // TODO: 觸發監控警報 (Sentry, CloudWatch 等)
}

// ❌ 錯誤：吞掉 rollback 錯誤
try { await t.rollback(); } catch (_) {}

// ❌ 錯誤：沒有 rollback
catch (err) {
    return res.status(500).json({ error: err.message });
}
```

**檢查指令**：
```bash
# 查找不安全的 rollback 模式
grep -n "catch (_)" sdl-backend-main/controllers/*.js
grep -n "sequelize.transaction" sdl-backend-main/controllers/*.js | xargs grep -L "rollback"
```

---

### 5. 參數驗證檢查

**標準格式**：
```javascript
// ✅ 正確：在業務邏輯前驗證所有必要參數
if (!projectId || isNaN(currentStage) || isNaN(currentSubStage)) {
    const errorResponse = createErrorResponse('INVALID_PARAMETERS', 'Missing required parameters');
    return res.status(400).json(errorResponse);
}

// ❌ 錯誤：直接使用未驗證的參數
const stageId = process[0].stage[currentStage - 1]; // 💣 沒檢查 process[0] 是否存在
```

**必須檢查**：
- null/undefined 檢查
- 陣列邊界檢查
- 類型驗證 (parseInt, parseFloat)

---

### 6. 陣列訪問檢查

**標準格式**：
```javascript
// ✅ 正確：訪問陣列前檢查
if (!array || !Array.isArray(array) || index < 0 || index >= array.length) {
    const errorResponse = createErrorResponse('INDEX_OUT_OF_BOUNDS');
    return res.status(400).json(errorResponse);
}
const item = array[index];

// ❌ 錯誤：直接訪問陣列
const item = array[index]; // 💣 可能越界

// ❌ 錯誤：鏈式訪問沒有檢查
const data = obj.prop1.prop2[0].prop3; // 💣 任何一層都可能是 undefined
```

**檢查指令**：
```bash
# 查找潛在的陣列越界問題
grep -n "\[.*-.*1\]" sdl-backend-main/controllers/*.js
```

---

## ✅ Frontend API 檢查項目

### 1. 錯誤提取檢查

**標準格式**：
```javascript
// ✅ 正確：使用統一的錯誤提取函數
import { extractErrorMessage } from '@/constants/dailyErrorCodes';

try {
    const response = await apiClient.post('/endpoint', data);
    return response.data;
} catch (error) {
    console.error('操作失敗:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage); // 或直接顯示給使用者
}

// ❌ 錯誤：直接使用 error.message
catch (error) {
    console.error(error);
    throw error; // 前端會看到英文錯誤或技術性訊息
}
```

---

### 2. 使用者反饋檢查

**必須項目**：
```javascript
// ✅ 正確：所有錯誤都顯示給使用者
catch (error) {
    console.error('❌ 創建失敗:', error);
    const errorMessage = extractErrorMessage(error);
    errorNotify(errorMessage); // toast 或其他 UI 提示
}

// ❌ 錯誤：只有 console.error
catch (error) {
    console.error(error); // 使用者不知道發生了什麼
}
```

---

### 3. 加載狀態檢查

**標準格式**：
```javascript
// ✅ 正確：錯誤時清除加載狀態
const [isLoading, setIsLoading] = useState(false);

try {
    setIsLoading(true);
    await someOperation();
} catch (error) {
    errorNotify(extractErrorMessage(error));
} finally {
    setIsLoading(false); // 確保清除加載狀態
}

// ❌ 錯誤：錯誤時沒有清除加載狀態
try {
    setIsLoading(true);
    await someOperation();
    setIsLoading(false); // 💣 錯誤時不會執行
} catch (error) {
    errorNotify(error.message);
}
```

---

## 🔍 自動化檢查工具

### ESLint 規則建議

在 `.eslintrc.js` 中加入：

```javascript
module.exports = {
    rules: {
        // 禁止使用 res.send (應該用 res.json)
        'no-restricted-syntax': [
            'error',
            {
                selector: 'CallExpression[callee.property.name="send"]',
                message: '使用 res.json() 而不是 res.send()'
            }
        ],

        // 要求 async 函數有 try-catch
        'no-async-without-await': 'error',

        // 禁止空的 catch 區塊
        'no-empty': ['error', { 'allowEmptyCatch': false }]
    }
};
```

---

## 📝 Code Review 流程

### Pull Request 檢查清單

**提交前自我檢查**：
- [ ] 所有錯誤回應使用 `createErrorResponse()`
- [ ] 所有 HTTP 狀態碼使用 `getHttpStatusByErrorCode()`
- [ ] 所有 async 函數有 try-catch
- [ ] Transaction rollback 有錯誤記錄
- [ ] 所有陣列訪問有邊界檢查
- [ ] 前端錯誤使用 `extractErrorMessage()`
- [ ] 使用者能看到所有錯誤提示

**Review 時重點檢查**：
1. **錯誤格式一致性** (5分鐘)
   ```bash
   # 快速檢查
   git diff origin/master...HEAD | grep -E "res\.status|createErrorResponse"
   ```

2. **潛在崩潰點** (10分鐘)
   - 陣列訪問
   - 鏈式屬性訪問
   - Transaction 處理

3. **使用者體驗** (5分鐘)
   - 錯誤訊息是否友善
   - 是否有適當的提示

---

## 🚨 常見錯誤模式

### 1. 陣列越界炸彈 💣
```javascript
// ❌ 危險
const item = array[index - 1];

// ✅ 安全
if (!array || index < 1 || index > array.length) {
    return res.status(400).json(createErrorResponse('INDEX_OUT_OF_BOUNDS'));
}
const item = array[index - 1];
```

### 2. Transaction 洩漏 💣
```javascript
// ❌ 危險：rollback 失敗導致資料不一致
try { await t.rollback(); } catch (_) {}

// ✅ 安全
try {
    await t.rollback();
} catch (rollbackError) {
    console.error('❌❌❌ CRITICAL:', rollbackError);
    // 觸發警報
}
```

### 3. 錯誤吞噬 💣
```javascript
// ❌ 危險：使用者不知道發生了什麼
catch (error) {
    console.error(error);
}

// ✅ 安全
catch (error) {
    console.error('❌ 操作失敗:', error);
    const errorMessage = extractErrorMessage(error);
    errorNotify(errorMessage);
}
```

---

## 📊 檢查報告範本

**完成檢查後填寫**：

```markdown
## Code Review Report

### 檢查人：[Your Name]
### 檢查日期：YYYY-MM-DD
### PR 編號：#XXX

### 檢查結果

#### ✅ 通過項目
- [ ] 錯誤格式統一
- [ ] Try-catch 覆蓋完整
- [ ] Transaction 處理正確
- [ ] 參數驗證充分
- [ ] 使用者反饋完整

#### ❌ 發現問題
1. **[檔案名:行號]** - [問題描述]
2. ...

#### 💡 建議改進
1. ...

### 總體評價
- 安全性：⭐⭐⭐⭐⭐
- 一致性：⭐⭐⭐⭐⭐
- 使用者體驗：⭐⭐⭐⭐⭐
```

---

## 🔗 相關文件

- [錯誤碼定義](../backend/constants/dailyErrorCodes.js)
- [程式碼審查報告](./code-review-2025-10-11.md)
- [測試指南](./TESTING_GUIDE.md) (待建立)

---

**最後更新**: 2025-10-11
**維護者**: Development Team
