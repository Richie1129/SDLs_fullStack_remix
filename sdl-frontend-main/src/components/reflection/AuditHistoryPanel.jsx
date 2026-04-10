import React, { useEffect, useState } from 'react';
import { getAuditEvents } from '@/api/audit.js';
import { formatTime } from '@/utils/timeUtils.js';
import { formatAuditAction } from '@/utils/auditUtils.js';

const AuditHistoryPanel = ({ targetType, targetId, refreshKey }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!targetType || !targetId) return;
      try {
        setLoading(true);
        const events = await getAuditEvents({ targetType, targetId, limit: 50 });
        if (!ignore) setItems(events || []);
      } catch (_) {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, [targetType, targetId, refreshKey]);

  if (!targetType || !targetId) return null;

  const is5RsLike = (text) => {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase();
    return t.includes('5rs_reflection') || (t.includes('reporting') && t.includes('responding') && t.includes('relating'));
  };

  const truncate = (s, n = 120) => {
    if (!s || typeof s !== 'string') return '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  };

  return (
    <div className="mt-3">
      <div className="mt-2 max-h-[70vh] overflow-auto space-y-3">
        {loading && (<div className="text-body-sm text-gray-500 p-component-base bg-white rounded-lg border border-gray-200">載入中…</div>)}
        {!loading && items.length === 0 && (
          <div className="text-body-sm text-gray-500 p-component-md-lg text-center bg-white rounded-lg border border-gray-200">尚無變更</div>
        )}
        {!loading && items.map((ev, i) => {
          const meta = ev?.metadata || {};
          const diff = meta?.diff || {};
          const titleChanged = !!diff.title;
          const contentChanged = !!diff.content;
          const fileChanged = !!diff.file || /ATTACHMENT/i.test(ev.action || '');

          const beforeTitle = titleChanged ? (diff.title.before?.textPreview ?? diff.title.before ?? '') : '';
          const afterTitle = titleChanged ? (diff.title.after?.textPreview ?? diff.title.after ?? '') : '';

          const beforeContentRaw = contentChanged ? (diff.content.before?.textPreview ?? (typeof diff.content.before === 'string' ? diff.content.before : '')) : '';
          const afterContentRaw = contentChanged ? (diff.content.after?.textPreview ?? (typeof diff.content.after === 'string' ? diff.content.after : '')) : '';

          const show5RsBadge = is5RsLike(beforeContentRaw) || is5RsLike(afterContentRaw);

          let contentLine = '此次未變更';
          if (contentChanged) {
            if (show5RsBadge) {
              contentLine = '5Rs 反思內容已更新';
            } else {
              const beforePreview = truncate(String(beforeContentRaw || ''));
              const afterPreview = truncate(String(afterContentRaw || ''));
              contentLine = (beforePreview || afterPreview)
                ? `${beforePreview || '（略）'} → ${afterPreview || '（略）'}`
                : '已變更';
            }
          }

          let fileLine = null;
          if (fileChanged) {
            const b = (diff.file && diff.file.before) || {};
            const a = (diff.file && diff.file.after) || {};
            const bName = b.name || b.fileName || null;
            const aName = a.name || a.fileName || null;
            fileLine = `附件: ${bName || '（無）'} → ${aName || '（無）'}`;
          }

          // 顯示變更者資訊（actor）
          const actorName = ev?.actorName || '未知使用者';
          const actorInitial = (actorName || 'U').toString().trim().charAt(0).toUpperCase();

          const fiveRs = diff?.fiveRs || null;
          const aiFeedback = ev?.metadata?.feedback || null;
          const aiProvider = ev?.metadata?.provider || null;
          const aiInput = ev?.metadata?.inputData || null;
          const aiTitle = ev?.metadata?.title || null;
          const aiScores = aiFeedback?.scores || {};
          const R_KEYS = ['reporting','responding','relating','reasoning','reconstructing'];

          return (
            <div
              key={ev.id || i}
              className="p-component-base bg-white rounded-lg shadow-sm border-2"
              style={{ borderColor: '#5BA491' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-caption font-medium text-gray-600">
                    {actorInitial}
                  </div>
                  <div className="flex items-center gap-stack-xs">
                    <span className="text-body-sm font-medium text-gray-800">{actorName}</span>
                    <span className="inline-flex items-center px-2 py-0.5 text-caption font-medium rounded-full bg-teal-100 text-teal-800">
                      {formatAuditAction(ev.action)}
                    </span>
                    {show5RsBadge && (
                      <span className="inline-flex items-center px-2 py-0.5 text-caption font-medium rounded-full bg-blue-100 text-blue-800">5Rs</span>
                    )}
                  </div>
                </div>
                <span className="text-caption text-gray-500" title={formatTime(ev.timestamp, 'full')}>
                  {formatTime(ev.timestamp, 'relative')}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-stack-xs">
                <div className="text-body-sm">
                  <span className="text-gray-500 mr-2">標題:</span>
                  {titleChanged ? (
                    <span className="text-gray-800">
                      {truncate(String(beforeTitle || ''), 60) || '（空）'}
                      <span className="mx-1 text-gray-400">→</span>
                      {truncate(String(afterTitle || ''), 60) || '（空）'}
                    </span>
                  ) : (
                    <span className="text-gray-500">此次未變更</span>
                  )}
                </div>

                <div className="text-body-sm">
                  <span className="text-gray-500 mr-2">內容:</span>
                  <span className="text-gray-800">{contentLine}</span>
                </div>

                {/* AI 分析歷史（5Rs） */}
                {ev?.action === 'DAILY_PERSONAL_5RS_AI_ANALYSIS' && (aiFeedback || aiInput) && (
                  <div className="text-body-sm mt-2">
                    <div className="flex items-center gap-stack-xs mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 text-caption font-medium rounded-full bg-purple-100 text-purple-800">AI</span>
                      <span className="text-gray-600">AI 分析結果（{aiProvider || '未知提供者'}）</span>
                    </div>
                    {aiTitle && (
                      <div className="text-gray-800 mb-1">
                        <span className="text-gray-600 mr-2">日誌標題:</span>
                        <span className="whitespace-pre-wrap">{String(aiTitle)}</span>
                      </div>
                    )}
                    {aiFeedback?.overall && (
                      <div className="text-gray-800 mb-2">
                        <span className="text-gray-600 mr-2">整體建議:</span>
                        <span className="whitespace-pre-wrap">{String(aiFeedback.overall)}</span>
                      </div>
                    )}
                    {/* 對應顯示：每個 R 一個小區塊（內容 vs 分析） */}
                    <div className="grid grid-cols-1 gap-stack-xs">
                      {R_KEYS.map((k) => {
                        const inputVal = aiInput?.[k];
                        const fbVal = aiFeedback?.[k];
                        if (!inputVal && !fbVal) return null;
                        const score = typeof aiScores?.[k] !== 'undefined' ? aiScores[k] : null;
                        return (
                          <div key={k} className="rounded-md border border-gray-200 p-component-xs bg-gray-50">
                            <div className="flex items-center gap-stack-xs mb-1">
                              <span className="text-gray-700 font-medium capitalize">{k}</span>
                              {score != null && (
                                <span className="inline-flex items-center px-2 py-0.5 text-caption font-medium rounded-full bg-amber-100 text-amber-800">分數 {score}</span>
                              )}
                            </div>
                            <div className="text-gray-600 mb-0.5">內容:</div>
                            <div className="text-gray-800 whitespace-pre-wrap">{String(inputVal || '') || '（空）'}</div>
                            <div className="text-gray-600 mt-1 mb-0.5">分析:</div>
                            <div className="text-gray-800 whitespace-pre-wrap">{String(fbVal || '') || '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                    {Array.isArray(aiFeedback.suggestions) && aiFeedback.suggestions.length > 0 && (
                      <div className="text-gray-800 mt-1">
                        <span className="text-gray-600 mr-2">建議:</span>
                        <span>{aiFeedback.suggestions.length} 則</span>
                      </div>
                    )}
                  </div>
                )}

                {fiveRs && (
                  <div className="text-body-sm">
                    <span className="text-gray-500 mr-2">5Rs 欄位:</span>
                    <div className="mt-1 grid grid-cols-1 gap-1">
                      {Object.entries(fiveRs).map(([k, v]) => (
                        <div key={k} className="text-gray-800">
                          <span className="inline-block min-w-[120px] text-gray-600">{k}:</span>
                          <span>
                            {String(v?.before ?? '') || '（空）'}
                            <span className="mx-1 text-gray-400">→</span>
                            {String(v?.after ?? '') || '（空）'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fileLine && (
                  <div className="text-caption text-gray-600">{fileLine}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditHistoryPanel;
