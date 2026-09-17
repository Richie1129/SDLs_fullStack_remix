# 001 — 共用 Modal 的進場縮放從 0.75 改為 0.95，並只過渡 transform/opacity

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: HIGH
- **Category**: 3. Physicality & origin（兼 5. Performance）
- **Estimated scope**: 1 個檔案（`sdl-frontend-main/src/components/Modal.jsx`），2 行 className；影響全站 18 個 import 此元件的模組

## Problem

全站對話框共用 `Modal.jsx`。關閉態的 class 是 `scale-75 opacity-0`，代表每個 Modal 都從 75% 大小彈出、再縮回 75% 消失。規範是起點落在 0.9 到 0.97 之間，太小的起點看起來像「從無到有」而不是「已經在那裡、只是浮現」。同一行還用 `transition-all`，會把 `max-height`、`padding` 等無關屬性一併納入過渡，離開 GPU 合成。

```jsx
{/* sdl-frontend-main/src/components/Modal.jsx:18 — current（座標定位分支） */}
<div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow transition-all duration-normal ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} >
```

```jsx
{/* sdl-frontend-main/src/components/Modal.jsx:27 — current（置中分支） */}
<div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow ${paddingClass} transition-all duration-normal ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} >
```

第 18 行的分支被 `src/pages/ideaWall/components/modals/CreateOptionMenu.jsx` 用作錨定在畫布點擊座標的 context menu，非置中 Modal，理論上應從觸發點長出，但它的 `top/left` 已經是點擊座標，改成 0.95 後視覺偏差已可忽略，本計畫不另加 `transform-origin`。

## Target

```jsx
{/* target：兩個分支的 className 都改成這個模式 */}
transition-[transform,opacity] duration-normal ease-out
${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}
```

- 起點 `scale-95`（0.95），符合 0.9 到 0.97 的規範。
- `transition-[transform,opacity]` 只過渡兩個 GPU 屬性，Tailwind v3 支援這種任意值寫法。
- `ease-out`：進出場一律 ease-out。在計畫 004 完成前這是 Tailwind 內建曲線，完成後自動變成強化版曲線，不需回頭改。
- `motion-reduce:scale-100`：使用者開啟減少動態時保留淡入淡出、拿掉縮放。
- `duration-normal`（250ms）維持不變，落在 Modal 200 到 500ms 的預算內。

## Repo conventions to follow

- 時長只能用 `duration-fast` / `duration-normal` / `duration-slow` token（`sdl-frontend-main/DESIGN_SYSTEM.md` 第「動畫速度」節）。
- `DESIGN_SYSTEM.md` 建議 `transition-opacity` / `transition-transform` 而非 `transition-all`。
- 正面範例：`sdl-frontend-main/src/pages/reflection/components/PersonalDailyModal.jsx:14` 的 framer variant 已用 `scale: 0.95`。

## Steps

1. 開啟 `sdl-frontend-main/src/components/Modal.jsx`。
2. 第 18 行：把 `transition-all duration-normal` 改為 `transition-[transform,opacity] duration-normal ease-out`；把 `"scale-75 opacity-0"` 改為 `"scale-95 opacity-0 motion-reduce:scale-100"`。
3. 第 27 行：做完全相同的兩處替換。
4. 檔案中不應再出現 `scale-75` 與 `transition-all`。

## Boundaries

- 只改這一個檔案的兩個 className 字串。
- 不改 `open` / `coordinate` 邏輯，不改 `scrollClass` / `paddingClass`，不改 DOM 結構。
- 不動任何呼叫端。
- 若第 18 或 27 行的內容與上方摘錄不符（commit 已漂移），停止並回報，不要自行猜測。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main && grep -n "scale-75\|transition-all" src/components/Modal.jsx   # 預期無輸出
  npm run build                                                                          # 預期成功
  ```
- **Feel check**：啟動 `docker compose -f docker-compose.dev.yml up`，在首頁開啟「建立專案」Modal，以及在 IdeaWall 畫布右鍵開啟 context menu：
  - Modal 像「浮現」而不是「從中心彈出」，開啟過程中邊緣不會有明顯放大感。
  - DevTools Animations 面板調到 10% 速度，確認起始大小約為最終大小的 95%。
  - DevTools Rendering 面板勾選 `prefers-reduced-motion: reduce`，重新開啟 Modal，確認只剩淡入、沒有縮放。
  - 快速連點開關按鈕，動畫從當前狀態接續，不會閃回 95% 重播。
- **Done when**：grep 無輸出、build 成功、上述四項目視檢查通過。
