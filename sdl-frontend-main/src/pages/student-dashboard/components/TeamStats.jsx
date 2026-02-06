import React from 'react';
import { FiCpu, FiInfo, FiClipboard, FiFileText, FiUsers } from 'react-icons/fi';

/**
 * 團隊統計卡片組件
 * @param {object} teamStats - 團隊統計數據
 * @returns {JSX.Element} 團隊統計卡片
 */
const TeamStats = ({ teamStats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6 sm:mb-8">
      <div className="bg-customgreen p-component-sm sm:p-component-md rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-fast">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-caption">團隊AI諮詢</p>
            <p className="text-body-lg sm:text-h2 font-bold">{teamStats.teamAiInteractions}</p>
            <p className="text-white/70 text-caption">次數</p>
          </div>
          <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"><FiCpu className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-customgreen p-component-sm sm:p-component-md rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-fast">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-caption">想法節點</p>
            <p className="text-body-lg sm:text-h2 font-bold">{teamStats.ideaNodes}</p>
            <p className="text-white/70 text-caption">個數</p>
          </div>
          <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"><FiInfo className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-customgreen p-component-sm sm:p-component-md rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-fast">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-caption">看板卡片</p>
            <p className="text-body-lg sm:text-h2 font-bold">{teamStats.kanbanTasks}</p>
            <p className="text-white/70 text-caption">張數</p>
          </div>
          <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"><FiClipboard className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-customgreen p-component-sm sm:p-component-md rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-fast">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-caption">個人反思</p>
            <p className="text-body-lg sm:text-h2 font-bold">{teamStats.personalReflections}</p>
            <p className="text-white/70 text-caption">篇數</p>
          </div>
          <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"><FiFileText className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-customgreen p-component-sm sm:p-component-md rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-fast">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-caption">團隊反思</p>
            <p className="text-body-lg sm:text-h2 font-bold">{teamStats.teamReflections}</p>
            <p className="text-white/70 text-caption">篇數</p>
          </div>
          <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"><FiUsers className="w-5 h-5" /></div>
        </div>
      </div>
    </div>
  );
};

export default TeamStats;
