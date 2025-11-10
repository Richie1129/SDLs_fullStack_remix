import React, { useRef, useEffect } from 'react';
import { useAssistantChat } from '../hooks/useAssistantChat';
import ReactMarkdown from 'react-markdown';

/**
 * 專案助理聊天介面（支援 Streaming）
 *
 * 使用範例：
 * ```jsx
 * <AssistantChatStreaming projectId={123} />
 * ```
 */
export default function AssistantChatStreaming({
  projectId,
  provider = 'gemini',
  embedded = false,
  className = ''
}) {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAssistantChat();
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 自動滾動到底部
  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // 監聽訊息變化，自動滾動（使用 debounce 避免頻繁滾動）
  useEffect(() => {
    // 只在新增訊息或 loading 狀態變化時滾動
    const timer = setTimeout(() => scrollToBottom(true), 50);
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]); // 只監聽訊息數量變化，不監聽內容變化

  // 發送訊息
  const handleSend = async (e) => {
    e?.preventDefault?.();

    const text = inputRef.current?.value?.trim();
    if (!text || !projectId) return;

    // 清空輸入框
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    // 發送訊息
    await sendMessage(projectId, text, provider);

    // 聚焦回輸入框
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 快速發送預設問題
  const handleQuickQuestion = async (question) => {
    if (!projectId || isLoading) return;

    // 填入輸入框
    if (inputRef.current) {
      inputRef.current.value = question;
    }

    // 發送訊息
    await sendMessage(projectId, question, provider);

    // 聚焦回輸入框
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 思考中指示器
  const ThinkingIndicator = () => {
    const [dots, setDots] = React.useState(0);

    useEffect(() => {
      const id = setInterval(() => setDots((d) => (d + 1) % 4), 400);
      return () => clearInterval(id);
    }, []);

    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full ${dots >= 1 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
          <div className={`w-2 h-2 rounded-full ${dots >= 2 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
          <div className={`w-2 h-2 rounded-full ${dots >= 3 ? 'opacity-100' : 'opacity-30'} transition-opacity`} style={{ backgroundColor: '#5BA491' }} />
        </div>
        <span className="text-sm">AI 正在思考中...</span>
      </div>
    );
  };

  // 訊息氣泡
  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    const isError = message.isError;

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`
            max-w-[80%] px-4 py-2 rounded-lg
            ${isUser
              ? 'text-white'
              : isError
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-gray-100 text-gray-900'
            }
          `}
          style={isUser ? { backgroundColor: '#5BA491' } : {}}
        >
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          <div className="text-xs opacity-60 mt-1">
            {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };

  // 容器樣式
  const Container = ({ children }) => (
    embedded ? (
      <div className={`flex flex-col h-full min-h-0 bg-transparent ${className}`}>{children}</div>
    ) : (
      <div className={`
        w-full max-w-4xl mx-auto h-[600px]
        bg-white shadow-lg rounded-lg border border-gray-200
        flex flex-col overflow-hidden
        ${className}
      `}>
        {children}
      </div>
    )
  );

  return (
    <Container>
      {/* 標題列 */}
      {!embedded && (
        <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: 'linear-gradient(to right, #5BA491, #4a9076)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              🤖
            </div>
            <div>
              <div className="font-semibold">專案助理</div>
              <div className="text-xs opacity-90">
                使用 {provider === 'gemini' ? 'Gemini' : 'GPT-4'} 提供協助
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              清空對話
            </button>
          )}
        </div>
      )}

      {/* 聊天區域 */}
      <div
        ref={chatContainerRef}
        className={`
          flex-1 p-4 overflow-y-auto
          ${embedded ? 'min-h-0 bg-transparent' : 'h-0 bg-gray-50'}
        `}
      >
        {/* 空狀態 */}
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-lg font-medium mb-2">開始對話</div>
              <div className="text-sm">
                詢問我關於專案的任何問題，例如：
              </div>
              <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
                <button
                  onClick={() => handleQuickQuestion('我的專案進度如何？')}
                  className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-sm text-left hover:border-[#5BA491] transition-colors cursor-pointer"
                  style={{ hover: { backgroundColor: 'rgba(91, 164, 145, 0.05)' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(91, 164, 145, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  disabled={!projectId || isLoading}
                >
                  「我的專案進度如何？」
                </button>
                <button
                  onClick={() => handleQuickQuestion('看板上有哪些任務待處理？')}
                  className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-sm text-left hover:border-[#5BA491] transition-colors cursor-pointer"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(91, 164, 145, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  disabled={!projectId || isLoading}
                >
                  「看板上有哪些任務待處理？」
                </button>
                <button
                  onClick={() => handleQuickQuestion('想法牆裡有什麼重要的想法？')}
                  className="w-full px-4 py-2 bg-white rounded-lg border border-[#e9ecef] text-sm text-left hover:border-[#5BA491] transition-colors cursor-pointer"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(91, 164, 145, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
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
            <div className="text-sm text-red-800">❌ {error}</div>
          </div>
        )}
      </div>

      {/* 輸入區域 */}
      <form
        onSubmit={handleSend}
        className={`p-4 border-t ${embedded ? 'bg-transparent' : 'bg-white'}`}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="
              flex-1 px-4 py-2
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            "
            onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(91, 164, 145, 0.5)'}
            onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
            placeholder={
              !projectId
                ? '請先選擇專案'
                : isLoading
                  ? '等待回應中...'
                  : '詢問專案相關問題...'
            }
            disabled={isLoading || !projectId}
            autoFocus
          />
          <button
            type="submit"
            className="
              px-6 py-2
              text-white font-medium rounded-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
            style={{ backgroundColor: '#5BA491' }}
            onMouseEnter={(e) => !isLoading && !(!projectId) && (e.currentTarget.style.backgroundColor = '#4a9076')}
            onMouseLeave={(e) => !isLoading && !(!projectId) && (e.currentTarget.style.backgroundColor = '#5BA491')}
            disabled={isLoading || !projectId}
          >
            {isLoading ? '送出中...' : '送出'}
          </button>
        </div>

        {/* 提示文字 */}
        <div className="mt-2 text-xs text-gray-500">
          💡 提示：我可以分析專案的看板、想法牆、提交記錄等資料來回答你的問題
        </div>
      </form>
    </Container>
  );
}
