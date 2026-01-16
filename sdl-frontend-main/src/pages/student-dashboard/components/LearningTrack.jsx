import React from 'react';
import { getActivityColor } from '../utils';

/**
 * 學習軌跡組件
 * @param {array} learningTrack - 學習軌跡數據
 * @returns {JSX.Element} 學習軌跡列表
 */
const LearningTrack = ({ learningTrack }) => {
  return (
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3"></span>
        近期學習軌跡
      </h2>
      <div className="space-y-stack-sm sm:space-y-stack-md max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100">
        {learningTrack && Array.isArray(learningTrack) && learningTrack.map((day, dayIndex) => (
          <div key={dayIndex}>
            <div className="flex items-center mb-3">
              <div className="bg-gradient-to-r from-customgreen to-teal-600 text-white px-2 sm:px-3 py-1 rounded-full text-caption sm:text-body-sm font-medium shadow-sm">
                {new Date(day.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="ml-2 sm:ml-4 space-y-3">
              {Array.isArray(day.activities) && day.activities.map((activity, actIndex) => (
                <div key={actIndex} className="flex items-start space-x-stack-xs sm:space-x-stack-sm">
                  <div className="flex items-center space-x-stack-xs flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${getActivityColor(activity.type)}`}></div>
                    <span className="text-caption text-gray-500 w-10 sm:w-12">{activity.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-caption sm:text-body-sm font-medium text-gray-800">{activity.action}</p>
                      <span className="text-caption text-gray-400 ml-2 flex-shrink-0">{activity.author}</span>
                    </div>
                    <p className="text-caption text-gray-600 break-words leading-relaxed">{activity.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!learningTrack || !Array.isArray(learningTrack) || learningTrack.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>尚無學習活動記錄</p>
            <p className="text-caption mt-1">開始參與專案活動後，這裡會顯示詳細的學習軌跡</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningTrack;
