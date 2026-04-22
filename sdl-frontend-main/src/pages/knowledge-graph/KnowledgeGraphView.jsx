import React, { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiUser, FiX, FiFilter, FiList } from 'react-icons/fi';
import { useKnowledgeGraph } from './hooks/useKnowledgeGraph';
import { getActionMeta, CAT_COLOR, targetTypeLabel } from './utils/actionMeta';
import {
  summarizeByCategory,
  summarizeByTargetType,
  filterByTimeRange,
} from './utils/buildGraph';
import { fmtDate } from './utils/fmtDate';
import RadialSunburst from './components/RadialSunburst';
import TemporalSankey from './components/TemporalSankey';

const TIME_RANGES = [
  { key: 'week', label: '本週' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

const SkeletonGraph = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-component-base animate-pulse">
    <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
    <div className="h-[560px] w-full bg-gray-100 rounded-lg" />
  </div>
);

const KpiCard = ({ label, value, sub, color, onClick, active, clickable }) => {
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-xl border p-component-base text-left transition-colors duration-fast
        ${active ? 'border-2 shadow-md' : 'border-gray-200'}
        ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      style={active ? { borderColor: color } : undefined}
    >
      <div className="flex items-center gap-1 text-caption text-gray-400 mb-1">
        {label}
        {active && <span className="text-[10px] text-gray-500">（篩選中）</span>}
      </div>
      <div
        className="text-[28px] font-bold tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-gray-500 mt-1.5">{sub}</div>
    </Tag>
  );
};

const KnowledgeGraphView = ({
  projectId,
  role = 'student',
  currentUserName = null,
  className = '',
}) => {
  const { loading, error, project, members, events } = useKnowledgeGraph(projectId);

  // 從 localStorage 讀偏好（per-role；刻意跨 project 共用，單一教師看 N 個班時保持習慣）
  // 刻意「不」持久化：
  //   - categoryFilter：每次進頁以「看全部」為預設，避免忘記自己昨天開了篩選
  //   - selectedMember：同上；教師切換班級或專案時，應回到「看全組」為預設
  const prefsKey = `kg:prefs:${role}`;
  const loadPrefs = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(prefsKey) : null;
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  };
  const initial = loadPrefs();

  const [timeRange, setTimeRange] = useState(initial.timeRange || 'month');
  const [level, setLevel] = useState(initial.level || 'group');
  const [selectedMember, setSelectedMember] = useState(null);
  const [flowWindow, setFlowWindow] = useState(initial.flowWindow ?? 30); // 10 | 30 | 120 | 'day'
  const [chartMode, setChartMode] = useState(initial.chartMode || 'flow'); // 'radial' | 'flow'
  const [categoryFilter, setCategoryFilter] = useState(null); // 當前聚焦的類別
  // 行動版抽屜狀態（lg 以下才用；lg 以上永遠並排顯示）
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileFeedOpen, setMobileFeedOpen] = useState(false);

  // 把偏好寫回 localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(prefsKey, JSON.stringify({ timeRange, level, flowWindow, chartMode }));
    } catch (_) {}
  }, [prefsKey, timeRange, level, flowWindow, chartMode]);

  const filteredEvents = useMemo(() => filterByTimeRange(events, timeRange), [events, timeRange]);

  const resolvedStudent = useMemo(() => {
    if (level !== 'personal') return null;
    if (role === 'student' && currentUserName) return currentUserName;
    if (selectedMember) return selectedMember;
    const firstStudent = members.find(m => m.role === 'student');
    return firstStudent?.username || null;
  }, [level, role, currentUserName, selectedMember, members]);

  // 先套 level/actor 過濾，再套 category 過濾 → 圖表 & 事件流使用
  const levelScopedEvents = useMemo(() => {
    if (level === 'personal' && resolvedStudent) {
      return filteredEvents.filter(e => e.actorName === resolvedStudent);
    }
    return filteredEvents;
  }, [level, resolvedStudent, filteredEvents]);

  const scopedEvents = useMemo(() => {
    if (!categoryFilter) return levelScopedEvents;
    return levelScopedEvents.filter(e => getActionMeta(e.action).cat === categoryFilter);
  }, [levelScopedEvents, categoryFilter]);

  // 左欄「行為類別」顯示當前 level 下的完整分佈，不受 categoryFilter 影響（才能切換類別）
  const categories = useMemo(() => summarizeByCategory(levelScopedEvents), [levelScopedEvents]);
  const targetTypes = useMemo(() => summarizeByTargetType(scopedEvents), [scopedEvents]);

  const toggleCategoryFilter = (cat) => {
    setCategoryFilter(prev => (prev === cat ? null : cat));
  };

  const handleMemberClick = (member) => {
    if (role !== 'teacher') return;
    setSelectedMember(member.username);
    setLevel('personal');
  };

  // KPI 以 level-scope（未套類別過濾）為基準，點一下等於切換類別篩選
  const kpiTotal = levelScopedEvents.length;
  const kpiAi = levelScopedEvents.filter(e => getActionMeta(e.action).cat === 'AI').length;
  const kpiCollab = levelScopedEvents.filter(e => getActionMeta(e.action).cat === '協作').length;
  const activeMembers = new Set(levelScopedEvents.map(e => e.actorName).filter(Boolean)).size;

  const scopeTitle = useMemo(() => {
    if (!project) return '';
    if (level === 'personal' && resolvedStudent) return `${resolvedStudent}・個人學習軌跡`;
    return project.name;
  }, [project, level, resolvedStudent]);

  const scopeSubtitle = useMemo(() => {
    if (!project) return '';
    const parts = [];
    if (project.semester) parts.push(project.semester);
    parts.push(`${members.length} 位成員`);
    parts.push(`${events.length} 筆事件`);
    return parts.join(' · ');
  }, [project, members, events]);

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-red-200 p-component-md ${className}`}>
        <p className="text-body-sm text-red-600">載入知識圖譜失敗：{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#F8FAFB] rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full min-h-0 ${className}`}>
      {/* Top Bar */}
      <div className="flex flex-wrap items-center gap-stack-xs px-component-sm md:px-component-md py-component-sm bg-white border-b border-gray-200 flex-shrink-0">
        {/* 手機/平板：開啟篩選抽屜 */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden inline-flex items-center gap-1 px-2 py-1.5 text-caption rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          aria-label="開啟篩選"
        >
          <FiFilter className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-serif text-h3 font-bold text-customgreen hidden sm:inline">SDL</span>
          <span className="w-px h-5 bg-gray-200 mx-1 hidden sm:inline" />
          <div className="min-w-0">
            <div className="text-body-sm font-semibold text-gray-800 truncate">{scopeTitle || '知識圖譜'}</div>
            <div className="text-caption text-gray-500 truncate hidden sm:block">{scopeSubtitle}</div>
          </div>
        </div>
        <div className="flex-1" />
        {/* Level switch */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLevel('group')}
            className={`inline-flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-caption font-medium transition-colors duration-fast
              ${level === 'group' ? 'bg-white text-trust-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FiUsers className="w-3.5 h-3.5" /> <span className="hidden sm:inline">看全組</span>
          </button>
          <button
            onClick={() => setLevel('personal')}
            className={`inline-flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-caption font-medium transition-colors duration-fast
              ${level === 'personal' ? 'bg-white text-trust-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FiUser className="w-3.5 h-3.5" /> <span className="hidden sm:inline">看一個人</span>
          </button>
        </div>
        {/* Time range */}
        <div className="flex items-center gap-1">
          {TIME_RANGES.map(t => (
            <button
              key={t.key}
              onClick={() => setTimeRange(t.key)}
              className={`px-2 md:px-3 py-1.5 text-caption rounded-md border transition-colors duration-fast
                ${timeRange === t.key
                  ? 'bg-customgreen text-white border-customgreen'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* 手機/平板：開啟事件流抽屜 */}
        <button
          onClick={() => setMobileFeedOpen(true)}
          className="lg:hidden inline-flex items-center gap-1 px-2 py-1.5 text-caption rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          aria-label="開啟事件清單"
        >
          <FiList className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex">
        {/* 黑色遮罩（手機/平板抽屜開啟時） */}
        {(mobileSidebarOpen || mobileFeedOpen) && (
          <div
            className="lg:hidden absolute inset-0 bg-black/40 z-20"
            onClick={() => { setMobileSidebarOpen(false); setMobileFeedOpen(false); }}
          />
        )}
        {/* Left sidebar：lg 以上並排；以下時變成抽屜（absolute + slide in） */}
        <aside className={`
          bg-white border-r border-gray-200 px-component-base py-component-md
          overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200
          transition-transform duration-normal
          ${mobileSidebarOpen
            ? 'absolute inset-y-0 left-0 z-30 w-[260px] shadow-2xl translate-x-0'
            : 'absolute inset-y-0 left-0 z-30 w-[260px] -translate-x-full'}
          lg:static lg:translate-x-0 lg:shadow-none lg:z-0 lg:w-[200px] lg:flex-shrink-0
        `}>
          <div className="lg:hidden flex items-center justify-between mb-3">
            <span className="text-body-sm font-semibold text-gray-800">篩選</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <FiX className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="text-caption text-gray-400 tracking-wide mb-2">範圍</div>
          <div className="text-body-sm px-2.5 py-2 rounded-md bg-gray-100 text-gray-700 mb-1">
            {project?.name || '—'}
          </div>
          {level === 'personal' && resolvedStudent && (
            <div className="text-caption px-2.5 py-2 rounded-md bg-customgreen/15 text-customgreen">
              └ 只看：{resolvedStudent}
            </div>
          )}

          <div className="flex items-center mt-component-md mb-2">
            <span className="text-caption text-gray-400 tracking-wide">行為類別</span>
            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-2.5 h-2.5" /> 清除篩選
              </button>
            )}
          </div>
          <div className="space-y-1">
            {categories.length === 0 && (
              <div className="text-caption text-gray-400">無資料</div>
            )}
            {categories.map(({ cat, count, color }) => {
              const selected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategoryFilter(cat)}
                  className={`w-full flex items-center px-1.5 py-1 rounded-md text-body-sm transition-colors duration-fast cursor-pointer
                    ${selected ? 'bg-gray-100 ring-1' : 'hover:bg-gray-50'}`}
                  style={selected ? { '--tw-ring-color': color, borderColor: color } : undefined}
                >
                  <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ background: color }} />
                  <span className={`flex-1 text-left ${selected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>{cat}</span>
                  <span className="tabular-nums text-gray-500">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="text-caption text-gray-400 tracking-wide mt-component-md mb-2">動作對象</div>
          <div className="space-y-1.5">
            {targetTypes.length === 0 && (
              <div className="text-caption text-gray-400">無資料</div>
            )}
            {targetTypes.slice(0, 8).map(({ targetType, count }) => (
              <div key={targetType} className="flex items-center text-body-sm">
                <span className="w-2.5 h-2.5 rounded-sm mr-2 bg-trust-blue-500" />
                <span className="flex-1 text-gray-700 truncate">{targetTypeLabel(targetType)}</span>
                <span className="tabular-nums text-gray-500">{count}</span>
              </div>
            ))}
          </div>

          <div className="text-caption text-gray-400 tracking-wide mt-component-md mb-2">成員</div>
          <div className="space-y-1">
            {members
              .map(m => ({ ...m, count: filteredEvents.filter(e => e.actorName === m.username).length }))
              .sort((a, b) => {
                if (a.role !== b.role) {
                  const rank = { student: 0, teacher: 1 };
                  return (rank[a.role] ?? 2) - (rank[b.role] ?? 2);
                }
                return b.count - a.count;
              })
              .map(m => {
                const selected = resolvedStudent === m.username;
                const isTeacher = m.role === 'teacher';
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMemberClick(m)}
                    disabled={role !== 'teacher'}
                    className={`w-full flex items-center px-1.5 py-1 rounded-md text-body-sm transition-colors duration-fast
                      ${selected ? 'bg-customgreen/10' : 'hover:bg-gray-50'}
                      ${role !== 'teacher' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[11px] mr-2
                        ${isTeacher ? 'bg-trust-blue-600' : 'bg-customgreen'}`}
                      title={isTeacher ? '教師' : '學生'}
                    >
                      {m.username?.slice(-2) || '—'}
                    </span>
                    <span className="flex-1 text-left text-gray-700 truncate">{m.username}</span>
                    {isTeacher && (
                      <span className="text-[10px] bg-trust-blue-50 text-trust-blue-700 rounded px-1 mr-1.5">師</span>
                    )}
                    <span className="tabular-nums text-gray-500">{m.count}</span>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-component-sm md:p-component-base flex flex-col gap-stack-xs min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-stack-xs">
            <KpiCard
              label="總共做的事"
              value={kpiTotal}
              sub={categoryFilter ? '點一下清除篩選' : (timeRange === 'week' ? '過去 7 天' : timeRange === 'month' ? '過去 30 天' : '全部時間')}
              color="#5BA491"
              clickable={!!categoryFilter}
              active={false}
              onClick={() => setCategoryFilter(null)}
            />
            <KpiCard
              label="有在動的成員"
              value={activeMembers}
              sub="有留下紀錄的人數"
              color="#3B82F6"
            />
            <KpiCard
              label="用 AI 幫忙"
              value={kpiAi}
              sub={kpiTotal > 0 ? `佔 ${Math.round((kpiAi / kpiTotal) * 100)}%` : '—'}
              color="#F97316"
              clickable
              active={categoryFilter === 'AI'}
              onClick={() => toggleCategoryFilter('AI')}
            />
            <KpiCard
              label="跟別人互動"
              value={kpiCollab}
              sub={kpiTotal > 0 ? `佔 ${Math.round((kpiCollab / kpiTotal) * 100)}%` : '—'}
              color="#8B5CF6"
              clickable
              active={categoryFilter === '協作'}
              onClick={() => toggleCategoryFilter('協作')}
            />
          </div>

          {categoryFilter && (
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-component-sm py-1.5 text-body-sm">
              <span className="text-gray-500 text-[11px]">只看</span>
              <span
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
                style={{ background: (CAT_COLOR[categoryFilter] || '#9CA3AF') + '22', color: CAT_COLOR[categoryFilter] || '#374151' }}
              >
                <span className="w-2 h-2 rounded-sm" style={{ background: CAT_COLOR[categoryFilter] || '#9CA3AF' }} />
                {categoryFilter}
              </span>
              <span className="text-gray-500 text-[11px]">類活動（{scopedEvents.length} 筆）</span>
              <span className="flex-1" />
              <button
                onClick={() => setCategoryFilter(null)}
                className="inline-flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-3 h-3" /> 取消
              </button>
            </div>
          )}

          {/* 合併：Tab 切換 A/B */}
          <div className="bg-white rounded-xl border border-gray-200 p-component-base flex-1 flex flex-col min-h-0">
            {/* Tab 列 */}
            <div className="flex flex-wrap items-center gap-stack-xs mb-3 border-b border-gray-100 pb-3">
              <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartMode('radial')}
                  className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors duration-fast
                    ${chartMode === 'radial'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                  aria-pressed={chartMode === 'radial'}
                >
                  A · 活動比例
                </button>
                <button
                  onClick={() => setChartMode('flow')}
                  className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors duration-fast
                    ${chartMode === 'flow'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                  aria-pressed={chartMode === 'flow'}
                >
                  B · 先後順序
                </button>
              </div>
              <span className="flex-1" />
              {chartMode === 'flow' && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-400 mr-1">視窗</span>
                  {[
                    { key: 10, label: '10 分' },
                    { key: 30, label: '30 分' },
                    { key: 120, label: '2 小時' },
                    { key: 'day', label: '同日' },
                  ].map(w => (
                    <button
                      key={w.key}
                      onClick={() => setFlowWindow(w.key)}
                      className={`px-2 py-1 text-[11px] rounded-md border transition-colors duration-fast
                        ${flowWindow === w.key
                          ? 'bg-trust-blue-600 text-white border-trust-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 圖標題 + 說明 */}
            <div className="flex flex-wrap items-center mb-2 gap-2">
              <span className="text-body-sm font-semibold text-gray-800">
                {chartMode === 'radial'
                  ? (level === 'group' ? '每個人都把時間花在哪些活動' : '你把時間花在哪些活動')
                  : '做完一件事之後，通常接著做什麼'}
              </span>
              <span className="text-[11px] text-gray-500 ml-1 hidden md:inline">
                {chartMode === 'radial'
                  ? '（內圈是主要分類，外圈是細項；區塊越大 = 做得越多）'
                  : '（彩帶越粗 = 這種先後組合越常出現；繞回自己代表連續做同類的事）'}
              </span>
              <span className="flex-1" />
              <span className="text-[11px] text-gray-400 hidden lg:inline">把滑鼠移過去看詳細數字</span>
            </div>

            {/* 圖本體 */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              {loading ? (
                <SkeletonGraph />
              ) : chartMode === 'radial' ? (
                <RadialSunburst
                  events={scopedEvents}
                  level={level}
                  actorName={resolvedStudent}
                  centerLabel={level === 'group' ? (project?.name || '—') : resolvedStudent}
                />
              ) : (
                <TemporalSankey
                  events={scopedEvents}
                  timeWindow={flowWindow}
                />
              )}
            </div>
          </div>
        </main>

        {/* Right: event feed — lg 以上並排；以下時變成右側抽屜 */}
        <aside className={`
          bg-white border-l border-gray-200 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200
          transition-transform duration-normal
          ${mobileFeedOpen
            ? 'absolute inset-y-0 right-0 z-30 w-[300px] max-w-[85%] shadow-2xl translate-x-0'
            : 'absolute inset-y-0 right-0 z-30 w-[300px] max-w-[85%] translate-x-full'}
          lg:static lg:translate-x-0 lg:shadow-none lg:z-0 lg:w-[260px] lg:flex-shrink-0
        `}>
          <div className="px-component-base py-component-sm border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center justify-between">
            <div className="text-body-sm font-semibold text-gray-800">
              最新做的事
              <span className="ml-1.5 text-caption font-normal text-gray-400">共 {scopedEvents.length} 筆</span>
            </div>
            <button onClick={() => setMobileFeedOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-100">
              <FiX className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {scopedEvents.slice(0, 30).map((l) => {
            const meta = getActionMeta(l.action);
            const color = CAT_COLOR[meta.cat] || CAT_COLOR['其他'];
            return (
              <div key={l.id} className="px-component-base py-component-xs border-b border-gray-50 text-caption">
                <div className="flex items-center mb-1">
                  <span className="w-2 h-2 rounded-full mr-2" style={{ background: color }} />
                  <span className="font-medium text-gray-800">{meta.short}</span>
                  <span className="flex-1" />
                  <span className="tabular-nums text-gray-400 text-[10px]">{fmtDate(l.timestamp)}</span>
                </div>
                <div className="text-gray-500 pl-4">
                  {l.actorName || '—'}
                  {l.conceptLabel && <span>　·　{l.conceptLabel}</span>}
                  {!l.conceptLabel && l.targetType && <span>　·　{l.targetType}</span>}
                </div>
              </div>
            );
          })}
          {!loading && scopedEvents.length === 0 && (
            <div className="px-component-base py-component-md text-caption text-gray-400 text-center">
              此範圍內無事件
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
