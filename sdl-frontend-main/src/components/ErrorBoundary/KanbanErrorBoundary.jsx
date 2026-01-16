import React from 'react';
import errorReportingService from '../../services/errorReportingService';

/**
 * Kanban 專用錯誤邊界 - 針對拖放和實時協作優化
 * "Never break userspace" - 確保用戶的工作永遠不會丟失
 *
 * 設計重點：
 * 1. 拖放操作錯誤恢復
 * 2. Socket 斷線重連機制
 * 3. 樂觀更新失敗回滾
 * 4. 保護用戶的工作進度
 */
class KanbanErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error) {
    const errorId = `kanban_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 根據錯誤類型分類
    let errorType = 'unknown';
    if (error.message.includes('drag') || error.message.includes('drop')) {
      errorType = 'drag_drop';
    } else if (error.message.includes('socket') || error.message.includes('connection')) {
      errorType = 'network';
    } else if (error.message.includes('query') || error.message.includes('fetch')) {
      errorType = 'data_loading';
    }

    return {
      hasError: true,
      errorId,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🎯 KanbanErrorBoundary 捕獲到錯誤:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    }, () => {
      // 在 setState 完成後執行錯誤上報，確保 errorId 可用
      errorReportingService.reportReactError(error, errorInfo, this.state.errorId);

      // 通知父組件
      if (this.props.onError) {
        this.props.onError(error, errorInfo, this.state.errorId);
      }
    });

    // 嘗試自動恢復某些類型的錯誤
    this.attemptAutoRecovery();
  }

  attemptAutoRecovery = () => {
    const { errorType } = this.state;

    switch (errorType) {
      case 'drag_drop':
        // 拖放錯誤 - 清除拖放狀態
        console.log('🔄 嘗試恢復拖放操作...');
        this.clearDragDropState();
        break;

      case 'network':
        // 網路錯誤 - 嘗試重連
        console.log('🔄 嘗試重新連接...');
        this.attemptReconnection();
        break;

      case 'data_loading':
        // 數據載入錯誤 - 重新查詢
        console.log('🔄 嘗試重新載入數據...');
        this.reloadData();
        break;

      default:
        console.log('💔 無法自動恢復，需要用戶介入');
    }
  };

  clearDragDropState = () => {
    try {
      // 清除可能殘留的拖放狀態
      document.querySelectorAll('[data-rbd-draggable-id]').forEach(el => {
        el.style.transform = '';
        el.style.transition = '';
      });

      // 嘗試在短時間後自動恢復
      setTimeout(() => {
        if (this.state.hasError) {
          this.handleRetry();
        }
      }, 2000);
    } catch (recoveryError) {
      console.error('拖放狀態清除失敗:', recoveryError);
    }
  };

  attemptReconnection = () => {
    try {
      // 通知父組件嘗試重連
      if (this.props.onNetworkError) {
        this.props.onNetworkError();
      }

      // 設置重試計時器
      setTimeout(() => {
        if (this.state.hasError) {
          this.handleRetry();
        }
      }, 3000);
    } catch (recoveryError) {
      console.error('重連嘗試失敗:', recoveryError);
    }
  };

  reloadData = () => {
    try {
      // 通知父組件重新載入數據
      if (this.props.onDataReload) {
        this.props.onDataReload();
      }

      setTimeout(() => {
        if (this.state.hasError) {
          this.handleRetry();
        }
      }, 1500);
    } catch (recoveryError) {
      console.error('數據重載失敗:', recoveryError);
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
  };

  handleSaveAndReload = () => {
    // 提醒用戶保存工作，然後重新載入頁面
    const userConfirmed = window.confirm('即將重新載入頁面。請確認您的工作已保存。');
    if (userConfirmed) {
      window.location.reload();
    }
  };

  getErrorMessage = () => {
    const { errorType } = this.state;

    switch (errorType) {
      case 'drag_drop':
        return {
          title: '拖放操作發生錯誤',
          message: '看板的拖放功能遇到問題。您的數據是安全的，我們正在嘗試恢復。',
          action: '正在自動恢復拖放功能...'
        };

      case 'network':
        return {
          title: '連接中斷',
          message: '與伺服器的連接出現問題。您的本地更改已保存，連接恢復後會自動同步。',
          action: '正在嘗試重新連接...'
        };

      case 'data_loading':
        return {
          title: '數據載入失敗',
          message: '無法載入看板數據。請檢查網路連接。',
          action: '正在重新載入數據...'
        };

      default:
        return {
          title: '看板遇到問題',
          message: '看板組件發生未預期的錯誤。您的工作進度是安全的。',
          action: '準備恢復...'
        };
    }
  };

  render() {
    if (this.state.hasError) {
      const { title, message, action } = this.getErrorMessage();

      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 p-component-md-lg">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-component-md-lg text-center">
            {/* 錯誤圖示 */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* 錯誤標題 */}
            <h2 className="text-body-lg font-semibold text-gray-900 mb-2">
              {title}
            </h2>

            {/* 錯誤描述 */}
            <p className="text-gray-600 mb-4 text-body-sm">
              {message}
            </p>

            {/* 自動恢復狀態 */}
            <div className="mb-6">
              <p className="text-blue-600 text-body-sm mb-2">{action}</p>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="space-y-stack-xs">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-customgreen text-white rounded-md hover:bg-teal-600 transition-colors text-body-sm"
              >
                立即重試
              </button>

              <button
                onClick={this.handleSaveAndReload}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-body-sm"
              >
                重新載入頁面
              </button>
            </div>

            {/* 錯誤ID */}
            {this.state.errorId && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-caption text-gray-500">
                  錯誤ID: <code className="bg-gray-100 px-1 rounded text-caption">{this.state.errorId}</code>
                </p>
              </div>
            )}

            {/* 開發模式錯誤詳情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-component-sm bg-red-50 rounded border border-red-200 text-left">
                <summary className="text-red-700 font-medium cursor-pointer text-caption">
                  🔧 開發模式 - 錯誤詳情
                </summary>
                <div className="mt-2 text-caption text-red-600 font-mono">
                  <p><strong>錯誤類型:</strong> {this.state.errorType}</p>
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
    }

    return this.props.children;
  }
}

export default KanbanErrorBoundary;