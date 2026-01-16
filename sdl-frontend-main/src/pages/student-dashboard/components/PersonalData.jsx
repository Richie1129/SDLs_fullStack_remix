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
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3"></span>
        專案進度詳情
      </h2>
      <div className="space-y-stack-sm">
        <div className="bg-gradient-to-r from-teal-50 to-customgreen/10 p-component-sm sm:p-component-base rounded-lg border border-teal-100 hover:border-teal-200 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-1 sm:space-y-0">
            <span className="font-semibold text-gray-800 text-body-sm sm:text-body">{personalData?.projectName || '專案'}</span>
            <span className="text-caption sm:text-body-sm text-teal-600 bg-teal-100 px-2 py-1 rounded-full font-medium">第 {personalData?.currentStage || 1} 階段</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-customgreen to-teal-600 h-4 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${personalData?.progressPercentage || 0}%` }}
            ></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between text-caption sm:text-body-sm text-gray-600 space-y-1 sm:space-y-0">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
              當前子階段: {personalData?.currentSubStage || 1}
            </span>
            <span className="font-semibold text-teal-600">{personalData?.progressPercentage || 0}% 完成</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-stack-sm">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-component-sm sm:p-component-base rounded-lg border border-teal-200 hover:border-teal-300 transition-all duration-300 hover:shadow-md">
            <h3 className="font-semibold text-teal-800 mb-3 text-body-sm sm:text-body flex items-center">
              <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-caption mr-2">📊</span>
              學習統計
            </h3>
            <div className="space-y-3 text-caption sm:text-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-teal-700 flex items-center">
                  <span className="w-2 h-2 bg-teal-400 rounded-full mr-2"></span>
                  總學習時間
                </span>
                <span className="font-bold text-teal-800 bg-white/50 px-2 py-1 rounded">{personalData?.totalStudyTime || 0}小時</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-teal-700 flex items-center">
                  <span className="w-2 h-2 bg-teal-400 rounded-full mr-2"></span>
                  平均每次
                </span>
                <span className="font-bold text-teal-800 bg-white/50 px-2 py-1 rounded">{personalData?.averageSessionTime || 0}小時</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-customgreen/20 to-teal-100/50 p-component-sm sm:p-component-base rounded-lg border border-customgreen/30 hover:border-customgreen/50 transition-all duration-300 hover:shadow-md">
            <h3 className="font-semibold text-teal-800 mb-3 text-body-sm sm:text-body flex items-center">
              <span className="w-8 h-8 bg-customgreen text-white rounded-full flex items-center justify-center text-caption mr-2">📋</span>
              任務狀況
            </h3>
            <div className="space-y-3 text-caption sm:text-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-teal-700 flex items-center">
                  <span className="w-2 h-2 bg-customgreen rounded-full mr-2"></span>
                  總任務
                </span>
                <span className="font-bold text-teal-800 bg-white/50 px-2 py-1 rounded">{personalData?.totalTasks || 0}</span>
              </div>
              {personalData?.allColumnNames && Array.isArray(personalData.allColumnNames) && personalData.allColumnNames.length > 0 ? (
                personalData.allColumnNames.map(columnName => {
                  const style = getColumnStyle(columnName);
                  const taskCount = personalData?.tasksByStatus?.[columnName]?.length || 0;
                  return (
                    <div key={columnName} className="flex justify-between items-center">
                      <span className="text-teal-700 flex items-center">
                        <span className="w-2 h-2 bg-teal-400 rounded-full mr-2"></span>
                        {style.icon} {columnName}
                      </span>
                      <span className={`font-bold ${style.color} bg-white/50 px-2 py-1 rounded`}>
                        {taskCount}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-3 bg-white/50 rounded-lg">
                  <span className="text-teal-600 text-caption font-medium">🎯 準備開始建立任務吧！</span>
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
