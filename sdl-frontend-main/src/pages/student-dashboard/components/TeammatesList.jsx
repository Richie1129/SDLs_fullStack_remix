
/**
 * 團隊成員列表組件
 * @param {array} teammates - 團隊成員數據
 * @param {object} personalData - 個人資料數據
 * @returns {JSX.Element} 團隊成員列表
 */
const TeammatesList = ({ teammates, personalData }) => {
  return (
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3"></span>
        我的小組
      </h2>
      <div className="space-y-3 sm:space-y-stack-sm">
        <div className="bg-gradient-to-r from-customgreen/10 to-teal-50 p-component-sm rounded-lg border border-teal-100 hover:border-teal-200 transition-colors duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-customgreen to-teal-600 rounded-full flex items-center justify-center text-white text-body-sm font-bold flex-shrink-0 shadow-sm">
              我
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-body-sm sm:text-body truncate">{personalData?.name || '學習者'}</p>
              <p className="text-caption sm:text-body-sm text-gray-600">{personalData?.teamRole || '成員'}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-caption bg-gradient-to-r from-customgreen to-teal-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                {personalData?.progressPercentage || 0}%
              </span>
            </div>
          </div>
        </div>

        {Array.isArray(teammates) && teammates.length > 0 ? (
          teammates.map((teammate, index) => (
            <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-component-sm rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-body-sm font-bold flex-shrink-0 shadow-sm">
                  {teammate.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-body-sm sm:text-body truncate">{teammate.name}</p>
                  <p className="text-caption sm:text-body-sm text-gray-600">{teammate.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-caption text-gray-500 mb-1">{teammate.lastSeen}</div>
                  <span className={`text-caption px-3 py-1 rounded-full font-semibold shadow-sm ${
                    teammate.status === 'active' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                  }`}>
                    {teammate.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <div className="text-display mb-2">👥</div>
            <p className="text-body-sm">目前只有您一人</p>
            <p className="text-caption text-gray-400">等待其他成員加入專案</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeammatesList;
