import React, { useEffect, useState } from 'react';
import { getAuditEvents } from '@/api/audit.js';
import { formatTime } from '@/utils/timeUtils.js';

const AIAnalysisHistoryPanel = ({ targetId, title: currentTitle }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!targetId) return;
      try {
        setLoading(true);
        const events = await getAuditEvents({
          targetType: 'daily_personal',
          targetId,
          action: 'DAILY_PERSONAL_5RS_AI_ANALYSIS',
          limit: 50,
        });
        if (!ignore) setItems(events || []);
      } catch (_) {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, [targetId]);

  if (!targetId) return null;

  return (
    <div className="mt-2 max-h-[70vh] overflow-auto space-y-3">
      {loading && (
        <div className="text-sm text-gray-500 p-4 bg-white rounded-lg border border-gray-200">載入中…</div>
      )}
      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500 p-6 text-center bg-white rounded-lg border border-gray-200">尚無 AI 分析歷史</div>
      )}
      {!loading && items.map((ev, i) => {
        const md = ev?.metadata || {};
        const input = md.inputData || {}; // 當時提交的 5Rs 內容
        const fb = md.feedback || {}; // AI 分析結果
        const provider = md.provider || '未知模型';
        const ts = md.analysisDate || ev.timestamp;
        const actorName = ev?.actorName || '未知使用者';
        const initial = (actorName || 'U').toString().trim().charAt(0).toUpperCase();

        const score = (k) => (fb?.scores && typeof fb.scores[k] !== 'undefined' ? fb.scores[k] : null);
        const R_KEYS = ['reporting','responding','relating','reasoning','reconstructing'];

        return (
          <div key={ev.id || i} className="p-4 bg-white rounded-lg shadow-sm border-2" style={{ borderColor: '#5BA491' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {initial}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{actorName}</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">AI</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-800">{provider}</span>
                </div>
              </div>
              <span className="text-xs text-gray-500" title={formatTime(ts, 'full')}>
                {formatTime(ts, 'relative')}
              </span>
            </div>

            {/* 標題 */}
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">日誌標題</div>
              <div className="text-sm text-gray-800">{currentTitle || '（無標題）'}</div>
            </div>

            {/* AI 回饋 */}
            <div className="mb-2">
              <div className="text-sm text-gray-600 mb-1">整體分析</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{String(fb?.overall || '') || '—'}</div>
            </div>

            {/* 對應顯示：每個 R 一個小區塊（內容 vs 分析） */}
            <div className="grid grid-cols-1 gap-2">
              {R_KEYS.map(k => (
                (input?.[k] || fb?.[k]) ? (
                  <div key={k} className="text-sm rounded-md border border-gray-200 p-2 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block min-w-[120px] text-gray-700 capitalize">{k}</span>
                      {score(k) != null && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">分數 {score(k)}</span>
                      )}
                    </div>
                    <div className="text-gray-600 mb-0.5">內容:</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{String(input?.[k] || '') || '（空）'}</div>
                    <div className="text-gray-600 mt-1 mb-0.5">分析:</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{String(fb?.[k] || '') || '—'}</div>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AIAnalysisHistoryPanel;
