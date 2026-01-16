import React from 'react';
import errorReportingService from '../../services/errorReportingService';
import LoadingState from '../../pages/student-dashboard/components/LoadingState';

/**
 * Dashboard 專用錯誤邊界 - 針對數據密集型組件優化
 * "好程式設計師關心數據結構" - 保護複雜數據處理流程
 *
 * 設計重點：
 * 1. 數據載入錯誤隔離
 * 2. 模組化錯誤恢復
 * 3. 用戶會話保護
 * 4. 優雅降級顯示
 */
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorType: 'unknown',
      lastWorkingData: null
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = `dashboard_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 錯誤類型分析
    let errorType = 'unknown';
    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = 'network';
    } else if (error.message.includes('data') || error.message.includes('undefined')) {
      errorType = 'data_processing';
    } else if (error.message.includes('render') || error.message.includes('chart')) {
      errorType = 'rendering';
    } else if (error.message.includes('permission') || error.message.includes('auth')) {
      errorType = 'permission';
    }

    return {
      hasError: true,
      errorId,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('📊 DashboardErrorBoundary 捕獲到錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    }, () => {
      // 保存當前工作數據
      this.saveWorkingData();

      // 錯誤上報
      errorReportingService.reportReactError(error, errorInfo, this.state.errorId);

      // 回調處理
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });
  }

  saveWorkingData = () => {
    try {
      // 嘗試保存當前的 props 數據，以備恢復使用
      const workingData = {
        timestamp: Date.now(),
        props: this.props.data || this.props.children?.props || null
      };
      this.setState({ lastWorkingData: workingData });
    } catch (saveError) {
      console.warn('保存工作數據失敗:', saveError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorType: 'unknown'
    });

    // 回調重試邏輯
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleRefreshData = () => {
    // 通知父組件刷新數據
    if (this.props.onDataRefresh) {
      this.props.onDataRefresh();
    }
    this.handleRetry();
  };

  getErrorConfig = () => {
    const { errorType } = this.state;

    switch (errorType) {
      case 'network':
        return {
          icon: '🌐',
          title: '網路連接問題',
          message: '無法載入 Dashboard 數據，請檢查網路連接',
          actions: [
            { label: '重新載入數據', handler: this.handleRefreshData, primary: true },
            { label: '重試', handler: this.handleRetry }
          ]
        };

      case 'data_processing':
        return {
          icon: '📊',
          title: '數據處理錯誤',
          message: '分析學習數據時發生問題，可能是數據格式異常',
          actions: [
            { label: '重新分析', handler: this.handleRefreshData, primary: true },
            { label: '重試', handler: this.handleRetry }
          ]
        };

      case 'rendering':
        return {
          icon: '🎨',
          title: '顯示渲染錯誤',
          message: 'Dashboard 組件渲染時發生問題',
          actions: [
            { label: '重新渲染', handler: this.handleRetry, primary: true }
          ]
        };

      case 'permission':
        return {
          icon: '🔒',
          title: '權限不足',
          message: '您可能沒有查看此 Dashboard 的權限',
          actions: [
            { label: '重新檢查權限', handler: this.handleRefreshData, primary: true }
          ]
        };

      default:
        return {
          icon: '⚠️',
          title: 'Dashboard 載入失敗',
          message: '學習數據面板遇到未預期的問題',
          actions: [
            { label: '重新載入', handler: this.handleRefreshData, primary: true },
            { label: '重試', handler: this.handleRetry }
          ]
        };
    }
  };

  renderErrorUI = () => {
    const config = this.getErrorConfig();

    return (
      <div className="w-full h-full min-h-[400px] bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="h-full flex flex-col items-center justify-center p-component-md-lg text-center">
          {/* 錯誤圖示 */}
          <div className="text-display mb-4">{config.icon}</div>

          {/* 錯誤標題 */}
          <h2 className="text-body-lg font-semibold text-gray-900 mb-2">
            {config.title}
          </h2>

          {/* 錯誤描述 */}
          <p className="text-gray-600 mb-6 max-w-md">
            {config.message}
          </p>

          {/* 操作按鈕 */}
          <div className="flex flex-wrap gap-3 justify-center">
            {config.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.handler}
                className={`px-4 py-2 rounded-md text-body-sm font-medium transition-colors ${
                  action.primary
                    ? 'bg-customgreen text-white hover:bg-teal-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* 上次工作數據恢復選項 */}
          {this.state.lastWorkingData && (
            <div className="mt-6 p-component-sm bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-body-sm">
                檢測到之前的工作數據，是否嘗試恢復？
              </p>
              <button
                onClick={() => {
                  // 這裡可以實現數據恢復邏輯
                  console.log('恢復數據:', this.state.lastWorkingData);
                  this.handleRetry();
                }}
                className="mt-2 text-blue-600 text-body-sm underline hover:text-blue-800"
              >
                恢復上次數據
              </button>
            </div>
          )}

          {/* 錯誤ID */}
          {this.state.errorId && (
            <div className="mt-6 pt-4 border-t border-gray-200 w-full max-w-md">
              <p className="text-caption text-gray-500">
                錯誤ID: <code className="bg-gray-100 px-1 rounded text-caption">{this.state.errorId}</code>
              </p>
            </div>
          )}

          {/* 開發模式錯誤詳情 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-component-sm bg-red-50 rounded border border-red-200 text-left w-full max-w-md">
              <summary className="text-red-700 font-medium cursor-pointer text-body-sm">
                🔧 開發模式 - 錯誤詳情
              </summary>
              <div className="mt-2 text-caption text-red-600 font-mono">
                <p><strong>類型:</strong> {this.state.errorType}</p>
                <p><strong>錯誤:</strong> {this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap text-caption overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      // 自定義錯誤 UI
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry)
          : this.props.fallback;
      }

      // 使用 LoadingState 風格的錯誤顯示
      if (this.props.useLoadingStyle) {
        return (
          <LoadingState
            type="error"
            title={this.getErrorConfig().title}
            message={this.getErrorConfig().message}
            className="min-h-[400px]"
          />
        );
      }

      // 預設錯誤 UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;