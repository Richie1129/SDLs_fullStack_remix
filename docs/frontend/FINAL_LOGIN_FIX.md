# 登入 404 問題 - 最終修復

## 🔍 問題根本原因

你訪問的是 `localhost/login`，但前端路由設定中**沒有 `/login` 這個路徑**！

### 路由設定問題

**App.jsx 原始路由：**
```jsx
<Route path="/" element={<RootLayout />}>
  <Route element={<ProtectedLogin />}>
    <Route index element={<Login />} />        // ✅ 只有 "/" 有 Login
    <Route path="register" element={<Register />} />
    // ❌ 沒有 path="login"
  </Route>
  <Route path="*" element={<NotFound />} />    // 所以 /login 會匹配到這裡
</Route>
```

**問題：**
- 根路徑 `/` → 顯示 Login ✅
- `/login` → 找不到路由，顯示 404 ❌

**當 client.js 重定向到 `/login` 時**
```javascript
window.location.assign('/login');  // 跳到 /login
// 但路由裡沒有 /login，所以顯示 404！
```

---

## ✅ 完整修復方案

### 修復 1: 新增 `/login` 路由

**檔案：** `sdl-frontend-main/src/App.jsx`

**第 36 行，新增：**
```jsx
<Route path="login" element={<Login />} />
```

**修復後的路由：**
```jsx
<Route path="/" element={<RootLayout />}>
  <Route element={<ProtectedLogin />}>
    <Route index element={<Login />} />           // "/" 顯示 Login
    <Route path="login" element={<Login />} />    // ✅ "/login" 也顯示 Login
    <Route path="register" element={<Register />} />
  </Route>
</Route>
```

現在兩個路徑都可以訪問登入頁面：
- `localhost/` ✅
- `localhost/login` ✅

---

### 修復 2: 防止 interceptor 在登入頁面重定向

**檔案：** `sdl-frontend-main/src/api/client.js`

```javascript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    // ✅ 只在非登入頁面才重定向
    if ((status === 401 || status === 403) && !currentPath.includes('/login')) {
      localStorage.removeItem('accessToken');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);
```

---

### 修復 3: 使用 SweetAlert 顯示錯誤

**檔案：** `sdl-frontend-main/src/pages/login/Login.jsx`

```javascript
import Swal from 'sweetalert2';

const userLoginMutation = useMutation(userLogin, {
  onError: (err) => {
    let errorMessage = '帳號或密碼錯誤';

    if (err.response) {
      switch (err.response.status) {
        case 400:
          errorMessage = err.response.data.message || '請輸入帳號和密碼';
          break;
        case 401:
          errorMessage = err.response.data.message || '帳號或密碼錯誤';
          break;
        case 500:
          errorMessage = '伺服器錯誤，請稍後再試';
          break;
      }
    }

    // ✅ 使用 SweetAlert 顯示錯誤
    Swal.fire({
      icon: 'error',
      title: '登入失敗',
      text: errorMessage,
      confirmButtonText: '確定',
      confirmButtonColor: '#5BA491'
    });
  }
});
```

---

## 🧪 測試步驟

### 1. 重新啟動前端（如果需要）

```bash
cd sdl-frontend-main
npm run dev
```

### 2. 測試錯誤登入

訪問以下任一網址：
- `http://localhost:5173/`
- `http://localhost:5173/login` （新增的路由）

輸入錯誤的帳號密碼，點擊登入。

**預期結果：**
- ✅ 看到 SweetAlert 彈窗：「登入失敗 - 帳號或密碼錯誤」
- ✅ 頁面停留在登入頁面
- ❌ **不會**看到 404 頁面

### 3. 測試成功登入

輸入正確的帳號密碼，點擊登入。

**預期結果：**
- ✅ 看到 SweetAlert 彈窗：「登入成功 - 歡迎回來，{username}！」
- ✅ 1.5 秒後自動跳轉到首頁

---

## 📋 修復檔案總覽

| 檔案 | 修改內容 | 狀態 |
|-----|---------|------|
| `App.jsx` | 新增 `/login` 路由 | ✅ |
| `client.js` | 修改 interceptor 邏輯 | ✅ |
| `Login.jsx` | 新增 SweetAlert 錯誤提示 | ✅ |

---

## 🎯 問題流程圖

### 修復前（404 問題）

```
輸入錯誤密碼
  ↓
後端返回 401
  ↓
axios interceptor 檢測到 401
  ↓
重定向到 /login
  ↓
路由找不到 /login
  ↓
顯示 404 頁面 ❌
```

### 修復後（正確流程）

```
輸入錯誤密碼
  ↓
後端返回 401
  ↓
axios interceptor 檢測到 401
  ↓
檢查 currentPath = "/login"
  ↓
包含 "/login"，不重定向
  ↓
Login.jsx 的 onError 執行
  ↓
顯示 SweetAlert 彈窗 ✅
```

---

## ✅ 驗證清單

測試完成後，請確認：

- [ ] 訪問 `localhost/` 可以看到登入頁面
- [ ] 訪問 `localhost/login` 可以看到登入頁面（不是 404）
- [ ] 輸入錯誤密碼時顯示 SweetAlert 彈窗
- [ ] 彈窗內容為「帳號或密碼錯誤」
- [ ] 頁面不會跳轉到 404
- [ ] 成功登入後顯示歡迎彈窗
- [ ] 自動跳轉到首頁

---

## 🔧 如果仍有問題

### 清除瀏覽器快取

```javascript
// 在瀏覽器 Console 執行
localStorage.clear();
location.reload();
```

### 確認修改已生效

1. **檢查路由**
   - 瀏覽器訪問 `localhost:5173/login`
   - 應該顯示登入頁面，不是 404

2. **檢查 Console**
   - 按 F12 打開開發者工具
   - 查看 Console 標籤是否有錯誤

3. **檢查 Network**
   - 查看 `/api/users/login` 請求
   - 狀態碼應為 401
   - 不應該有重定向到其他頁面

---

## 📝 總結

這次修復解決了三個關聯的問題：

1. **路由缺失** - 新增 `/login` 路由
2. **Interceptor 過度重定向** - 修改判斷邏輯
3. **錯誤提示不友善** - 使用 SweetAlert

所有修改都是向後相容的，不會影響現有功能。

---

**現在請重新測試，應該可以正常顯示 SweetAlert 了！** 🚀
