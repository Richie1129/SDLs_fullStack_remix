import React from 'react';
import { FiCpu, FiInfo, FiClipboard, FiFileText, FiUsers } from 'react-icons/fi';

/**
 * 團隊統計卡片組件
 * 設計：customgray 底色 + 左側 4px customgreen accent 線 + 淡綠圖示背景
 */
const StatCard = ({ label, value, unit, icon }) => (
  <div className="bg-customgray rounded-xl border border-gray-200 hover:border-gray-400 transition-colors duration-fast border-l-4 border-l-customgreen p-component-sm sm:p-component-md">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-caption text-[#888780]">{label}</p>
        <p className="metric-value text-h2 font-medium text-[#2C2C2A] leading-tight">{value}</p>
        <p className="text-caption text-[#888780]">{unit}</p>
      </div>
      <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] text-customgreen flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </div>
  </div>
);

const TeamStats = ({ teamStats }) => {
  const stats = [
    { label: '團隊AI諮詢', value: teamStats.teamAiInteractions, unit: '次數', icon: <FiCpu className="w-4 h-4" /> },
    { label: '想法節點',   value: teamStats.ideaNodes,           unit: '個數', icon: <FiInfo className="w-4 h-4" /> },
    { label: '看板卡片',   value: teamStats.kanbanTasks,         unit: '張數', icon: <FiClipboard className="w-4 h-4" /> },
    { label: '個人反思',   value: teamStats.personalReflections, unit: '篇數', icon: <FiFileText className="w-4 h-4" /> },
    { label: '團隊反思',   value: teamStats.teamReflections,     unit: '篇數', icon: <FiUsers className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6 sm:mb-8">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
};

export default TeamStats;
