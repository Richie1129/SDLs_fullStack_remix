import React from 'react';
import { getCurrentUserId } from '../utils/authUtils';

/**
 * 錯誤上報服務 - Linus式實用主義設計
 * "實用主義者解決實際問題，而不是假想的威脅"
 *
 * 設計目標：
 * 1. 開發環境：詳細錯誤信息，便於調試
 * 2. 生產環境：精簡上報，保護用戶隱私
 * 3. 可擴展：支持多種錯誤監控服務
 */

// 網址裡可能帶密碼重設 token 等敏感 query／fragment：上報前先遮蔽，fragment 整段丟掉
const SENSITIVE_PARAM_HINTS = ['token', 'password', 'secret', 'code', 'key'];

function redactUrl(href) {
  if (typeof href !== 'string' || !href) return href ?? null;
  try {
    const url = new URL(href, window.location.origin);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (SENSITIVE_PARAM_HINTS.some((hint) => lower.includes(hint))) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    url.hash = '';
    return url.toString();
  } catch {
    return href.split(/[?#]/)[0];
  }
}

class ErrorReportingService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    this.errorQueue = [];
    this.isOnline = navigator.onLine;

    // 節流去重：同一 type+message+stack 在 60 秒內只送一次；全域每分鐘最多 10 筆
    this.dedupeWindowMs = 60_000;
    this.rateLimitWindowMs = 60_000;
    this.rateLimitMax = 10;
    this.recentErrorKeys = new Map(); // dedupeKey → 上次送出的時間戳
    this.sentTimestamps = [];         // 最近一分鐘內送出的時間戳

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
    const safeUrl = redactUrl(url);
    const errorReport = this.createErrorReport({
      type: 'network_error',
      id: errorId,
      message: `Network error: ${method} ${safeUrl} ${statusCode}`,
      url: safeUrl,
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
      url: redactUrl(window.location.href),
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
   * 產生去重 key：type + message + stack 前 300 字（network error 另加 method+url）
   */
  getDedupeKey(errorReport) {
    const stack = typeof errorReport.stack === 'string' ? errorReport.stack.slice(0, 300) : '';
    const endpoint = errorReport.method && errorReport.url ? `${errorReport.method} ${errorReport.url}` : '';
    return [errorReport.type, errorReport.message, stack, endpoint].join('|');
  }

  /**
   * 節流去重判斷；通過時會記錄本次送出，回傳 true
   * - 同一 key 在 dedupeWindowMs 內只送一次
   * - 全域 rateLimitWindowMs 內最多 rateLimitMax 筆
   */
  shouldSubmit(errorReport) {
    const now = Date.now();
    const key = this.getDedupeKey(errorReport);

    const lastSent = this.recentErrorKeys.get(key);
    if (lastSent !== undefined && now - lastSent < this.dedupeWindowMs) {
      return false;
    }

    this.sentTimestamps = this.sentTimestamps.filter((t) => now - t < this.rateLimitWindowMs);
    if (this.sentTimestamps.length >= this.rateLimitMax) {
      return false;
    }

    this.recentErrorKeys.set(key, now);
    this.sentTimestamps.push(now);

    // 定期清掉過期 key，避免 Map 無限成長
    if (this.recentErrorKeys.size > 200) {
      for (const [k, t] of this.recentErrorKeys) {
        if (now - t >= this.dedupeWindowMs) this.recentErrorKeys.delete(k);
      }
    }
    return true;
  }

  /**
   * 提交錯誤報告
   * @param {object} errorReport
   * @param {{ fromQueue?: boolean }} [options] fromQueue=true 表示離線佇列重送，入列時已通過節流檢查，不再重算
   */
  async submitError(errorReport, { fromQueue = false } = {}) {
    if (this.isDevelopment) {
      // 開發環境：詳細控制台輸出
      console.group(`🚨 錯誤上報 [${errorReport.type}]`);
      console.error('錯誤詳情:', errorReport);
      console.groupEnd();
    }

    // 節流去重：socket 重連風暴等重複錯誤不再逐次打 /api/errors
    if (!fromQueue && !this.shouldSubmit(errorReport)) {
      if (this.isDevelopment) {
        console.log('錯誤報告已節流，略過上報');
      }
      return;
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
      await this.submitError(errorReport, { fromQueue: true });
    }
  }

  /**
   * 獲取用戶ID（保護隱私）
   */
  getUserId() {
    try {
      const userId = getCurrentUserId();
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
        // 過濾敏感信息（不分大小寫：accessToken / refreshToken 也要擋）
        const lowerKey = key.toLowerCase();
        if (!lowerKey.includes('token') && !lowerKey.includes('password')) {
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
export { redactUrl };

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