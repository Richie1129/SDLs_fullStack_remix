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
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-xs sm:text-sm">AI 諮詢</span>
          <span className="font-bold text-purple-600">{personalData?.aiInteractions || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
