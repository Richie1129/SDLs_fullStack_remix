import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { isCompletedStatus } from '../utils/overviewUtils';

// 往前推算 N 個月，回傳 { label: '3月', key: '2026-03' } 陣列（舊→新）
function buildMonthRange(numMonths) {
  const result = [];
  const now = new Date();
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getMonth() + 1}月`;
    result.push({ key, label });
  }
  return result;
}

function toMonthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SERIES = [
  { key: 'reflections', label: '反思篇數',  color: '#0d9488' }, // teal-600
  { key: 'tasks',       label: '完成任務',  color: '#2563eb' }, // blue-600
  { key: 'ai',          label: 'AI 互動',   color: '#d97706' }, // amber-600
  { key: 'ideas',       label: '想法節點',  color: '#7c3aed' }, // purple-600
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-body-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}：</span>
          <span className="font-medium text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * 月度跨專案成長趨勢折線圖
 *
 * CARE 診斷性層次：讓學生看到「自己的行為隨時間如何變化」
 * 資料全部來自已載入的 props，純前端計算，無需新 API。
 */
const GrowthTrendChart = ({
  allReflections = [],
  kanbanTasks = [],
  aiInteractions = [],
  ideaNodes = [],
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const NUM_MONTHS = 5;

  const { chartData, hasMeaningfulData, trendInsight } = useMemo(() => {
    const months = buildMonthRange(NUM_MONTHS);
    const buckets = {};
    months.forEach(({ key }) => {
      buckets[key] = { reflections: 0, tasks: 0, ai: 0, ideas: 0 };
    });
    const validKeys = new Set(months.map(m => m.key));

    allReflections.forEach(r => {
      const k = toMonthKey(r.createdAt);
      if (k && validKeys.has(k)) buckets[k].reflections++;
    });

    kanbanTasks.filter(t => isCompletedStatus(t.columnName)).forEach(t => {
      const k = toMonthKey(t.updatedAt || t.createdAt);
      if (k && validKeys.has(k)) buckets[k].tasks++;
    });

    aiInteractions.forEach(a => {
      const k = toMonthKey(a.createdAt);
      if (k && validKeys.has(k)) buckets[k].ai++;
    });

    ideaNodes.forEach(n => {
      const k = toMonthKey(n.createdAt);
      if (k && validKeys.has(k)) buckets[k].ideas++;
    });

    const data = months.map(({ key, label }) => ({ month: label, ...buckets[key] }));

    // 至少有兩個月有任何資料才算有意義
    const nonZeroMonths = data.filter(d => d.reflections + d.tasks + d.ai + d.ideas > 0).length;

    // 計算反思趨勢（最近 2 個月比較）
    let trendInsight = null;
    if (data.length >= 2) {
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      const diff = last.reflections - prev.reflections;
      if (diff > 0) trendInsight = { dir: 'up', text: `本月反思比上月多 ${diff} 篇`, color: 'text-teal-600' };
      else if (diff < 0) trendInsight = { dir: 'down', text: `本月反思比上月少 ${Math.abs(diff)} 篇`, color: 'text-amber-600' };
      else if (last.reflections > 0) trendInsight = { dir: 'flat', text: '本月反思與上月持平', color: 'text-gray-500' };
    }

    return { chartData: data, hasMeaningfulData: nonZeroMonths >= 2, trendInsight };
  }, [allReflections, kanbanTasks, aiInteractions, ideaNodes]);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-component-base sm:px-component-md-lg sm:pt-component-md-lg sm:pb-4 text-left"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-50 text-teal-600">
            <FiTrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 leading-none">
              成長趨勢
            </h2>
            <p className="text-caption text-gray-400 mt-0.5">過去 {NUM_MONTHS} 個月的跨專案學習活動</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trendInsight && !collapsed && (
            <span className={`text-caption font-medium ${trendInsight.color} hidden sm:inline`}>
              {trendInsight.text}
            </span>
          )}
          {collapsed
            ? <FiChevronDown className="w-4 h-4 text-gray-400" />
            : <FiChevronUp className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="px-component-base sm:px-component-md-lg pb-component-base sm:pb-component-md-lg">
          {hasMeaningfulData ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#888780' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#888780' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  {SERIES.map(s => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* 趨勢摘要行（手機版才顯示，桌面在 header） */}
              {trendInsight && (
                <p className={`text-caption ${trendInsight.color} mt-2 sm:hidden`}>
                  {trendInsight.text}
                </p>
              )}

              {/* 診斷性說明 */}
              <p className="text-caption text-gray-400 mt-3">
                診斷性分析：觀察學習活動的月度變化，找出活躍高峰與低谷期，了解自己的學習節律。
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <FiTrendingUp className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-body-sm font-medium text-gray-500 mb-1">資料累積中</p>
              <p className="text-caption text-gray-400 max-w-xs">
                持續參與學習活動後，這裡將自動呈現你過去數個月的成長趨勢折線圖。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GrowthTrendChart;
