import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PREFERRED = '[autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

// 目前開啟中的 Modal 堆疊：只有最上層的那個處理 Escape 與 Tab，
// 巢狀時（卡片詳情內再開圖片放大）Escape 才會先關內層、再關外層
const openStack = [];

export default function Modal({ open, onClose, opacity, position, modalCoordinate, children, custom, enableScroll = true, noPadding = false }) {
    const [coordinate, setCoordinate] = useState({});
    const panelRef = useRef(null);
    const restoreFocusRef = useRef(null);
    // onClose 多半是呼叫端的 inline 箭頭函式，每次 render 都是新身分；
    // 放進 ref 讓下方 effect 只依賴 open，避免父層重渲染時焦點被拉回面板
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        setCoordinate(modalCoordinate);
    }, [modalCoordinate]);

    // 開啟：記住觸發元素、把焦點移進面板；關閉：焦點還原
    useEffect(() => {
        if (!open) return;
        const token = {};
        openStack.push(token);
        restoreFocusRef.current = document.activeElement;
        const panel = panelRef.current;
        const first = panel?.querySelector(PREFERRED) || panel?.querySelector(FOCUSABLE);
        (first || panel)?.focus();

        const handleKeyDown = (e) => {
            if (openStack[openStack.length - 1] !== token) return;
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current?.();
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
            const idx = openStack.indexOf(token);
            if (idx !== -1) openStack.splice(idx, 1);
            restoreFocusRef.current?.focus?.();
        };
    }, [open]);

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
