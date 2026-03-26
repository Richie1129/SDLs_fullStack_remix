import { useState } from 'react';
import { FiHelpCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaHandsHelping } from 'react-icons/fa';
import { useStudentHelpSeeking } from '../hooks/useStudentHelpSeeking';

// ─── 求助類型設定 ───────────────────────────────────────────
const TYPE_CONFIG = {
  adaptive:  { label: '主動求助', color: 'bg-teal-500',  desc: '先嘗試後再求助' },
  expedient: { label: '直接求助', color: 'bg-amber-400', desc: '直接尋求解答' },
  mixed:     { label: '混合型',   color: 'bg-slate-400', desc: '兩者皆有' },
};

// ─── 求助對象設定 ───────────────────────────────────────────
const SOURCE_CONFIG = [
  { key: 'askedPeers',      label: '同學',      color: 'bg-blue-400'   },
  { key: 'askedTeacher',    label: '老師',      color: 'bg-purple-400' },
  { key: 'askedResources',  label: '查資料',    color: 'bg-customgreen'  },
  { key: 'askedNone',       label: '還沒問任何人', color: 'bg-gray-300' },
];

// ─── 橫向比率列 ────────────────────────────────────────────
const RatioBar = ({ label, count, total, colorClass, desc }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-caption text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span>{count} 次（{pct}%）{desc ? <span className="text-gray-400 ml-1">— {desc}</span> : null}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full">
        <div className={`h-2 rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── 無資料提示 ────────────────────────────────────────────
const EmptyState = () => (
  <p className="text-body-sm text-gray-500 text-center py-4 leading-relaxed">
    當你在看板任務卡片使用 AI 助手求助時，<br />這裡會記錄你的學習策略分析。
  </p>
);

// ─── 主元件 ────────────────────────────────────────────────
const HelpSeekingAwareness = ({ userId, projectId }) => {
  const { data, loading } = useStudentHelpSeeking(userId, projectId);
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return null;

  const stats            = data?.stats            ?? { total: 0 };
  const effectivenessStats = data?.effectivenessStats ?? {};
  const insights         = data?.insights         ?? [];
  const { total }        = stats;

  // 逃避傾向：「還沒問任何人」超過 40%
  const avoidanceTendency = total > 0 && (stats.askedNone / total) > 0.4;

  return (
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 flex items-center">
          <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3" />
          <FaHandsHelping className="text-teal-600 mr-2" />
          我的求助習慣
        </h2>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={collapsed ? '展開' : '收合'}
        >
          {collapsed ? <FiChevronDown className="w-5 h-5" /> : <FiChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {total === 0 ? <EmptyState /> : (
            <div className="space-y-5">

              {/* 逃避傾向柔性提示 */}
              {avoidanceTendency && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-body-sm text-amber-800">
                  你最近傾向獨自面對困難，試試在聊天室提問——隊友可能有同樣的疑惑。
                </div>
              )}

              {/* ① 求助類型 */}
              <div>
                <p className="text-caption font-semibold text-gray-500 uppercase tracking-wide mb-2">求助類型</p>
                <div className="space-y-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <RatioBar
                      key={key}
                      label={cfg.label}
                      count={stats[key] ?? 0}
                      total={total}
                      colorClass={cfg.color}
                      desc={cfg.desc}
                    />
                  ))}
                </div>
              </div>

              {/* ② 求助對象 */}
              <div>
                <p className="text-caption font-semibold text-gray-500 uppercase tracking-wide mb-2">求助對象</p>
                <div className="space-y-2">
                  {SOURCE_CONFIG.map(({ key, label, color }) => (
                    <RatioBar
                      key={key}
                      label={label}
                      count={stats[key] ?? 0}
                      total={total}
                      colorClass={color}
                    />
                  ))}
                </div>
              </div>

              {/* ③ 求助有效性 */}
              {effectivenessStats.checked > 0 && (
                <div>
                  <p className="text-caption font-semibold text-gray-500 uppercase tracking-wide mb-2">求助有效性</p>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-teal-50 border border-teal-100 rounded-lg p-3 text-center">
                      <p className="text-h3 font-bold text-teal-700">
                        {effectivenessStats.resolved} / {effectivenessStats.checked}
                      </p>
                      <p className="text-caption text-teal-600 mt-1">求助後任務有進展</p>
                    </div>
                    {effectivenessStats.avgScore !== null && (
                      <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                        <p className="text-h3 font-bold text-blue-700">{effectivenessStats.avgScore}</p>
                        <p className="text-caption text-blue-600 mt-1">平均效益分數</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ④ 後端洞察文字 */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 p-3 rounded-lg text-body-sm ${
                        insight.type === 'positive'
                          ? 'bg-teal-50 border border-teal-100 text-teal-800'
                          : insight.type === 'warning'
                          ? 'bg-amber-50 border border-amber-100 text-amber-800'
                          : 'bg-blue-50 border border-blue-100 text-blue-800'
                      }`}
                    >
                      <FiHelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>{insight.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 底部說明 */}
              <p className="text-[10px] text-gray-400 text-center">
                統計過去 30 天、在本專案的 AI 求助紀錄，共 {total} 次
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HelpSeekingAwareness;
