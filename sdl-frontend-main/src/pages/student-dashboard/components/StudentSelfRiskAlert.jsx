import React, { useMemo, useState } from 'react';
import { FiAlertCircle, FiChevronDown, FiChevronUp, FiCheckCircle, FiClock, FiZap, FiBookOpen, FiClipboard } from 'react-icons/fi';

function getDismissKey(projectId) {
  const today = new Date().toDateString();
  return `risk_dismissed_${projectId}_${today}`;
}

/**
 * 學生自我風險提示（柔性版）
 *
 * 從 personalData 推導三種參與度訊號：
 *  1. 長時間無活動（>= 5 天）
 *  2. 本週未撰寫反思（且專案已啟動）
 *  3. 大量任務積壓（pending >= 3 且 pending/total > 60%）
 *
 * 不使用紅色警示，全部以鼓勵性語氣呈現。
 */
const StudentSelfRiskAlert = ({ personalData, projectId }) => {
  const [dismissed, setDismissed] = useState(() => {
    if (!projectId) return false;
    return localStorage.getItem(getDismissKey(projectId)) === '1';
  });
  const [expanded, setExpanded] = useState(true);

  const handleDismiss = () => {
    if (projectId) localStorage.setItem(getDismissKey(projectId), '1');
    setDismissed(true);
  };

  const signals = useMemo(() => {
    if (!personalData) return [];
    const result = [];

    const { lastActivity, weeklyReflections, pendingTasks, totalTasks, currentStage } = personalData;

    // 訊號 1：長時間無活動
    if (lastActivity) {
      const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86_400_000);
      if (daysSince >= 5) {
        result.push({
          id: 'inactive',
          severity: daysSince >= 10 ? 'high' : 'medium',
          icon: <FiClock className="w-4 h-4 shrink-0" />,
          title: `你已 ${daysSince} 天沒有在這個專案留下任何活動紀錄`,
          suggestion: '不論是更新任務、撰寫一篇反思，還是在聊天室分享一個想法，任何小動作都算！需要協助嗎？',
          action: '試試求助隊友或 AI 助手',
        });
      }
    } else if (currentStage >= 1) {
      // 完全沒有 lastActivity 代表從未活動
      result.push({
        id: 'never_active',
        severity: 'medium',
        icon: <FiZap className="w-4 h-4 shrink-0" />,
        title: '還沒在這個專案留下任何活動紀錄',
        suggestion: '可以先從認識專案目標開始，在看板新增一個任務，或在聊天室打個招呼！',
        action: '前往看板開始第一個任務',
      });
    }

    // 訊號 2：本週未反思（且專案已啟動）
    if (currentStage >= 1 && weeklyReflections === 0) {
      result.push({
        id: 'no_reflection',
        severity: 'medium',
        icon: <FiBookOpen className="w-4 h-4 shrink-0" />,
        title: '本週還沒有撰寫學習反思',
        suggestion: '反思不需要很長，幾句話記錄今天的學習心得就很有價值。定期反思有助於鞏固學習成效！',
        action: '前往寫一篇本週反思',
      });
    }

    // 訊號 3：大量任務積壓
    if (pendingTasks >= 3 && totalTasks > 0 && pendingTasks / totalTasks > 0.6) {
      result.push({
        id: 'task_backlog',
        severity: 'medium',
        icon: <FiClipboard className="w-4 h-4 shrink-0" />,
        title: `看板上有 ${pendingTasks} 個任務等待處理`,
        suggestion: '如果有任務卡住了，試著在聊天室提問，或向 AI 助手尋求靈感。不用一個人硬撐！',
        action: '前往看板整理任務',
      });
    }

    return result;
  }, [personalData]);

  // 無訊號或已關閉 → 不渲染
  if (!signals.length || dismissed) return null;

  const hasHigh = signals.some(s => s.severity === 'high');
  const borderColor = hasHigh ? 'border-orange-300' : 'border-amber-200';
  const bgColor = hasHigh ? 'bg-orange-50' : 'bg-amber-50';
  const headerColor = hasHigh ? 'text-orange-700' : 'text-amber-700';
  const iconColor = hasHigh ? 'text-orange-500' : 'text-amber-500';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl overflow-hidden mb-4 sm:mb-6`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-component-base py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <FiAlertCircle className={`w-4 h-4 shrink-0 ${iconColor}`} />
          <span className={`text-body-sm font-semibold ${headerColor}`}>
            學習狀態提醒
          </span>
          <span className={`text-caption px-2 py-0.5 rounded-full font-medium ${hasHigh ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
            {signals.length} 項
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            className={`text-caption ${headerColor} opacity-60 hover:opacity-100 transition-opacity px-2 py-1 rounded`}
            title="關閉提醒"
          >
            今天不看
          </button>
          {expanded ? <FiChevronUp className={`w-4 h-4 ${iconColor}`} /> : <FiChevronDown className={`w-4 h-4 ${iconColor}`} />}
        </div>
      </div>

      {/* Signals */}
      {expanded && (
        <div className="px-component-base pb-3 space-y-2 border-t border-amber-100">
          {signals.map(signal => (
            <div key={signal.id} className="pt-3">
              <div className={`flex items-center gap-1.5 text-body-sm font-medium ${headerColor} mb-1`}>
                <span className={iconColor}>{signal.icon}</span>
                {signal.title}
              </div>
              <p className="text-caption text-gray-600 mb-1.5 leading-relaxed">{signal.suggestion}</p>
              <div className="flex items-center gap-1 text-caption text-teal-600 font-medium">
                <FiCheckCircle className="w-3 h-3 shrink-0" />
                {signal.action}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSelfRiskAlert;
