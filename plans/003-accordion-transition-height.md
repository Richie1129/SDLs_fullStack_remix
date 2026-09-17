# 003 — 修復兩個手風琴的無效 `transition-height` class，讓展開收合真的有過渡

- **Status**: DONE（2026-09-17，commit 見 git log）
- **Commit**: df1cb1b
- **Severity**: HIGH（功能性缺陷：宣告了動畫但實際是瞬間跳變）
- **Category**: 2. Easing & duration（兼 5. Performance）
- **Estimated scope**: 2 個檔案，各 1 行 className

## Problem

首頁專案區與管理總覽的手風琴容器都寫了 `transition-height`，但這不是 Tailwind 內建 class，`tailwind.config.cjs` 也沒有擴充 `transitionProperty`，所以這個 class 不會產生任何 CSS。結果是 `duration-500 ease-in-out` 沒有對象可套用，高度在第 0 幀直接跳到目標值，使用者看到的是內容瞬間展開或消失。此外即使 class 有效，`ease-in-out` 用在展開（進場）也不對，應為 `ease-out`；500ms 也超過 300ms 的 UI 預算。

```jsx
{/* sdl-frontend-main/src/pages/home/components/ProjectSection.jsx:220-229 — current */}
      <div
        ref={contentRef}
        style={{
          height: isActive ? `${height}px` : "0px",
          minHeight: isActive ? `${minContentHeight}px` : "0px",
          overflow: 'hidden'
        }}
        className="transition-height bg-customgreen/5 duration-500 ease-in-out my-1"
      >
```

```jsx
{/* sdl-frontend-main/src/pages/overview/ManagementOverview.jsx:431-435 — current */}
      <div
        ref={contentRef}
        style={{ height: isActive ? `${height}px` : "0px", overflow: 'hidden' }}
        className="transition-height bg-customgreen/5 duration-slow ease-in-out my-1  "
      >
```

兩處都用 `requestAnimationFrame` 量測 `scrollHeight` 再寫入 `height` state（ProjectSection.jsx:45-48），所以高度值是正確的，缺的只是過渡宣告。

## Target

```jsx
{/* target：兩處的 className 一致改為 */}
className="transition-[height] bg-customgreen/5 duration-normal ease-out my-1"
```

- `transition-[height]`：Tailwind v3 任意值語法，會產生 `transition-property: height`。
- `duration-normal`（250ms）：落在 UI 預算內，比原本 500ms / 400ms 更快、更靈敏。
- `ease-out`：展開與收合都是進出場，用 ease-out。計畫 004 完成後自動升級為強化曲線。

已知取捨：`height` 是 layout 屬性，過渡時每幀重排。這裡的內容高度不固定且已有量測機制，改用 `grid-template-rows: 0fr / 1fr` 需要調整 DOM 結構，超出本計畫「只改動畫屬性」的範圍，留待未來評估（見 `future-list.md` F027）。

## Repo conventions to follow

- 時長 token：`duration-fast` / `duration-normal` / `duration-slow`（`DESIGN_SYSTEM.md`）。
- 正面範例：`sdl-frontend-main/src/pages/knowledge-graph/KnowledgeGraphView.jsx:234` 用 `transition-transform duration-normal` 做可逆面板。

## Steps

1. `sdl-frontend-main/src/pages/home/components/ProjectSection.jsx` 第 228 行：把 `className="transition-height bg-customgreen/5 duration-500 ease-in-out my-1"` 改為 `className="transition-[height] bg-customgreen/5 duration-normal ease-out my-1"`。
2. `sdl-frontend-main/src/pages/overview/ManagementOverview.jsx` 第 434 行：把 `className="transition-height bg-customgreen/5 duration-slow ease-in-out my-1  "` 改為 `className="transition-[height] bg-customgreen/5 duration-normal ease-out my-1"`（順手移除尾端多餘空白）。
3. 全專案不應再有 `transition-height` 字串。

## Boundaries

- 不改 `style` 物件、不改 `useEffect` 量測邏輯、不改 `contentRef`。
- 不改按鈕（`handleToggle` 所在元素）的 class。
- 不引入 grid-rows 改法。
- 若行號內容與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main && grep -rn "transition-height" src        # 預期無輸出
  grep -n "transition-\[height\]" src/pages/home/components/ProjectSection.jsx src/pages/overview/ManagementOverview.jsx   # 預期各 1 行
  npm run build
  ```
- **Feel check**：
  - 首頁點「我的專案」區塊標題收合再展開：內容高度應平滑滑開，不再瞬間出現；DevTools Elements 面板可看到該 div 的 computed `transition-property: height`。
  - 展開時起步快、末段減速（ease-out）。
  - 快速連點標題兩次：第二次點擊從當前高度反向，不會先跳到終點。
  - 管理總覽頁的每個可收合區塊同樣檢查。
- **Done when**：grep 無 `transition-height`、build 成功、兩頁手風琴皆有可見過渡。
