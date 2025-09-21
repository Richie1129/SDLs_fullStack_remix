import React from 'react';
import LoadingState from './LoadingState';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary 捕獲到錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // 可以在這裡添加錯誤報告邏輯
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // 自定義錯誤 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 預設錯誤 UI
      return (
        <div className="bg-white p-4 rounded-lg border border-red-200">
          <LoadingState
            type="error"
            title="組件發生錯誤"
            message="抱歉，排行榜組件出現問題"
            className="py-6"
          />

          {/* 開發模式下顯示錯誤詳情 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-3 bg-red-50 rounded border border-red-200">
              <summary className="text-red-700 font-medium cursor-pointer">
                錯誤詳情 (開發模式)
              </summary>
              <div className="mt-2 text-xs text-red-600 font-mono">
                <p><strong>錯誤:</strong> {this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* 重試按鈕 */}
          <div className="mt-4 text-center">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-customgreen text-white rounded hover:bg-teal-600 transition-colors text-sm"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;