import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiTool } from 'react-icons/fi';
import errorReportingService from '../../services/errorReportingService';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError() {
    const errorId = `page_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error, errorInfo) {
    console.error('📄 PageErrorBoundary 捕獲到錯誤:', error, errorInfo);

    this.setState({ error, errorInfo }, () => {
      errorReportingService.reportReactError(error, errorInfo, this.state.errorId);
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry)
        : this.props.fallback;
    }

    const pageName = this.props.pageName || '此頁面';

    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center p-component-md">
        <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-sm p-component-md-lg text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100 mb-4">
            <FiAlertTriangle className="h-7 w-7 text-yellow-600" />
          </div>

          <h2 className="text-h3 font-semibold text-gray-900 mb-2">
            {pageName}載入時發生問題
          </h2>

          <p className="text-body-sm text-gray-600 mb-6">
            頁面遇到了意外錯誤，您可以嘗試重試或重新載入頁面。其他功能仍可正常使用。
          </p>

          <div className="flex flex-col sm:flex-row gap-stack-sm justify-center">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-customgreen text-white rounded-md hover:bg-teal-600 transition-colors duration-normal text-body-sm font-medium"
            >
              <FiRefreshCw className="w-4 h-4" />
              重試
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-normal text-body-sm font-medium"
            >
              重新載入頁面
            </button>
          </div>

          {this.state.errorId && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-caption text-gray-500">
                錯誤ID: <code className="bg-gray-100 px-1 rounded">{this.state.errorId}</code>
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-component-sm bg-red-50 rounded border border-red-200 text-left">
              <summary className="text-red-700 font-medium cursor-pointer text-body-sm">
                <FiTool className="w-4 h-4 inline mr-1" /> 開發模式 - 錯誤詳情
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
}

export default PageErrorBoundary;
