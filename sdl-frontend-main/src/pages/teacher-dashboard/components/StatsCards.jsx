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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
            {card.title}
          </h3>
          <p className={`text-lg sm:text-3xl font-bold ${card.color}`}>
            {card.value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
