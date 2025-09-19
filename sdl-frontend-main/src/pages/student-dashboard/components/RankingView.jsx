import React from 'react';

const RankingView = ({ rankingData }) => {
  if (!rankingData) {
    return (
      <div className="text-center text-gray-500 py-8">
        排行榜資料載入中...
      </div>
    );
  }

  const { students = [], creators = [], tasks = [] } = rankingData;

  const getMedalIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const RankingSection = ({ title, data, valueKey, valueLabel, bgColor }) => (
    <div className="mb-6">
      <h3 className="text-md font-semibold mb-3 text-gray-600">{title}</h3>
      <div className="grid grid-cols-1 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50">
        {data.slice(0, 3).map((item, index) => (
          <div key={`${item.name || item.creator}-${index}`} className={`relative flex items-center justify-between p-2 ${bgColor} rounded`}>
            {index < 3 && (
              <div className="absolute -top-1 -left-1 text-lg">
                {getMedalIcon(index)}
              </div>
            )}
            <span className={`text-sm font-medium text-gray-800 ${index < 3 ? 'ml-4' : ''}`}>
              {item.name || item.creator}
            </span>
            <span className="text-sm text-gray-600">{item[valueKey]} {valueLabel}</span>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center text-gray-500 py-4 text-sm">此類別暫無資料</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <RankingSection
        title="學生活動排行"
        data={students}
        valueKey="totalActivity"
        valueLabel="總活動"
        bgColor="bg-blue-50"
      />

      <RankingSection
        title="想法創作排行"
        data={Object.entries(creators)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([creator, count]) => ({ creator, count }))}
        valueKey="count"
        valueLabel="個想法"
        bgColor="bg-purple-50"
      />

      <RankingSection
        title="任務完成排行"
        data={Object.entries(tasks)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([creator, count]) => ({ creator, count }))}
        valueKey="count"
        valueLabel="個任務"
        bgColor="bg-orange-50"
      />
    </div>
  );
};

export default RankingView;