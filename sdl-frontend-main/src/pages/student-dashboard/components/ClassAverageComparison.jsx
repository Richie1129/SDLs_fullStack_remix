import React, { useMemo, useState } from 'react';
import { FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi';

/**
 * 班級情境參考（匿名平均值對比）
 *
 * 研究依據：SDT（2024）指出「能力感知（Competence）」需要參照點，
 * 但參照點應是「班級匿名平均」或「過去的自己」，而非個人排名。
 *
 * 設計原則：
 * - 只顯示匿名班級平均值，不揭示任何個人排名或姓名
 * - 提供情境脈絡（「這樣算好嗎？」），不製造競爭壓力
 * - 使用鼓勵性語氣，低於平均用琥珀色（非紅色）
 *
 * 週反思平均來自後端 /daily/class-summary（GROUP BY userId 聚合），
 * 確保是真實全班數據而非個人資料。
 */
const ClassAverageComparison = ({
  personalData,
  classSummary = null,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const { metrics } = useMemo(() => {
    // 全部來自後端 classSummary，無前端自行計算
    const avgReflections = classSummary?.avgWeeklyReflections ?? null;
    const avgNodes       = classSummary?.avgIdeaNodes ?? null;
    const avgTasks       = classSummary?.avgKanbanTasks ?? null;
    const count          = classSummary?.memberCount ?? 0;

    const myNodes       = personalData?.ideaNodes || 0;
    const myTasks       = personalData?.totalTasks || 0;
    const myReflections = personalData?.weeklyReflections || 0;

    const indicator = (mine, avg) => {
      if (avg === null || avg === 0) return 'neutral';
      const ratio = mine / avg;
      if (ratio >= 1.2) return 'above';
      if (ratio >= 0.8) return 'near';
      return 'below';
    };

    const items = [
      {
        label: '週反思',
        unit: '篇',
        avg: avgReflections,
        mine: myReflections,
        status: indicator(myReflections, avgReflections),
        noData: avgReflections === null,
      },
      {
        label: '想法節點',
        unit: '個',
        avg: avgNodes,
        mine: myNodes,
        status: indicator(myNodes, avgNodes),
        noData: avgNodes === null,
      },
      {
        label: '看板任務',
        unit: '個',
        avg: avgTasks,
        mine: myTasks,
        status: indicator(myTasks, avgTasks),
        noData: avgTasks === null,
      },
    ];

    return { metrics: items };
  }, [personalData, classSummary]);

  const statusConfig = {
    above:   { text: '高於平均', textColor: 'text-customgreen',  rowBg: 'bg-green-50',  rowBorder: 'border-green-200' },
    near:    { text: '接近平均', textColor: 'text-gray-500',     rowBg: 'bg-gray-50',   rowBorder: 'border-gray-200'  },
    below:   { text: '低於平均', textColor: 'text-amber-600',    rowBg: 'bg-amber-50',  rowBorder: 'border-amber-200' },
    neutral: { text: '暫無資料', textColor: 'text-gray-400',     rowBg: 'bg-gray-50',   rowBorder: 'border-gray-200'  },
  };

  if (!personalData) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-component-base py-3 cursor-pointer"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <FiUsers className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-body-sm font-semibold text-gray-800">班級情境參考</span>
        </div>
        {collapsed
          ? <FiChevronDown className="w-4 h-4 text-gray-400" />
          : <FiChevronUp   className="w-4 h-4 text-gray-400" />}
      </div>

      {!collapsed && (
        <div className="px-component-base pb-4">
          <p className="text-caption text-gray-400 mb-3 leading-relaxed">
            以下為全班匿名平均值，提供情境脈絡，不顯示個人排名，不影響評分。
          </p>

          <div className="space-y-2">
            {metrics.map(m => {
              const cfg = statusConfig[m.status];
              return (
                <div
                  key={m.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.rowBg} ${cfg.rowBorder}`}
                >
                  {/* 指標名稱 */}
                  <span className="w-16 text-caption text-gray-500 shrink-0">{m.label}</span>

                  {/* 班級平均 */}
                  <div className="flex-1 flex items-baseline gap-1">
                    <span className="text-caption text-gray-400">班平均</span>
                    <span className="text-body-sm font-semibold text-gray-700">
                      {m.noData ? '—' : `${m.avg} ${m.unit}`}
                    </span>
                  </div>

                  {/* 我的 + 狀態 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-caption text-gray-400">我的  </span>
                      <span className="text-body-sm font-bold text-gray-800">{m.mine} {m.unit}</span>
                    </div>
                    <span className={`text-caption font-medium ${cfg.textColor} w-16 text-right`}>
                      {m.noData ? '暫無資料' : cfg.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassAverageComparison;
