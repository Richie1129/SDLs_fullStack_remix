import React, { useState, useEffect } from 'react';
import { socket } from '../../services/socketManager';

/**
 * Socket 連接狀態指示器
 * "好品味是一種直覺" - 讓用戶清楚知道連接狀態
 */
const SocketStatusIndicator = ({ position = 'bottom-right', compact = false }) => {
  const [status, setStatus] = useState(socket.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 監聽連接狀態變化
    const unsubscribeConnection = socket.onConnectionChange((connectionStatus, details) => {
      setStatus(socket.getStatus());
    });

    // 監聽錯誤
    const unsubscribeError = socket.onError((errorType, error) => {
      setStatus(socket.getStatus());
    });

    // 定期更新狀態
    const interval = setInterval(() => {
      setStatus(socket.getStatus());
    }, 5000);

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      clearInterval(interval);
    };
  }, []);

  const getStatusConfig = () => {
    if (!status.online) {
      return {
        color: 'bg-gray-500',
        text: '離線',
        icon: '📴',
        pulse: false
      };
    }

    if (status.connected) {
      return {
        color: 'bg-green-500',
        text: '已連接',
        icon: '🟢',
        pulse: false
      };
    }

    if (status.connecting) {
      return {
        color: 'bg-yellow-500',
        text: '連接中',
        icon: '🟡',
        pulse: true
      };
    }

    return {
      color: 'bg-red-500',
      text: '斷線',
      icon: '🔴',
      pulse: true
    };
  };

  const handleReconnect = () => {
    socket.connect().catch(console.error);
  };

  const handleReset = () => {
    socket.reset();
  };

  const config = getStatusConfig();

  // 計算位置樣式
  const getPositionClasses = () => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };
    return positions[position] || positions['bottom-right'];
  };

  if (compact) {
    return (
      <div
        className={`fixed ${getPositionClasses()} z-50 cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
        title={`Socket 狀態: ${config.text}`}
      >
        <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />

        {showDetails && (
          <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-component-sm min-w-[200px] text-body-sm">
            <div className="flex items-center gap-stack-xs mb-2">
              <span>{config.icon}</span>
              <span className="font-medium">{config.text}</span>
            </div>
            {status.queueLength > 0 && (
              <p className="text-gray-600 text-caption">
                隊列中: {status.queueLength} 條消息
              </p>
            )}
            {status.reconnectAttempts > 0 && (
              <p className="text-gray-600 text-caption">
                重連嘗試: {status.reconnectAttempts} 次
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-component-sm min-w-[250px]">
        {/* 狀態標題 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-stack-xs">
            <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
            <span className="font-medium text-body-sm">{config.text}</span>
          </div>

          {/* 最小化按鈕 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 text-caption"
          >
            {showDetails ? '−' : '+'}
          </button>
        </div>

        {/* 詳細信息 */}
        {showDetails && (
          <>
            {/* 狀態詳情 */}
            <div className="space-y-1 text-caption text-gray-600 mb-3">
              <div className="flex justify-between">
                <span>網路:</span>
                <span>{status.online ? '在線' : '離線'}</span>
              </div>

              {status.queueLength > 0 && (
                <div className="flex justify-between">
                  <span>待發送:</span>
                  <span>{status.queueLength} 條</span>
                </div>
              )}

              {status.reconnectAttempts > 0 && (
                <div className="flex justify-between">
                  <span>重連次數:</span>
                  <span>{status.reconnectAttempts}</span>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-stack-xs">
              {!status.connected && status.online && (
                <button
                  onClick={handleReconnect}
                  className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-caption hover:bg-blue-600 transition-colors"
                >
                  重連
                </button>
              )}

              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-caption hover:bg-gray-600 transition-colors"
              >
                重置
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SocketStatusIndicator;