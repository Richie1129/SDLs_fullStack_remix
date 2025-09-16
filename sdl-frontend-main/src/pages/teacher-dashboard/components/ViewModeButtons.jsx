import React from 'react';

const ViewModeButtons = ({ viewMode, setViewMode }) => {
  const modes = [
    { key: 'overview', label: '總覽' },
    { key: 'all-students', label: '所有學生' },
    { key: 'groups', label: '小組檢視' },
    { key: 'individual', label: '個人檢視' },
    { key: 'analytics', label: '數據分析' }
  ];

  const buttonIcons = {
    'overview': '🏠',
    'all-students': '👥',
    'groups': '🔗',
    'individual': '👤',
    'analytics': '📊'
  };

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2 p-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl shadow-inner">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setViewMode(key)}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-1 sm:space-x-2 ${
            viewMode === key
              ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-md'
              : 'bg-white text-teal-700 border border-teal-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
          }`}
        >
          <span className="text-sm">{buttonIcons[key]}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeButtons;
