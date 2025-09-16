import React from 'react';

/**
 * 快速統計組件
 * @param {object} personalData - 個人資料數據
 * @returns {JSX.Element} 快速統計
 */
const QuickStats = ({ personalData }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">學習統計</h2>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-xs sm:text-sm">聊天訊息</span>
          <span className="font-bold text-blue-600">{personalData?.chatMessages || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-xs sm:text-sm">Q&A 提問</span>
          <span className="font-bold text-green-600">{personalData?.qaQuestions || 0}</span>
        </div>
        <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-purple-100/50 p-2 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors duration-300">
          <span className="text-teal-700 text-xs sm:text-sm flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            AI 諮詢
          </span>
          <span className="font-bold text-purple-700 bg-white/50 px-2 py-1 rounded">{personalData?.aiInteractions || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
