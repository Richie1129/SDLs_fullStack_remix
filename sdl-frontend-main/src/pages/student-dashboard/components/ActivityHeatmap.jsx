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

const COLORS = ['bg-gray-100', 'bg-teal-100', 'bg-teal-300', 'bg-teal-600'];

const getColor = (count) => {
  if (count === 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count <= 3) return COLORS[2];
  return COLORS[3];
};

const toDateKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const ActivityHeatmap = ({
  personalReflections = [],
  kanbanTasks = [],
  ideaNodes = [],
  aiInteractions = [],
  userId,
}) => {
  const { cells, totalActivities, activeDays } = useMemo(() => {
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

    personalReflections.forEach(r => add(r.createdAt));

    ideaNodes
      .filter(n => !userId || n.userId === userId)
      .forEach(n => add(n.createdAt));

    aiInteractions
      .filter(a => !userId || a.userId === userId)
      .forEach(a => add(a.createdAt));

    kanbanTasks
      .filter(t => {
        if (!userId) return true;
        const byAssignee = t.assignees?.some(a => a.userId === userId || a.id === userId);
        const byOwner = t.userId === userId;
        return byAssignee || byOwner;
      })
      .forEach(t => add(t.updatedAt || t.createdAt));

    const cells = days.map(d => ({
      date: d,
      count: counts[toDateKey(d)],
      label: d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'narrow' }),
    }));

    return {
      cells,
      totalActivities: cells.reduce((s, c) => s + c.count, 0),
      activeDays: cells.filter(c => c.count > 0).length,
    };
  }, [personalReflections, kanbanTasks, ideaNodes, aiInteractions, userId]);

  const weeks = [
    { label: '4週前', days: cells.slice(0, 7) },
    { label: '3週前', days: cells.slice(7, 14) },
    { label: '2週前', days: cells.slice(14, 21) },
    { label: '本週',  days: cells.slice(21, 28) },
  ];

  const insightColor = activeDays >= 14 ? 'text-teal-600' : activeDays >= 7 ? 'text-gray-500' : 'text-amber-600';
  const insightMsg = totalActivities === 0
    ? null
    : activeDays >= 14
    ? '學習習慣規律，持續保持！'
    : activeDays >= 7
    ? '學習頻率尚可，嘗試增加每週活動天數。'
    : `過去 4 週僅有 ${activeDays} 天有活動，試著建立更規律的學習節奏。`;

  return (
    <div className="bg-white rounded-xl p-component-base sm:p-component-md-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800">學習節律</h2>
          <Tooltip text="顯示過去 4 週每天的學習活動強度，包含反思、看板任務、想法節點、AI 互動。顏色愈深代表當天活動愈多，幫助你了解自己的學習節奏是否規律。" />
        </div>
        <span className="text-caption text-gray-400">
          {activeDays} 天有活動・共 {totalActivities} 次
        </span>
      </div>

      <div className="space-y-1.5">
        {weeks.map((week) => (
          <div key={week.label} className="flex items-center gap-2">
            <span className="text-caption text-gray-400 w-10 shrink-0 text-right">{week.label}</span>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {week.days.map((cell, di) => (
                <div
                  key={di}
                  title={`${cell.label}：${cell.count} 次活動`}
                  className={`h-7 rounded ${getColor(cell.count)} cursor-default transition-colors duration-fast`}
                />
              ))}
            </div>
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

      {insightMsg && (
        <p className={`text-caption mt-2 ${insightColor}`}>{insightMsg}</p>
      )}
    </div>
  );
};

export default ActivityHeatmap;
