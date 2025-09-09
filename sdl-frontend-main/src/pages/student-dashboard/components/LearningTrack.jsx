import React from 'react';
import { getActivityColor } from '../utils';

/**
 * 學習軌跡組件
 * @param {array} learningTrack - 學習軌跡數據
 * @returns {JSX.Element} 學習軌跡列表
 */
const LearningTrack = ({ learningTrack }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">近期學習軌跡</h2>
      <div className="space-y-4 sm:space-y-6 max-h-96 overflow-y-auto">
        {learningTrack && Array.isArray(learningTrack) && learningTrack.map((day, dayIndex) => (
          <div key={dayIndex}>
            <div className="flex items-center mb-3">
              <div className="bg-teal-100 text-teal-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                {new Date(day.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="ml-2 sm:ml-4 space-y-3">
              {Array.isArray(day.activities) && day.activities.map((activity, actIndex) => (
                <div key={actIndex} className="flex items-start space-x-2 sm:space-x-4">
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${getActivityColor(activity.type)}`}></div>
                    <span className="text-xs text-gray-500 w-10 sm:w-12">{activity.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-800">{activity.action}</p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{activity.author}</span>
                    </div>
                    <p className="text-xs text-gray-600 break-words leading-relaxed">{activity.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!learningTrack || !Array.isArray(learningTrack) || learningTrack.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>尚無學習活動記錄</p>
            <p className="text-xs mt-1">開始參與專案活動後，這裡會顯示詳細的學習軌跡</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningTrack;
