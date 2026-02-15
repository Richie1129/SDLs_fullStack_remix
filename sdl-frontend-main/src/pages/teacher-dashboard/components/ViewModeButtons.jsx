import React from 'react';
import { FiHome, FiUsers, FiBarChart2 } from 'react-icons/fi';

const ViewModeButtons = ({ viewMode, setViewMode }) => {
  const modes = [
    { key: 'overview', label: '總覽', icon: <FiHome className="w-4 h-4" /> },
    { key: 'students', label: '學生', icon: <FiUsers className="w-4 h-4" /> },
    { key: 'analytics', label: '分析', icon: <FiBarChart2 className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* 桌面版：水平 Tab 樣式 */}
      <div className="hidden lg:flex bg-white rounded-xl shadow-md p-1 border border-gray-200">
        {modes.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`
              flex items-center space-x-2 px-4 py-2.5 rounded-lg
              font-medium text-body-sm transition-all duration-normal
              ${viewMode === key
                ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            aria-label={`切換到${label}視圖`}
            aria-pressed={viewMode === key}
            role="tab"
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 移動版：Dropdown 選單 */}
      <div className="lg:hidden">
        <select 
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-body-sm font-medium shadow-sm focus:ring-2 focus:ring-customgreen focus:border-transparent transition-all"
          aria-label="選擇視圖模式"
        >
          {modes.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </>
  );
};

export default ViewModeButtons;
