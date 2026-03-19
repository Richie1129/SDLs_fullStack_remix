import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/**
 * 學習進度環形圖
 * 顯示學生當前的課程完成率
 */
const LearningProgressRing = ({ progressPercentage = 0 }) => {
  const pct = Math.min(100, Math.max(0, Math.round(progressPercentage)));
  const data = [
    { value: pct },
    { value: 100 - pct },
  ];

  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
      <h3 className="text-caption text-[#888780] mb-3">當前完成率</h3>
      <div className="relative" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              startAngle={90}
              endAngle={-270}
              innerRadius="62%"
              outerRadius="82%"
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="#5BA491" />
              <Cell fill="#E1F5EE" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* 中央數值 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="metric-value text-h2 font-medium text-[#2C2C2A] leading-none">{pct}%</p>
          <p className="text-caption text-[#888780] mt-1">學習進度</p>
        </div>
      </div>
    </div>
  );
};

export default LearningProgressRing;
