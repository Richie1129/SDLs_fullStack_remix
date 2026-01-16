import React from 'react';
import errorReportingService from '../../services/errorReportingService';

/**
 * 評論系統專用錯誤邊界 - Linus式設計
 * "消除特殊情況永遠優於增加條件判斷"
 *
 * 設計原則：
 * 1. 專門處理評論相關錯誤
 * 2. 提供友善的降級界面
 * 3. 不破壞整體用戶體驗
 */
class CommentErrorBoundary extends React.Component {
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
    const errorId = `comment_error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return {
      hasError: true,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🗨️ CommentErrorBoundary 捕獲到評論錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    }, () => {
      this.reportError(error, errorInfo);

      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });
  }

  reportError = (error, errorInfo) => {
    try {
      errorReportingService.reportError(error, {
        ...errorInfo,
        errorId: this.state.errorId,
        component: 'CommentErrorBoundary',
        context: this.props.context || 'comment_system',
        userId: localStorage.getItem('id') || 'unknown',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (reportError) {
      console.error('CommentErrorBoundary 錯誤上報失敗:', reportError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      // 友善的評論錯誤界面
      return (
        <div className="flex flex-col items-center justify-center p-component-md-lg bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-display mb-4">💬</div>
            <h3 className="text-body-lg font-medium text-gray-800 mb-2">
              評論載入失敗
            </h3>
            <p className="text-body-sm text-gray-600 mb-4">
              抱歉，評論功能暫時無法使用
            </p>
            <div className="flex flex-col sm:flex-row gap-stack-xs justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors text-body-sm"
              >
                重試
              </button>
              {this.props.showDetails && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-body-sm text-gray-500 hover:text-gray-700">
                    技術詳情 (錯誤ID: {this.state.errorId})
                  </summary>
                  <pre className="mt-2 p-component-sm bg-gray-100 rounded text-caption text-gray-700 overflow-auto max-h-32">
                    {this.state.error?.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CommentErrorBoundary;