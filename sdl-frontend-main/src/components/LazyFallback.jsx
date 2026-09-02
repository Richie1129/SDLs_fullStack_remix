import { FiLoader } from 'react-icons/fi';

/**
 * LazyFallback - React.lazy 元件載入中的簡單佔位區塊
 *
 * 供 Suspense fallback 使用；圖示用 react-icons，間距與字級用設計系統 token。
 * @param {string} label - 顯示文字
 * @param {string} className - 外層容器額外 class（例如 h-full 讓它撐滿父層）
 */
export default function LazyFallback({ label = '載入中…', className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-stack-xs p-component-sm sm:p-component-base md:p-component-md text-body-sm text-gray-500 ${className}`}
    >
      <FiLoader className="w-4 h-4 animate-spin text-customgreen shrink-0" />
      <span>{label}</span>
    </div>
  );
}
