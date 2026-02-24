import { io } from "socket.io-client";
import errorReportingService from './errorReportingService';
import { authStorage } from './storageService';

/**
 * Socket 連接管理器 - Linus式可靠性設計
 * "實用主義者解決實際問題" - 穩健的即時通信
 *
 * 設計重點：
 * 1. 自動重連機制
 * 2. 連接狀態監控
 * 3. 離線隊列處理
 * 4. 錯誤恢復策略
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // 起始延遲 1 秒
    this.maxReconnectDelay = 30000; // 最大延遲 30 秒
    this.messageQueue = [];
    this.connectionListeners = [];
    this.errorListeners = [];

    // 網路狀態監控
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();

    this.initialize();
  }

  initialize() {
    const URL = process.env.NODE_ENV === 'production' ? undefined : 'localhost/';

    this.socket = io(URL, {
      autoConnect: false,
      reconnection: false, // 我們自己處理重連
      timeout: 10000,
      forceNew: true
    });

    this.setupSocketEventListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 網路已連接，嘗試重新建立 Socket 連接');
      this.isOnline = true;

      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('🌐 網路已斷開');
      this.isOnline = false;
      this.notifyConnectionListeners('offline');
    });
  }

  setupSocketEventListeners() {
    if (!this.socket) return;

    // 連接成功
    this.socket.on('connect', () => {
      console.log('✅ Socket 連接成功');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // 處理離線隊列
      this.flushMessageQueue();

      this.notifyConnectionListeners('connected');
    });

    // 連接斷開
    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Socket 連接斷開:', reason);
      this.isConnected = false;
      this.isConnecting = false;

      this.notifyConnectionListeners('disconnected', reason);

      // 自動重連（除非是手動斷開）
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    // 連接錯誤
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket 連接錯誤:', error);
      this.isConnecting = false;

      // 上報錯誤
      const errorId = `socket_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      errorReportingService.reportNetworkError(
        'socket.io',
        'CONNECT',
        0,
        error.message,
        errorId
      );

      this.notifyErrorListeners('connect_error', error);
      this.scheduleReconnect();
    });

    // Socket 錯誤
    this.socket.on('error', (error) => {
      console.error('❌ Socket 運行錯誤:', error);

      const errorId = `socket_runtime_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      errorReportingService.reportNetworkError(
        'socket.io',
        'RUNTIME',
        0,
        error.message,
        errorId
      );

      this.notifyErrorListeners('runtime_error', error);
    });

    // 重連嘗試
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket 重連嘗試 ${attemptNumber}`);
    });
  }

  connect() {
    if (this.isConnected || this.isConnecting) {
      console.log('Socket 已連接或正在連接中');
      return Promise.resolve();
    }

    if (!this.isOnline) {
      console.log('網路離線，無法連接 Socket');
      return Promise.reject(new Error('Network offline'));
    }

    console.log('🔌 嘗試連接 Socket...');
    this.isConnecting = true;

    // 更新認證資訊
    const token = authStorage.get('accessToken');
    if (token) {
      this.socket.auth = { token };
      this.socket.io.opts.extraHeaders = { 'accesstoken': token };
    }

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        this.isConnecting = false;
        reject(new Error('Connection timeout'));
      }, 10000);

      const onConnect = () => {
        clearTimeout(connectTimeout);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error) => {
        clearTimeout(connectTimeout);
        this.socket.off('connect', onConnect);
        reject(error);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);

      this.socket.connect();
    });
  }

  disconnect() {
    console.log('🔌 手動斷開 Socket 連接');
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止自動重連

    if (this.socket) {
      this.socket.disconnect();
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Socket 重連次數已達上限，停止重連');
      this.notifyErrorListeners('max_reconnect_attempts');
      return;
    }

    if (!this.isOnline) {
      console.log('網路離線，暫停重連');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`⏳ ${delay / 1000} 秒後嘗試第 ${this.reconnectAttempts} 次重連`);

    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect().catch((error) => {
          console.error('重連失敗:', error);
        });
      }
    }, delay);
  }

  emit(event, data, callback) {
    if (this.isConnected) {
      this.socket.emit(event, data, callback);
    } else {
      // 添加到離線隊列
      console.log(`📤 Socket 離線，消息加入隊列: ${event}`);
      this.messageQueue.push({
        event,
        data,
        callback,
        timestamp: Date.now()
      });

      // 嘗試重連
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  on(event, listener) {
    if (this.socket) {
      this.socket.on(event, listener);
    }
  }

  off(event, listener) {
    if (this.socket) {
      this.socket.off(event, listener);
    }
  }

  flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 處理離線隊列中的 ${this.messageQueue.length} 條消息`);

    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    messagesToSend.forEach(({ event, data, callback, timestamp }) => {
      const messageAge = Date.now() - timestamp;

      // 忽略過於陳舊的消息（超過 5 分鐘）
      if (messageAge > 5 * 60 * 1000) {
        console.warn(`忽略過期消息: ${event} (${messageAge / 1000}s 前)`);
        return;
      }

      this.socket.emit(event, data, callback);
    });
  }

  // 連接狀態監聽器
  onConnectionChange(listener) {
    this.connectionListeners.push(listener);

    // 立即回調當前狀態
    const status = this.isConnected ? 'connected' : 'disconnected';
    listener(status);

    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  onError(listener) {
    this.errorListeners.push(listener);

    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  notifyConnectionListeners(status, details) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(status, details);
      } catch (error) {
        console.error('連接監聽器錯誤:', error);
      }
    });
  }

  notifyErrorListeners(type, error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(type, error);
      } catch (listenerError) {
        console.error('錯誤監聽器錯誤:', listenerError);
      }
    });
  }

  // 獲取連接狀態
  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      online: this.isOnline,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length
    };
  }

  // 重置連接（強制重新初始化）
  reset() {
    console.log('🔄 重置 Socket 連接');

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];

    this.initialize();
  }
}

// 創建全域實例
const socketManager = new SocketManager();

// 導出便利方法
export const socket = {
  connect: () => socketManager.connect(),
  disconnect: () => socketManager.disconnect(),
  emit: (event, data, callback) => socketManager.emit(event, data, callback),
  on: (event, listener) => socketManager.on(event, listener),
  off: (event, listener) => socketManager.off(event, listener),
  onConnectionChange: (listener) => socketManager.onConnectionChange(listener),
  onError: (listener) => socketManager.onError(listener),
  getStatus: () => socketManager.getStatus(),
  reset: () => socketManager.reset()
};

export default socketManager;