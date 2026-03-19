import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const BAR_MIN_HEIGHT = 120;
const BAR_ITEM_HEIGHT = 28;

const getBarColor = (progress) => {
  if (progress >= 70) return '#5BA491';
  if (progress >= 40) return '#EF9F27';
  return '#E24B4A';
};

const Legend = () => (
  <div className="flex items-center gap-4">
    {[
      { color: '#5BA491', label: '≥70%' },
      { color: '#EF9F27', label: '40–69%' },
      { color: '#E24B4A', label: '<40%' },
    ].map(({ color, label }) => (
      <span key={label} className="flex items-center gap-1 text-caption text-[#888780]">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
    ))}
  </div>
);

/**
 * 班級進度水平長條圖
 * 顏色依完成率動態填色：綠（≥70%）、琥珀（40–69%）、紅（<40%）
 */
const ClassProgressBar = ({ students = [] }) => {
  const data = students
    .map((s) => ({
      name: s.username || s.name || '未知',
      progress: Math.round(s.progressPercentage || 0),
    }))
    .sort((a, b) => b.progress - a.progress);

  if (!data.length) return null;

  const chartHeight = Math.max(BAR_MIN_HEIGHT, data.length * BAR_ITEM_HEIGHT);

  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body-sm font-semibold text-gray-700">班級進度分佈</h3>
        <Legend />
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="rgba(0,0,0,0.07)"
            strokeDasharray="4 4"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#888780', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: '#888780', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => [`${v}%`, '完成率']}
            contentStyle={{
              fontSize: '12px',
              fontVariantNumeric: 'tabular-nums lining-nums',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]} maxBarSize={14}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.progress)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ClassProgressBar;
