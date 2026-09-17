# 004 — 建立 easing token，並把三份互相覆蓋的 `.animate-fade-in` 定義收斂為一份

- **Status**: TODO
- **Commit**: df1cb1b
- **Severity**: MEDIUM（基礎建設；其他計畫依賴此曲線）
- **Category**: 7. Cohesion & tokens（兼 2. Easing & duration）
- **Estimated scope**: 4 個檔案（`tailwind.config.cjs`、`src/index.css`、`src/pages/teacher-dashboard/components/QuickActions.jsx`、`DESIGN_SYSTEM.md`），約 30 行

## Problem

**沒有 easing token。** `tailwind.config.cjs` 有 `transitionDuration` 三檔 token，但沒有 `transitionTimingFunction`，全站的 `ease-out`（7 處）與 `ease-in-out`（38 處）都是 Tailwind 預設的弱曲線；framer 端用字串 `"easeInOut"`，CSS 端用裸 `ease`。三套技術各自定義近似但不同的曲線。

**`.animate-fade-in` 有三份定義互相覆蓋。** 同一個 class 名稱在三處以不同的時長與曲線定義，實際生效取決於 CSS 載入順序：

```js
// sdl-frontend-main/tailwind.config.cjs:20-23, 40 — current
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
// ...
        'fade-in':    'fade-in 0.3s ease forwards',
```

```css
/* sdl-frontend-main/src/index.css:34-41 — current（在 @tailwind utilities 之後，靜默蓋掉上面那份） */
/* 視圖切換淡入動畫 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out both;
}
```

```jsx
{/* sdl-frontend-main/src/pages/teacher-dashboard/components/QuickActions.jsx:312-327 — current（元件內聯 <style>，再蓋掉 index.css） */}
      {/* Toast 動畫樣式 */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
```

## Target

**Easing token（覆寫 Tailwind 的 `out` 與 `in-out`，新增 `drawer`）。** 覆寫而非新增名稱，是為了讓現有 45 處 `ease-out` / `ease-in-out` 不改一行程式碼就升級為強化曲線：

```js
// target：sdl-frontend-main/tailwind.config.cjs 的 theme.extend 內，緊接在 transitionDuration 之後新增
      transitionTimingFunction: {
        'out':    'cubic-bezier(0.23, 1, 0.32, 1)',     // 進場 / 退場（UI 預設）
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',    // 畫面上的移動 / 變形
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',     // 抽屜滑入（iOS 風格）
      },
```

**`fade-in` 單一定義。** 保留 Tailwind config 這份為唯一來源，數值取三份中最合理的組合（6px 位移、200ms、強化 ease-out、`both`）：

```js
// target：sdl-frontend-main/tailwind.config.cjs
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
// ...
        'fade-in':    'fade-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both',
```

`index.css` 第 34 到 41 行整段刪除；`QuickActions.jsx` 的 `<style>` 區塊與其上方註解整段刪除。

**設計系統文件補上 easing 規範**，加在「動畫速度」節的「標準化速度」表格之後：

```markdown
### 標準化曲線

| Token | Tailwind Class | 使用場景 |
|-------|---------------|---------|
| out | `ease-out` | 進場、退場（預設） |
| in-out | `ease-in-out` | 已在畫面上的元素移動或變形 |
| drawer | `ease-drawer` | 抽屜、側欄滑入 |

Hover 的顏色與陰影變化用 Tailwind 預設的 `ease` 即可。**禁止 `ease-in`**：起步慢會讓使用者覺得介面遲鈍。
```

## Repo conventions to follow

- `tailwind.config.cjs` 的註解風格：每個 token 後接繁體中文行尾註解（見 `transitionDuration` 區塊第 157 到 159 行）。
- `DESIGN_SYSTEM.md` 的表格欄位格式（Token / Tailwind Class / 使用場景）。
- 專案規則：文件中不得出現章節符號（section sign），章節引用一律寫「第 N 節」。

## Steps

1. `sdl-frontend-main/tailwind.config.cjs`：
   a. 第 20 到 23 行 `fade-in` keyframe 的 `translateY(10px)` 改為 `translateY(6px)`。
   b. 第 40 行 `'fade-in':    'fade-in 0.3s ease forwards',` 改為 `'fade-in':    'fade-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both',`。
   c. 在 `transitionDuration: { ... },` 區塊（第 156 到 160 行）之後、`},`（extend 結尾）之前，插入 Target 的 `transitionTimingFunction` 區塊。
2. `sdl-frontend-main/src/index.css`：刪除第 34 到 41 行（從 `/* 視圖切換淡入動畫 */` 到 `.animate-fade-in { ... }` 的結尾 `}`）。刪除後檔案結尾應是 `.text-caption { letter-spacing: 0.03em; }` 區塊，或計畫 002 追加的 `@media` 區塊。
3. `sdl-frontend-main/src/pages/teacher-dashboard/components/QuickActions.jsx`：刪除第 312 行 `{/* Toast 動畫樣式 */}` 到第 327 行 `\`}</style>` 的整段。第 302 行 toast 元素的 `animate-fade-in` class 保留，它現在會套用 Tailwind config 的定義。
4. `sdl-frontend-main/DESIGN_SYSTEM.md`：在「標準化速度」表格與「使用範例」小節之間，插入 Target 的「標準化曲線」小節。
5. 檢查 `CLAUDE.md`「設計系統」節列出的常見違規清單，若尚未提到 easing，追加一條「進出場用 `ease-out`，禁止 `ease-in`」。

## Boundaries

- 不改任何使用 `ease-out` / `ease-in-out` / `animate-fade-in` 的元件檔案；覆寫 token 的用意就是不動呼叫端。
- 不改 `rise`、`float`、`slide-up` keyframes。
- 不改 `transitionDuration`。
- 不新增相依套件。
- 若 `index.css` 或 `QuickActions.jsx` 的行號內容與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -rn "@keyframes fade-in\|@keyframes fadeIn" src            # 預期無輸出（唯一定義在 tailwind config）
  grep -n "transitionTimingFunction" tailwind.config.cjs           # 預期 1 行
  grep -c "ease-drawer" DESIGN_SYSTEM.md                           # 預期 >= 1
  grep -nP "\x{A7}" DESIGN_SYSTEM.md                                # 預期無輸出（章節符號檢查）
  npm run build
  npx vitest run
  ```
- **Feel check**：
  - 教師儀表板觸發 QuickActions toast：仍有淡入上浮，時長明顯短於原本（200ms vs 300ms）。
  - Kanban 拖曳頭像的提示氣泡（`DraggableImage/index.jsx:113`）淡入正常。
  - 任一 Modal 開啟（`ease-out` 已被覆寫）：起步比之前快、末段收得更明顯，DevTools Animations 面板顯示曲線為 `cubic-bezier(0.23, 1, 0.32, 1)`。
  - 在 DevTools 對某個帶 `ease-drawer` 的元素（計畫 005 完成後）確認 computed `transition-timing-function` 為 `cubic-bezier(0.32, 0.72, 0, 1)`。
- **Done when**：四條 grep 符合預期、build 與測試通過、toast 與 Modal 目視檢查通過。
