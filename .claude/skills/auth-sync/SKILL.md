---
name: auth-sync
description: "檢查並同步 Login、Register、ForgotPassword 三個 auth 頁面的樣式一致性。用表格顯示差異，讓你選擇要同步哪些項目。"
---

# Auth 頁面一致性同步 Skill

當使用者執行 `/auth-sync` 時，掃描三個 auth 頁面並比對一致性。

## 使用方式
```
/auth-sync          # 檢查並顯示差異報告
/auth-sync fix      # 檢查後自動同步所有差異
/auth-sync fix <項目>  # 只同步特定項目（如 /auth-sync fix 品牌面板寬度）
```

## Auth 頁面路徑
- `sdl-frontend-main/src/pages/Login.jsx`
- `sdl-frontend-main/src/pages/Register.jsx`
- `sdl-frontend-main/src/pages/ForgotPassword.jsx`

## 執行步驟

### 步驟 1：讀取三個頁面

同時讀取三個檔案，提取以下關鍵值：

**品牌面板（左側）：**
- 寬度 class（`w-1/2`, `w-2/5` 等）
- 背景色（`bg-customgreen`, `bg-green-*` 等）
- 是否有漸層（`from-*`, `to-*`）
- 隱藏斷點（`hidden md:flex`, `hidden lg:flex` 等）

**表單面板（右側）：**
- 寬度 class
- 垂直置中方式（`items-center`, `justify-center`）
- 最大寬度（`max-w-md`, `max-w-sm` 等）

**動畫：**
- 動畫速度（`duration-fast`, `duration-normal`, `duration-slow` 或具體 ms 值）
- 動畫類型（`transition-*`, `animate-*`）

**整體佈局：**
- 外層容器 class（`h-screen`, `min-h-screen`, `overflow-hidden` 等）
- Flex 方向

**密碼欄位（若有）：**
- 是否有顯示/隱藏切換按鈕

### 步驟 2：產出差異報告

```
## Auth 頁面一致性報告

| 項目 | Login | Register | ForgotPassword | 狀態 |
|------|-------|----------|----------------|------|
| 品牌面板寬度 | w-1/2 | w-2/5 | w-1/2 | ⚠️ 不一致 |
| 背景色 | customgreen | customgreen | customgreen | ✅ |
| 動畫速度 | duration-normal | duration-fast | duration-normal | ⚠️ 不一致 |
| 外層佈局 | h-screen overflow-hidden | h-screen | h-screen overflow-hidden | ⚠️ 不一致 |
| 響應式斷點 | hidden md:flex | hidden lg:flex | hidden md:flex | ⚠️ 不一致 |
| 密碼顯示切換 | ✅ 有 | ✅ 有 | - (無密碼欄) | ✅ |

共發現 N 處不一致。
```

若**完全一致**，回報「✅ 三個頁面樣式完全一致，無需同步」。

### 步驟 3：詢問如何處理（若未帶 fix 參數）

```
發現以上 N 處差異。要如何處理？
1. 全部同步（以 Login.jsx 為基準）
2. 選擇性同步
3. 只查看報告，暫不修改
```

### 步驟 4：執行同步

**同步基準：以 Login.jsx 為準**（除非使用者指定其他頁面）

修改時：
- 每次只修改一個檔案
- 修改後列出具體變更的 class 名稱
- 完成後再次執行步驟 1-2 驗證一致性

### 步驟 5：驗證報告

同步完成後，再跑一次比對，確認所有 ✅。

## 注意事項
- ForgotPassword 頁面沒有密碼欄位，跳過密碼相關項目的比對
- 若三個頁面各有不同邏輯需求（如 Register 有更多欄位），只同步視覺樣式，不改動表單結構
- 修改前先確認使用者想以哪個頁面為基準
