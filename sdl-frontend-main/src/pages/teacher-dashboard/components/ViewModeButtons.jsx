import React from 'react';

const ViewModeButtons = ({ viewMode, setViewMode }) => {
  const modes = [
    { key: 'overview', label: '總覽' },
    { key: 'all-students', label: '所有學生' },
    { key: 'groups', label: '小組檢視' },
    { key: 'individual', label: '個人檢視' },
    { key: 'analytics', label: '數據分析' }
  ];

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setViewMode(key)}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            viewMode === key 
              ? 'bg-teal-600 text-white' 
              : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ViewModeButtons;
