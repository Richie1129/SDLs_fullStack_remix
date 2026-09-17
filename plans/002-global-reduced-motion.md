# 002 — 建立全域 prefers-reduced-motion 防線（framer MotionConfig + CSS media query）

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: HIGH
- **Category**: 6. Accessibility
- **Estimated scope**: 2 個檔案（`sdl-frontend-main/src/App.jsx`、`sdl-frontend-main/src/index.css`），約 25 行新增

## Problem

全站 16 個使用 framer-motion 的檔案沒有任何一處呼叫 `useReducedMotion` 或設定 `MotionConfig reducedMotion`；三個 CSS 檔（`index.css`、`styles/glassmorphism.css`、`pages/ExportPreview/ExportPreview.css`）也沒有任何 `@media (prefers-reduced-motion)` 區塊。`tailwind.config.cjs` 定義的 `fade-in`、`slide-up`、`float`、`rise` 四組位移 keyframes 只靠呼叫端自行加 `motion-safe:` 前綴，目前只有 Login、Register、ForgotPassword 三頁有做。開啟「減少動態」的使用者在其他所有頁面仍會看到抽屜滑入、卡片落下、裝飾球浮動。

```jsx
// sdl-frontend-main/src/App.jsx:112-118 — current
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
    </AuthProvider>
  )
```

```css
/* sdl-frontend-main/src/index.css 末尾 — current：檔案結尾就是 .animate-fade-in 區塊，沒有 reduced-motion 區塊 */
```

## Target

減少動態不是歸零：保留 opacity 與顏色回饋，移除位移與縮放；`animate-spin`（載入指示）與 `animate-pulse`（骨架）保留。

```jsx
// target：sdl-frontend-main/src/App.jsx
import { MotionConfig } from 'framer-motion';
// ...
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </Suspense>
      </AuthProvider>
    </MotionConfig>
  )
```

`reducedMotion="user"` 讓 framer-motion 在使用者系統偏好為 reduce 時自動跳過 transform 類動畫、保留 opacity。

```css
/* target：sdl-frontend-main/src/index.css 檔案末尾新增 */

/* =====================================================
   減少動態：保留淡入與顏色回饋，移除位移、縮放與裝飾性循環
   ===================================================== */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-up,
  .animate-rise,
  .animate-float,
  .animate-float-slow,
  .animate-bounce {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .glass-card-hover:hover,
  .card-hover:hover,
  .group:hover .icon-bg {
    transform: none;
  }
}
```

## Repo conventions to follow

- `index.css` 已有分段註解格式（`/* ===== */` 標題），沿用。
- 正面範例：`sdl-frontend-main/src/pages/login/Login.jsx:38` 用 `motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none` 保留淡入、移除位移，這正是本計畫要推廣到全站的行為。
- framer-motion 版本 11.0.28（`node_modules/framer-motion/package.json`），`MotionConfig` 的 `reducedMotion` prop 自 v5 起可用。

## Steps

1. `sdl-frontend-main/src/App.jsx` 第 1 行 `import React, { Suspense, lazy } from 'react';` 之後新增一行 `import { MotionConfig } from 'framer-motion';`。
2. 同檔案 `return (` 區塊：在 `<AuthProvider>` 外層包 `<MotionConfig reducedMotion="user">`，結尾對應加 `</MotionConfig>`，內層縮排各加兩格。
3. `sdl-frontend-main/src/index.css` 檔案末尾（`.animate-fade-in { ... }` 區塊之後）追加上方 Target 的整段 `@media` 區塊。若計畫 004 已先執行、`.animate-fade-in` 區塊已被移除，仍然追加到檔案末尾即可。
4. 不要改 `tailwind.config.cjs`。

## Boundaries

- 只動這兩個檔案。
- 不移除任何現有 `motion-safe:` / `motion-reduce:` 前綴（它們與新防線相容）。
- 不觸碰 `animate-spin` 與 `animate-pulse`。
- 不新增相依套件。
- 若 App.jsx 的 return 區塊與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main && grep -n "MotionConfig" src/App.jsx                    # 預期 2 行以上（import + 使用）
  grep -n "prefers-reduced-motion" src/index.css                                # 預期 1 行
  npm run build                                                                 # 預期成功
  npx vitest run                                                                # 預期全數通過
  ```
- **Feel check**：DevTools Rendering 面板勾選 `Emulate CSS media feature prefers-reduced-motion: reduce`，逐一檢查：
  - 專案頁右上開啟「活動串流」抽屜（`ActivityStream`）：只淡入、不從右側滑入。
  - 教師儀表板 QuickActions 觸發 toast：只淡入、不上浮。
  - Login 頁：裝飾圓靜止，hero 文字直接顯示，與原本 `motion-safe:` 的表現一致（沒有退化）。
  - 任何頁面的載入 spinner 仍在旋轉（確認沒有誤殺狀態指示）。
  - 關閉模擬後，上述動畫全部恢復。
- **Done when**：build 與測試通過，五項目視檢查通過。
