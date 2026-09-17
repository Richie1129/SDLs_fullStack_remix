# 006 — 移除高頻與常駐元件上的裝飾性動畫（設計系統違規與無限循環）

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: HIGH
- **Category**: 1. Purpose & frequency（兼 2. Easing & duration）
- **Estimated scope**: 6 個檔案，共約 12 行，全部是刪除或替換 class

## Problem

以下六處動畫都通不過「為什麼要動」的檢驗：不是在高頻元素上做裝飾，就是無限循環、沒有終止條件，或直接違反 `DESIGN_SYSTEM.md` 的 hover 規則。修法一律是刪除或換成正確的靜態 / 線性表現。

**A. 反思類型卡片的 hover 抬升（設計系統明文禁止 hover translate）**

```jsx
{/* sdl-frontend-main/src/pages/reflection/components/ReflectionTypeSelector.jsx:21, 44 — current */}
          whileHover={{ y: -2 }}
{/* 同檔 :75, :147 — current */}
        whileHover={{ y: -4 }}
```
四張卡片的 className 已經有 `hover:border-*` 與 `hover:shadow-md` / `hover:shadow-lg`，顏色與陰影回饋足夠。

**B. 行動版浮動按鈕的 hover 放大與常駐 pulse**

```jsx
{/* sdl-frontend-main/src/pages/submit/components/GuidancePanel.jsx:166 — current */}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-customgreen text-white p-4 rounded-full shadow-lg hover:bg-customgreen/90 transition-all hover:scale-110"
{/* 同檔 :173 — current */}
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
```
這顆按鈕標為 `md:hidden`，只在觸控裝置顯示，hover 永遠是點擊造成的假 hover，放大後會卡住不回彈；橘點無限 pulse 是常駐干擾。

**C. 階段列目前階段文字無限 pulse**

```js
// sdl-frontend-main/src/utils/stageUtils.js:57 — current
        return 'text-white animate-pulse'; // 當前階段
```
`SubStageBar` 是常駐底部導覽，目前階段每次看畫面都在閃。目前階段已有底色區分（`getStageColor`），不需要閃爍。

**D. 階段列容器的無效 `duration-slow`**

```jsx
{/* sdl-frontend-main/src/components/SubStageBar.jsx:272 — current */}
        <div className="relative w-full bg-[#F5F5F5] h-12 sm:h-14 lg:h-16 duration-slow border-t border-gray-200 px-2 sm:px-4 lg:px-8 flex-shrink-0 lg:mb-4">
```
沒有搭配 `transition-*`，token 引用了但不生效，是誤用訊號，移除。

**E. IdeaWall 連線模式提示條無限彈跳**

```jsx
{/* sdl-frontend-main/src/pages/ideaWall/IdeaWall.jsx:294 — current */}
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 animate-bounce">
```
使用者正要精準點選節點時，畫面頂端有東西一直在跳。

**F. 倒數計時進度環用 ease-in-out**

```jsx
{/* sdl-frontend-main/src/pages/ideaWall/components/Timer.jsx:120 — current */}
              className="transition-all duration-1000 ease-in-out"
```
每秒更新一次 `strokeDashoffset`，屬 constant motion，規範是 `linear`；`transition-all` 也應收斂到單一屬性。

## Target

| 位置 | 改法 |
|---|---|
| ReflectionTypeSelector.jsx:21、44、75、147 | 整行 `whileHover={{ y: ... }}` 刪除 |
| GuidancePanel.jsx:166 | `transition-all hover:scale-110` 改為 `transition-colors duration-fast` |
| GuidancePanel.jsx:173 | 移除 `animate-pulse`，其餘 class 保留（橘點變靜態） |
| stageUtils.js:57 | `'text-white animate-pulse'` 改為 `'text-white'` |
| SubStageBar.jsx:272 | 移除 `duration-slow`（連同前後單一空格整理） |
| IdeaWall.jsx:294 | 移除 `animate-bounce` |
| Timer.jsx:120 | 改為 `transition-[stroke-dashoffset] duration-1000 ease-linear` |

Timer 的 1000ms 是刻意對齊每秒一次的 tick，屬 constant motion 例外，不受 300ms 預算限制。

## Repo conventions to follow

- `DESIGN_SYSTEM.md`「互動設計規範」節：hover 只用顏色與陰影，禁止 `scale` / `translate`。
- 正面範例：`sdl-frontend-main/src/components/SideBar.jsx:23` 的 NavItem 只用 `hover:bg-slate-100 transition-colors duration-fast`。
- `getStageTextColor` 的回傳值被 `SubStageBar.jsx:279` 直接放進 className，改字串即可，不需改呼叫端。

## Steps

1. `ReflectionTypeSelector.jsx`：刪除第 21、44、75、147 行（各是一整行 `whileHover=...`）。`motion.div` 標籤保留，其他 prop 不動。
2. `GuidancePanel.jsx` 第 166 行：把 `transition-all hover:scale-110` 替換為 `transition-colors duration-fast`。
3. `GuidancePanel.jsx` 第 173 行：把 `rounded-full animate-pulse"` 替換為 `rounded-full"`。
4. `stageUtils.js` 第 57 行：把 `'text-white animate-pulse'` 替換為 `'text-white'`，行尾註解保留。
5. `SubStageBar.jsx` 第 272 行：把 `lg:h-16 duration-slow border-t` 替換為 `lg:h-16 border-t`。
6. `IdeaWall.jsx` 第 294 行：把 `gap-4 animate-bounce"` 替換為 `gap-4"`。
7. `Timer.jsx` 第 120 行：把 `className="transition-all duration-1000 ease-in-out"` 替換為 `className="transition-[stroke-dashoffset] duration-1000 ease-linear"`。

## Boundaries

- 只改上述七行，不重構任何元件。
- `ReflectionTypeSelector.jsx` 的 `motion.div` 不要換成一般 `div`（保留未來加進場動畫的可能，且避免影響 data-track 屬性）。
- 不動 `animate-spin`（載入指示）與骨架用的 `animate-pulse`。
- 不動 Timer 的 `strokeDashoffset` 計算。
- 若任一行號內容與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -n "whileHover" src/pages/reflection/components/ReflectionTypeSelector.jsx     # 預期無輸出
  grep -n "hover:scale\|animate-pulse" src/pages/submit/components/GuidancePanel.jsx   # 預期無輸出
  grep -n "animate-pulse" src/utils/stageUtils.js                                       # 預期無輸出
  grep -n "duration-slow" src/components/SubStageBar.jsx                                # 預期只剩第 134 行 DialogBox 那一處
  grep -n "animate-bounce" src/pages/ideaWall/IdeaWall.jsx                              # 預期無輸出
  grep -n "ease-linear" src/pages/ideaWall/components/Timer.jsx                         # 預期 1 行
  npm run build
  npx vitest run
  ```
- **Feel check**：
  - 反思頁：滑過兩張類型卡片，只有邊框變色與陰影加深，卡片不位移。
  - 手機寬度的提交任務頁：點浮動按鈕開抽屜再關閉，按鈕不會停留在放大狀態；橘點靜止。
  - 任一專案頁底部階段列：目前階段文字不再閃爍，仍以底色與白字區分。
  - IdeaWall 進入連線模式：提示條靜止顯示。
  - IdeaWall 計時器倒數：進度環每秒等速推進，沒有加減速的「頓一下」感。
- **Done when**：六條 grep 符合預期、build 與測試通過、五項目視檢查通過。
