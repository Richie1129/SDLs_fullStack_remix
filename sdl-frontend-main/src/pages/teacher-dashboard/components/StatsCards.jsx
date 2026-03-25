import { useState } from 'react';
import { FiUsers, FiBarChart2, FiFileText, FiZap, FiClock, FiInfo } from 'react-icons/fi';

const Tooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition-colors duration-fast"
        aria-label="說明"
        type="button"
      >
        <FiInfo className="w-2.5 h-2.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-gray-800 text-white text-caption rounded-lg z-50 pointer-events-none shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
};

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
    tooltip: '加入本專案的學生總人數。「活躍」指近 7 天有任何互動記錄的學生。',
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
    tooltip: '所有學生個人學習進度的平均值（0–100%）。低於 60% 的學生會被標記為「需關注」。健康參考值：整體平均應達 60% 以上。',
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
    tooltip: '本週所有學生提交的個人反思日誌總篇數。反思頻率是衡量自我調節學習行為的核心指標，建議每人每週至少 1 篇。',
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
    tooltip: '在想法牆（IdeaWall）上創建的節點總數，反映團隊創意思考的深度與廣度。數量越多代表探索越充分。',
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
    tooltip: '透過 Session 心跳追蹤計算的累計學習時數，僅計算在系統中的活躍時間。健康參考值：每週平均 2h+ 表示高度參與。',
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
            <div className="flex items-center">
              <h3 className="text-caption text-[#888780]">{card.title}</h3>
              {card.tooltip && <Tooltip text={card.tooltip} />}
            </div>
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
