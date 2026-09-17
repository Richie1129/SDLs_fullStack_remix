# 005 — 三個右側抽屜改用百分比 transform 字串與抽屜曲線，並抽成共用 preset

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: MEDIUM
- **Category**: 3. Physicality & origin（兼 5. Performance、7. Cohesion）
- **Estimated scope**: 3 個元件檔案各 4 行 + 新增 1 個 preset 檔案
- **Depends on**: 無（曲線值直接寫在 framer transition，不依賴計畫 004 的 Tailwind token）

## Problem

三個右側抽屜的進退場程式碼幾乎逐字相同，都用硬編碼 `x: 300`：

```jsx
{/* sdl-frontend-main/src/components/ProjectCommentDrawer.jsx:403-407 — current */}
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-16 h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-10rem)] w-72 sm:w-80 lg:w-96 bg-white shadow-xl border-l border-gray-200 z-[120] overflow-hidden flex flex-col"
    >
```

`sdl-frontend-main/src/components/ActivityStream/ActivityStream.jsx:73-77` 與 `sdl-frontend-main/src/components/IdeaWall/IdeaWallChatPanel.jsx:41-45` 的 `initial` / `animate` / `exit` 三行完全相同。

兩個問題：
1. **位移與寬度不一致。** 容器寬度是 `w-72 sm:w-80 lg:w-96`（288 / 320 / 384px），位移固定 300px。lg 斷點下抽屜第一幀不在螢幕外，而是已露出 84px；sm 以下則多滑 12px。抽屜應該「從邊緣滑入」，用百分比而不是像素。
2. **`x` 簡寫不走 GPU。** framer-motion 的 `x` / `y` 是主執行緒 rAF 動畫，IdeaWall 頁面同時有 vis-network 畫布在跑，最容易掉幀。規範是用完整 transform 字串。

另外沒有指定 `transition`，用的是 framer 預設 spring，與其他 UI 的 tween 個性不一致。

## Target

新增共用 preset：

```js
// target：sdl-frontend-main/src/utils/motionPresets.js（新檔案）
/**
 * framer-motion 共用動畫 preset。
 * 曲線與時長對應 tailwind.config.cjs 的 token：
 *   DRAWER_EASE  = ease-drawer  cubic-bezier(0.32, 0.72, 0, 1)
 *   duration 0.4 = duration-slow 400ms
 * 位移用完整 transform 字串而非 x/y 簡寫，讓瀏覽器走合成層。
 */
export const DRAWER_EASE = [0.32, 0.72, 0, 1];

export const DRAWER_RIGHT = {
  initial: { transform: 'translateX(100%)', opacity: 0 },
  animate: { transform: 'translateX(0%)', opacity: 1 },
  exit: { transform: 'translateX(100%)', opacity: 0 },
  transition: { duration: 0.4, ease: DRAWER_EASE },
};
```

三個元件改為：

```jsx
{/* target：三個檔案相同 */}
import { DRAWER_RIGHT } from '../utils/motionPresets';   // 路徑依檔案位置調整
// ...
    <motion.div
      {...DRAWER_RIGHT}
      className="fixed right-0 top-16 ...（原 className 不動）"
    >
```

## Repo conventions to follow

- 共用工具放 `sdl-frontend-main/src/utils/`（既有 `stageUtils.js`、`tempPasswordDialog.js`）。
- 檔案頂端用 JSDoc 區塊註解說明用途（見 `stageUtils.js`）。
- 時長對應 `duration-slow`（400ms）token，落在抽屜 200 到 500ms 預算。
- 進出場一律 ease-out 家族；抽屜用 iOS 風格曲線 `cubic-bezier(0.32, 0.72, 0, 1)`。

## Steps

1. 新增 `sdl-frontend-main/src/utils/motionPresets.js`，內容為 Target 的完整程式碼。
2. `sdl-frontend-main/src/components/ProjectCommentDrawer.jsx`：
   a. 在既有 `framer-motion` import 附近新增 `import { DRAWER_RIGHT } from '../utils/motionPresets';`。
   b. 第 404 到 406 行三行（`initial=` / `animate=` / `exit=`）刪除，改為一行 `{...DRAWER_RIGHT}`。
3. `sdl-frontend-main/src/components/ActivityStream/ActivityStream.jsx`：同上，import 路徑為 `'../../utils/motionPresets'`，替換第 74 到 76 行。
4. `sdl-frontend-main/src/components/IdeaWall/IdeaWallChatPanel.jsx`：同上，import 路徑為 `'../../utils/motionPresets'`，替換第 42 到 44 行。
5. 三個檔案中不應再出現 `x: 300`。

## Boundaries

- 不改三個抽屜的 `className`、DOM 結構、關閉邏輯、`AnimatePresence` 包裹。
- 不改其他使用 framer `x` / `y` 簡寫的元件（ActivityItem、ReflectionTypeSelector 等另案處理）。
- 不新增相依套件。
- 若三個檔案的 `initial` / `animate` / `exit` 內容與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -rn "x: 300" src                                              # 預期無輸出
  grep -rln "DRAWER_RIGHT" src                                       # 預期 4 個檔案（preset + 3 元件）
  npm run build
  npx vitest run
  ```
- **Feel check**：在 lg 寬度（>= 1024px）與手機寬度（< 640px）各測一次：
  - 專案頁開啟評論抽屜、活動串流抽屜；IdeaWall 開啟聊天面板。
  - 抽屜第一幀完全在螢幕右緣之外，滑入時右緣貼齊，沒有「憑空出現一截」。
  - DevTools Animations 面板調到 10%：起步快、末段長尾減速（iOS 抽屜感），總長約 400ms。
  - DevTools Performance 錄製一次開關，確認 Main 執行緒沒有每幀的 style recalc（動畫應顯示在 Animations 軌道而非 JS 軌道）。若 framer-motion 11.0.28 對 `transform` 字串仍走 JS，記錄在 `plans/README.md` 狀態欄，百分比位移的修正仍然成立。
  - 快速連點開關：動畫從當前位置反向，不閃跳。
  - 開啟 `prefers-reduced-motion` 模擬（需計畫 002 已完成）：抽屜只淡入。
- **Done when**：grep 符合預期、build 與測試通過、兩種寬度目視檢查通過。
