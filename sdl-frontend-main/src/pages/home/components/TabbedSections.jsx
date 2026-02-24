import React, { useState } from 'react';
import ProjectSection from './ProjectSection';

const TabbedSections = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!tabs || tabs.length === 0) return null;

  const currentTab = tabs[activeTab];

  return (
    <div>
      {/* Tab 標頭列 */}
      <div className="flex items-end border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hidden">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`
              flex items-center gap-stack-xs px-btn-x-lg py-btn-y-lg text-body-sm font-medium
              border-b-2 transition-colors duration-fast whitespace-nowrap
              ${activeTab === idx
                ? 'border-[#5BA491] text-[#5BA491]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.title}
            {tab.showBadge && tab.badgeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-caption rounded-full leading-none">
                {tab.badgeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 內容 - 灰框由 ProjectSection alwaysExpanded 模式統一提供 */}
      <ProjectSection
        {...currentTab.sectionProps}
        alwaysExpanded={true}
        showSectionTitle={false}
      />
    </div>
  );
};

export default TabbedSections;
