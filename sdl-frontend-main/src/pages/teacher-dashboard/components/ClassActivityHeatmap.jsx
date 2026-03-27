import React, { useMemo, useState } from 'react';
import { FiInfo } from 'react-icons/fi';

const Tooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition-colors duration-fast"
        aria-label="說明"
        type="button"
      >
        <FiInfo className="w-2.5 h-2.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-800 text-white text-caption rounded-lg z-50 pointer-events-none shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
};

const COLORS = ['bg-gray-100', 'bg-purple-100', 'bg-purple-300', 'bg-purple-600'];

const getColor = (count) => {
  if (count === 0) return COLORS[0];
  if (count <= 2) return COLORS[1];
  if (count <= 6) return COLORS[2];
  return COLORS[3];
};

const toDateKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const ClassActivityHeatmap = ({ reflections = [], tasks = [], nodes = [] }) => {
  const { cells, totalActivities, activeDays, weeklyTotals, isCramming } = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (27 - i));
      return d;
    });

    const counts = {};
    days.forEach(d => { counts[toDateKey(d)] = 0; });

    const add = (dateStr) => {
      if (!dateStr) return;
      const key = toDateKey(dateStr);
      if (key in counts) counts[key]++;
    };

    reflections.forEach(r => add(r.createdAt));
    nodes.forEach(n => add(n.createdAt));
    tasks.forEach(t => add(t.updatedAt || t.createdAt));

    const cells = days.map(d => ({
      date: d,
      count: counts[toDateKey(d)],
      label: d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'narrow' }),
    }));

    const weeklyTotals = [
      cells.slice(0, 7).reduce((s, c) => s + c.count, 0),
      cells.slice(7, 14).reduce((s, c) => s + c.count, 0),
      cells.slice(14, 21).reduce((s, c) => s + c.count, 0),
      cells.slice(21, 28).reduce((s, c) => s + c.count, 0),
    ];

    const prevAvg = (weeklyTotals[0] + weeklyTotals[1] + weeklyTotals[2]) / 3;
    const isCramming = prevAvg > 0 && weeklyTotals[3] >= prevAvg * 2.5;

    return {
      cells,
      totalActivities: cells.reduce((s, c) => s + c.count, 0),
      activeDays: cells.filter(c => c.count > 0).length,
      weeklyTotals,
      isCramming,
    };
  }, [reflections, tasks, nodes]);

  const weeks = [
    { label: '4週前', days: cells.slice(0, 7) },
    { label: '3週前', days: cells.slice(7, 14) },
    { label: '2週前', days: cells.slice(14, 21) },
    { label: '本週',  days: cells.slice(21, 28) },
  ];

  return (
    <div className="bg-white p-component-base sm:p-component-md-lg rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-body-lg sm:text-h2 font-semibold text-gray-700">全班學習節律</h2>
          <Tooltip text="顯示過去 4 週全班每天的活動強度（含反思、看板任務、想法節點），顏色愈深代表活動愈多。若本週活動量明顯高於前三週平均，系統會自動提示可能的集中趕工模式。" />
        </div>
        <span className="text-caption text-gray-400">
          {activeDays} 天有活動・共 {totalActivities} 筆
        </span>
      </div>

      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={week.label} className="flex items-center gap-2">
            <span className="text-caption text-gray-400 w-10 shrink-0 text-right">{week.label}</span>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {week.days.map((cell, di) => (
                <div
                  key={di}
                  title={`${cell.label}：${cell.count} 筆活動`}
                  className={`h-7 rounded ${getColor(cell.count)} cursor-default transition-colors duration-fast`}
                />
              ))}
            </div>
            <span className="text-caption text-gray-500 w-8 shrink-0 text-right">{weeklyTotals[wi]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-caption text-gray-400">少</span>
        {COLORS.map((c, i) => (
          <div key={i} className={`w-4 h-4 rounded ${c} border border-gray-200`} />
        ))}
        <span className="text-caption text-gray-400">多</span>
      </div>

      {isCramming && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-component-xs">
          <p className="text-caption text-amber-700">
            本週活動量明顯高於過去三週平均，可能有學生在截止日前集中趕作業。建議觀察是否為臨時抱佛腳模式。
          </p>
        </div>
      )}
    </div>
  );
};

export default ClassActivityHeatmap;
