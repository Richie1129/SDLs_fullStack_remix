# 登入錯誤修復 - 測試指南

## 🔧 修復的問題

**問題：** 帳號密碼錯誤時，畫面會跳到 404 頁面，而不是顯示 SweetAlert 彈窗。

**根本原因：** axios 的 response interceptor 在收到 401 錯誤時會自動重定向到 `/login`，導致 SweetAlert 無法顯示。

---

## ✅ 修復內容

### 1. 修改 API Client 的 Response Interceptor

**檔案：** `sdl-frontend-main/src/api/client.js:27-44`

**修改前：**
```javascript
// 任何 401 錯誤都會重定向到登入頁面
if (status === 401 || status === 403) {
  localStorage.removeItem('accessToken');
  window.location.assign('/login');
}
```

**修改後：**
```javascript
// 只在「非登入頁面」收到 401/403 時才重定向
// 登入頁面的 401 錯誤由頁面自己處理（使用 SweetAlert）
const currentPath = window.location.pathname;

if ((status === 401 || status === 403) && !currentPath.includes('/login')) {
  localStorage.removeItem('accessToken');
  window.location.assign('/login');
}
```

### 2. Login.jsx 的 SweetAlert 處理

**檔案：** `sdl-frontend-main/src/pages/login/Login.jsx`

**已在前一次修復中完成：**
- ✅ 導入 SweetAlert2
- ✅ 在 `onError` 中使用 `Swal.fire()` 顯示錯誤
- ✅ 根據不同錯誤狀態碼顯示不同訊息

---

## 🧪 測試步驟

### 測試 1: 錯誤的帳號密碼

1. 開啟登入頁面：`http://localhost:3000/login`

2. 輸入錯誤的帳號密碼：
   ```
   帳號: wronguser
   密碼: wrongpassword
   ```

3. 點擊「登入」按鈕

**預期結果：**
- ✅ 應該看到 SweetAlert 彈窗顯示「登入失敗」
- ✅ 彈窗內容：「帳號或密碼錯誤」
- ✅ 頁面**不應該**跳轉到 404 或其他頁面
- ✅ 停留在登入頁面

**不應該出現：**
- ❌ 404 頁面
- ❌ 頁面重新載入
- ❌ 跳轉到其他頁面

---

### 測試 2: 空白帳號或密碼

1. 開啟登入頁面

2. 只輸入帳號，密碼留空：
   ```
   帳號: testuser
   密碼: (空白)
   ```

3. 點擊「登入」

**預期結果：**
- ✅ 應該看到 SweetAlert 彈窗
- ✅ 彈窗內容：「請輸入帳號和密碼」
- ✅ 停留在登入頁面

---

### 測試 3: 正確的帳號密碼

1. 開啟登入頁面

2. 輸入正確的帳號密碼

3. 點擊「登入」

**預期結果：**
- ✅ 應該看到 SweetAlert 彈窗顯示「登入成功」
- ✅ 彈窗內容：「歡迎回來，{username}！」
- ✅ 1.5 秒後自動跳轉到首頁 `/homepage`

---

### 測試 4: 在其他頁面的 401 錯誤（確保不破壞現有功能）

1. 登入成功後進入首頁

2. 手動刪除 localStorage 中的 accessToken：
   ```javascript
   // 在瀏覽器 Console 執行
   localStorage.removeItem('accessToken');
   ```

3. 重新整理頁面或訪問需要認證的 API

**預期結果：**
- ✅ 應該自動重定向到 `/login` 頁面（這是正確的行為）
- ✅ 不會顯示 SweetAlert（因為不在登入頁面）

---

## 🔍 除錯提示

### 如果仍然跳轉到 404

1. **檢查瀏覽器 Console**
   ```javascript
   // 應該看到：
   onError: (err) => {
     console.log(err);
     // ...
   }
   ```

2. **檢查 Network 標籤**
   - 找到 `/api/users/login` 的請求
   - 查看狀態碼（應該是 401）
   - 查看 Response 內容

3. **檢查 axios interceptor 是否正確**
   ```javascript
   // 在瀏覽器 Console 執行
   console.log(window.location.pathname);
   // 在登入頁面應該顯示 "/login"
   ```

### 如果 SweetAlert 沒有顯示

1. **確認 SweetAlert2 已安裝**
   ```bash
   cd sdl-frontend-main
   npm list sweetalert2
   # 應該顯示: sweetalert2@^11.10.5
   ```

2. **檢查 import 是否正確**
   ```javascript
   // Login.jsx 第 9 行
   import Swal from 'sweetalert2';
   ```

3. **測試 SweetAlert 是否可用**
   ```javascript
   // 在瀏覽器 Console 執行
   import('sweetalert2').then(Swal => {
     Swal.default.fire('測試', '這是一個測試彈窗', 'info');
   });
   ```

---

## 📝 修復邏輯說明

### 為什麼要檢查 `currentPath.includes('/login')`？

**情境 1: 在登入頁面（`/login`）**
```javascript
currentPath = '/login'
status = 401 (密碼錯誤)

條件: (status === 401) && !currentPath.includes('/login')
     = true && !true
     = true && false
     = false  ❌ 不重定向

結果:
- 不會重定向
- Login.jsx 的 onError 會執行
- SweetAlert 會顯示 ✅
```

**情境 2: 在其他頁面（例如 `/homepage`）**
```javascript
currentPath = '/homepage'
status = 401 (token 過期)

條件: (status === 401) && !currentPath.includes('/login')
     = true && !false
     = true && true
     = true  ✅ 重定向

結果:
- 會重定向到 /login
- 這是正確的行為（token 過期應該重新登入）✅
```

---

## ✅ 修復驗證清單

測試完成後，請確認以下項目：

- [ ] 錯誤帳號密碼時顯示 SweetAlert 彈窗
- [ ] 彈窗顯示「帳號或密碼錯誤」
- [ ] 頁面不會跳轉到 404
- [ ] 頁面停留在 `/login`
- [ ] 正確登入後顯示「登入成功」彈窗
- [ ] 1.5 秒後自動跳轉到首頁
- [ ] 在其他頁面收到 401 仍會重定向到登入頁（不破壞現有功能）

---

## 🎯 總結

這次修復確保了：

1. **登入頁面的錯誤由頁面自己處理**
   - 使用 SweetAlert 顯示友善的錯誤訊息
   - 不會被 axios interceptor 攔截重定向

2. **其他頁面的認證錯誤仍然正常工作**
   - token 過期時會自動重定向到登入頁
   - 保持原有的安全機制

3. **不破壞現有功能**
   - 只修改了 interceptor 的判斷邏輯
   - 其他頁面的行為保持不變

---

**測試完成後請回報結果！** 🚀
