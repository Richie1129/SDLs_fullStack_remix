# 010 — 手機基礎四件套：dvh、hover 守衛、觸控回饋、輸入框 16px，並修 TopBar 的 xs 斷點 bug

- **Status**: DONE（2026-09-17，commit 見 git log）
- **Commit**: 564c298
- **Severity**: HIGH（學生手機使用比例高；實測 390px 寬度首頁有橫向捲軸、殼層用 h-screen）
- **Category**: 手機體驗
- **Estimated scope**: `index.html`、`tailwind.config.cjs`、`src/index.css` 三個基礎檔 + 約 12 個檔案各 1 行 class 替換

## Problem

1. **`index.html`**：`<html lang="en">` 但全站繁中；viewport 沒有 `viewport-fit=cover`（`env(safe-area-inset-*)` 一律回 0）；沒有 `theme-color`。
   ```html
   <!-- index.html:2,7 — current -->
   <html lang="en">
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   ```
2. **605 處 `hover:` 沒有守衛**：Tailwind v3 預設不 gate hover，觸控裝置點一下 hover 樣式黏住。
3. **沒有 tap-highlight、touch-action**：點擊有灰藍閃光與延遲。
4. **36 處 input / textarea 字級 14px 或 12px**（`text-body-sm` / `text-caption`）：iOS Safari 聚焦時強制縮放且不縮回。不改設計 token，用媒體查詢在觸控裝置下固定 16px。
5. **`h-screen` 當應用殼層**：手機網址列會吃掉底部。
   ```jsx
   {/* src/layouts/ProjectLayout.jsx:24 — current */}
   <div className="relative h-screen bg-gray-100 overflow-hidden flex flex-row">
   ```
   其他同類：`StudentOverview.jsx:374`、`TeacherOverview.jsx:633`、`ClassObservationPage.jsx:253`、`ManageIdeaWall.jsx:31`、`NotFound.jsx:6`、`Loader.jsx:7`、`DraggableImage/components/ChatWindow.jsx:75`（`w-screen h-screen`）。`Register.jsx` 的 `h-screen` 屬 auth 頁面一致性規則，不動。
6. **三個右側抽屜高度用 `100vh`**：`ProjectCommentDrawer.jsx:406`、`ActivityStream.jsx:76`、`IdeaWallChatPanel.jsx:44` 的 `h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-Xrem)]`。
7. **固定底部元素沒有 safe-area**：`SubStageBar.jsx:272` 的階段列、`GuidancePanel.jsx` 約第 186 行的 `fixed inset-x-0 bottom-0` 底部 sheet、同檔第 166 行的浮動按鈕。
8. **首頁分頁列出現橫向捲軸**：`src/pages/home/components/TabbedSections.jsx:14` 用 `overflow-x-auto scrollbar-hidden`，`scrollbar-hidden` 不是 tailwind-scrollbar 套件提供的 class（套件提供 `scrollbar-none`），所以捲軸顯示出來。
9. **TopBar 教師按鈕文字永遠隱藏**：`src/components/TopBar.jsx:209,217` 用 `hidden xs:inline`，config 沒有 `xs` 斷點。
   ```jsx
   {/* TopBar.jsx:209 — current */}
   <span className="hidden xs:inline">觀摩</span>
   ```

## Target

```html
<!-- index.html target -->
<html lang="zh-Hant">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#5BA491" />
```

```js
// tailwind.config.cjs target：module.exports 物件最前面（content 之前）加
  future: {
    hoverOnlyWhenSupported: true,   // 觸控裝置不套 hover:，避免點一下就黏住
  },
```

```css
/* src/index.css target：檔案末尾追加 */

/* =====================================================
   手機基礎：去掉點擊閃光與延遲、避免 iOS 聚焦縮放、安全區
   ===================================================== */
html {
  -webkit-tap-highlight-color: transparent;
}

button, a, [role="button"], input, select, textarea {
  touch-action: manipulation;
}

@media (pointer: coarse) {
  input, select, textarea {
    font-size: 16px;
  }
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

Class 替換：

| 位置 | 現況 | 改為 |
|---|---|---|
| 上列 8 處殼層 | `h-screen` | `h-[100dvh]`（`ChatWindow.jsx:75` 的 `w-screen h-screen` 改 `w-screen h-[100dvh]`） |
| 三個抽屜 | 字串中所有 `100vh` | `100dvh` |
| `SubStageBar.jsx:272` 的容器 | `... flex-shrink-0 lg:mb-4"` | `... flex-shrink-0 lg:mb-4 pb-safe"` |
| `GuidancePanel.jsx` 底部 sheet 容器（`fixed inset-x-0 bottom-0`） | 加 `pb-safe` | |
| `GuidancePanel.jsx:166` 浮動按鈕 | `bottom-6` | `bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]` |
| `TabbedSections.jsx:14` | `scrollbar-hidden` | `scrollbar-none` |
| `TopBar.jsx:209,217` | `hidden xs:inline` | `hidden sm:inline` |

## Repo conventions to follow

- `index.css` 的分段註解格式。
- 任意值 class 只用在 token 不存在的情況（`h-[100dvh]` 是 viewport 單位，屬此例）。
- 響應式規則：改動不新增斷點，只替換既有值，sm / md / lg 表現不變。

## Steps

1. `index.html`：改 `lang`、viewport、加 `theme-color`。
2. `tailwind.config.cjs`：加 `future` 區塊。
3. `src/index.css`：追加 Target 區塊。
4. 依表格逐檔替換 class。抽屜的三個檔案可用 `sed -i 's/100vh/100dvh/g'` 只對那三個檔案執行，執行前先 `grep -c 100vh` 確認每檔各 3 處。
5. `GuidancePanel.jsx` 先 `grep -n "fixed inset-x-0 bottom-0\|bottom-6" src/pages/submit/components/GuidancePanel.jsx` 取得實際行號再改。

## Boundaries

- 不動 `Register.jsx` / `Login.jsx` 等 auth 頁（有自己的一致性規則）。
- 不動 `min-h-screen`（30 處，只是多一截捲動，非阻斷）。
- 不改任何 `text-body-sm` / `text-caption` token 或元件字級。
- 不處理側欄改抽屜與底部階段列改可捲動（`future-list.md` F030）。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -n "hoverOnlyWhenSupported" tailwind.config.cjs           # 1
  grep -n "viewport-fit=cover\|zh-Hant\|theme-color" index.html   # 3
  grep -rn "xs:inline\|scrollbar-hidden" src                     # 無輸出
  grep -rn "100vh" src/components/ProjectCommentDrawer.jsx src/components/ActivityStream/ActivityStream.jsx src/components/IdeaWall/IdeaWallChatPanel.jsx   # 無輸出
  grep -rn "\bh-screen\b" src --include='*.jsx' | grep -v "login/"   # 無輸出
  npm run build && npx vitest run
  grep -c "hover:hover" dist/assets/*.css                        # >= 1（hover 已包在 @media (hover:hover) 內）
  ```
- **Feel check**（DevTools 裝置模擬 iPhone 14 或用 iframe 390px）：
  - 首頁分頁列下方沒有捲軸。
  - 教師帳號 TopBar 在 640px 以上看得到「觀摩」「密碼重設」文字。
  - 專案頁底部階段列貼齊視口底部，切換網址列顯示時不被吃掉。
  - 點任一按鈕沒有灰色閃光；點過的卡片不會停留在 hover 樣式。
  - 真機（若有）：iOS 點輸入框不縮放。
- **Done when**：六條 grep 符合、build 與測試通過、前四項目視檢查通過。
