import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";

// 思考中指示器
const ThinkingIndicator = () => {
  const [dots, setDots] = React.useState(0);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-stack-xs text-[#6c757d]">
      <div className="flex gap-1">
        <div className={`w-2 h-2 rounded-full ${dots >= 1 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
        <div className={`w-2 h-2 rounded-full ${dots >= 2 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
        <div className={`w-2 h-2 rounded-full ${dots >= 3 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
      </div>
      <span className="text-[14px]">AI 正在思考中...</span>
    </div>
  );
};

// 思考過程區塊組件
const ThinkingBlock = ({ content }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // 如果沒有思考內容，不渲染
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <div
      className="mb-4 border-2 rounded-lg overflow-hidden shadow-sm"
      style={{
        borderColor: '#d4a373',
        borderStyle: 'dashed',
        backgroundColor: '#fffbf0'
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
        style={{
          background: 'linear-gradient(to right, #fffbf0, #fff9e6)',
          color: '#8b7355'
        }}
      >
        <div className="flex items-center gap-stack-xs">
          <span className="text-body">💭</span>
          <span className="font-medium text-body-sm">AI 思考過程</span>
        </div>
        <span className="text-caption transition-transform" style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div
          className="px-4 py-3 text-body-sm leading-relaxed prose prose-sm max-w-none"
          style={{
            borderTop: '2px dashed #e8d4b8',
            color: '#5a5a5a',
            backgroundColor: '#fffef8'
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// 訊息氣泡
const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-[80%]">
        {/* 思考過程區塊（只在 AI 訊息中顯示）*/}
        {!isUser && message.thinking && (
          <ThinkingBlock content={message.thinking} />
        )}

        {/* 訊息氣泡 */}
        <div
          className={`
            px-4 py-3 rounded-[18px]
            ${isUser
              ? 'bg-[#5BA491] text-white rounded-[18px_18px_4px_18px]'
              : isError
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-white text-[#495057] border border-[#e9ecef] rounded-[18px_18px_18px_4px]'
            }
            text-[14px] leading-[1.4] shadow-[0_2px_8px_rgba(0,0,0,0.1)]
          `}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          <div className="text-caption opacity-60 mt-1">
            {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatContent = ({
  messages = [],
  isLoading = false,
  error = null,
  chatContainerRef,
  onQuickQuestion,
  projectId,
  embedded = false
}) => {
  return (
    <div
      ref={chatContainerRef}
      className={`chat-content flex-1 overflow-y-auto p-component-md ${embedded ? 'min-h-0 bg-transparent' : 'bg-[#fdfdfd]'}`}
    >
      {/* 空狀態 */}
      {messages.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-[#6c757d]">
            <div className="text-6xl mb-4">💬</div>
            <div className="text-[15px] font-semibold text-[#343a40] mb-2">開始對話</div>
            <div className="text-[13px] mb-4">
              詢問我關於專案的任何問題，例如：
            </div>
            <div className="mt-4 space-y-stack-xs text-left max-w-md mx-auto">
              <button
                onClick={() => onQuickQuestion('我的專案進度如何？')}
                className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-[13px] text-left transition-all cursor-pointer hover:bg-[#f8f9fa] hover:border-[#5BA491]"
                disabled={!projectId || isLoading}
              >
                「我的專案進度如何？」
              </button>
              <button
                onClick={() => onQuickQuestion('看板上有哪些任務待處理？')}
                className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-[13px] text-left transition-all cursor-pointer hover:bg-[#f8f9fa] hover:border-[#5BA491]"
                disabled={!projectId || isLoading}
              >
                「看板上有哪些任務待處理？」
              </button>
              <button
                onClick={() => onQuickQuestion('想法牆裡有什麼重要的想法？')}
                className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-[13px] text-left transition-all cursor-pointer hover:bg-[#f8f9fa] hover:border-[#5BA491]"
                disabled={!projectId || isLoading}
              >
                「想法牆裡有什麼重要的想法？」
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 訊息列表 */}
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}

      {/* 思考中指示器 */}
      {isLoading && (
        <div className="mb-4">
          <ThinkingIndicator />
        </div>
      )}

      {/* 錯誤提示 */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-[14px] text-red-800">❌ {error}</div>
        </div>
      )}
    </div>
  );
};

export default ChatContent;
