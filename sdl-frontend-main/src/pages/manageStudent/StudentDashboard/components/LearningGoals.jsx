import React from 'react';
import { getPriorityColor } from '../utils';

/**
 * 學習目標組件
 * @param {array} learningGoals - 學習目標數據
 * @returns {JSX.Element} 學習目標列表
 */
const LearningGoals = ({ learningGoals }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">我的學習目標</h2>
      <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
        {Array.isArray(learningGoals) && learningGoals.map((goal) => (
          <div key={goal.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
              <h3 className="font-medium text-gray-800 text-sm sm:text-base">{goal.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border self-start ${getPriorityColor(goal.priority)}`}>
                {goal.priority === 'high' ? '高優先級' : 
                 goal.priority === 'medium' ? '中優先級' : '低優先級'}
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                <span>進度</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              截止日期: {new Date(goal.deadline).toLocaleDateString('zh-TW')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningGoals;
