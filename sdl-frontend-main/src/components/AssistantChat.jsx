import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getGuidance } from '../api/assistant';
import { getKanbanColumns } from '../api/kanban';
import { socket } from '../utils/socket';

export default function AssistantChat({ projectId, currentStage, currentSubStage, autoGreet = true, embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastData, setLastData] = useState(null); // store suggestions, tasks, citations
  const greetedRef = useRef(false);
  const inputRef = useRef(null);

  const handleFormSubmit = (e) => {
    try { e?.preventDefault?.(); } catch {}
    send();
  };

  const stageKey = useMemo(() => `${currentStage || ''}-${currentSubStage || ''}`, [currentStage, currentSubStage]);

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
        const data = await getGuidance({ projectId, currentStage, currentSubStage, useLLM: true, provider: 'gemini' });
        setLastData(data);
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, followup: data.followup }]);
      } catch (e) {
        // noop
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [autoGreet, projectId, currentStage, currentSubStage, stageKey]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    // 維持焦點，避免看起來像「打完一個字就停住」
    try { inputRef.current?.focus(); } catch {}
    try {
      setIsSubmitting(true);
      const data = await getGuidance({ projectId, currentStage, currentSubStage, userMessage: text, useLLM: true, provider: 'gemini' });
      setLastData(data);
      const payload = [data.message];
      if (data.followup?.questions?.length) {
        payload.push(data.followup.message);
        payload.push(...data.followup.questions.map((q, i) => `${i + 1}. ${q}`));
      }
      setMessages(prev => [...prev, { role: 'assistant', content: payload.join('\n') }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我暫時無法回覆，稍後再試試看。' }]);
    } finally {
      setIsSubmitting(false);
    }
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
      const username = localStorage.getItem('username') || '未知';
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
      <div className={`p-3 space-y-2 ${embedded ? 'flex-1 min-h-0' : 'h-64'} overflow-y-auto`}>
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
        {isSubmitting && <div className="text-xs text-gray-400">正在思考…</div>}
        {/* Citations */}
        {lastData?.citations?.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-gray-500">引用片段</div>
            {lastData.citations.map((c, i) => (
              <div key={i} className="text-xs p-2 bg-white border rounded">
                <div className="font-medium text-gray-700">{c.title}</div>
                <div className="text-gray-600 whitespace-pre-wrap break-words">{c.quote}</div>
              </div>
            ))}
          </div>
        )}
        {/* One-click tasks */}
        {(lastData?.suggestedTasks?.length > 0 || lastData?.suggestions?.length > 0) && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-gray-500">快速建立任務卡</div>
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
      <form onSubmit={handleFormSubmit} className="p-2 border-t flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="問我下一步怎麼做…"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus={embedded}
        />
        <button
          className="px-3 py-1 bg-teal-600 text-white text-sm rounded disabled:opacity-50"
          type="submit"
          disabled={isSubmitting}
        >{isSubmitting ? '送出中...' : '送出'}</button>
      </form>
    </Container>
  );
}
