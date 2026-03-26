import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheckSquare,
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiArrowRight,
  FiZap,
} from 'react-icons/fi';
import { isCompletedStatus } from '../utils/overviewUtils';

/* ─────────────────────────────────────────────
   Rule-based 跨專案可操作建議生成器
   最多輸出 3 條建議，依優先序排序
───────────────────────────────────────────── */
function generateCrossProjectSuggestions({ activeProjects, allReflections, kanbanTasks, aiInteractions }) {
  const now = new Date();
  const suggestions = [];

  activeProjects.forEach((project) => {
    const projectReflections = allReflections.filter(r => r.projectId === project.id);
    const projectTasks = kanbanTasks.filter(t => t.projectId === project.id);
    const pendingTasks = projectTasks.filter(t => !isCompletedStatus(t.columnName));

    // 規則 1（最高優先）：從未反思過的進行中專案
    if (projectReflections.length === 0) {
      suggestions.push({
        id: `no_reflection_${project.id}`,
        priority: 1,
        type: 'warning',
        icon: FiAlertTriangle,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
        title: `「${project.name}」尚未撰寫任何反思`,
        body: '定期反思是 SDL 學習的核心。建議本週在此專案中記錄你的學習心得，即使是幾行簡短筆記也很有價值。',
        projectId: project.id,
        actionLabel: '前往專案',
        actionPath: `/project/${project.id}/kanban`,
      });
      return; // 同一專案不重複觸發規則 2
    }

    // 規則 2（高優先）：超過 14 天沒有新反思的進行中專案
    const latestReflection = projectReflections.reduce((latest, r) =>
      new Date(r.createdAt) > new Date(latest.createdAt) ? r : latest
    );
    const daysSinceReflection = (now - new Date(latestReflection.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceReflection >= 14) {
      const weeksAgo = Math.floor(daysSinceReflection / 7);
      suggestions.push({
        id: `stale_reflection_${project.id}`,
        priority: 2,
        type: 'warning',
        icon: FiAlertTriangle,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
        title: `「${project.name}」已 ${weeksAgo} 週未撰寫反思`,
        body: '持續記錄學習歷程能幫助你發現成長軌跡。建議本週撥出時間，用 5Rs 框架回顧最近的學習。',
        projectId: project.id,
        actionLabel: '前往反思',
        actionPath: `/project/${project.id}/kanban`,
      });
    }

    // 規則 3（中優先）：積壓大量未完成任務
    if (pendingTasks.length >= 3) {
      suggestions.push({
        id: `task_backlog_${project.id}`,
        priority: 3,
        type: 'info',
        icon: FiCheckSquare,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
        title: `「${project.name}」有 ${pendingTasks.length} 個任務待完成`,
        body: '任務積壓可能影響專案節奏。建議優先處理最重要的任務，或與隊友重新分配工作。',
        projectId: project.id,
        actionLabel: '查看看板',
        actionPath: `/project/${project.id}/kanban`,
      });
    }
  });

  // 規則 4（低優先）：從未使用 AI 助手（全域）
  if (aiInteractions.length === 0 && activeProjects.length > 0) {
    suggestions.push({
      id: 'no_ai_usage',
      priority: 4,
      type: 'tip',
      icon: FiCpu,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      title: '還沒試過 AI 學習助手',
      body: '研究顯示 AI 輔助能顯著提升學習效率。進入任一專案，試著向 AI 助手提問你目前遇到的研究困難。',
      projectId: activeProjects[0]?.id,
      actionLabel: '試試看',
      actionPath: activeProjects[0] ? `/project/${activeProjects[0].id}/kanban` : null,
    });
  }

  // 依優先序排序，取前 3 條
  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

/* ─────────────────────────────────────────────
   CrossProjectSuggestions 元件
───────────────────────────────────────────── */
const TYPE_STYLES = {
  warning: 'border-l-amber-400',
  info: 'border-l-blue-400',
  tip: 'border-l-purple-400',
};

const CrossProjectSuggestions = ({ activeProjects, allReflections, kanbanTasks, aiInteractions }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const suggestions = useMemo(
    () => generateCrossProjectSuggestions({ activeProjects, allReflections, kanbanTasks, aiInteractions }),
    [activeProjects, allReflections, kanbanTasks, aiInteractions]
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 標題列 */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-component-md py-3 hover:bg-gray-50 transition-colors duration-fast"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
            <FiZap className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-body font-semibold text-gray-800">本週行動建議</span>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-caption font-semibold rounded-full">
            {suggestions.length}
          </span>
        </div>
        {collapsed
          ? <FiChevronDown className="w-4 h-4 text-gray-400" />
          : <FiChevronUp className="w-4 h-4 text-gray-400" />
        }
      </button>

      {/* 建議清單 */}
      {!collapsed && (
        <div className="px-component-md pb-component-sm space-y-stack-sm">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`border-l-4 ${TYPE_STYLES[s.type]} bg-gray-50 rounded-r-lg p-component-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${s.iconBg}`}>
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-gray-800 mb-1">{s.title}</p>
                    <p className="text-caption text-gray-600 leading-relaxed">{s.body}</p>
                    {s.actionPath && (
                      <button
                        onClick={() => navigate(s.actionPath)}
                        className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-teal-600 hover:text-teal-800 transition-colors duration-fast"
                      >
                        {s.actionLabel}
                        <FiArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CrossProjectSuggestions;
