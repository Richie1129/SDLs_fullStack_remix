import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiSend, FiCpu, FiBookOpen, FiTrash2 } from 'react-icons/fi';
import { askSdlCoach, stageNumberToLabel } from '../api/sdlCoach';
import { createChatTurn, completeChatTurn, getChatHistory, deleteChatSession } from '../api/assistant';
import { useUsername } from '../hooks/useUserInfo';
import { getCurrentUserId } from '../utils/authUtils';
import MessageContent from './MessageContent';

const SDL_COACH_USERNAME = '自主學習助手';

const STAGE_HINT = {
  1: '定標：把興趣轉成可研究的問題',
  2: '擇策：規劃方法、變數與資料記錄方式',
  3: '監評：執行嘗試性研究、分析與初步結論',
  4: '調節：依結果修正方向、深化討論與結論',
};

const QUICK_PROMPTS_BY_STAGE = {
  1: [
    '我有興趣的方向但不知道從哪裡縮小範圍，可以怎麼做？',
    '怎麼判斷我的研究問題是否夠具體？',
  ],
  2: [
    '我要怎麼挑選適合的研究方法？',
    '幫我想想我的研究設計可能會漏掉哪些變數。',
  ],
  3: [
    '我嘗試性研究遇到瓶頸，下一步可以怎麼想？',
    '我的數據看不出來規律，可以怎麼分析？',
  ],
  4: [
    '我要如何判斷是否需要修正研究方向？',
    '怎麼讓我的結論更有說服力？',
  ],
};

const DEFAULT_PROMPTS = [
  '我現在卡住了，不知道下一步要做什麼。',
  '可以幫我釐清「現象」「問題」與「研究目的」的差別嗎？',
];

const formatTimestamp = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  if (isYesterday) return `昨天 ${hh}:${mm}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};

export default function SdlCoachChat({
  projectId,
  currentStage,
  embedded = false,
}) {
  const currentUsername = useUsername();
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [provider, setProvider] = useState(null);

  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const sessionId = projectId ? `sdl-coach-${projectId}` : null;
  const stageLabel = stageNumberToLabel(currentStage);
  const stageHint = STAGE_HINT[currentStage];
  const quickPrompts = QUICK_PROMPTS_BY_STAGE[currentStage] || DEFAULT_PROMPTS;

  const loadHistory = useCallback(async () => {
    if (!projectId || !sessionId) return;
    setIsLoadingHistory(true);
    try {
      const turns = await getChatHistory({ projectId, sessionId });
      const flat = [];
      for (const t of (turns || [])) {
        const ts = t.createdAt || t.updatedAt || null;
        if (t.userContent) flat.push({ role: 'user', content: t.userContent, createdAt: ts });
        if (t.assistantContent) flat.push({ role: 'assistant', content: t.assistantContent, createdAt: ts });
      }
      setHistory(flat);
    } catch (_) {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const scrollToBottom = (smooth = false) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(false), 60);
    return () => clearTimeout(timer);
  }, [history.length, messages.length, isSubmitting]);

  const handleClearHistory = async () => {
    if (!projectId || !sessionId) return;
    if (history.length === 0 && messages.length === 0) return;
    if (!window.confirm('確定要清空與自主學習助手的所有歷史紀錄嗎？此動作無法復原。')) return;
    setIsClearing(true);
    try {
      await deleteChatSession({ projectId, sessionId });
      setHistory([]);
      setMessages([]);
      setProvider(null);
    } catch (_) {
      window.alert('清空失敗，請稍後再試。');
    } finally {
      setIsClearing(false);
    }
  };

  const sendQuestion = async (questionText) => {
    const text = (questionText || '').trim();
    if (!text || isSubmitting || !projectId) return;
    const userTs = new Date().toISOString();
    setMessages((prev) => [...prev, { role: 'user', content: text, createdAt: userTs }]);
    if (inputRef.current) inputRef.current.value = '';
    setIsSubmitting(true);

    let turnId = null;
    try {
      try {
        const userId = getCurrentUserId();
        const username = currentUsername || '未知';
        const created = await createChatTurn({
          projectId,
          body: {
            userId,
            username,
            userContent: text,
            sessionId,
            assistantUsername: SDL_COACH_USERNAME,
          },
        });
        turnId = created?.id || null;
      } catch (_) { /* 寫歷史失敗不阻斷對話 */ }

      const data = await askSdlCoach({ question: text, currentStage, projectId, sessionId });

      let answer;
      if (data?.success) {
        setProvider(data.provider || null);
        answer = data.answer || '（自主學習助手沒有回覆內容）';
      } else {
        answer = data?.message || '自主學習助手暫時無法回覆，請稍後再試。';
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, createdAt: new Date().toISOString() }]);

      try {
        if (turnId) {
          await completeChatTurn({
            projectId,
            id: turnId,
            assistantContent: answer,
            assistantUsername: SDL_COACH_USERNAME,
          });
        } else {
          await createChatTurn({
            projectId,
            body: {
              assistantContent: answer,
              assistantUsername: SDL_COACH_USERNAME,
              sessionId,
            },
          });
        }
      } catch (_) { /* 寫歷史失敗不阻斷對話 */ }
    } catch (err) {
      const fallback = err?.response?.data?.message || '連線失敗，請稍後再試。';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback, createdAt: new Date().toISOString() }]);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    sendQuestion(inputRef.current?.value || '');
  };

  const totalCount = history.length + messages.length;
  const hasAnyContent = totalCount > 0;
  const showWelcome = !hasAnyContent && !isLoadingHistory;
  const hasHistory = history.length > 0;
  // 有歷史但本次尚未發問時，分隔線後仍顯示快捷問題，讓學生每次回到對話都能直接起頭
  const showQuickPromptsAfterDivider = hasHistory && messages.length === 0 && !isSubmitting && !isLoadingHistory;

  const quickPromptsList = (
    <div className="space-y-1.5">
      {quickPrompts.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => sendQuestion(q)}
          disabled={isSubmitting}
          className="block w-full text-left text-caption px-component-sm py-1.5 rounded-md bg-customgreen/10 hover:bg-customgreen/20 text-gray-700 border border-customgreen/20 transition-colors duration-fast disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );

  const renderBubble = (m, idx, keyPrefix) => (
    <div key={`${keyPrefix}-${idx}`} className={`flex flex-col ${m.role === 'assistant' ? 'items-start' : 'items-end'}`}>
      <div
        className={
          m.role === 'assistant'
            ? 'max-w-[90%] md:max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-component-sm py-component-sm shadow-sm'
            : 'max-w-[85%] md:max-w-[75%] bg-customgreen text-white rounded-2xl rounded-tr-sm px-component-sm py-component-sm shadow-sm'
        }
      >
        {m.role === 'assistant' ? (
          <MessageContent content={m.content} />
        ) : (
          <span className="text-body-sm whitespace-pre-wrap">{m.content}</span>
        )}
      </div>
      {m.createdAt && (
        <span className={`text-caption text-gray-400 mt-0.5 px-1 ${m.role === 'assistant' ? 'text-left' : 'text-right'}`}>
          {formatTimestamp(m.createdAt)}
        </span>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full min-h-0 ${embedded ? '' : 'border border-gray-200 rounded-lg bg-white'}`}>
      {/* 標題列 */}
      <div className="px-component-base py-component-sm border-b border-gray-200 bg-customgreen/5 flex items-center justify-between gap-stack-xs">
        <div className="flex items-center gap-stack-xs min-w-0">
          <FiBookOpen className="w-4 h-4 text-customgreen shrink-0" />
          <span className="text-body-sm font-semibold text-customgreen truncate">自主學習助手</span>
          {stageLabel && (
            <span className="text-caption px-2 py-0.5 rounded-full bg-white/80 text-customgreen border border-customgreen/30 shrink-0 hidden sm:inline">
              {stageLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-stack-xs shrink-0">
          {provider && (
            <span className="text-caption text-gray-500 hidden lg:inline">{provider}</span>
          )}
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={!hasAnyContent || isClearing || isSubmitting}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:text-red-500 hover:bg-white transition-colors duration-fast disabled:opacity-30 disabled:cursor-not-allowed"
            title="清空歷史紀錄"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 訊息區 */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-component-base py-component-sm space-y-stack-sm bg-gray-50">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-component-sm text-caption text-gray-400">
            載入歷史紀錄中…
          </div>
        )}

        {showWelcome && (
          <div className="rounded-xl border border-customgreen/30 bg-white p-component-base">
            <div className="flex items-start gap-stack-xs">
              <FiCpu className="w-4 h-4 text-customgreen mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-body-sm font-semibold text-gray-800 mb-1">
                  你好，我是你的自主學習助手。
                </p>
                <p className="text-caption text-gray-600 leading-relaxed">
                  我會用「探究與實作」的階段思維陪你想下一步——而不是直接給你答案。
                  {stageHint && <span className="block mt-1 text-customgreen font-medium">{stageHint}</span>}
                </p>
                <div className="mt-3">
                  {quickPromptsList}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 歷史紀錄 */}
        {history.map((m, idx) => renderBubble(m, idx, 'h'))}

        {/* 新對話分隔線 */}
        {hasHistory && (
          <div className="flex items-center gap-stack-xs py-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-caption text-gray-400 px-2">本次新對話</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* 分隔線後的快捷問題：有歷史但本次尚未發問時顯示，讓學生每次回來都能直接起頭 */}
        {showQuickPromptsAfterDivider && (
          <div className="rounded-xl border border-customgreen/30 bg-white p-component-base">
            <div className="flex items-start gap-stack-xs">
              <FiCpu className="w-4 h-4 text-customgreen mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-caption text-gray-600 leading-relaxed mb-stack-xs">
                  想聊點別的？可以從這裡起頭：
                  {stageHint && <span className="block mt-1 text-customgreen font-medium">{stageHint}</span>}
                </p>
                {quickPromptsList}
              </div>
            </div>
          </div>
        )}

        {/* 本次新訊息 */}
        {messages.map((m, idx) => renderBubble(m, idx, 'm'))}

        {isSubmitting && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-component-sm py-component-sm text-caption text-gray-500 shadow-sm">
              自主學習助手正在思考…
            </div>
          </div>
        )}
      </div>

      {/* 輸入區 */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white px-component-sm py-component-sm">
        <div className="flex items-end gap-stack-xs">
          <input
            ref={inputRef}
            type="text"
            placeholder="把你目前的想法或卡關的地方告訴我…"
            className="flex-1 border border-gray-300 rounded-lg px-component-sm py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-customgreen/40 focus:border-customgreen transition-colors duration-fast"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-component-sm py-2 bg-customgreen text-white rounded-lg text-body-sm font-semibold hover:bg-customgreen/90 hover:shadow-lg transition-all duration-fast disabled:opacity-50 flex items-center gap-1"
          >
            <FiSend className="w-3.5 h-3.5" />
            送出
          </button>
        </div>
        <p className="text-caption text-gray-400 mt-1.5 leading-tight">
          自主學習助手不會直接幫你寫題目或報告，會用提問引導你自己想出答案。
        </p>
      </form>
    </div>
  );
}
