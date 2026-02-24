import React from 'react';
import { FiUsers, FiBarChart2, FiFileText, FiZap, FiClock } from 'react-icons/fi';

const StatsCards = ({ classStats }) => {
  const cards = [
    {
      title: '總學生數',
      value: classStats.totalStudents,
      subtitle: `活躍: ${classStats.activeStudents}人`,
      icon: <FiUsers className="w-5 h-5" />,
      colorGradient: 'from-trust-blue-500 to-trust-blue-600',
      progressBarColor: 'from-trust-blue-500 to-trust-blue-600',
      progress: classStats.activeStudents && classStats.totalStudents 
        ? Math.round((classStats.activeStudents / classStats.totalStudents) * 100) 
        : 0,
    },
    {
      title: '平均進度',
      value: `${classStats.averageProgress}%`,
      subtitle: `需關注: ${classStats.needAttentionStudents}人`,
      icon: <FiBarChart2 className="w-5 h-5" />,
      colorGradient: 'from-trust-blue-400 to-trust-blue-500',
      progressBarColor: 'from-trust-blue-400 to-trust-blue-500',
      progress: classStats.averageProgress,
    },
    {
      title: '反思記錄',
      value: classStats.totalReflections,
      subtitle: '本週新增',
      icon: <FiFileText className="w-5 h-5" />,
      colorGradient: 'from-customgreen to-teal-600',
      progressBarColor: 'from-customgreen to-teal-600',
      progress: 65,
    },
    {
      title: '想法節點',
      value: classStats.totalIdeaNodes,
      subtitle: '創意發想',
      icon: <FiZap className="w-5 h-5" />,
      colorGradient: 'from-purple-500 to-purple-600',
      progressBarColor: 'from-purple-500 to-purple-600',
      progress: 78,
    },
    {
      title: '使用時長',
      value: `${classStats.totalUsageHours}h`,
      subtitle: `平均 ${classStats.averageUsageHours}h/人`,
      icon: <FiClock className="w-5 h-5" />,
      colorGradient: 'from-orange-500 to-orange-600',
      progressBarColor: 'from-orange-500 to-orange-600',
      progress: 82,
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6">
      {cards.map((card, index) => (
        <div key={index} className="group relative">
          {/* Glassmorphism 背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl rounded-2xl"></div>
          
          {/* 主要內容 */}
          <div className="relative glass-card glass-card-hover p-component-sm sm:p-component-md rounded-2xl cursor-pointer">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-caption sm:text-body-sm font-medium text-gray-600">
                {card.title}
              </h3>
              
              {/* Icon with animated background */}
              <div className={`icon-bg w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${card.colorGradient} text-white`}>
                {card.icon}
              </div>
            </div>
            
            {/* Main Value */}
            <div className="mb-2">
              <p className="text-3xl sm:text-4xl font-bold font-poppins gradient-text">
                {card.value}
              </p>
            </div>
            
            {/* Subtitle */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-caption text-gray-500">{card.subtitle}</p>
            </div>
            
            {/* Bottom Progress Bar */}
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`progress-bar h-full bg-gradient-to-r ${card.progressBarColor}`}
                style={{ width: `${card.progress}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
