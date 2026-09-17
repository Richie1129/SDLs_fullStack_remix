# 007 — 移除稽核中確認無人引用的動畫元件、CSS class 與相依套件

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: LOW（清理；但這些死碼各含教科書級違例，容易被複製沿用）
- **Category**: 7. Cohesion & tokens
- **Estimated scope**: 刪除 4 個檔案、CSS 4 個區塊、package.json 1 行

## Problem

稽核發現以下檔案與樣式在 `sdl-frontend-main/src` 內沒有任何 import 或 class 引用（已於 df1cb1b 用 `grep -rlF` 逐一確認）。它們各自帶著會誤導後續開發的動畫寫法：

| 項目 | 違規內容 |
|---|---|
| `src/components/sideNav.jsx` | `initial={{ scale: 0 }}`（從無到有的縮放）、`whileHover={{ scale: 1.05 }}` |
| `src/components/AnimatedHamburgerButton.jsx` | 500ms 對稱 toggle、keyframe 陣列中途反向會重播 |
| `src/pages/Kanban/k.JSX` | 舊版 Kanban，含 `transition ease-in-out duration-300` 三處 |
| `src/pages/ideaWall/components/IdeaWallSideBar.jsx` | `duration-500` 無 `transition-*`、每項 100ms 遞增延遲 |
| `src/styles/glassmorphism.css` 的 `.glass-card-hover`、`.card-hover`、`.progress-bar`、`.tab-button` | `transition: all` 與 `backdrop-filter` 共存、hover scale/translate、1s width 過渡 |
| `package.json` 的 `react-type-animation` | 已安裝但零使用 |

```css
/* sdl-frontend-main/src/styles/glassmorphism.css:12-20 — current */
/* Glass Card Hover 效果 */
.glass-card-hover {
  transition: all 0.25s ease;
}

.glass-card-hover:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
}
```

```css
/* sdl-frontend-main/src/styles/glassmorphism.css:48-51 — current */
/* 進度條動畫 */
.progress-bar {
  transition: width 1s ease-out;
}

/* 卡片 Hover 效果 */
.card-hover {
  transition: all 0.25s ease;
}

.card-hover:hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}
```

`.tab-button` 區塊在同檔第 99 行起（`transition: all 0.25s ease` 加 `:hover` / `.active` 的 background 與 color）。

## Target

上述檔案與區塊全部移除。`glassmorphism.css` 保留 `.glass-card`、`.glass-card-dark`、`.gradient-text`、`.icon-bg`、`.btn-ripple`（後兩者仍有使用者）以及 `@supports` 降級區塊。

## Repo conventions to follow

- 刪除前必須再次以 `grep -rlF` 確認零引用（Steps 第 1 步），不能只信任本計畫的紀錄。
- 相依套件移除用 `npm uninstall`，讓 `package-lock.json` 同步更新。

## Steps

1. 再次確認零引用（在 `sdl-frontend-main/` 下執行），每一條都必須無輸出才能繼續：
   ```bash
   grep -rlF "sideNav" src | grep -v "components/sideNav.jsx"
   grep -rlF "AnimatedHamburgerButton" src | grep -v "AnimatedHamburgerButton.jsx"
   grep -rlF "Kanban/k'" src; grep -rlF 'Kanban/k"' src
   grep -rlF "IdeaWallSideBar" src | grep -v "IdeaWallSideBar.jsx"
   grep -rn "glass-card-hover\|card-hover\|progress-bar\|tab-button" src index.html | grep -v "glassmorphism.css"
   grep -rn "react-type-animation" src
   ```
   任一條有輸出，停止並回報該項目，其餘項目照常進行。
2. 刪除四個檔案：`src/components/sideNav.jsx`、`src/components/AnimatedHamburgerButton.jsx`、`src/pages/Kanban/k.JSX`、`src/pages/ideaWall/components/IdeaWallSideBar.jsx`。
3. `src/styles/glassmorphism.css`：刪除 `.glass-card-hover` 與 `.glass-card-hover:hover`（含上方註解）、`.progress-bar`（含註解）、`.card-hover` 與 `.card-hover:hover`（含註解）、`.tab-button` 及其 `:hover` / `.active` 相關規則（含註解）。
4. `npm uninstall react-type-animation`。
5. 若計畫 002 已執行，`src/index.css` 的 `@media (prefers-reduced-motion: reduce)` 區塊內移除 `.glass-card-hover:hover,` 與 `.card-hover:hover,` 兩個選擇器（它們已不存在），保留 `.group:hover .icon-bg`。

## Boundaries

- 不刪除 `.glass-card`、`.icon-bg`、`.btn-ripple`（有使用者）。
- 不動 `src/components/SideBar.jsx`（這是實際使用中的側欄，與 `sideNav.jsx` 不同檔）。
- 不刪除 `lottie-react`、`framer-motion` 等其他套件。
- 不做任何重構或搬移。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  ls src/components/sideNav.jsx src/components/AnimatedHamburgerButton.jsx src/pages/Kanban/k.JSX src/pages/ideaWall/components/IdeaWallSideBar.jsx 2>&1 | grep -c "No such file"   # 預期 4
  grep -c "glass-card-hover\|card-hover\|progress-bar\|tab-button" src/styles/glassmorphism.css                                                                          # 預期 0
  grep -c "react-type-animation" package.json                                                                                                                             # 預期 0
  npm run build
  npx vitest run
  ```
- **Feel check**：啟動 dev 環境，走一遍首頁、Kanban、IdeaWall、教師儀表板（QuickActions 的 `btn-ripple` 按鈕）、圖表卡片 hover（`icon-bg`），確認沒有樣式遺失或 console 的 import 錯誤。
- **Done when**：三條 grep / ls 符合預期、build 與測試通過、四個頁面無錯誤。
