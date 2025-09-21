import React from 'react';

const LoadingState = ({
  type = 'loading',
  message,
  title,
  className = ''
}) => {
  const getContent = () => {
    switch (type) {
      case 'loading':
        return {
          icon: (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-customgreen"></div>
          ),
          defaultMessage: message || '資料載入中...',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600'
        };

      case 'empty':
        return {
          icon: '📭',
          defaultMessage: message || '暫無資料',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-500'
        };

      case 'error':
        return {
          icon: '⚠️',
          defaultMessage: message || '載入失敗，請稍後再試',
          bgColor: 'bg-red-50',
          textColor: 'text-red-600'
        };

      case 'no-ranking':
        return {
          icon: '🏆',
          defaultMessage: message || '此類別暫無排行資料',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-600'
        };

      default:
        return {
          icon: 'ℹ️',
          defaultMessage: message || '暫無內容',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-500'
        };
    }
  };

  const content = getContent();

  return (
    <div className={`
      flex flex-col items-center justify-center
      py-6 px-4 rounded-lg
      ${content.bgColor}
      ${className}
    `}>
      {title && (
        <h4 className={`text-sm font-medium mb-2 ${content.textColor}`}>
          {title}
        </h4>
      )}

      <div className="flex items-center space-x-3">
        <div className="text-lg">
          {content.icon}
        </div>
        <span className={`text-sm ${content.textColor}`}>
          {content.defaultMessage}
        </span>
      </div>
    </div>
  );
};

export default LoadingState;