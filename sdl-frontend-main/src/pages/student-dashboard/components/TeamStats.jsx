import React from 'react';

/**
 * 團隊統計卡片組件
 * @param {object} teamStats - 團隊統計數據
 * @returns {JSX.Element} 團隊統計卡片
 */
const TeamStats = ({ teamStats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 sm:p-4 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-xs">團隊AI諮詢</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.teamAiInteractions}</p>
            <p className="text-purple-200 text-xs">次數</p>
          </div>
          <div className="text-xl sm:text-2xl">🤖</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 sm:p-4 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-xs">想法節點</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.ideaNodes}</p>
            <p className="text-yellow-200 text-xs">個數</p>
          </div>
          <div className="text-xl sm:text-2xl">💡</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-xs">看板卡片</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.kanbanTasks}</p>
            <p className="text-green-200 text-xs">張數</p>
          </div>
          <div className="text-xl sm:text-2xl">📋</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs">個人反思</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.personalReflections}</p>
            <p className="text-blue-200 text-xs">篇數</p>
          </div>
          <div className="text-xl sm:text-2xl">📝</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-3 sm:p-4 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-xs">團隊反思</p>
            <p className="text-lg sm:text-2xl font-bold">{teamStats.teamReflections}</p>
            <p className="text-teal-200 text-xs">篇數</p>
          </div>
          <div className="text-xl sm:text-2xl">👥</div>
        </div>
      </div>
    </div>
  );
};

export default TeamStats;
