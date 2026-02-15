import React from 'react';
import { FiTrendingUp, FiBarChart2, FiPieChart } from 'react-icons/fi';

/**
 * 通用圖表容器元件
 * 提供統一的玻璃擬態卡片樣式和標題
 */
const ChartContainer = ({
  title,
  subtitle,
  icon: Icon = FiBarChart2,
  children,
  className = '',
  iconColor = 'trust-blue'
}) => {
  const iconColorMap = {
    'trust-blue': 'from-trust-blue-500 to-trust-blue-600',
    'action-orange': 'from-action-orange-500 to-action-orange-600',
    'customgreen': 'from-customgreen to-teal-600',
    'purple': 'from-purple-500 to-purple-600',
    'pink': 'from-pink-500 to-pink-600'
  };

  const iconBgGradient = iconColorMap[iconColor] || iconColorMap['trust-blue'];

  return (
    <div className={`glass-card rounded-2xl p-component-md-lg transition-all duration-300 hover:shadow-xl ${className}`}>
      {/* 標題區 */}
      <div className="flex items-start justify-between mb-component-md">
        <div className="flex items-center space-x-3">
          {/* 圖示 */}
          <div className={`icon-bg bg-gradient-to-br ${iconBgGradient} flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          
          {/* 標題和副標題 */}
          <div>
            <h3 className="text-h3 font-bold text-gray-800">{title}</h3>
            {subtitle && (
              <p className="text-body-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 圖表內容 */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;
