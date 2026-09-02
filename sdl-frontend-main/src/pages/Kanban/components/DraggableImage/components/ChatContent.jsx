import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { lazy, Suspense } from 'react';
import LazyFallback from '../../../../../components/LazyFallback';

// 自主學習助手改為動態載入：只有切到「自主學習助手」並按下開始後才下載該 chunk
const SdlCoachChat = lazy(() => import('../../../../../components/SdlCoachChat'));

const ChatContent = ({
  activeTab,
  mentorStarted,
  setMentorStarted,
  isLoadingHistory,
  history,
  chatEndRef,
  isFullscreen,
  screenWidth,
  isMinimized,
  projectId,
  currentStage,
  currentSubStage
}) => {
  // ✅ 移除 RAGFlow 引用標記（##0$$, ##1$$ 等）並清理多餘空格
  const cleanRagflowCitations = (text) => {
    if (!text) return text;
    return text
      .replace(/##\d+\$\$/g, '')   // 移除引用標記
      .replace(/ {2,}/g, ' ')       // 只合併連續的空格（保留換行符）
      .trim();                      // 移除首尾空格
  };

  if (isMinimized) return null;

  return (
    <div
      className={`chat-content flex-1 overflow-y-auto ${
        isFullscreen
          ? (screenWidth < 768 ? 'p-component-base' : 'p-component-md-lg')
          : (screenWidth < 768 ? 'p-component-sm' : 'p-component-md')
      } bg-[#fdfdfd]`}
    >
      {activeTab === 'mentor' ? (
        mentorStarted ? (
          <div className="h-full">
            <Suspense fallback={<LazyFallback label="載入自主學習助手…" className="h-full" />}>
              <SdlCoachChat
                embedded
                projectId={projectId}
                currentStage={currentStage}
                currentSubStage={currentSubStage}
              />
            </Suspense>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className={`bg-white border border-[#e9ecef] rounded-xl ${screenWidth < 768 ? 'p-component-base' : 'p-component-md-lg'} text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] max-w-[520px]`}>
              <div className="text-[15px] font-semibold text-[#343a40] mb-2">啟動前確認</div>
              <div className="text-[13px] text-[#6c757d] mb-4">
                為了避免在科學助手與自主學習助手之間切換時自動觸發推理、耗用 LLM Token，切換到「自主學習助手」後不會自動開始。
                自主學習助手會以「探究與實作」階段思維陪你想下一步，不會直接幫你寫題目或報告。
              </div>
              <button
                className="px-4 py-2 bg-[#5BA491] text-white rounded-lg border-0 cursor-pointer text-body-sm font-semibold shadow-[0_2px_8px_rgba(91,164,145,0.3)] hover:bg-[#4a9076] hover:shadow-lg transition-all duration-fast"
                onClick={() => setMentorStarted(true)}
              >
                開始與自主學習助手對話
              </button>
            </div>
          </div>
        )
      ) : isLoadingHistory ? (
        <div className="flex items-center justify-center h-full text-[#6c757d] text-[14px]">
          <div className="flex items-center gap-stack-xs">
            <div className="w-5 h-5 border-2 border-[#5BA491] border-t-transparent rounded-full animate-spin"></div>
            載入對話歷史...
          </div>
        </div>
      ) : (
        <>
          {history.map((item, index) => (
            <div key={index} className="mb-4">
              {item.question && (
                <div className="flex justify-end mb-2">
                  <div className={`bg-[#5BA491] text-white px-4 py-3 rounded-[18px_18px_4px_18px] ${
                    isFullscreen
                      ? (screenWidth < 768 ? 'max-w-[85%]' : 'max-w-[60%]')
                      : (screenWidth < 768 ? 'max-w-[85%]' : 'max-w-[75%]')
                  } ${screenWidth < 768 ? 'text-[13px]' : 'text-[14px]'} leading-[1.4] shadow-[0_2px_8px_rgba(91,164,145,0.2)]`}>
                    {item.question}
                  </div>
                </div>
              )}
              {item.answer && (
                <div className="flex justify-start mb-2">
                  <div className={`bg-white text-[#495057] px-4 py-3 rounded-[18px_18px_18px_4px] ${
                    isFullscreen
                      ? (screenWidth < 768 ? 'max-w-[90%]' : 'max-w-[70%]')
                      : (screenWidth < 768 ? 'max-w-[90%]' : 'max-w-[85%]')
                  } ${screenWidth < 768 ? 'text-[13px]' : 'text-[14px]'} leading-[1.4] shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-[#e9ecef]`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const { jsx, ...domProps } = props;
                          return match ? (
                            <pre className="bg-[#f8f9fa] p-component-sm rounded-lg my-2 overflow-x-auto border border-[#e9ecef]">
                              <code className="bg-transparent text-[#495057] text-[12px] font-mono" {...domProps}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-[#f1f3f4] text-[#5f6368] px-[6px] py-[2px] rounded text-[12px] font-mono" {...domProps}>
                              {children}
                            </code>
                          );
                        },
                        p: ({ children }) => <p className="m-0 mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="my-2 pl-5">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 pl-5">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        h1: ({ children }) => <h1 className="text-[16px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[15px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[14px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-[#5BA491] pl-4 my-2 italic text-[#6c757d]">{children}</blockquote>,
                        strong: ({ children }) => <strong className="font-semibold text-[#343a40]">{children}</strong>,
                      }}
                    >
                      {cleanRagflowCitations(item.answer)}
                    </ReactMarkdown>

                    {/* ✅ 顯示 RAGFlow 參考文獻 */}
                    {item.reference?.doc_aggs && item.reference.doc_aggs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#e9ecef]">
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-3.5 h-3.5 text-[#5BA491]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                          </svg>
                          <span className="text-[11px] font-semibold text-[#5BA491]">參考文獻</span>
                        </div>
                        <div className="space-y-1">
                          {item.reference.doc_aggs.map((doc, idx) => (
                            <div key={idx} className="text-[11px] text-[#6c757d] flex items-start gap-1.5">
                              <span className="text-[#5BA491] font-medium shrink-0">[{idx + 1}]</span>
                              <span className="flex-1">
                                {doc.doc_name}
                                {doc.count > 1 && (
                                  <span className="ml-1 text-[10px] text-[#adb5bd]">({doc.count} 處引用)</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ✅ 顯示外部連結（Gemini Grounding） */}
                    {item.externalLinks && item.externalLinks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#e9ecef]">
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-3.5 h-3.5 text-[#28a745]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[11px] font-semibold text-[#28a745]">網路延伸閱讀</span>
                        </div>
                        <div className="space-y-1.5">
                          {item.externalLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] flex items-start gap-1.5 group hover:bg-[#f8f9fa] p-1.5 -ml-1.5 rounded transition-colors"
                            >
                              <span className="text-[#28a745] font-medium shrink-0 group-hover:text-[#218838]">[{idx + 1}]</span>
                              <span className="flex-1">
                                <span className="text-[#0056b3] underline group-hover:text-[#004494] break-words">
                                  {link.title}
                                </span>
                              </span>
                              <svg className="w-3 h-3 text-[#6c757d] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </>
      )}
    </div>
  );
};

export default ChatContent;