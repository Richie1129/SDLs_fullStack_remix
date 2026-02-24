import React from 'react';

/**
 * SkeletonCard - 卡片骨架屏
 * 用於統計卡片載入時的佔位符
 */
export const SkeletonCard = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-32 sm:h-36">
        <div className="p-component-sm sm:p-component-md">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-gray-300 rounded w-20"></div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-300 rounded-xl"></div>
          </div>
          <div className="h-8 sm:h-10 bg-gray-300 rounded w-16 mb-3"></div>
          <div className="h-2 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * SkeletonTable - 表格骨架屏
 * 用於學生列表或數據表格載入時的佔位符
 */
export const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="bg-gray-200 h-12 flex-1 rounded"></div>
          <div className="bg-gray-200 h-12 w-20 rounded"></div>
          <div className="bg-gray-200 h-12 w-24 rounded"></div>
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonChart - 圖表骨架屏
 * 用於圖表載入時的佔位符
 */
export const SkeletonChart = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-xl h-64 sm:h-80"></div>
    </div>
  );
};

/**
 * SkeletonStatsCards - 統計卡片組骨架屏
 * 用於整組統計卡片載入時的佔位符
 */
export const SkeletonStatsCards = ({ count = 5 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

/**
 * SkeletonDashboard - 完整儀錶板骨架屏
 * 用於整個儀錶板載入時的佔位符
 */
export const SkeletonDashboard = () => {
  return (
    <div className="space-y-6">
      {/* 標題骨架 */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
      </div>

      {/* 統計卡片骨架 */}
      <SkeletonStatsCards />

      {/* 內容區域骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-gray-200 rounded-xl h-96"></div>
        <div className="bg-gray-200 rounded-xl h-96"></div>
      </div>
    </div>
  );
};

export default {
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonStatsCards,
  SkeletonDashboard,
};
