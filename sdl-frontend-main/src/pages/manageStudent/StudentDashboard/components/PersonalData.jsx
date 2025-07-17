import React from 'react';
import { getColumnStyle } from '../utils';

/**
 * 個人資料詳情組件
 * @param {object} personalData - 個人資料數據
 * @param {array} ideaNodes - 想法節點數據
 * @param {array} kanbanTasks - 看板任務數據
 * @returns {JSX.Element} 個人資料詳情
 */
const PersonalData = ({ personalData, ideaNodes, kanbanTasks }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">專案進度詳情</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
            <span className="font-medium text-gray-700 text-sm sm:text-base">{personalData?.projectName || '專案'}</span>
            <span className="text-xs sm:text-sm text-gray-500">第 {personalData?.currentStage || 1} 階段</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-teal-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${personalData?.progressPercentage || 0}%` }}
            ></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
            <span>當前子階段: {personalData?.currentSubStage || 1}</span>
            <span>{personalData?.progressPercentage || 0}% 完成</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">學習統計</h3>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">總學習時間</span>
                <span className="font-medium">{personalData?.totalStudyTime || 0}小時</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">平均每次</span>
                <span className="font-medium">{personalData?.averageSessionTime || 0}小時</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2 text-sm sm:text-base">任務狀況</h3>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">📋 總任務</span>
                <span className="font-medium">{personalData?.totalTasks || 0}</span>
              </div>
              {personalData?.allColumnNames && Array.isArray(personalData.allColumnNames) && personalData.allColumnNames.length > 0 ? (
                personalData.allColumnNames.map(columnName => {
                  const style = getColumnStyle(columnName);
                  const taskCount = personalData?.tasksByStatus?.[columnName]?.length || 0;
                  return (
                    <div key={columnName} className="flex justify-between">
                      <span className="text-green-600">
                        {style.icon} {columnName}
                      </span>
                      <span className={`font-medium ${style.color}`}>
                        {taskCount}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-2">
                  <span className="text-green-500 text-xs">🎯 準備開始建立任務吧！</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalData;
