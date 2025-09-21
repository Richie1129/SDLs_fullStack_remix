import React from 'react';
import {
  getSafeArrayData,
  getSafeDisplayName,
  getSafeValue,
  processSafeRankingData
} from '../utils';
import LoadingState from './LoadingState';

const RankingView = ({ rankingData }) => {
  if (!rankingData) {
    return (
      <div className="text-center text-gray-500 py-8">
        排行榜資料載入中...
      </div>
    );
  }

  // 安全的資料解構和處理
  const safeStudents = getSafeArrayData(rankingData?.students);
  const safeCreators = processSafeRankingData(rankingData?.creators, 3);
  const safeTasks = processSafeRankingData(rankingData?.tasks, 3);

  const getMedalIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const SafeRankingSection = ({ title, data, valueKey, valueLabel, bgColor }) => {
    // 安全的資料驗證
    const safeData = getSafeArrayData(data);

    // 檢查是否有有效的標題和鍵名
    if (!title || !valueKey || !valueLabel) {
      return (
        <div className="mb-6">
          <LoadingState
            type="error"
            message="排行榜配置錯誤"
            className="py-4"
          />
        </div>
      );
    }

    // 檢查是否有資料
    if (safeData.length === 0) {
      return (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">{title}</h3>
          <LoadingState
            type="no-ranking"
            message={`${title}暫無資料`}
            className="py-4"
          />
        </div>
      );
    }

    // 安全的渲染邏輯
    try {
      return (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">{title}</h3>
          <div className="grid grid-cols-1 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50">
            {safeData.slice(0, 3).map((item, index) => {
              // 安全的屬性存取
              const displayName = getSafeDisplayName(item);
              const displayValue = getSafeValue(item, valueKey, 0);
              const safeKey = `${displayName}-${index}-${displayValue}`;

              return (
                <div
                  key={safeKey}
                  className={`relative flex items-center justify-between p-2 ${bgColor || 'bg-gray-50'} rounded transition-colors hover:opacity-90`}
                >
                  {index < 3 && (
                    <div className="absolute -top-1 -left-1 text-lg">
                      {getMedalIcon(index)}
                    </div>
                  )}
                  <span className={`text-sm font-medium text-gray-800 ${index < 3 ? 'ml-4' : ''} truncate`}>
                    {displayName}
                  </span>
                  <span className="text-sm text-gray-600 flex-shrink-0 ml-2">
                    {displayValue} {valueLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (error) {
      console.warn(`渲染 ${title} 時發生錯誤:`, error);
      return (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">{title}</h3>
          <LoadingState
            type="error"
            message="顯示排行榜時發生錯誤"
            className="py-4"
          />
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <SafeRankingSection
        title="學生活動排行"
        data={safeStudents}
        valueKey="totalActivity"
        valueLabel="總活動"
        bgColor="bg-blue-50"
      />

      <SafeRankingSection
        title="想法創作排行"
        data={safeCreators}
        valueKey="count"
        valueLabel="個想法"
        bgColor="bg-purple-50"
      />

      <SafeRankingSection
        title="任務完成排行"
        data={safeTasks}
        valueKey="count"
        valueLabel="個任務"
        bgColor="bg-orange-50"
      />
    </div>
  );
};

export default RankingView;