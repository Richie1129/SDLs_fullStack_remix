/**
 * ErrorBoundary 組件統一導出
 * "好程式設計師關心數據結構" - 組織良好的文件結構
 */

export { default as GlobalErrorBoundary } from './GlobalErrorBoundary';
export { default as PageErrorBoundary } from './PageErrorBoundary';
export { default as KanbanErrorBoundary } from './KanbanErrorBoundary';
export { default as DashboardErrorBoundary } from './DashboardErrorBoundary';
export { default as ChartErrorBoundary } from './ChartErrorBoundary';
export { default as CommentErrorBoundary } from './CommentErrorBoundary';
// SocketStatusIndicator 不再由 barrel 轉出：它會載入 services/socketManager（第二個 socket 實例），
// 需要時請直接 import './SocketStatusIndicator'，避免所有引用 barrel 的頁面都把它拉進 bundle。

// 預設導出最常用的全域 ErrorBoundary
export { default } from './GlobalErrorBoundary';