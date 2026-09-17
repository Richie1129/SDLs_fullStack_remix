# 013：手機側欄改抽屜式導覽、底部階段列可橫向捲動（F030 + F032 第 4、5 項）

- **嚴重度**：HIGH（390px 寬度下 Kanban 與想法牆內容區只剩約 290px）
- **基準 commit**：`b0dda75`
- **範圍**：`src/components/SideBar.jsx`、`src/layouts/ProjectLayout.jsx`、`src/components/TopBar.jsx`、`src/components/SubStageBar.jsx`、新增 `src/hooks/useMediaQuery.js`
- **執行模型**：sonnet；只用 Edit 改既有檔，新檔才用 Write

## 現況

- `SideBar.jsx:346` 的面板是 `z-10 bg-white flex flex-col flex-shrink-0 border-r-2 h-full`，收合狀態圖示欄約 100px，任何寬度都佔位。
- `ProjectLayout.jsx:24` 是 `flex flex-row`，左邊 `<SideBar />`、右邊 TopBar + `<main>`。
- `TopBar.jsx:266` 專案頁版本左側只有 Logo 與專案名稱，沒有開側欄的入口。
- `SubStageBar.jsx:273` 中層容器 `flex justify-between ... overflow-x-auto` 同時包住三個 pill 與機器人圖示；`:274` 內層 `flex items-center space-x-1 ... min-w-0 flex-1`。手機上第三個 pill 被機器人切掉。
- `SideBar.jsx:20` `NavItem` 選中只靠 `bg-[#5BA491]/20` 底色，`Link` 沒有 `aria-current`。
- `SideBar.jsx:92` 關閉鈕用字元 `×`，`:98` 項目符號用 `•`。

## 目標

### 1. `useMediaQuery` hook（新檔 `src/hooks/useMediaQuery.js`）

```js
import { useEffect, useState } from 'react';
export default function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
```

### 2. `ProjectLayout.jsx`

- 新增 `const [mobileNavOpen, setMobileNavOpen] = useState(false)`；`location.pathname` 變動時關閉。
- 最前面（`ObservationProvider` 內、最外層 div 的第一個子元素）加跳至主內容連結：
  `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-onboarding focus:bg-white focus:text-customgreen focus:px-btn-x focus:py-btn-y focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-customgreen">跳至主內容</a>`
- `<main>` 加 `id="main-content" tabIndex={-1} className="... outline-none"`。
- `<SideBar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />`
- `<TopBar ... onOpenMobileNav={() => setMobileNavOpen(true)} />`

### 3. `SideBar.jsx`

- Props：`{ mobileOpen = false, onMobileClose }`。
- `const isMdUp = useMediaQuery('(min-width: 768px)')`；`const expanded = isMdUp ? open : true`（手機抽屜一律展開顯示文字）。把所有讀 `open` 決定版面的地方改讀 `expanded`（`StageProgressItem isOpen`、`HoverTooltip show`、label opacity、gap 等）。`handleStageClick` 的 `if (!open)` 改 `if (!expanded)`。
- 面板 class 改為：
  `fixed inset-y-0 left-0 z-drawer w-64 max-w-[80vw] md:static md:inset-auto md:z-10 md:w-auto md:max-w-none bg-white flex flex-col flex-shrink-0 border-r-2 border-gray-200 h-full transform transition-transform duration-slow ease-drawer motion-reduce:transition-none md:transform-none md:transition-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
  並加 `aria-label="專案導覽"`；手機開啟時加 `role="dialog" aria-modal="true"`（用 `{...(!isMdUp && mobileOpen ? { role: 'dialog', 'aria-modal': true } : {})}`）。
- 面板前面加遮罩（只在 `!isMdUp && mobileOpen`）：
  `<div className="md:hidden fixed inset-0 z-drawer bg-black/40 transition-opacity duration-normal" onClick={onMobileClose} aria-hidden="true" />`
  遮罩在 DOM 中要排在面板之前，讓同層級的面板蓋在上面。
- Header 區：`isMdUp` 顯示原本 `ToggleButton`；手機顯示關閉鈕（`FiX`，`aria-label="關閉導覽"`，`onClick={onMobileClose}`），排在右側。
- Escape：`useEffect` 監聽 `keydown`，`mobileOpen && !isMdUp && e.key === 'Escape'` 時呼叫 `onMobileClose`。
- 開啟時焦點：`useEffect([mobileOpen])`，開啟且 `!isMdUp` 時 `panelRef.current?.querySelector('a[href]')?.focus()`；關閉時不做事（TopBar 的漢堡鈕自己保有焦點）。
- 點任一 `Link` 後呼叫 `onMobileClose?.()`（`onClick` 加在 Link 上，不要動 `NavItem` 的 `setSelected`）。
- `aria-current`：`Link` 加 `aria-current={selected === i ? 'page' : undefined}`；選中時 Link 額外加 `text-customgreen font-semibold`，未選中維持 `text-gray-700`（把原本放在 `<span>` 上的 `text-gray-700` 改成依 selected 切換）。`NavItem` 的底色保留。
- `FloatingTooltip` 的 `×` 改 `<FiX className="w-4 h-4" aria-hidden="true" />` 並給按鈕 `aria-label="關閉"`；`•` 改 `list-disc list-inside`（移除手工符號的 span）。
- `HoverTooltip` 只在 `expanded === false` 時才需要，維持 `show={!expanded}`。
- ChatRoom、FloatingTooltip 的渲染位置不變。

### 4. `TopBar.jsx`

- Props 新增 `onOpenMobileNav`（可選）。
- 專案頁版本（第二個 return）左側容器最前面加：
  ```jsx
  {onOpenMobileNav && projectId && !isOverviewPage && (
    <button type="button" onClick={onOpenMobileNav} aria-label="開啟導覽" className="md:hidden mr-1 p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-fast">
      <Menu className="h-5 w-5" />
    </button>
  )}
  ```
  `Menu` 從 `lucide-react` 匯入（此檔既有用 lucide）。
- Logo 在手機縮成 `px-1 sm:px-5`，避免和漢堡鈕擠。

### 5. `SubStageBar.jsx`

- 中層容器移除 `overflow-x-auto`，改成 `flex justify-between lg:justify-evenly items-center p-1 sm:p-component-xs lg:p-component-base min-w-0`。
- 內層 pill 容器改：`flex items-center space-x-1 sm:space-x-stack-xs lg:space-x-stack-sm min-w-0 flex-1 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto`，加 `ref={pillsRef}`。
- 每個 pill 加 `snap-center shrink-0`；目前子階段（`index + 1 === currentSubStageIndex`）的 pill 加 `ref={currentPillRef}` 與 `aria-current="step"`。
- `useEffect([currentSubStageIndex, stages])`：若 `pillsRef.current.scrollWidth > pillsRef.current.clientWidth` 則 `currentPillRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: prefersReduced ? 'auto' : 'smooth' })`，`prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches`。
- 虛線分隔符維持 `hidden sm:block`。
- 機器人 `span` 維持 `flex-shrink-0`。

## 邊界

- 不改 `ChatRoom.jsx`、`useStageIndex`、任何 API。
- 不動 HomePage / ManagementOverview 的 `<TopBar />`（沒有傳 `onOpenMobileNav` 就不顯示漢堡鈕）。
- 桌面（md 以上）外觀與行為必須與現在完全相同：收合 / 展開、tooltip、階段 tooltip、聊天室按鈕。
- 不用 `scale`、`translateY` 做 hover；時長只用 token；不使用任意 `z-[n]`。

## 驗證

- `npx eslint src/components/SideBar.jsx src/layouts/ProjectLayout.jsx src/components/TopBar.jsx src/components/SubStageBar.jsx src/hooks/useMediaQuery.js`
- grep 確認：`grep -n "aria-current" src/components/SideBar.jsx` 有結果；`grep -n "overflow-x-auto" src/components/SubStageBar.jsx` 只在內層。
- 三個斷點的預期：
  - `< md`：側欄不佔位，TopBar 有漢堡鈕，開啟為 256px 抽屜 + 遮罩，Escape / 遮罩 / 點連結都關閉；底部 pill 可橫向捲動並自動捲到目前階段。
  - `md`：側欄靜態收合欄（同現況），無漢堡鈕。
  - `lg`：同現況。
