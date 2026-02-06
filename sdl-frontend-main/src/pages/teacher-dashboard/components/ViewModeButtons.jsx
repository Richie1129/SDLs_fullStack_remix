import React from 'react';
import { FiHome, FiUsers, FiLink, FiUser, FiBarChart2 } from 'react-icons/fi';

const ViewModeButtons = ({ viewMode, setViewMode }) => {
  const modes = [
    { key: 'overview', label: '總覽' },
    { key: 'all-students', label: '所有學生' },
    { key: 'groups', label: '小組檢視' },
    { key: 'individual', label: '個人檢視' },
    { key: 'analytics', label: '數據分析' }
  ];

  const buttonIcons = {
    'overview': <FiHome className="w-4 h-4" />,
    'all-students': <FiUsers className="w-4 h-4" />,
    'groups': <FiLink className="w-4 h-4" />,
    'individual': <FiUser className="w-4 h-4" />,
    'analytics': <FiBarChart2 className="w-4 h-4" />
  };

  return (
    <div className="flex flex-wrap gap-1 sm:gap-stack-xs p-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl shadow-inner">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setViewMode(key)}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-caption sm:text-body-sm font-semibold transition-all duration-normal hover:shadow-md flex items-center space-x-1 sm:space-x-stack-xs ${
            viewMode === key
              ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-md'
              : 'bg-white text-teal-700 border border-teal-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
          }`}
        >
          <span>{buttonIcons[key]}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeButtons;
