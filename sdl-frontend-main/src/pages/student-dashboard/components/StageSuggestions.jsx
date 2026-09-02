import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTarget, FiBookOpen, FiMessageSquare, FiZap, FiCpu, FiCheckSquare, FiChevronDown, FiChevronUp, FiArrowRight, FiX } from 'react-icons/fi';
import LazyFallback from '../../../components/LazyFallback';

// 自主學習助手改為動態載入：學生儀表板首屏不再帶入對話元件，開啟時才下載
const SdlCoachChat = lazy(() => import('../../../components/SdlCoachChat'));

/* ─────────────────────────────────────────────
   Stage / Sub-stage 定義（與 SubStageBar.jsx 保持同步）
   stage 1–4, subStage 1–3
───────────────────────────────────────────── */
const STAGE_META = {
  1: {
    name: '定標', color: 'blue',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400',
    subs: {
      1: { name: '提出研究主題',   focus: '透過文獻回顧識別研究空白，與隊友討論並確定一個具體的研究主題。' },
      2: { name: '提出研究目的',   focus: '細化研究的目標與期望成果，說明理論與實務層面的貢獻。' },
      3: { name: '提出研究問題',   focus: '根據研究目的提出可操作的研究問題，確保問題具有明確性和可研究性。' },
    }
  },
  2: {
    name: '擇策', color: 'teal',
    bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-400',
    subs: {
      1: { name: '訂定研究構想表', focus: '發展研究概念框架，包括研究假設、變數定義和預期的研究模型。' },
      2: { name: '設計研究記錄表格', focus: '設計資料收集表格和記錄表，包括問卷、訪談記錄和實驗資料表。' },
      3: { name: '規劃研究排程',  focus: '制定詳細的研究計畫和時間線，明確各階段的日期和關鍵里程碑。' },
    }
  },
  3: {
    name: '監評', color: 'amber',
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400',
    subs: {
      1: { name: '進行嘗試性研究', focus: '在小範圍實施研究設計，收集初步數據，評估方法和工具的可行性。' },
      2: { name: '分析資料與繪圖', focus: '使用統計方法對資料進行系統性分析，製作圖表直觀展示研究結果。' },
      3: { name: '撰寫研究結果',  focus: '整理分析數據，撰寫報告各部分：引言、方法、結果、討論和結論。' },
    }
  },
  4: {
    name: '調節', color: 'purple',
    bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400',
    subs: {
      1: { name: '檢視研究進度',   focus: '定期回顧研究行程和成果，評估是否需要調整研究方向或方法。' },
      2: { name: '進行研究討論',   focus: '組織研究討論，呈現研究結果，收集並整合回饋意見，深化分析。' },
      3: { name: '撰寫研究結論',  focus: '基於研究結果撰寫結論，明確指出研究的貢獻和後續研究的建議。' },
    }
  }
};

/* ─────────────────────────────────────────────
   Rule-based 建議生成器
   回傳最多 3 條建議（1 條階段焦點 + 最多 2 條個人表現建議）
───────────────────────────────────────────── */
function generateSuggestions(stage, subStage, personalData) {
  const meta  = STAGE_META[stage];
  const sub   = meta?.subs?.[subStage];
  if (!meta || !sub) return [];

  const suggestions = [];

  // ── 固定建議：當前子階段焦點 ──
  suggestions.push({
    id: 'stage_focus',
    icon: <FiTarget className="w-4 h-4 shrink-0" />,
    title: `${meta.name} · ${sub.name}`,
    body: sub.focus,
    type: 'stage',
  });

  if (!personalData) return suggestions;

  const {
    weeklyReflections = 0,
    pendingTasks = 0,
    totalTasks = 0,
    chatMessages = 0,
    aiInteractions = 0,
    ideaNodes = 0,
    lastActivity,
  } = personalData;

  // ── 條件建議（最多再加 2 條，依優先序） ──
  const conditional = [];

  // 1. 本週未反思 → 最重要的 SDL 行為
  if (weeklyReflections === 0) {
    conditional.push({
      id: 'no_reflection',
      icon: <FiBookOpen className="w-4 h-4 shrink-0" />,
      title: '本週尚未撰寫反思',
      body: `在「${sub.name}」階段，定期記錄自己的思考過程非常重要。可以針對本週的進展寫一篇 5Rs 反思，讓 AI 幫你分析學習深度。`,
      type: 'action',
    });
  }

  // 2. 監評/調節階段有大量待辦任務 → 任務推進是重點
  if ((stage === 3 || stage === 4) && pendingTasks >= 2 && totalTasks > 0 && pendingTasks / totalTasks > 0.5) {
    conditional.push({
      id: 'task_backlog',
      icon: <FiCheckSquare className="w-4 h-4 shrink-0" />,
      title: `看板有 ${pendingTasks} 個任務待完成`,
      body: `${stage === 3 ? '監評' : '調節'}階段需要積極推進任務。如果有任務卡住，先在聊天室提問，或向 AI 助手尋求突破方向。`,
      type: 'action',
    });
  }

  // 3. 定標/擇策階段沒有想法節點 → 探索是重點
  if ((stage === 1 || stage === 2) && ideaNodes === 0) {
    conditional.push({
      id: 'no_idea_nodes',
      icon: <FiZap className="w-4 h-4 shrink-0" />,
      title: '想法牆還沒有任何節點',
      body: `「${meta.name}」階段是探索想法的好時機。在想法牆貼出你的研究靈感，與隊友的想法連結，幫助釐清研究方向。`,
      type: 'action',
    });
  }

  // 4. 沒有使用 AI 助手（任何階段都可受益）
  if (aiInteractions === 0) {
    conditional.push({
      id: 'no_ai',
      icon: <FiBookOpen className="w-4 h-4 shrink-0" />,
      title: '還沒向自主學習助手提問',
      body: `自主學習助手會用「探究與實作」階段思維陪你想下一步，不會直接給答案。試著問：「${getAiPromptExample(stage, subStage)}」`,
      type: 'action',
    });
  }

  // 5. 沒有聊天室互動 → 協作是 SDL 的重要元素
  if (chatMessages === 0) {
    conditional.push({
      id: 'no_chat',
      icon: <FiMessageSquare className="w-4 h-4 shrink-0" />,
      title: '還沒有在聊天室與隊友互動',
      body: '主動在聊天室分享你的進度或問題，協作討論能幫助你更快釐清研究方向，也讓隊友知道你的思考。',
      type: 'tip',
    });
  }

  // 取前 2 條條件建議（優先：有明確 action 的）
  const sorted = [
    ...conditional.filter(c => c.type === 'action'),
    ...conditional.filter(c => c.type === 'tip'),
  ];
  suggestions.push(...sorted.slice(0, 2));

  return suggestions;
}

/* 根據 stage/subStage 給出具體的 AI 提問範例 */
function getAiPromptExample(stage, subStage) {
  const examples = {
    '1-1': '我想研究「社群媒體對青少年睡眠的影響」，這個主題範圍是否合適？',
    '1-2': '如何將研究主題轉化為明確的研究目的？',
    '1-3': '幫我把這個研究目的拆解成 2-3 個可操作的研究問題。',
    '2-1': '幫我設計這個研究的概念框架，包括主要變數和假設。',
    '2-2': '幫我設計一份適合這個研究的問卷格式。',
    '2-3': '幫我評估這個研究排程是否合理，有什麼需要調整的？',
    '3-1': '我的嘗試性研究遇到了這個問題，有什麼建議？',
    '3-2': '幫我解釋這份資料應該用什麼統計方法分析。',
    '3-3': '幫我改善這段研究結果的寫法，使其更嚴謹清晰。',
    '4-1': '根據目前的進度，我需要調整研究方向嗎？',
    '4-2': '幫我準備研究討論的重點，預測可能的問題和回應。',
    '4-3': '幫我檢視這份結論是否回應了所有的研究問題。',
  };
  return examples[`${stage}-${subStage}`] || '我目前遇到的問題是...，有什麼建議？';
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const typeStyle = {
  stage:  { badge: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400'   },
  action: { badge: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-400'   },
  tip:    { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400'   },
};

const ACTION_ROUTES = {
  no_reflection: (projectId) => `/project/${projectId}/reflection`,
  task_backlog:  (projectId) => `/project/${projectId}/kanban`,
  no_idea_nodes: (projectId) => `/project/${projectId}/ideaWall`,
  no_ai:         (projectId) => `/project/${projectId}/assistant`,
  no_chat:       (projectId) => `/project/${projectId}/chat`,
};

const StageSuggestions = ({ personalData, projectId }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  const stage    = personalData?.currentStage    || 0;
  const subStage = personalData?.currentSubStage || 0;
  const meta     = STAGE_META[stage];

  const suggestions = useMemo(
    () => generateSuggestions(stage, subStage, personalData),
    [stage, subStage, personalData]
  );

  if (!meta || suggestions.length === 0) return null;

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-component-base py-3 gap-stack-xs">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
          onClick={() => setCollapsed(v => !v)}
        >
          <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
          <span className={`text-body-sm font-semibold ${meta.text} shrink-0 whitespace-nowrap`}>
            本週學習建議
          </span>
          <span className={`text-caption px-2 py-0.5 rounded-full font-medium bg-white/60 ${meta.text} truncate min-w-0`}>
            {meta.name} · {meta.subs[subStage]?.name || `子階段 ${subStage}`}
          </span>
        </div>
        <div className="flex items-center gap-stack-xs shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCoachOpen(true); }}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 border ${meta.border} ${meta.text} hover:bg-white transition-all duration-fast`}
            title="向自主學習助手提問"
          >
            <FiBookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            className={`p-1 ${meta.text}`}
            aria-label={collapsed ? '展開' : '收合'}
          >
            {collapsed
              ? <FiChevronDown className="w-4 h-4" />
              : <FiChevronUp   className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SDL Coach modal */}
      {coachOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/40 flex items-end sm:items-center justify-center p-component-sm sm:p-component-md"
          onClick={() => setCoachOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl h-[80vh] sm:h-[70vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-component-base py-component-sm border-b border-gray-200 bg-customgreen/5">
              <div className="flex items-center gap-stack-xs">
                <FiBookOpen className="w-4 h-4 text-customgreen" />
                <span className="text-body-base font-semibold text-customgreen">自主學習助手</span>
                <span className="text-caption text-gray-500 hidden sm:inline">
                  {meta.name} · {meta.subs[subStage]?.name || `子階段 ${subStage}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCoachOpen(false)}
                className="p-1.5 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-fast"
                aria-label="關閉"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<LazyFallback label="載入自主學習助手…" className="h-full" />}>
                <SdlCoachChat
                  embedded
                  projectId={projectId}
                  currentStage={stage}
                  currentSubStage={subStage}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions list */}
      {!collapsed && (
        <div className="px-component-base pb-4 space-y-3 border-t border-white/60">
          {suggestions.map((s, i) => (
            <div key={s.id} className="flex gap-3 pt-3">
              {/* Number + icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                ${i === 0 ? `${meta.bg} ${meta.text} border ${meta.border}` : 'bg-white/70 text-gray-500'}`}>
                {i === 0
                  ? <span className={`text-caption font-bold ${meta.text}`}>{React.cloneElement(s.icon, { className: 'w-3 h-3' })}</span>
                  : <span className="text-caption font-bold text-gray-500">{i}</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-body-sm font-semibold mb-0.5 ${i === 0 ? meta.text : 'text-gray-800'}`}>
                  {s.title}
                </p>
                <p className="text-caption text-gray-600 leading-relaxed">{s.body}</p>
                {s.type === 'action' && s.id === 'no_ai' && (
                  <button
                    onClick={() => setCoachOpen(true)}
                    className={`mt-1.5 inline-flex items-center gap-1 text-caption font-medium ${meta.text} hover:underline`}
                  >
                    <FiBookOpen className="w-3 h-3" />
                    向自主學習助手提問
                  </button>
                )}
                {s.type === 'action' && s.id !== 'no_ai' && ACTION_ROUTES[s.id] && projectId && (
                  <button
                    onClick={() => navigate(ACTION_ROUTES[s.id](projectId))}
                    className={`mt-1.5 inline-flex items-center gap-1 text-caption font-medium ${meta.text} hover:underline`}
                  >
                    <FiArrowRight className="w-3 h-3" />
                    立即行動
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StageSuggestions;
