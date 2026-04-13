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
export { default as SocketStatusIndicator } from './SocketStatusIndicator';

// 預設導出最常用的全域 ErrorBoundary
export { default } from './GlobalErrorBoundary';