# 009 — 共用 Modal 補 Escape、焦點陷阱、role，改用 portal；想法牆兩個節點視窗加遮罩

- **Status**: TODO
- **Commit**: 564c298
- **Severity**: HIGH（實測：所有 Modal 都不能用 Escape 關閉；想法牆節點編輯視窗沒有遮罩、開著時畫布仍可拖曳）
- **Category**: 鍵盤與無障礙
- **Estimated scope**: `src/components/Modal.jsx` 重寫（約 34 行變 90 行）+ 2 個想法牆 Modal 各 1 個 prop
- **Depends on**: 008（Modal 的 `z-modal` class；若 008 未做，暫時保留 `z-50`）

## Problem

```jsx
// src/components/Modal.jsx — current（完整）
import React, {useState, useEffect} from 'react'

export default function Modal({ open, onClose, opacity, position, modalCoordinate, children, custom, enableScroll = true, noPadding = false }) {
    const [coordinate, setCoordinate] = useState({})
    useEffect(()=>{
        setCoordinate(modalCoordinate);
    },[modalCoordinate])

    const scrollClass = enableScroll ? "max-h-[90vh] overflow-y-auto" : "";
    const paddingClass = noPadding ? "" : "p-component-sm sm:p-component-md";

    return (
        <>
            {
                coordinate ?
                <div  style={{top: `${coordinate.y}px`, left: `${coordinate.x}px`}} className={`z-50 fixed flex transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow transition-[transform,opacity] duration-normal ease-out ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}`} >
                    {/* 註解掉的關閉鈕 */}
                    {children}
                    </div>
                </div>
                :
                <div className={`z-50 fixed inset-0 flex items-center justify-center transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow ${paddingClass} transition-[transform,opacity] duration-normal ease-out ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}`} >
                    {children}
                    </div>
                </div>
            }
        </>
    )
}
```

問題：
1. `onClose` 被解構但整個檔案沒用：沒有 Escape、沒有點遮罩關閉。
2. 沒有 `role="dialog"`、`aria-modal`、焦點陷阱；開啟時焦點不一定進入，關閉後焦點不還原。
3. 在呼叫端原地渲染，不是 portal，層級受父層 stacking context 影響。
4. 想法牆的 `CreateNodeModal.jsx:22` 與 `UpdateNodeModal.jsx:38` 傳 `opacity={false}`，沒有遮罩；實測視窗開著時右鍵畫布，畫布會平移。

呼叫端共 11 處（`grep -rn "<Modal " src`），全部都傳 `onClose`。`CreateOptionMenu.jsx` 用 `modalCoordinate` 分支當 context menu。

## Target

```jsx
// target：src/components/Modal.jsx（完整取代）
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, opacity, position, modalCoordinate, children, custom, enableScroll = true, noPadding = false }) {
    const [coordinate, setCoordinate] = useState({});
    const panelRef = useRef(null);
    const restoreFocusRef = useRef(null);

    useEffect(() => {
        setCoordinate(modalCoordinate);
    }, [modalCoordinate]);

    // 開啟：記住觸發元素、把焦點移進面板；關閉：焦點還原
    useEffect(() => {
        if (!open) return;
        restoreFocusRef.current = document.activeElement;
        const panel = panelRef.current;
        const first = panel?.querySelector(FOCUSABLE);
        (first || panel)?.focus();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose?.();
                return;
            }
            if (e.key !== 'Tab' || !panel) return;
            const items = Array.from(panel.querySelectorAll(FOCUSABLE));
            if (items.length === 0) { e.preventDefault(); return; }
            const firstItem = items[0];
            const lastItem = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
            else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            restoreFocusRef.current?.focus?.();
        };
    }, [open, onClose]);

    const scrollClass = enableScroll ? "max-h-[90vh] overflow-y-auto" : "";
    const paddingClass = noPadding ? "" : "p-component-sm sm:p-component-md";
    const panelClass = `bg-white rounded-md shadow outline-none transition-[transform,opacity] duration-normal ease-out ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}`;

    const content = coordinate ? (
        <div style={{ top: `${coordinate.y}px`, left: `${coordinate.x}px` }} className={`z-modal fixed flex transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
            <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={panelClass}>
                {children}
            </div>
        </div>
    ) : (
        <div onClick={() => onClose?.()} className={`z-modal fixed inset-0 flex items-center justify-center transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
            <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={`${panelClass} ${paddingClass}`}>
                {children}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
```

想法牆兩個節點視窗：

```jsx
{/* src/pages/ideaWall/components/modals/CreateNodeModal.jsx:22 與 UpdateNodeModal.jsx:38 — current */}
<Modal open={open} onClose={onClose} opacity={false} position={"justify-center items-center"}>
{/* target */}
<Modal open={open} onClose={onClose} opacity={true} position={"justify-center items-center"}>
```

## Repo conventions to follow

- 若 008 未執行，`z-modal` 改回 `z-50`。
- `Escape` 處理用 `stopPropagation`，避免與 `TopBar.jsx:33-42` 既有的 Escape 關下拉監聽互相觸發。
- 正面範例：`src/components/LazyFallback.jsx:13-14` 已用 `role` 與 `aria-live`。

## Steps

1. 用 Target 的完整內容取代 `src/components/Modal.jsx`。
2. `CreateNodeModal.jsx:22`、`UpdateNodeModal.jsx:38`：`opacity={false}` 改 `opacity={true}`。
3. 檢查 `src/pages/ideaWall/components/modals/CreateOptionMenu.jsx` 的兩個 `<Modal`（第 20、51 行起）：它們用 `modalCoordinate`，走 coordinate 分支，本計畫只給它 Escape，不加遮罩。確認 `onClose` 有傳；沒有就傳關閉 menu 的 setter。
4. 全專案搜尋 `<Modal ` 的 11 個呼叫端，確認每個 `onClose` 都是「關閉」語意（不是送出）。`AITaskAssistantModalContent.jsx:576` 傳 `handleClose`，讀一下確認它不會觸發送出。

## Boundaries

- 不改任何呼叫端的內容與版面，只改 `opacity` prop。
- 不改 `CreateOptionMenu` 的定位邏輯。
- 不引入 headless UI 或其他套件。
- 若 `Modal.jsx` 現況與摘錄不符，停止並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -n "createPortal\|role=\"dialog\"\|Escape" src/components/Modal.jsx     # 預期各 >= 1
  grep -n "opacity={false}" src/pages/ideaWall/components/modals/*.jsx          # 預期無輸出
  npm run build && npx vitest run
  ```
- **Feel check**：
  - 首頁「建立活動」：開啟後焦點在第一個輸入框；按 Escape 關閉；焦點回到「建立活動」按鈕；Tab 到最後一個按鈕再按 Tab 會回到第一個輸入框。
  - 點遮罩空白處關閉。
  - 想法牆點任一節點：有半透明遮罩；視窗開著時右鍵或拖曳畫布，畫布不動；Escape 關閉。
  - 想法牆右鍵畫布的 context menu 仍能開，Escape 可關。
  - Kanban 卡片詳情 Modal：內部圖片放大 Modal 疊在其上，Escape 先關內層再關外層（各關各的，不會兩個一起關；若一起關，把內層的 Escape 監聽改為只在 `open` 時綁定並用 `stopPropagation`，本 Target 已如此）。
  - TopBar 使用者下拉開著時按 Escape 只關下拉，不影響其他。
- **Done when**：grep 符合、build 與測試通過、六項目視檢查通過。
