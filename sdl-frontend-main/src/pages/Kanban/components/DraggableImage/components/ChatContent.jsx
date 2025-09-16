import React from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AssistantChat from '../../../../../components/AssistantChat';

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
  if (isMinimized) return null;

  return (
    <div
      className={`chat-content flex-1 overflow-y-auto ${
        isFullscreen
          ? (screenWidth < 768 ? 'p-4' : 'p-6')
          : (screenWidth < 768 ? 'p-3' : 'p-5')
      } bg-[#fdfdfd]`}
    >
      {activeTab === 'mentor' ? (
        mentorStarted ? (
          <div className="h-full">
            <AssistantChat
              embedded
              projectId={projectId}
              currentStage={currentStage}
              currentSubStage={currentSubStage}
              autoGreet
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className={`bg-white border border-[#e9ecef] rounded-xl ${screenWidth < 768 ? 'p-4' : 'p-6'} text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] max-w-[520px]`}>
              <div className="text-[15px] font-semibold text-[#343a40] mb-2">啟動前確認</div>
              <div className="text-[13px] text-[#6c757d] mb-4">
                為了避免在科學助手與自主學習助手之間切換時自動觸發推理、耗用 LLM Token，切換到「自主學習助手」後不會自動開始。
                請點擊下方按鈕以開始與自主學習助手互動。
              </div>
              <button
                className="px-4 py-2 bg-[#5BA491] text-white rounded-lg border-0 cursor-pointer text-sm font-semibold shadow-[0_2px_8px_rgba(91,164,145,0.3)] hover:bg-[#4a9076] hover:-translate-y-px transition-all"
                onClick={() => setMentorStarted(true)}
              >
                詢問自主學習助手後開始
              </button>
            </div>
          </div>
        )
      ) : isLoadingHistory ? (
        <div className="flex items-center justify-center h-full text-[#6c757d] text-[14px]">
          <div className="flex items-center gap-2">
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
                            <pre className="bg-[#f8f9fa] p-3 rounded-lg my-2 overflow-x-auto border border-[#e9ecef]">
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
                      {item.answer}
                    </ReactMarkdown>
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