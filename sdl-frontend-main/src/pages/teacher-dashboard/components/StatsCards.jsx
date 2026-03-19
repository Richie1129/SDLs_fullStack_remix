import { FiUsers, FiBarChart2, FiFileText, FiZap, FiClock } from 'react-icons/fi';

/**
 * 教師儀表板統計指標卡
 * 設計：白色底 + 輕邊框 + icon 色塊區分（無 glassmorphism）
 * 色彩系統：品牌綠 + 信任藍 + 警示琥珀（不用紫色/橙色）
 */
const cards_config = (classStats) => [
  {
    title: '總學生數',
    value: classStats.totalStudents,
    subtitle: `活躍 ${classStats.activeStudents} 人`,
    icon: <FiUsers className="w-4 h-4" />,
    iconBg: 'bg-[#E6F1FB]',
    iconColor: 'text-trust-blue-600',
    progress: classStats.activeStudents && classStats.totalStudents
      ? Math.round((classStats.activeStudents / classStats.totalStudents) * 100)
      : 0,
    progressColor: 'bg-trust-blue-500',
  },
  {
    title: '平均進度',
    value: `${classStats.averageProgress}%`,
    subtitle: `需關注 ${classStats.needAttentionStudents} 人`,
    icon: <FiBarChart2 className="w-4 h-4" />,
    iconBg: 'bg-[#E1F5EE]',
    iconColor: 'text-customgreen',
    progress: classStats.averageProgress,
    progressColor: 'bg-customgreen',
  },
  {
    title: '反思記錄',
    value: classStats.totalReflections,
    subtitle: '本週累計',
    icon: <FiFileText className="w-4 h-4" />,
    iconBg: 'bg-[#E1F5EE]',
    iconColor: 'text-customgreen',
    progress: 65,
    progressColor: 'bg-customgreen',
  },
  {
    title: '想法節點',
    value: classStats.totalIdeaNodes,
    subtitle: '創意發想',
    icon: <FiZap className="w-4 h-4" />,
    iconBg: 'bg-[#EAF3DE]',
    iconColor: 'text-teal-600',
    progress: 78,
    progressColor: 'bg-teal-500',
  },
  {
    title: '使用時長',
    value: `${classStats.totalUsageHours}h`,
    subtitle: `平均 ${classStats.averageUsageHours}h/人`,
    icon: <FiClock className="w-4 h-4" />,
    iconBg: 'bg-[#FAEEDA]',
    iconColor: 'text-amber-600',
    progress: 82,
    progressColor: 'bg-amber-400',
  },
];

const StatsCards = ({ classStats }) => {
  const cards = cards_config(classStats);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-caption text-[#888780]">{card.title}</h3>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor}`}>
              {card.icon}
            </div>
          </div>

          {/* Value */}
          <p className="metric-value text-h2 font-medium text-[#2C2C2A] mb-1">
            {card.value}
          </p>

          {/* Subtitle */}
          <p className="text-caption text-[#888780] mb-3">{card.subtitle}</p>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${card.progressColor}`}
              style={{ width: `${card.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
