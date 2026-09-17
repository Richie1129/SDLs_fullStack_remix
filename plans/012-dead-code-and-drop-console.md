# 012 — 移除零引用的檔案、測試路由、相依與孤兒資源；production 去掉 console

- **Status**: TODO
- **Commit**: 564c298
- **Severity**: LOW（純清理；但三條測試路由掛在正式站、209 處 console.log 進 bundle）
- **Category**: 死碼
- **Estimated scope**: 刪 14 個原始檔 + 3 條路由 + 4 個相依 + 約 17 個靜態檔 + 4 個 export；vite.config 加 3 行
- **Depends on**: 011（011 會新增 `SkeletonKanbanColumn`，本計畫刪 SkeletonLoader 其他 export 時要保留它）

## Problem

死碼稽核（2026-09-17）逐一以 `grep -rlF` 驗證零引用的項目：

| 項目 | 行數 |
|---|---|
| `src/pages/teacher-dashboard/utils/dataValidator.js` | 326 |
| `src/test/TrackingTestPage.jsx` + `App.jsx:36,59` 的 `/test-tracking` 路由 | 243 |
| `src/components/ViewableProjects.jsx` | 232 |
| `src/pages/teacher-dashboard/hooks/useApiWithFallback.js` | 194 |
| `src/components/ErrorBoundary/SocketStatusIndicator.jsx`（`ErrorBoundary/index.js` 已用註解移出 barrel） | 192 |
| `src/pages/project/ProjectSettingsPage.jsx`（無路由） | 185 |
| `src/pages/ideaWall/components/OrchestratorMonitor.jsx` | 171 |
| `src/components/ViewingModeComponents.jsx` | 164 |
| `src/pages/ideaWall/components/Timer.jsx` + `src/assets/AnimationTimer.json` | 143 |
| `src/components/ChatBotRoom.jsx`（被 `ChatRoom.jsx` 取代的舊版） | 93 |
| `src/pages/protfolio/components/folderModal.jsx`（Protfolio 的 7 處 hit 是 `folderModalOpen` 變數） | 70 |
| `src/pages/Kanban/components/ColorPicker.jsx` + `react-color` 相依 | 50 |
| `src/pages/Kanban/components/TaskHint.jsx` | 20 |
| `src/pages/StreamdownDemo.jsx` + `App.jsx:34,69` 的 `/streamdown-demo` 路由 | 417 |
| `src/pages/TestRag.jsx` + `App.jsx:35,58` 的 `/test-rag` 路由 | 130 |
| `src/pages/Kanban/components/carditem/REFACTOR_VERIFICATION.md` | 426 |
| `src/components/SkeletonLoader.jsx` 的 `SkeletonTable`、`SkeletonChart`、`SkeletonStatsCards`（`SkeletonCard` 由 011 的 feel check 可能會用，保留） | ~50 |
| `src/pages/teacher-dashboard/utils/DataNormalizer.js:203` 的 `export const dataNomalizer`（拼錯的 singleton） | 1 |
| `src/components/ChatRoom.jsx:142-167` 註解掉的舊版 `messageList.map` | 26 |
| 相依：`streamdown`（`MessageContent.jsx:7-11` 註解已說明改用 react-markdown）、`styled-components`、`nanoid`、`@babel/core`（devDep 傳遞相依）、`vite-plugin-node-polyfills`（vite.config 未註冊） | |
| `vite.config.js` 的 `vendor-streamdown` chunk group（streamdown 移除後永不命中） | |
| `src/assets/Animation-login.json`（528KB）、`src/assets/react.svg` | 536KB |
| `public/`：`note.jpg`、`list-note.jpg`、`refDaily.jpg`、`SDLS_LOGO.png`、`SDLS_LOGOO.jpg`、`logo.ico`、`images/login.png`、`images/sticky-note*.png`（5 個）、`person/woman4.png` | ~484KB |
| `prop-types` 有 3 檔 import 但 `package.json` 未宣告 | |

`console.log` 209 處、所有 `console.*` 452 處全部進 production bundle；`vite.config.js:75-81` 的 `build` 只有 `rollupOptions`。

## Target

```js
// vite.config.js target：build 區塊加 esbuild drop（與 rollupOptions 並列）
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
```
放在 `build:` 之前、與它同層（`esbuild` 是 vite 頂層選項）。

其餘項目全部刪除；`prop-types` 用 `npm i prop-types` 補宣告（3 個檔案在用，移除它們的 PropTypes 不在本計畫）。

## Repo conventions to follow

- 刪除前每一項都要再 `grep -rlF` 一次確認零引用，grep 排除定義檔本身與 `src/index.css`。
- 檔案用 `git rm`，套件用 `npm uninstall`，讓 lock 檔同步。
- `App.jsx` 移除路由時連同對應的 `lazy(() => import(...))` 一起刪。

## Steps

1. 逐項確認零引用（在 `sdl-frontend-main/`）：
   ```bash
   for k in dataValidator TrackingTestPage ViewableProjects useApiWithFallback SocketStatusIndicator ProjectSettingsPage OrchestratorMonitor ViewingModeComponents "components/Timer" ChatBotRoom folderModal ColorPicker TaskHint StreamdownDemo TestRag; do echo "== $k"; grep -rlF "$k" src --include='*.jsx' --include='*.js' | grep -vE "/(${k##*/})\.jsx?$|App\.jsx|ErrorBoundary/index\.js"; done
   ```
   `App.jsx` 與 `ErrorBoundary/index.js` 是已知的引用點（路由與 barrel 註解），其餘任何輸出代表該項有人用，跳過並回報。
2. `git rm` 表列的原始檔、`.md`、`src/assets/AnimationTimer.json`、`Animation-login.json`、`react.svg`，以及 `public/` 下列出的檔案（先 `grep -rn "<檔名>" src index.html` 確認零引用）。
3. `App.jsx`：刪第 34 到 36 行三個 `lazy` 與第 58、59、69 行三條 `<Route>`。
4. `SkeletonLoader.jsx`：刪 `SkeletonTable`、`SkeletonChart`、`SkeletonStatsCards` 三個 export 及其在檔尾 `export default {}` 內的鍵；保留 `SkeletonCard`、`SkeletonDashboard`、`SkeletonKanbanColumn`。
5. `DataNormalizer.js:203` 刪該行；`ChatRoom.jsx:142-167` 刪註解區塊（先讀確認是被 `{/* */}` 包住的舊 map）。
6. `npm uninstall streamdown styled-components nanoid @babel/core vite-plugin-node-polyfills react-color && npm i prop-types`。
7. `vite.config.js`：刪 `vendor-streamdown` 群組（保留該段說明「為何不把 markdown 管線放進去」的註解），加 `esbuild.drop`。
8. `README` 或 `docs/` 若有提到 `/test-rag`、`/streamdown-demo`，一併移除（`grep -rn "test-rag\|streamdown-demo\|test-tracking" .. --include='*.md'`）。

## Boundaries

- 不刪 `Loader.jsx`、`LazyFallback.jsx`、`ChatRoom.jsx`、`SkeletonCard`、`date-fns`、`dateformat`、`postcss`、`autoprefixer`（稽核確認皆有使用）。
- 不合併 `authUtils` / `userUtils`、不統一日期套件（`future-list.md` F033）。
- 不動後端。
- 任一項 grep 有輸出就跳過該項。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -n "test-rag\|test-tracking\|streamdown-demo" src/App.jsx   # 無輸出
  grep -n "drop" vite.config.js                                    # 1
  grep -c "streamdown\|styled-components\|\"nanoid\"\|react-color\|vite-plugin-node-polyfills" package.json   # 0
  grep -c "prop-types" package.json                                # 1
  npm run build && npx vitest run
  grep -c "console.log" dist/assets/*.js | awk -F: '{s+=$2} END {print s}'   # 預期 0
  ```
- **Feel check**：dev 環境走首頁、Kanban、IdeaWall、教師儀表板、作品集、提交頁，console 無 import 錯誤；瀏覽 `/test-rag` 應顯示 404 頁。
- **Done when**：grep 符合、build 與測試通過、六頁無錯誤、dist 內 console.log 為 0。
