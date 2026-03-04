import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { getCurrentUserId } from '../utils/authUtils';
import { authStorage } from '../services/storageService';
import { initAutoCaptureWithTrack } from '../utils/autoCapture';

const TrackingContext = createContext(null);

/**
 * EventBatcher - 批量發送審計事件，優化效能
 * 
 * 特性:
 * - 批量發送 (預設 20 個事件/批)
 * - 定時刷新 (預設 5 秒)
 * - sendBeacon 保證頁面離開時送達
 * - 自動重試機制 (最多 3 次)
 * - keepalive 保持連線
 */
class EventBatcher {
  constructor({
    maxBatchSize = 20,
    flushIntervalMs = 5000,
    endpoint = '/audit/batch',
    maxRetries = 3
  }) {
    this.queue = [];
    this.endpoint = endpoint;
    this.maxBatchSize = maxBatchSize;
    this.maxRetries = maxRetries;
    this.flushIntervalMs = flushIntervalMs;
    
    // 定時刷新
    this.timer = setInterval(() => this.flush(), flushIntervalMs);

    // 頁面離開時用 sendBeacon 保證送達
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && this.queue.length > 0) {
        // 未登入時不送出，避免 401
        if (!authStorage.get('accessToken')) {
          this.queue = [];
          return;
        }
        const payload = JSON.stringify({ events: this.queue });
        const sent = navigator.sendBeacon(
          `${import.meta.env.VITE_API_BASE_URL || '/api'}${this.endpoint}`,
          payload
        );
        if (sent) {
          console.log(`✅ [TrackingProvider] sendBeacon 成功發送 ${this.queue.length} 個事件`);
          this.queue = [];
        } else {
          console.warn(`⚠️ [TrackingProvider] sendBeacon 失敗，將在下次啟動時重試`);
        }
      }
    };
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * 新增事件到佇列
   * @param {Object} event - 審計事件
   */
  push(event) {
    // 未登入時不排入佇列，避免後續 flush 產生 401
    if (!authStorage.get('accessToken')) {
      return;
    }

    this.queue.push({ 
      ...event, 
      _ts: Date.now(),
      _clientId: this._generateClientId()
    });
    
    // 達到批量大小時立即刷新
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * 刷新佇列，批量發送事件
   */
  async flush() {
    if (this.queue.length === 0) return;

    // 未登入時不發送，避免 401；清空佇列以防止舊事件累積
    const token = authStorage.get('accessToken');
    if (!token) {
      this.queue = [];
      return;
    }
    
    const batch = this.queue.splice(0, this.maxBatchSize);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || '/api'}${this.endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'accessToken': authStorage.get('accessToken') || ''
          },
          body: JSON.stringify({ events: batch }),
          keepalive: true, // 保證請求完成
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ [TrackingProvider] 批量發送成功: ${data.count || batch.length} 個事件`);
    } catch (error) {
      console.error('❌ [TrackingProvider] 批量發送失敗:', error);
      
      // 重試失敗的事件 (最多 maxRetries 次)
      const retryable = batch
        .filter(e => (e._retries || 0) < this.maxRetries)
        .map(e => ({ ...e, _retries: (e._retries || 0) + 1 }));
      
      if (retryable.length > 0) {
        console.log(`♻️ [TrackingProvider] 將重試 ${retryable.length} 個事件`);
        this.queue.unshift(...retryable);
      }
    }
  }

  /**
   * 生成客戶端 ID (用於去重)
   */
  _generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 銷毀 batcher，清理資源
   */
  destroy() {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.flush(); // 最後刷新一次
  }
}

/**
 * TrackingProvider - 全局追蹤上下文
 * 
 * 使用方式:
 * 1. 在應用根部包裹 <TrackingProvider>
 * 2. 在任意元件中使用 useTracking() Hook
 * 3. 呼叫 track() 方法記錄事件
 * 
 * @example
 * const { track } = useTracking();
 * track('KANBAN_TASK_CLICK', 'task', taskId, { projectId: 123 });
 */
export function TrackingProvider({ children }) {
  const batcherRef = useRef(null);

  // 使用 useEffect 初始化 EventBatcher，確保與 React 生命週期同步
  useEffect(() => {
    // 如果已經初始化過，不重複建立
    if (batcherRef.current) {
      return;
    }

    // 建立新的 EventBatcher 實例
    batcherRef.current = new EventBatcher({
      maxBatchSize: 20,
      flushIntervalMs: 5000,
      endpoint: '/audit/batch',
      maxRetries: 3
    });

    console.log('✅ [TrackingProvider] EventBatcher 已初始化');

    // 清理函數：元件卸載時清理資源
    return () => {
      if (batcherRef.current) {
        console.log('🧹 [TrackingProvider] 正在清理 EventBatcher');
        batcherRef.current.destroy();
        batcherRef.current = null;
      }
    };
  }, []); // 空依賴陣列，確保只執行一次

  /**
   * 追蹤事件
   * @param {string} action - 動作碼 (如 'KANBAN_TASK_CLICK')
   * @param {string} targetType - 目標類型 (如 'task', 'node', 'user')
   * @param {string|number|null} targetId - 目標 ID
   * @param {Object} metadata - 額外的 metadata
   */
  const track = useCallback((action, targetType = 'client', targetId = null, metadata = {}) => {
    if (!action) {
      console.warn('⚠️ [TrackingProvider] action 不可為空');
      return;
    }

    // 防禦性檢查：確保 EventBatcher 已經初始化
    if (!batcherRef.current) {
      console.warn('⚠️ [TrackingProvider] EventBatcher 尚未初始化，事件將被忽略:', action);
      return;
    }

    const userId = getCurrentUserId();

    batcherRef.current.push({
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      metadata: {
        ...metadata,
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
      // 自動注入上下文
      projectId: metadata.projectId || null,
      userId: userId || null,
    });
  }, []);

  /**
   * 立即刷新佇列 (用於關鍵操作)
   */
  const flush = useCallback(() => {
    batcherRef.current?.flush();
  }, []);

  // Phase 4: 初始化 data-track 自動捕獲機制
  const autoCaptureCleanupRef = useRef(null);

  useEffect(() => {
    // 確保 track 函式可用後再初始化 autoCapture
    if (autoCaptureCleanupRef.current) return;

    autoCaptureCleanupRef.current = initAutoCaptureWithTrack(track, {
      debounceMs: 300,
    });

    return () => {
      if (autoCaptureCleanupRef.current) {
        autoCaptureCleanupRef.current();
        autoCaptureCleanupRef.current = null;
      }
    };
  }, [track]);

  return (
    <TrackingContext.Provider value={{ track, flush }}>
      {children}
    </TrackingContext.Provider>
  );
}

/**
 * useTracking Hook - 獲取追蹤函式
 * @returns {{ track: Function, flush: Function }}
 */
export const useTracking = () => {
  const context = useContext(TrackingContext);
  
  if (!context) {
    console.warn('⚠️ [useTracking] 必須在 TrackingProvider 內使用');
    // 返回空函式避免錯誤
    return {
      track: () => {},
      flush: () => {}
    };
  }
  
  return context;
};
