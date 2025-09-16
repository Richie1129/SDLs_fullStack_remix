import React from 'react';

const StatsCards = ({ classStats }) => {
  const cards = [
    {
      title: '總學生數',
      value: classStats.totalStudents,
      subtitle: `活躍學生: ${classStats.activeStudents}`,
      color: 'text-teal-600'
    },
    {
      title: '平均進度',
      value: `${classStats.averageProgress}%`,
      subtitle: `需關注: ${classStats.needAttentionStudents}人`,
      color: 'text-blue-600'
    },
    {
      title: '反思記錄',
      value: classStats.totalReflections,
      subtitle: '本週新增',
      color: 'text-green-600'
    },
    {
      title: '想法節點',
      value: classStats.totalIdeaNodes,
      subtitle: '創意發想',
      color: 'text-purple-600'
    },
    {
      title: '使用時長(總計)',
      value: `${classStats.totalUsageHours}h`,
      subtitle: `每生平均 ${classStats.averageUsageHours}h`,
      color: 'text-orange-600'
    }
  ];

  const cardStyles = [
    'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg hover:shadow-xl',
    'bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-lg hover:shadow-xl',
    'bg-gradient-to-br from-customgreen to-teal-600 text-white shadow-lg hover:shadow-xl',
    'bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl',
    'bg-gradient-to-br from-teal-500 via-customgreen to-teal-600 text-white shadow-lg hover:shadow-xl'
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className={`${cardStyles[index % cardStyles.length]} p-3 sm:p-6 rounded-xl transition-all duration-300 hover:scale-105 border border-white/20`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-white/90 mb-1 sm:mb-2">
              {card.title}
            </h3>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm">
              {index === 0 ? '👥' : index === 1 ? '📊' : index === 2 ? '📝' : index === 3 ? '💡' : '⏱️'}
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-bold text-white mb-1">
            {card.value}
          </p>
          <p className="text-xs text-white/80">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
