import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { parse5RsContent } from '@/utils/5RsUtils.js';

const DIMENSIONS = [
  { key: 'reporting',     label: '報告',  fullLabel: 'Reporting（報告）'     },
  { key: 'responding',    label: '回應',  fullLabel: 'Responding（回應）'    },
  { key: 'relating',      label: '關聯',  fullLabel: 'Relating（關聯）'      },
  { key: 'reasoning',     label: '推論',  fullLabel: 'Reasoning（推論）'     },
  { key: 'reconstructing',label: '重建',  fullLabel: 'Reconstructing（重建）'},
];

/**
 * 5Rs 反思深度雷達圖
 *
 * 資料來源：personalReflections[].content → parse5RsContent → feedback.scores
 * 每個維度分數 0–100，跨所有已分析反思取平均值。
 */
const FiveRsRadarChart = ({ personalReflections = [] }) => {
  const { chartData, analyzedCount, totalCount, overall, strongest, weakest } = useMemo(() => {
    const scoreSums = { reporting: 0, responding: 0, relating: 0, reasoning: 0, reconstructing: 0 };
    const scoreCounts = { reporting: 0, responding: 0, relating: 0, reasoning: 0, reconstructing: 0 };
    let analyzed = 0;

    personalReflections.forEach(r => {
      if (!r?.content) return;
      const parsed = parse5RsContent(r.content);
      if (!parsed?.feedback?.scores) return;
      const { scores } = parsed.feedback;
      analyzed++;
      DIMENSIONS.forEach(({ key }) => {
        if (typeof scores[key] === 'number') {
          scoreSums[key] += scores[key];
          scoreCounts[key]++;
        }
      });
    });

    const avgScores = DIMENSIONS.map(({ key, label, fullLabel }) => {
      const avg = scoreCounts[key] > 0 ? Math.round(scoreSums[key] / scoreCounts[key]) : 0;
      return { key, label, fullLabel, score: avg };
    });

    const withScores = avgScores.filter(d => d.score > 0);
    const overall = withScores.length
      ? Math.round(withScores.reduce((s, d) => s + d.score, 0) / withScores.length)
      : 0;
    const strongest = withScores.length
      ? withScores.reduce((a, b) => (a.score >= b.score ? a : b))
      : null;
    const weakest = withScores.length
      ? withScores.reduce((a, b) => (a.score <= b.score ? a : b))
      : null;

    return {
      chartData: avgScores,
      analyzedCount: analyzed,
      totalCount: personalReflections.length,
      overall,
      strongest,
      weakest,
    };
  }, [personalReflections]);

  const noData = analyzedCount === 0;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const dim = DIMENSIONS.find(x => x.label === d.payload.label);
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-caption">
        <p className="font-semibold text-gray-800 mb-0.5">{dim?.fullLabel}</p>
        <p className="text-teal-600 font-bold">{d.value} 分</p>
        <p className="text-gray-400">
          {d.value >= 80 ? '優秀' : d.value >= 60 ? '良好' : d.value >= 40 ? '待加強' : '尚未分析'}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-component-base sm:p-component-md-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 flex items-center">
            <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3" />
            5Rs 反思深度
          </h2>
          <p className="text-caption text-gray-400 mt-0.5">
            共 {totalCount} 篇反思，其中 {analyzedCount} 篇已獲 AI 分析
          </p>
        </div>
        {!noData && (
          <div className="text-right shrink-0">
            <p className="text-h2 font-bold text-teal-600">{overall}</p>
            <p className="text-caption text-gray-400">綜合分數</p>
          </div>
        )}
      </div>

      {noData ? (
        /* 尚無分析資料 */
        <div className="text-center py-10 text-gray-400">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-body-sm font-medium text-gray-500 mb-1">尚無 AI 分析資料</p>
          <p className="text-caption text-gray-400 max-w-xs mx-auto leading-relaxed">
            {totalCount > 0
              ? '已有反思記錄，可前往反思日誌頁面對任一篇 5Rs 反思執行 AI 分析，分數將自動在此呈現。'
              : '撰寫你的第一篇 5Rs 反思並執行 AI 分析後，各維度的深度分析將在此呈現。'}
          </p>
        </div>
      ) : (
        <>
          {/* Radar Chart */}
          <div className="h-64 sm:h-72 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                />
                <Radar
                  dataKey="score"
                  stroke="#0d9488"
                  fill="#0d9488"
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Dimension score bars */}
          <div className="mt-4 space-y-2">
            {chartData.map(d => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-8 text-caption text-gray-500 shrink-0 text-right">{d.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-slow ${
                      d.score >= 80 ? 'bg-teal-400'
                      : d.score >= 60 ? 'bg-blue-400'
                      : d.score >= 40 ? 'bg-amber-400'
                      : 'bg-gray-300'
                    }`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className={`w-8 text-caption font-semibold shrink-0 ${
                  d.score >= 80 ? 'text-teal-600'
                  : d.score >= 60 ? 'text-blue-600'
                  : d.score >= 40 ? 'text-amber-600'
                  : 'text-gray-400'
                }`}>
                  {d.score > 0 ? d.score : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Strongest / Weakest callout */}
          {strongest && weakest && strongest.key !== weakest.key && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-component-sm">
                <p className="text-caption text-teal-500 mb-0.5">最強維度</p>
                <p className="text-body-sm font-semibold text-teal-700">{strongest.fullLabel}</p>
                <p className="text-caption text-teal-600">{strongest.score} 分</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-component-sm">
                <p className="text-caption text-amber-500 mb-0.5">待加強維度</p>
                <p className="text-body-sm font-semibold text-amber-700">{weakest.fullLabel}</p>
                <p className="text-caption text-amber-600">{weakest.score} 分</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FiveRsRadarChart;
