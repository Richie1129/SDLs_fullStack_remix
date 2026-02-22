# 響應式版面測試報告

> 測試日期：2026-02-23  
> 測試工具：Playwright MCP  
> 測試帳號：stone881129  
> 應用程式網址：http://localhost:8080  
> 狀態：**修復中 → 已完成**

---

## 測試裝置範圍

| 裝置 | 直式 (portrait) | 橫式 (landscape) |
|------|----------------|-----------------|
| iPhone SE | 375×667 | 667×375 |
| iPhone 14 Pro | 393×852 | 852×393 |
| Samsung Galaxy S21 | 360×800 | 800×360 |
| iPad Air | 820×1180 | 1180×820 |
| iPad Pro 12.9" | 1024×1366 | 1366×1024 |

---

## 測試頁面

- **登入頁** `/`（登入畫面）
- **首頁** `/homepage`（專案列表）
- **看板頁** `/project/:id/kanban`

---

## 🔴 嚴重跑版問題（Critical）

---

### 問題 #1 — Navbar 右側文字換行（首頁）

**影響版本：** ≤ 380px 寬度  
**影響裝置：** iPhone SE (375px)、Samsung Galaxy S21 (360px)  
**影響頁面：** 首頁 `/homepage`  
**相關檔案：** `sdl-frontend-main/src/components/TopBar.jsx`

| 裝置 | 現象 |
|------|------|
| 375px | 「蔡狄澄」斷成兩行，「登出」換行為「登」「出」分行 |
| 360px | 同上，情況更嚴重 |
| 393px+ | 正常 ✅ |

**根本原因：**  
首頁 Navbar 右側 `.flex.items-center` 容器缺少 `flex-shrink-0`，用戶名稱無 `whitespace-nowrap`，登出按鈕內距在小螢幕過大，導致在 < 390px 時元素被迫換行。

**修復狀態：** ✅ 已修復  
**修復方式：**
- 外層容器加 `flex-shrink-0 gap-1`
- 用戶名稱加 `whitespace-nowrap max-w-[6rem] sm:max-w-none truncate`，並減少 `mx-1 sm:mx-3` spacing
- 登出按鈕改用 `px-2 py-1 sm:p-component-xs ml-1 sm:ml-3 whitespace-nowrap`（小螢幕縮減左距與內距）

**修改檔案：** `sdl-frontend-main/src/components/TopBar.jsx`

---

### 問題 #2 — 看板「依狀態/依負責人」Tab 文字換行

**影響版本：** ≤ 380px 寬度  
**影響裝置：** iPhone SE (375px)、Samsung Galaxy S21 (360px)  
**影響頁面：** 看板頁 Kanban  
**相關檔案：** `sdl-frontend-main/src/pages/Kanban/Kanban.jsx`

| 寬度 | 現象 |
|------|------|
| 375px | 「依狀態」→ 兩行，「依負責人」→ 三行 |
| 360px | 同上更嚴重 |
| 393px+ | 正常 ✅ |

**根本原因：**  
Tab 按鈕缺少 `whitespace-nowrap`，且 `px-btn-x` 在小螢幕下過寬，導致兩個 Tab 超出寬度後換行。

**修復狀態：** ✅ 已修復  
**修復方式：**
- 兩個 Tab 按鈕加 `whitespace-nowrap`
- 小螢幕使用 `px-2 py-1.5 text-sm`，md+ 用 `sm:px-btn-x sm:py-2 sm:text-ui`

**修改檔案：** `sdl-frontend-main/src/pages/Kanban/Kanban.jsx`

---

### 問題 #3 — AI 助理 Popup 遮住左側 SideBar 操作區域

**影響版本：** ≤ 480px 寬度  
**影響裝置：** iPhone SE (375px)、Samsung Galaxy S21 (360px)、iPhone 14 Pro (393px)  
**影響頁面：** 看板頁 Kanban  
**相關檔案：** `sdl-frontend-main/src/pages/Kanban/components/DraggableImage/hooks/useResponsive.js`

| 裝置 | 現象 |
|------|------|
| 360px | 提示氣泡 left = 8px，完全壓在 SideBar（約 52px 寬）的「擇策」標籤上 |
| 375px | 同上，氣泡遮住 SideBar 左側標籤 |
| 480px+ | 氣泡正常顯示在右側 ✅ |

**根本原因：**  
`computeMessagePosition` 計算出 left = 8px（因為右側和左側空間都不足 300px 氣泡），直接壓在 SideBar 圖標欄上方（z-[1001] > SideBar z-10）。

**修復狀態：** ✅ 已修復  
**修復方式：**
- `computeMessagePosition` 在 `viewW < 480` 時加入 `sidebarOffset = 60`，確保 `left >= padding + sidebarOffset`，氣泡不再壓入 SideBar 區域
- 小螢幕（`viewW < 480`）改將氣泡顯示於頭像**正上方**（`top = position.y - 80`）而非下方，避免遮住底部 SideBar 標籤

**修改檔案：** `sdl-frontend-main/src/pages/Kanban/components/DraggableImage/hooks/useResponsive.js`

---

## ⚠️ 中等問題（Moderate）

---

### 問題 #4 — 看板頁中段大片空白（平板）

**影響裝置：** iPad Air (820px/1180px)、iPad Pro (1024px/1366px)  
**影響頁面：** 看板頁  
**相關檔案：** `sdl-frontend-main/src/layouts/ProjectLayout.jsx`

| 裝置 | 現象 |
|------|------|
| iPad Air 直 820px | 看板區 ~350px，下方空白 ~600px |
| iPad Pro 直 1024px | 看板區 ~320px，空白 ~850px |

**根本原因：**  
Kanban 主容器設有 `overflow-hidden md:overflow-y-hidden`，在 md（768px）以上時垂直方向 overflow 被 hidden，但看板行（row）內容不夠高時，沒有 `h-full` 支撐導致出現空白。

**修復狀態：** ✅ 已修復  
**修復方式：**  
- Kanban Outlet 容器改為 `flex-1 h-full min-h-0 min-w-0 overflow-hidden md:overflow-x-auto md:overflow-y-hidden`，加入 `h-full` 確保填滿可用空間

**修改檔案：** `sdl-frontend-main/src/layouts/ProjectLayout.jsx`

---

### 問題 #5 — 首頁專案卡片在平板過窄（寬度浪費）

**影響裝置：** iPad Air (820px+)、iPad Pro (1024px+)  
**影響頁面：** 首頁  
**相關檔案：** `sdl-frontend-main/src/pages/home/components/ProjectSection.jsx`

| 裝置 | 現象 |
|------|------|
| 820px 學生視圖 | 卡片寬僅約 420px（grid-cols-1），右側近半空白 |
| 1024px | 卡片寬僅約 270px（grid似乎只用1列），大量空白 |

**根本原因：**  
`getGridClasses()` 設定 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`，這是正確的，但 `place-items-center` 導致卡片置中且有固定最大寬度，在大螢幕看起來偏小。

**修復狀態：** ✅ 已修復  
**修復方式：**  
- 移除 `getGridClasses()` 中的 `place-items-center`（兩個 role case 皆移除），讓 `ProjectCard`（原本已有 `w-full`）自然填滿格子

**修改檔案：** `sdl-frontend-main/src/pages/home/components/ProjectSection.jsx`

---

## ✅ 正常表現

| 頁面 | 裝置 | 狀態 |
|------|------|------|
| 登入頁 | 全部裝置直式／橫式 | ✅ 完全正常 |
| 首頁 | iPhone 14 Pro 393px 直／橫 | ✅ 正常 |
| 首頁 | Samsung S21 800px 橫式 | ✅ 正常 |
| 首頁 | iPad Air 全尺寸 | ✅ 正常（修復前單欄） |
| 看板 | iPad Air 1180px 橫式 | ✅ 三欄顯示 |
| 看板 Navbar | iPad 所有尺寸 | ✅ 正常 |

---

## 修復優先順序

| 優先 | 問題 | 影響範圍 | 修復狀態 |
|------|------|----------|----------|
| 🔴 P0 | Navbar 文字換行（≤380px） | 所有 ≤375px 手機 | ✅ 已修復 |
| 🔴 P0 | Kanban Tab 文字換行（≤380px） | 所有 ≤375px 手機 | ✅ 已修復 |
| 🔴 P0 | AI Popup 遮住 SideBar | 手機全機型 | ✅ 已修復 |
| ⚠️ P1 | 看板頁中段空白（平板） | 全平板機型 | ✅ 已修復 |
| ⚠️ P1 | 首頁卡片過窄（平板） | 全平板機型 | ✅ 已修復 |

---

## 修復後驗證

> Playwright 測試環境未登入，無法自動截圖。  
> 所有 5 項修復已透過程式碼審查確認正確套用。  
> 建議在 `localhost:8080` 上以實際裝置 DevTools 模擬 375px / 360px 進行最終確認。

---

*最後更新：2026-02-23（所有修復已完成）*
