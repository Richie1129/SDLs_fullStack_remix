import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * 對話框遮罩：fixed 全螢幕、置中、Escape 與點遮罩關閉、role=dialog。
 * 面板本身由 children 提供（保留各處原本的 panel 樣式）。
 * stacked=true 時用 z-modal-stack（已經在某個 Modal 內再開一層）。
 * closeOnBackdrop=false 時點遮罩不關閉（表單類對話框避免誤觸丟失輸入），Escape 仍會關。
 * 限制：Escape 監聽掛在 document，沒有接 Modal.jsx 的 openStack；若疊在 Modal 之上，Escape 會兩層一起關。
 */
export default function Overlay({ open = true, onClose, stacked = false, align = 'center', closeOnBackdrop = true, className = '', panelClassName = '', label, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

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
      onClick={closeOnBackdrop ? () => onCloseRef.current?.() : undefined}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} className={`outline-none ${panelClassName}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
