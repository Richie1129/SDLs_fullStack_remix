import React from 'react';

/**
 * 團隊統計卡片組件
 * @param {object} teamStats - 團隊統計數據
 * @returns {JSX.Element} 團隊統計卡片
 */
const TeamStats = ({ teamStats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="bg-customgreen p-3 sm:p-4 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">團隊AI諮詢</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.teamAiInteractions}</p>
            <p className="text-white/70 text-xs">次數</p>
          </div>
          <div className="text-xl sm:text-2xl bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">🤖</div>
        </div>
      </div>

      <div className="bg-customgreen p-3 sm:p-4 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">想法節點</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.ideaNodes}</p>
            <p className="text-white/70 text-xs">個數</p>
          </div>
          <div className="text-xl sm:text-2xl bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">💡</div>
        </div>
      </div>

      <div className="bg-customgreen p-3 sm:p-4 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">看板卡片</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.kanbanTasks}</p>
            <p className="text-white/70 text-xs">張數</p>
          </div>
          <div className="text-xl sm:text-2xl bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">📋</div>
        </div>
      </div>

      <div className="bg-customgreen p-3 sm:p-4 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">個人反思</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.personalReflections}</p>
            <p className="text-white/70 text-xs">篇數</p>
          </div>
          <div className="text-xl sm:text-2xl bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">📝</div>
        </div>
      </div>

      <div className="bg-customgreen p-3 sm:p-4 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">團隊反思</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.teamReflections}</p>
            <p className="text-white/70 text-xs">篇數</p>
          </div>
          <div className="text-xl sm:text-2xl bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">👥</div>
        </div>
      </div>
    </div>
  );
};

export default TeamStats;
