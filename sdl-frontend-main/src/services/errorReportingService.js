import React from 'react';

/**
 * 錯誤上報服務 - Linus式實用主義設計
 * "實用主義者解決實際問題，而不是假想的威脅"
 *
 * 設計目標：
 * 1. 開發環境：詳細錯誤信息，便於調試
 * 2. 生產環境：精簡上報，保護用戶隱私
 * 3. 可擴展：支持多種錯誤監控服務
 */

class ErrorReportingService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    this.errorQueue = [];
    this.isOnline = navigator.onLine;

    // 監聽網路狀態
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * 上報 React ErrorBoundary 捕獲的錯誤
   */
  reportReactError(error, errorInfo, errorId) {
    const errorReport = this.createErrorReport({
      type: 'react_error',
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      severity: 'high'
    });

    this.submitError(errorReport);
  }

  /**
   * 上報 JavaScript 運行時錯誤
   */
  reportJSError(error, errorId) {
    const errorReport = this.createErrorReport({
      type: 'js_error',
      id: errorId,
      message: error.message,
      stack: error.stack,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      severity: 'medium'
    });

    this.submitError(errorReport);
  }

  /**
   * 上報網路請求錯誤
   */
  reportNetworkError(url, method, statusCode, responseText, errorId) {
    const errorReport = this.createErrorReport({
      type: 'network_error',
      id: errorId,
      message: `Network error: ${method} ${url} ${statusCode}`,
      url: url,
      method: method,
      statusCode: statusCode,
      responseText: this.isDevelopment ? responseText : undefined,
      severity: statusCode >= 500 ? 'high' : 'low'
    });

    this.submitError(errorReport);
  }

  /**
   * 創建標準化錯誤報告
   */
  createErrorReport(errorData) {
    const baseReport = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown'
    };

    // 開發環境包含更多調試信息
    if (this.isDevelopment) {
      baseReport.localStorage = this.getLocalStorageInfo();
      baseReport.reactVersion = React.version;
    }

    return {
      ...baseReport,
      ...errorData
    };
  }

  /**
   * 提交錯誤報告
   */
  async submitError(errorReport) {
    if (this.isDevelopment) {
      // 開發環境：詳細控制台輸出
      console.group(`🚨 錯誤上報 [${errorReport.type}]`);
      console.error('錯誤詳情:', errorReport);
      console.groupEnd();
    }

    // 如果離線，添加到隊列
    if (!this.isOnline) {
      this.errorQueue.push(errorReport);
      console.warn('離線狀態，錯誤已加入隊列');
      return;
    }

    try {
      // 發送到後端錯誤收集 API
      await fetch(`${this.apiBaseUrl}/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });

      if (this.isDevelopment) {
        console.log('✅ 錯誤報告已提交');
      }
    } catch (submissionError) {
      console.error('錯誤上報失敗:', submissionError);

      // 如果上報失敗，添加到隊列稍後重試
      this.errorQueue.push(errorReport);
    }
  }

  /**
   * 清空錯誤隊列（網路恢復時）
   */
  async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    console.log(`📤 正在提交 ${this.errorQueue.length} 個離線錯誤報告`);

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const errorReport of errors) {
      await this.submitError(errorReport);
    }
  }

  /**
   * 獲取用戶ID（保護隱私）
   */
  getUserId() {
    try {
      const userId = localStorage.getItem('userId');
      // 生產環境可能需要匿名化處理
      return this.isDevelopment ? userId : (userId ? 'user_***' : 'anonymous');
    } catch {
      return 'anonymous';
    }
  }

  /**
   * 獲取會話ID
   */
  getSessionId() {
    try {
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 獲取 localStorage 信息（僅開發環境）
   */
  getLocalStorageInfo() {
    try {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // 過濾敏感信息
        if (!key.includes('token') && !key.includes('password')) {
          storage[key] = localStorage.getItem(key);
        }
      }
      return storage;
    } catch {
      return {};
    }
  }
}

// 創建全域實例
const errorReportingService = new ErrorReportingService();

// 監聽全域 JavaScript 錯誤
window.addEventListener('error', (event) => {
  const errorId = `js_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorReportingService.reportJSError(event.error, errorId);
});

// 監聽 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  const errorId = `promise_rejection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorReportingService.reportJSError(new Error(event.reason), errorId);
});

export default errorReportingService;