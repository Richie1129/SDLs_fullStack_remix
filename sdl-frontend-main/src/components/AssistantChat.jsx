import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getGuidance, createChatTurn, completeChatTurn, getChatHistory } from '../api/assistant';
import { getKanbanColumns } from '../api/kanban';
import { socket } from '../utils/socket';
import { useUsername } from '../hooks/useUserInfo'; // 引入 username hook

export default function AssistantChat({ projectId, currentStage, currentSubStage, autoGreet = true, embedded = false }) {
  const currentUsername = useUsername(); // 取得當前使用者名稱
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastData, setLastData] = useState(null); // store suggestions, tasks
  const [showQuickTasks, setShowQuickTasks] = useState(false);
  const greetedRef = useRef(false);
  const inputRef = useRef(null);
  const lastTurnIdRef = useRef(null);
  const chatContainerRef = useRef(null);

  const handleFormSubmit = (e) => {
    try { e?.preventDefault?.(); } catch {}
    send();
  };

  const stageKey = useMemo(() => `${currentStage || ''}-${currentSubStage || ''}`, [currentStage, currentSubStage]);

  // Load persisted chat history for this project
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      try {
        const history = await getChatHistory({ projectId });
        if (!mounted) return;
        const flattened = [];
        for (const t of (history || [])) {
          if (t.userContent) flattened.push({ role: 'user', content: t.userContent, username: t.username });
          if (t.assistantContent) flattened.push({ role: 'assistant', content: t.assistantContent, username: t.assistantUsername || 'AI 導師' });
        }
        setHistoryMessages(flattened);
        // If there is any history, assume greeting for this phase exists and avoid re-greeting
        if ((history || []).length > 0) {
          greetedRef.current = stageKey;
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [projectId, stageKey]);

  useEffect(() => {
    if (!autoGreet || !projectId) return;
    if (!currentStage || !currentSubStage) return;
    // avoid duplicate greet on same stage
    if (greetedRef.current === stageKey) return;
    greetedRef.current = stageKey;
    (async () => {
      try {
        // 清除上一子階段的建議，避免殘留
        setLastData(null);
        setIsSubmitting(true);
        const MAX_HISTORY = 8;
        const recent = historyMessages.slice(-MAX_HISTORY);
        const data = await getGuidance({ projectId, currentStage, currentSubStage, useLLM: true, provider: 'gemini', history: recent });
        setLastData(data);
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, followup: data.followup }]);
        try { await createChatTurn({ projectId, body: { assistantContent: data.message, assistantUsername: 'AI 導師' } }); } catch (_) {}
      } catch (e) {
        // noop
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [autoGreet, projectId, currentStage, currentSubStage, stageKey]);

  // 改善的滾輪體驗 - 參考 WhatsApp/Telegram 的平滑滾動
  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // 監聽 messages 變化，自動滾輪到底部
  useEffect(() => {
    // 新訊息出現時使用平滑滾動
    const timer = setTimeout(() => scrollToBottom(true), 100);
    return () => clearTimeout(timer);
  }, [messages, isSubmitting]);

  // 監聽任務建議變化，也需要滾動（因為內容高度改變）
  useEffect(() => {
    if (lastData?.suggestedTasks?.length > 0 || lastData?.suggestions?.length > 0) {
      const timer = setTimeout(() => scrollToBottom(true), 200);
      return () => clearTimeout(timer);
    }
  }, [lastData]);

  const send = async () => {
    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    if (inputRef.current) {
      inputRef.current.value = ''; 
    }
    
    try { inputRef.current?.focus(); } catch {}
    // 使用者輸入後立即滾動到輸入位置（無動畫，快速響應）
    scrollToBottom(false);
    try {
      setIsSubmitting(true);
      // create chat turn with user message
      try {
        const userId = parseInt(localStorage.getItem('id')) || null;
        const username = currentUsername || '未知';
        const turn = await createChatTurn({ projectId, body: { userId, username, userContent: text } });
        lastTurnIdRef.current = turn?.id || null;
      } catch (_) {}
      // include recent history (last 7 bubbles) + this user message
      const MAX_HISTORY = 8;
      const baseHistory = [...historyMessages, ...messages].slice(-Math.max(0, MAX_HISTORY - 1));
      const convo = [...baseHistory, { role: 'user', content: text }];
      const data = await getGuidance({ projectId, currentStage, currentSubStage, userMessage: text, useLLM: true, provider: 'gemini', history: convo });
      setLastData(data);
      const payload = [data.message];
      if (data.followup?.questions?.length) {
        payload.push(data.followup.message);
        payload.push(...data.followup.questions.map((q, i) => `${i + 1}. ${q}`));
      }
      const assistantText = payload.join('\n');
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
      // complete the chat turn with assistant reply
      try {
        if (lastTurnIdRef.current) {
          await completeChatTurn({ projectId, id: lastTurnIdRef.current, assistantContent: assistantText, assistantUsername: 'AI 導師' });
          lastTurnIdRef.current = null;
        } else {
          await createChatTurn({ projectId, body: { assistantContent: assistantText, assistantUsername: 'AI 導師' } });
        }
      } catch (_) {}
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我暫時無法回覆，稍後再試試看。' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ThinkingIndicator = () => {
    const [dots, setDots] = useState(0); 
    useEffect(() => {
      const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
      return () => clearInterval(id);
    }, []);
    return (
      <div className="text-xs text-gray-400" aria-live="polite" aria-busy>
        {`正在思考${'.'.repeat(dots)}`}
      </div>
    );
  };


  const Container = ({ children }) => (
    embedded ? (
      <div className="flex flex-col h-full min-h-0">{children}</div>
    ) : (
      <div className="fixed bottom-4 right-4 w-80 bg-white shadow-lg rounded-lg border border-gray-200 flex flex-col overflow-hidden">{children}</div>
    )
  );

  async function handleCreateTaskFromSuggestion(suggest, preferColumnName = '待處理') {
    try {
      const userId = parseInt(localStorage.getItem('id')) || null;
      const username = currentUsername || '未知';
      const kanbanData = await getKanbanColumns(projectId);
      // find column index by name; fallback to first column
      let selectedIdx = 0;
      const idxByName = kanbanData.findIndex(c => c?.name === preferColumnName);
      if (idxByName >= 0) selectedIdx = idxByName;
      const item = {
        title: suggest.title || (typeof suggest === 'string' ? suggest : 'AI 建議任務'),
        content: suggest.content || (typeof suggest === 'string' ? suggest : ''),
        labels: suggest.labels || ['AI導師'],
        assignees: []
      };
      socket.emit('taskItemCreated', {
        selectedcolumn: selectedIdx,
        item,
        kanbanData,
        projectId,
        user: { id: userId, username }
      });
      // UI feedback
      setMessages(prev => [...prev, { role: 'assistant', content: `已建立任務卡「${item.title}」於 ${kanbanData[selectedIdx]?.name || '看板'}。` }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '建立任務卡失敗，請稍後再試。' }]);
    }
  }

  return (
    <Container>
      {!embedded && <div className="px-3 py-2 bg-teal-600 text-white text-sm font-semibold">AI 導師</div>}
      <div className="px-3 py-2 border-b">
        {historyMessages.length > 0 && (
          <button
            className="text-xs text-teal-700 hover:underline"
            onClick={() => setShowHistory(s => !s)}
          >
            {showHistory ? '隱藏之前對話' : `查看之前對話（${historyMessages.length} 則）`}
          </button>
        )}
      </div>
      <div ref={chatContainerRef} className={`p-3 space-y-2 ${embedded ? 'flex-1 min-h-0' : 'h-64'} overflow-y-auto`}>
        {showHistory && historyMessages.length > 0 && (
          <>
            {historyMessages.map((m, idx) => (
              <div key={`h-${idx}`} className={m.role === 'assistant' ? 'text-sm text-gray-800' : 'text-sm text-right'}>
                <div className={m.role === 'assistant' ? 'inline-block px-3 py-2 bg-gray-50 border rounded-lg' : 'inline-block px-3 py-2 bg-gray-200 text-gray-800 rounded-lg'}>
                  {m.content}
                </div>
              </div>
            ))}
            <div className="text-center text-[10px] text-gray-400 my-2">— 以上為過往對話 —</div>
          </>
        )}
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">當你進入新子階段時，我會主動給建議。</div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'assistant' ? 'text-sm text-gray-800' : 'text-sm text-right'}>
            <div className={m.role === 'assistant' ? 'inline-block px-3 py-2 bg-gray-100 rounded-lg' : 'inline-block px-3 py-2 bg-teal-600 text-white rounded-lg'}>
              {m.content}
            </div>
          </div>
        ))}
        {isSubmitting && <ThinkingIndicator />}

        {/* Collapsible quick tasks */}
        {(lastData?.suggestedTasks?.length > 0 || lastData?.suggestions?.length > 0) && (
          <div className="mt-2">
            <button 
              onClick={() => setShowQuickTasks(!showQuickTasks)}
              className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-gray-800 p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
            >
              <span>快速建立任務卡</span>
              <span className={`transform transition-transform ${showQuickTasks ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showQuickTasks && (
              <div className="mt-1 space-y-1">
                {(lastData?.suggestedTasks || []).map((t, i) => (
                  <div key={`t-${i}`} className="flex items-center justify-between gap-2 text-xs p-2 bg-gray-50 border rounded">
                    <div className="truncate"><span className="font-medium">{t.title}</span></div>
                    <button className="px-2 py-1 bg-teal-600 text-white rounded" onClick={() => handleCreateTaskFromSuggestion(t)}>新增</button>
                  </div>
                ))}
                {/* Fallback from suggestions (string) */}
                {(!lastData?.suggestedTasks || lastData?.suggestedTasks?.length === 0) && (lastData?.suggestions || []).map((s, i) => (
                  <div key={`s-${i}`} className="flex items-center justify-between gap-2 text-xs p-2 bg-gray-50 border rounded">
                    <div className="truncate"><span className="font-medium">{typeof s === 'string' ? s.slice(0, 24) : 'AI 建議'}</span></div>
                    <button className="px-2 py-1 bg-teal-600 text-white rounded" onClick={() => handleCreateTaskFromSuggestion({ title: 'AI 建議', content: s })}>新增</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data sources transparency */}
        {(lastData?.dataSources || lastData?.kanbanSnapshot || lastData?.existingTaskTitles) && (
          <div className="mt-2 text-[11px] text-gray-500">
            <span className="font-medium">資料來源：</span>
            {(() => {
              const sources = lastData?.dataSources || [];
              const labels = {
                kanban: '看板卡片',
                ideaWall: '想法牆節點',
                submit: '提交內容',
                rubric: 'Rubric 節選',
                activity: '近期活動'
              };
              const inferred = [];
              if (!sources.length) {
                if (lastData?.kanbanSnapshot) inferred.push('kanban');
                if (lastData?.existingTaskTitles) inferred.push('kanban');
                // No direct idea wall snapshot unless debug enabled
              }
              const merged = Array.from(new Set([...(sources || []), ...inferred]));
              return merged.length ? merged.map((k, i) => (
                <span key={k}>
                  {i > 0 ? '、' : ''}{labels[k] || k}
                </span>
              )) : <span>—</span>;
            })()}
          </div>
        )}
      </div>
      <form onSubmit={handleFormSubmit} className="p-2 border-t">
        <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="問我下一步怎麼做…"
          defaultValue=""
          autoFocus={embedded}
        />
        <button
          className="px-3 py-1 bg-teal-600 text-white text-sm rounded disabled:opacity-50"
          type="submit"
          disabled={isSubmitting}
        >{isSubmitting ? '送出中...' : '送出'}</button>
        </div>
      </form>
    </Container>
  );
}
