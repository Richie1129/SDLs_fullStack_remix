import React from 'react';
import errorReportingService from '../../services/errorReportingService';

/**
 * 全域錯誤邊界組件 - Linus式簡潔設計
 * "好品味是一種直覺，需要經驗累積" - 基於現有ErrorBoundary優化
 *
 * 設計原則：
 * 1. 消除特殊情況 - 統一所有錯誤處理邏輯
 * 2. 零破壞性 - 完全向後相容
 * 3. 實用主義 - 解決真實問題
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // 生成錯誤ID用於追踪
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 GlobalErrorBoundary 捕獲到錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    }, () => {
      // 在 setState 完成後執行錯誤上報，確保 errorId 可用
      this.reportError(error, errorInfo);

      // 回調處理
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });
  }

  reportError = (error, errorInfo) => {
    // 使用錯誤上報服務
    errorReportingService.reportReactError(error, errorInfo, this.state.errorId);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // 刷新頁面作為最後手段
    if (this.props.fallbackToReload) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/homepage';
  };

  render() {
    if (this.state.hasError) {
      // 自定義錯誤 UI
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry)
          : this.props.fallback;
      }

      // 預設全域錯誤 UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-component-md-lg text-center">
            {/* 錯誤圖示 */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* 錯誤標題 */}
            <h1 className="text-h3 font-semibold text-gray-900 mb-2">
              糟糕，出現了一個問題
            </h1>

            {/* 錯誤描述 */}
            <p className="text-gray-600 mb-6">
              應用程式遇到了意外錯誤。我們已經記錄了這個問題，並將盡快修復。
            </p>

            {/* 操作按鈕 */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-customgreen text-white rounded-md hover:bg-teal-600 transition-colors"
              >
                重新載入
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                返回首頁
              </button>
            </div>

            {/* 錯誤ID - 用於技術支援 */}
            {this.state.errorId && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-caption text-gray-500">
                  錯誤ID: <code className="bg-gray-100 px-1 rounded">{this.state.errorId}</code>
                </p>
              </div>
            )}

            {/* 開發模式下顯示錯誤詳情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-component-sm bg-red-50 rounded border border-red-200 text-left">
                <summary className="text-red-700 font-medium cursor-pointer text-body-sm">
                  🔧 開發模式 - 錯誤詳情
                </summary>
                <div className="mt-2 text-caption text-red-600 font-mono">
                  <p><strong>錯誤:</strong> {this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 whitespace-pre-wrap text-caption overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;