import React from 'react';
import { getAchievementIcon } from '../utils';

/**
 * 成就展示組件
 * @param {array} achievements - 成就數據
 * @returns {JSX.Element} 成就列表
 */
const Achievements = ({ achievements }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">近期成就</h2>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {Array.isArray(achievements) && achievements.map((achievement, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl sm:text-2xl flex-shrink-0">{getAchievementIcon(achievement.type)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-800 text-xs sm:text-sm">{achievement.title}</h3>
              <p className="text-xs text-gray-600 mt-1 break-words">{achievement.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(achievement.date).toLocaleDateString('zh-TW')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
