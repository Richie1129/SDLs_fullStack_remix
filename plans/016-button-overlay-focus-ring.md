# 016：共用 Button / Overlay 元件、全域 focus ring（F032 第 1 到 3 項）

- **嚴重度**：MEDIUM（495 個 `<button>` 無可見焦點樣式，鍵盤使用者看不到焦點）
- **基準 commit**：`b0dda75`（在 013、014、015 合併之後執行）
- **執行模型**：sonnet；只用 Edit 改既有檔；新檔用 Write
- **skip-to-content 與 SideBar aria-current 已在 013 完成，不重做**

## 現況

- `src/components/ui/` 不存在。
- `src/index.css` 沒有任何 `:focus-visible` 規則；全站 `focus-visible:` 0 處。
- `src/pages/profile/Profile.jsx:254,298` 有裸 `focus:outline-none`（沒有配 ring），其餘 `focus:outline-none` 都有 `focus:ring-2` 配套。
- 在 `Modal.jsx` 之外自畫 `fixed inset-0` 遮罩的對話框（不含導覽、聊天遮罩、點擊外部關閉層）：
  `src/pages/teacher-dashboard/components/HelpSeekingView.jsx:428`、`src/components/ProjectViewingSettings.jsx:86`、`src/components/reflection/LogCard.jsx:294`、`src/pages/Kanban/components/ExampleTasksDialog.jsx:75`、`src/pages/StudentPortfolio/components/PreExportReminder.jsx:24`、`src/pages/teacher-dashboard/components/AnalyticsView.jsx:467`、`src/pages/student-dashboard/components/StageSuggestions.jsx:245`、`src/pages/observation/ClassObservationPage.jsx:439,546`、`src/pages/Kanban/Kanban.jsx:456`、`src/pages/overview/TeacherOverview.jsx:406`

## 目標

### 1. 全域 focus ring（`src/index.css`）

在「手機基礎」區塊之後加：

```css
/* =====================================================
   鍵盤焦點：只在 focus-visible 顯示，滑鼠點擊不出現
   ===================================================== */
:focus-visible {
  outline: 2px solid theme('colors.customgreen');
  outline-offset: 2px;
}
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline-offset: 0;
}
```

`Profile.jsx:254,298` 的裸 `focus:outline-none` 改成 `focus:outline-none focus:ring-2 focus:ring-customgreen/50`（與同檔 401 行的樣式一致）。

### 2. `src/components/ui/Button.jsx`

```jsx
import React, { forwardRef } from 'react';

const VARIANT = {
  primary: 'bg-customgreen text-white hover:bg-customgreen/90 hover:shadow-lg active:bg-customgreen/80',
  secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-300/80',
  danger: 'bg-red-600 text-white hover:bg-red-600/90 hover:shadow-lg active:bg-red-700',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
};
const SIZE = {
  sm: 'px-btn-x-sm py-btn-y-sm text-body-sm',
  md: 'px-btn-x py-btn-y text-ui',
  lg: 'px-btn-x-lg py-btn-y-lg text-body',
};

/** 共用按鈕：variant + size，內建 focus-visible ring 與按壓回饋（DESIGN_SYSTEM 只禁 hover 用 scale） */
const Button = forwardRef(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-stack-xs rounded-lg font-semibold cursor-pointer transition-all duration-fast ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-customgreen focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT[variant] || VARIANT.primary} ${SIZE[size] || SIZE.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
export default Button;
```

採用處（本批只換這幾處，全站逐頁替換登錄 future-list F036）：
- `src/components/ErrorBoundary/GlobalErrorBoundary.jsx` 的重試 / 回首頁按鈕
- `src/pages/teacher-dashboard/components/HelpSeekingView.jsx` 錯誤狀態的「重新載入」按鈕
- `src/pages/Kanban/components/KanbanOnboarding.jsx`、`src/pages/ideaWall/components/IdeaWallOnboarding.jsx` 的「下一步 / 開始使用」主按鈕

### 3. `src/components/ui/Overlay.jsx`

```jsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * 對話框遮罩：fixed 全螢幕、置中、Escape 與點遮罩關閉、role=dialog。
 * 面板本身由 children 提供（保留各處原本的 panel 樣式）。
 * stacked=true 時用 z-modal-stack（已經在某個 Modal 內再開一層）。
 */
export default function Overlay({ open = true, onClose, stacked = false, align = 'center', className = '', panelClassName = '', label, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const first = panelRef.current?.querySelector('[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href]');
    (first || panelRef.current)?.focus?.();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open]);

  if (!open) return null;
  const alignClass = align === 'bottom' ? 'items-end sm:items-center' : 'items-center';
  return createPortal(
    <div
      className={`fixed inset-0 ${stacked ? 'z-modal-stack' : 'z-modal'} flex ${alignClass} justify-center bg-black/50 p-component-base ${className}`}
      onClick={() => onCloseRef.current?.()}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} className={`outline-none ${panelClassName}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

把上面列的 11 處自畫遮罩改成 `<Overlay onClose={...} label="...">{原本的面板}</Overlay>`：
- 遮罩顏色 / 對齊如原本不是 `bg-black/50` 置中，用 `className` 覆寫（例如 `StageSuggestions` 的 `items-end sm:items-center` 用 `align="bottom"`；`TeacherOverview:406` 的 `bg-black/20` 用 `className="bg-black/20"`）。
- 原本遮罩層若沒有 `onClick` 關閉，仍傳 `onClose` 為該對話框的關閉函式（Escape 一定要能關）。
- 已在 Modal 內開啟的（`LogCard.jsx:294` 要實際讀上下文判斷）用 `stacked`。
- 原本的 z-index 不管是 `z-50` 或 `z-modal`，一律改由 Overlay 決定。
- 原面板若有 `onClick={(e) => e.stopPropagation()}` 可移除（Overlay 已處理）。
- 每一處改完要確認：關閉函式仍被呼叫、面板內容與樣式沒變。

完成後 `grep -rn "fixed inset-0" src` 只剩：`Modal.jsx`、`ui/Overlay.jsx`、`KanbanOnboarding.jsx`、`IdeaWallOnboarding.jsx`、`GuidancePanel.jsx:181`、`DraggableImage/index.jsx:92`、`Kanban.jsx` 的點擊外部關閉層。

## 邊界

- 不改 `Modal.jsx`。
- 不做全站按鈕替換。
- 不用任意 `z-[n]`；hover 不用 scale / translate。

## 驗證

- `npx eslint src/components/ui src/index.css` 之外改過的檔案。
- grep 清單如上。
