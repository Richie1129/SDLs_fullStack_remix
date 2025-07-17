import React from 'react';

/**
 * 團隊成員列表組件
 * @param {array} teammates - 團隊成員數據
 * @param {object} personalData - 個人資料數據
 * @returns {JSX.Element} 團隊成員列表
 */
const TeammatesList = ({ teammates, personalData }) => {
  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">我的小組</h2>
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-teal-50 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              我
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{personalData?.name || '學習者'}</p>
              <p className="text-xs sm:text-sm text-gray-600">{personalData?.teamRole || '成員'}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                {personalData?.progressPercentage || 0}%
              </span>
            </div>
          </div>
        </div>

        {Array.isArray(teammates) && teammates.length > 0 ? (
          teammates.map((teammate, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {teammate.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{teammate.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{teammate.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500 mb-1">{teammate.lastSeen}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    teammate.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {teammate.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-sm">目前只有您一人</p>
            <p className="text-xs text-gray-400">等待其他成員加入專案</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeammatesList;
