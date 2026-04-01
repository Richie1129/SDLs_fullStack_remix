/**
 * 個人學習歷程頁面
 *
 * 功能：
 * 1. 載入個人學習資料（自動依 userId 篩選）
 * 2. 選擇 PDF 模板（3 種）
 * 3. 可選觸發 AI 學習敘事生成（Streaming）
 * 4. 匯出前完整度提醒（軟提醒）
 * 5. 匯出 PDF（瀏覽器原生列印，保留文字層與完整排版）
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import './StudentPortfolio.print.css';
import { useParams, useNavigate } from 'react-router-dom';
import { FiDownload, FiZap, FiStopCircle, FiRefreshCw, FiFileText, FiInfo, FiMessageSquare, FiChevronDown, FiChevronUp, FiLayers, FiCheck, FiX } from 'react-icons/fi';
import Lottie from 'lottie-react';
import PortfolioIcon from '../../assets/AnimationProtfoliio.json';
import Loader from '../../components/Loader';

import { useStudentPortfolio } from './hooks/useStudentPortfolio';
import TemplateSelector from './components/TemplateSelector';
import PreExportReminder from './components/PreExportReminder';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import TimelineTemplate from './templates/TimelineTemplate';

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  timeline: TimelineTemplate
};

export default function StudentPortfolio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showReminder, setShowReminder] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showWritingTips, setShowWritingTips] = useState(false);
  const [suggestionStates, setSuggestionStates] = useState({});

  const {
    portfolioData,
    isLoading,
    isError,
    narrative,
    setNarrative,
    isGenerating,
    generateError,
    startGenerate,
    stopGenerate,
    clearNarrative,
    organized,
    isOrganizing,
    organizeError,
    startOrganize,
    stopOrganize,
    acceptOrganized,
    clearOrganized,
    feedback,
    isFeedbackGenerating,
    feedbackError,
    startFeedback,
    stopFeedback,
    clearFeedback,
    draftSavedAt,
    isSavingDraft
  } = useStudentPortfolio(projectId);

  const TemplateComponent = TEMPLATE_MAP[selectedTemplate];

  /**
   * 將 organized 文字拆成 segments（'text' | 'addition'）
   * 串流進行中回傳 null，完成後才解析
   */
  const organizedSegments = useMemo(() => {
    if (!organized || isOrganizing) return null;
    return organized
      .split(/(\[A\+\][\s\S]*?\[\/A\+\])/)
      .filter(p => p.length > 0)
      .map((part, idx) => {
        const match = part.match(/^\[A\+\]([\s\S]*?)\[\/A\+\]$/);
        if (match) return { id: idx, type: 'addition', content: match[1] };
        return { id: idx, type: 'text', content: part };
      });
  }, [organized, isOrganizing]);

  /** segments 改變時重置所有 addition 為未選取 */
  useEffect(() => {
    if (!organizedSegments) { setSuggestionStates({}); return; }
    const init = {};
    organizedSegments.forEach(s => { if (s.type === 'addition') init[s.id] = false; });
    setSuggestionStates(init);
  }, [organizedSegments]);

  const toggleSuggestion = (id) =>
    setSuggestionStates(prev => ({ ...prev, [id]: !prev[id] }));

  const selectAllSuggestions = () => {
    if (!organizedSegments) return;
    const all = {};
    organizedSegments.forEach(s => { if (s.type === 'addition') all[s.id] = true; });
    setSuggestionStates(all);
  };

  /** 依目前選取狀態組出最終文字 */
  const buildAcceptedText = () => {
    if (!organizedSegments) return '';
    return organizedSegments
      .map(s => s.type === 'text' ? s.content : (suggestionStates[s.id] ? s.content : ''))
      .join('');
  };

  const additionCount = organizedSegments?.filter(s => s.type === 'addition').length ?? 0;
  const acceptedCount = organizedSegments?.filter(s => s.type === 'addition' && suggestionStates[s.id]).length ?? 0;

  let draftSavedLabel = null;
  if (draftSavedAt) {
    const timeStr = draftSavedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    const isToday = draftSavedAt.toDateString() === new Date().toDateString();
    const dateStr = isToday ? '' : draftSavedAt.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) + ' ';
    draftSavedLabel = `已自動儲存（${dateStr}${timeStr}）`;
  }

  const handleExportClick = () => {
    if (!portfolioData) return;
    const { completeness } = portfolioData;
    if (completeness.needsReminder) {
      setShowReminder(true);
    } else {
      doExport();
    }
  };

  const doExport = () => {
    if (!portfolioData || isExporting) return;
    setIsExporting(true);

    // 建立隱藏 iframe，只列印模板內容，不印整頁 UI
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; }
  </style>
</head>
<body>${contentRef.current.outerHTML}</body>
</html>`);
    frameDoc.close();

    const cleanup = () => {
      setIsExporting(false);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };

    iframe.contentWindow.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 30000); // Safari fallback：afterprint 不穩定時自動清除（30 秒後強制釋放）

    // 等字型載入完成後再列印
    iframe.contentWindow.document.fonts.ready.then(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-stack-sm text-gray-500">
        <FiFileText className="w-12 h-12 text-gray-300" />
        <p className="text-body">載入學習歷程資料失敗</p>
        <button
          onClick={() => navigate(-1)}
          className="text-body-sm text-customgreen underline"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 portfolio-page-root">

      {/* 頂部控制列 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm portfolio-no-print">
        <div className="max-w-6xl mx-auto px-component-md py-3 flex items-center justify-between gap-stack-sm flex-wrap">

          {/* 標題 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <Lottie animationData={PortfolioIcon} loop />
            </div>
            <div>
              <div className="text-h3 font-bold text-gray-800">個人學習歷程</div>
              {portfolioData && (
                <div className="text-caption text-gray-500">
                  {portfolioData.student.username} · {portfolioData.project.name}
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕群 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI 生成敘事 */}
            {!narrative && !isGenerating ? (
              <button
                onClick={startGenerate}
                disabled={!portfolioData}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-purple-200 text-purple-700 text-body-sm hover:bg-purple-50 transition-shadow duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiZap className="w-4 h-4" />
                AI 生成學習敘事
              </button>
            ) : isGenerating ? (
              <button
                onClick={stopGenerate}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-red-200 text-red-600 text-body-sm hover:bg-red-50 transition-shadow duration-fast"
              >
                <FiStopCircle className="w-4 h-4" />
                停止生成
              </button>
            ) : (
              <button
                onClick={clearNarrative}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-gray-200 text-gray-500 text-body-sm hover:bg-gray-50 transition-shadow duration-fast"
              >
                <FiRefreshCw className="w-4 h-4" />
                清除敘事
              </button>
            )}

            {/* 匯出 PDF */}
            <button
              onClick={handleExportClick}
              disabled={isExporting || !portfolioData}
              className="flex items-center gap-2 px-btn-x-lg py-btn-y rounded-lg bg-customgreen text-white text-body-sm font-semibold hover:bg-customgreen/90 transition-shadow duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-4 h-4" />
              {isExporting ? '匯出中...' : '匯出 PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="max-w-6xl mx-auto px-component-md py-component-md">

        {/* AI 生成中提示 */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-3 portfolio-no-print">
            <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            <span className="text-body-sm text-purple-700">AI 正在生成學習敘事，生成完成後將自動填入文件...</span>
          </div>
        )}

        {/* AI 生成錯誤 */}
        {generateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-body-sm text-red-600 portfolio-no-print">
            AI 生成失敗：{generateError}
          </div>
        )}

        {/* 模板選擇器 */}
        <div className="bg-white rounded-xl border border-gray-200 p-component-md mb-component-md portfolio-no-print">
          <div className="text-h3 font-semibold text-gray-800 mb-stack-sm">選擇 PDF 模板</div>
          <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
        </div>

        {/* 學習敘事編輯區 */}
        <div className="bg-white rounded-xl border border-gray-200 p-component-md mb-component-md portfolio-no-print">
          <div className="flex items-start justify-between gap-3 mb-stack-sm">
            <div>
              <div className="text-h3 font-semibold text-gray-800">學習敘事</div>
              <div className="text-caption text-gray-500 mt-0.5">
                自行撰寫，或使用「AI 生成學習敘事」產生初稿後再修改
              </div>
            </div>
            {narrative && !isGenerating && (
              isFeedbackGenerating ? (
                <button
                  onClick={stopFeedback}
                  className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-red-200 text-red-600 text-body-sm hover:bg-red-50 transition-shadow duration-fast flex-shrink-0"
                >
                  <FiStopCircle className="w-4 h-4" />
                  停止回饋
                </button>
              ) : (
                <button
                  onClick={() => startFeedback(narrative)}
                  disabled={narrative.trim().length < 30}
                  title={narrative.trim().length < 30 ? '請至少輸入 30 字再請 AI 給回饋' : ''}
                  className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-indigo-200 text-indigo-700 text-body-sm hover:bg-indigo-50 transition-shadow duration-fast flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiMessageSquare className="w-4 h-4" />
                  請 AI 給回饋
                </button>
              )
            )}
          </div>

          {/* 寫作提示（可折疊） */}
          <div className="mb-3 border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowWritingTips(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-body-sm text-gray-600 hover:bg-gray-100 transition-shadow duration-fast"
            >
              <span className="font-medium">不知道怎麼寫？參考以下引導問題</span>
              {showWritingTips
                ? <FiChevronUp className="w-4 h-4 text-gray-400" />
                : <FiChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>
            {showWritingTips && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  '這個研究主題為什麼吸引你？當初是怎麼決定的？',
                  '你在研究過程中遇到最大的困難是什麼？最後如何解決？',
                  '哪個階段讓你印象最深刻，或學到最多？為什麼？',
                  '你的研究方法或思維在過程中有什麼改變？',
                  '如果重來一次，你會想改變哪些做法？',
                  '這次研究讓你對自己或學科有什麼新的認識？',
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-caption text-gray-500">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-customgreen/20 text-customgreen text-[10px] flex items-center justify-center font-semibold mt-0.5">{i + 1}</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI 免責聲明 */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-3">
            <FiInfo className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <span className="text-caption text-amber-700">
              AI 生成內容僅供撰寫參考，建議以自己的語言修改後再使用。此欄位內容將顯示於 PDF 文件中。
            </span>
          </div>

          {/* 可編輯文字框 */}
          <textarea
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            disabled={isGenerating}
            placeholder="依照上方引導問題，撰寫你的學習心路歷程；或點擊「AI 生成學習敘事」產生初稿後再修改..."
            rows={10}
            className="w-full p-3 border border-gray-200 rounded-lg text-body-sm text-gray-700 resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-customgreen/30 focus:border-customgreen disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-wait"
          />
          <div className="mt-1.5 flex items-center justify-between">
            {isGenerating ? (
              <div className="flex items-center gap-2 text-caption text-purple-600">
                <div className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                AI 生成中，完成後即可編輯...
              </div>
            ) : isSavingDraft ? (
              <span className="text-caption text-gray-400">儲存中...</span>
            ) : draftSavedLabel ? (
              <span className="text-caption text-gray-400">{draftSavedLabel}</span>
            ) : (
              <span />
            )}
            <span className={`text-caption ${narrative.trim().length < 30 && narrative.length > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              {narrative.length} 字{narrative.trim().length < 30 && narrative.length > 0 ? '（建議至少 30 字再請 AI 回饋）' : ''}
            </span>
          </div>

          {/* 段落整合按鈕（有內容且非生成中才顯示） */}
          {narrative.trim().length >= 30 && !isGenerating && (
            <div className="mt-3 flex justify-end">
              {isOrganizing ? (
                <button
                  onClick={stopOrganize}
                  className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-red-200 text-red-600 text-body-sm hover:bg-red-50 transition-shadow duration-fast"
                >
                  <FiStopCircle className="w-4 h-4" />
                  停止整合
                </button>
              ) : (
                <button
                  onClick={() => startOrganize(narrative)}
                  className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-teal-200 text-teal-700 text-body-sm hover:bg-teal-50 transition-shadow duration-fast"
                >
                  <FiLayers className="w-4 h-4" />
                  幫我串成文章
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI 段落整合預覽面板 */}
        {(organized || isOrganizing || organizeError) && (
          <div className="bg-white rounded-xl border border-teal-200 p-component-md mb-component-md portfolio-no-print">
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2">
                <FiLayers className="w-4 h-4 text-teal-600" />
                <div className="text-h3 font-semibold text-gray-800">AI 串文建議</div>
                <span className="text-caption text-gray-400">保留你的原字句，僅整合段落結構</span>
              </div>
              {isOrganizing && (
                <div className="flex items-center gap-2 text-caption text-teal-600">
                  <div className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  整合中...
                </div>
              )}
            </div>

            {organizeError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-body-sm text-red-600 mb-3">
                整合失敗：{organizeError}
              </div>
            )}

            {organized && (
              <>
                {/* 串流進行中：顯示原始文字 */}
                {isOrganizing ? (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-body-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                    {organized}
                  </div>
                ) : (
                  <>
                    {/* 圖例 */}
                    <div className="flex items-center gap-2 mb-2 text-caption text-gray-400">
                      <span className="bg-teal-100 text-teal-800 rounded px-1.5 py-0.5">點擊選取</span>
                      <span>= AI 加入的修改；點擊 chip 選取/取消，其餘為你的原文</span>
                    </div>

                    {/* Segment 渲染：原文 + AI 修改 chip */}
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-body-sm text-gray-700 leading-relaxed mb-3">
                      {organizedSegments?.map(seg => {
                        if (seg.type === 'text') {
                          return <span key={seg.id} className="whitespace-pre-wrap">{seg.content}</span>;
                        }
                        const selected = suggestionStates[seg.id];
                        return (
                          <button
                            key={seg.id}
                            onClick={() => toggleSuggestion(seg.id)}
                            title={selected ? '點擊取消選取' : '點擊選取此修改'}
                            className={`inline rounded px-1 py-0.5 mx-0.5 text-body-sm transition-colors duration-fast cursor-pointer border ${
                              selected
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-teal-50 text-teal-700 border-teal-300 border-dashed'
                            }`}
                          >
                            {selected && <FiCheck className="inline w-3 h-3 mr-0.5 mb-0.5" />}
                            {seg.content}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {!isOrganizing && (organized || organizeError) && (
              <div className="flex items-center justify-between">
                <span className="text-caption text-gray-400">
                  {additionCount > 0 && `已選取 ${acceptedCount} / ${additionCount} 處修改`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearOrganized}
                    className="flex items-center gap-1.5 px-btn-x py-btn-y rounded-lg border border-gray-200 text-gray-500 text-body-sm hover:bg-gray-50 transition-shadow duration-fast"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    捨棄
                  </button>
                  {organized && additionCount > 0 && acceptedCount < additionCount && (
                    <button
                      onClick={selectAllSuggestions}
                      className="flex items-center gap-1.5 px-btn-x py-btn-y rounded-lg border border-teal-300 text-teal-700 text-body-sm hover:bg-teal-50 transition-shadow duration-fast"
                    >
                      選取全部
                    </button>
                  )}
                  {organized && (
                    <button
                      onClick={() => acceptOrganized(buildAcceptedText())}
                      disabled={additionCount > 0 && acceptedCount === 0}
                      title={additionCount > 0 && acceptedCount === 0 ? '請先點擊選取至少一處修改' : ''}
                      className="flex items-center gap-1.5 px-btn-x py-btn-y rounded-lg bg-teal-600 text-white text-body-sm font-semibold hover:bg-teal-700 transition-shadow duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiCheck className="w-3.5 h-3.5" />
                      確認採用{acceptedCount > 0 ? `（${acceptedCount} 處）` : ''}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI 回饋面板 */}
        {(feedback || isFeedbackGenerating || feedbackError) && (
          <div className="bg-white rounded-xl border border-indigo-200 p-component-md mb-component-md portfolio-no-print">
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2">
                <FiMessageSquare className="w-4 h-4 text-indigo-600" />
                <div className="text-h3 font-semibold text-gray-800">AI 寫作回饋</div>
              </div>
              <div className="flex items-center gap-2">
                {isFeedbackGenerating && (
                  <div className="flex items-center gap-2 text-caption text-indigo-600">
                    <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    生成中...
                  </div>
                )}
                {!isFeedbackGenerating && (
                  <button
                    onClick={clearFeedback}
                    className="text-caption text-gray-400 hover:text-gray-600 transition-shadow duration-fast"
                  >
                    關閉
                  </button>
                )}
              </div>
            </div>

            {feedbackError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-body-sm text-red-600 mb-3">
                回饋生成失敗：{feedbackError}
              </div>
            )}

            {feedback && (
              <div className="text-body-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {feedback}
              </div>
            )}

            <div className="mt-3 flex items-start gap-1.5 text-caption text-gray-400">
              <FiInfo className="w-3 h-3 mt-0.5 flex-shrink-0" />
              以上為 AI 的參考建議，請依自身判斷決定是否採用
            </div>
          </div>
        )}

        {/* 模板預覽 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-component-md py-3 border-b border-gray-100 flex items-center justify-between portfolio-no-print">
            <span className="text-body-sm text-gray-500">預覽（列印時以 A4 紙張輸出，文字可選取複製）</span>
            <span className="text-caption text-gray-400">
              {{
                classic: '典雅學術版',
                modern: '現代活力版',
                timeline: '時間軸敘事版'
              }[selectedTemplate]}
            </span>
          </div>
          <div className="overflow-auto p-4 bg-gray-100 portfolio-print-frame">
            <div ref={contentRef} style={{ width: '210mm', margin: '0 auto', overflow: 'hidden' }}>
              {portfolioData && (
                <TemplateComponent
                  data={portfolioData}
                  narrative={narrative}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 匯出前提醒 Modal */}
      {showReminder && portfolioData && (
        <PreExportReminder
          completeness={portfolioData.completeness}
          onConfirm={() => { setShowReminder(false); doExport(); }}
          onCancel={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}
