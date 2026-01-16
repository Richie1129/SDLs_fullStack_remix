import React from 'react';
import errorReportingService from '../../services/errorReportingService';

/**
 * 圖表專用錯誤邊界 - 針對數據可視化優化
 * "如果你需要超過3層縮進，你就已經完蛋了" - 簡潔的圖表錯誤處理
 *
 * 設計重點：
 * 1. 圖表渲染錯誤隔離
 * 2. 數據載入失敗處理
 * 3. 大數據集渲染保護
 * 4. 降級顯示策略
 */
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = `chart_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('📊 ChartErrorBoundary 捕獲到圖表錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    }, () => {
      // 錯誤上報
      errorReportingService.reportReactError(error, errorInfo, this.state.errorId);

      // 回調處理
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: newRetryCount
    });

    // 回調重試邏輯
    if (this.props.onRetry) {
      this.props.onRetry(newRetryCount);
    }
  };

  renderFallbackChart = () => {
    const { chartType, title, data } = this.props;

    // 簡單的降級顯示
    if (chartType === 'bar' && Array.isArray(data)) {
      return (
        <div className="w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-component-base">
          <div className="text-gray-600 mb-4">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-body-sm font-medium text-gray-700 mb-2">{title || '圖表數據'}</h3>
          <div className="text-caption text-gray-500 text-center space-y-1">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center space-x-stack-sm">
                <span>{item.name || item.label || `項目 ${index + 1}`}</span>
                <span className="font-mono">{item.value || item.count || 0}</span>
              </div>
            ))}
            {data.length > 5 && (
              <div className="text-gray-400">... 還有 {data.length - 5} 項</div>
            )}
          </div>
        </div>
      );
    }

    // 通用降級顯示
    return (
      <div className="w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-component-base">
        <div className="text-gray-600 mb-4">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h3 className="text-body-sm font-medium text-gray-700 mb-2">{title || '圖表顯示'}</h3>
        <p className="text-caption text-gray-500 text-center">
          圖表渲染遇到問題，已切換到簡化顯示模式
        </p>
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定義降級組件
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleRetry, this.state.retryCount)
          : this.props.fallback;
      }

      // 如果啟用了降級顯示
      if (this.props.enableFallback) {
        return (
          <div className="relative">
            {this.renderFallbackChart()}

            {/* 錯誤提示與重試按鈕 */}
            <div className="absolute top-2 right-2">
              <button
                onClick={this.handleRetry}
                className="bg-blue-500 text-white px-2 py-1 rounded text-caption hover:bg-blue-600 transition-colors"
                title="重試載入圖表"
              >
                🔄 重試
              </button>
            </div>

            {/* 開發模式錯誤詳情 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2 p-component-xs bg-red-50 rounded border border-red-200 text-left">
                <summary className="text-red-700 font-medium cursor-pointer text-caption">
                  🔧 圖表錯誤詳情
                </summary>
                <div className="mt-1 text-caption text-red-600 font-mono">
                  <p><strong>錯誤:</strong> {this.state.error?.toString()}</p>
                  <p><strong>重試次數:</strong> {this.state.retryCount}</p>
                </div>
              </details>
            )}
          </div>
        );
      }

      // 預設錯誤顯示
      return (
        <div className="w-full h-32 bg-red-50 rounded-lg border border-red-200 flex items-center justify-center p-component-base">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-700 text-body-sm font-medium">圖表載入失敗</p>
            <button
              onClick={this.handleRetry}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-caption hover:bg-red-700 transition-colors"
            >
              重試 ({this.state.retryCount + 1})
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;