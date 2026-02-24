import React from "react";
import { FiCpu } from 'react-icons/fi';
import ChatSidebar from "./ChatSidebar";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";

const ChatWindow = ({
  // UI 狀態
  showSidebar,
  setShowSidebar,
  embedded,
  className,
  provider,
  isMinimized,
  isFullscreen,
  screenWidth,
  // 消息相關
  messages,
  clearMessages,
  // Session 相關
  chatSessions,
  currentSessionId,
  isLoadingSessions,
  onNewConversation,
  onSessionClick,
  onDeleteSession,
  // 聊天功能
  isLoading,
  error,
  chatContainerRef,
  inputRef,
  onSubmit,
  onQuickQuestion,
  projectId
}) => {
  // 容器組件（支援 embedded 和 standalone 模式）
  const Container = ({ children }) => (
    embedded ? (
      <div className={`flex flex-row h-full min-h-0 bg-transparent ${className || ''}`}>
        {children}
      </div>
    ) : (
      <div className={`
        w-full max-w-6xl mx-auto h-[600px]
        bg-white shadow-lg rounded-lg border border-gray-200
        flex flex-row overflow-hidden
        ${className || ''}
      `}>
        {children}
      </div>
    )
  );

  return (
    <Container>
      {/* 側邊欄 */}
      <ChatSidebar
        showSidebar={showSidebar}
        isMinimized={isMinimized}
        isFullscreen={isFullscreen}
        screenWidth={screenWidth}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        isLoadingSessions={isLoadingSessions}
        onNewConversation={onNewConversation}
        onSessionClick={onSessionClick}
        onDeleteSession={onDeleteSession}
      />

      {/* 主聊天區域 */}
      <div className="flex flex-1 flex-col bg-white min-w-0">
        {/* 頂部工具欄 */}
        {!embedded && (
          <div className={`chat-header flex justify-between items-center ${
            screenWidth < 768 ? 'px-4 py-3' : 'px-5 py-4'
          } border-b border-[#e9ecef] bg-[#f8f9fa] relative min-h-[60px]`}>
            {/* 左側區域 */}
            <div className="flex items-center gap-stack-xs shrink-0">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[18px] font-medium transition-colors duration-fast bg-transparent text-[#5BA491] hover:bg-[#f1f3f4]"
                title={showSidebar ? "隱藏側邊欄" : "顯示側邊欄"}
              >
                {showSidebar ? "◂" : "▸"}
              </button>
            </div>

            {/* 中央區域 - 標題 */}
            <div className="header-center flex items-center justify-center flex-1 gap-stack-xs absolute left-1/2 -translate-x-1/2 max-w-[360px]">
              <div className="flex items-center gap-stack-xs">
                <FiCpu className="w-5 h-5 text-[#5BA491]" />
                <span className="font-semibold text-[#343a40]">專案助理</span>
                <span className="text-caption text-[#6c757d]">
                  {provider === 'gemini' ? 'Gemini' : 'GPT-4'}
                </span>
              </div>
            </div>

            {/* 右側控制按鈕區域 */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 清空對話按鈕 */}
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="flex items-center justify-center px-3 py-1 rounded cursor-pointer text-[12px] font-medium transition-colors duration-fast bg-transparent text-[#dc3545] hover:bg-[#f8d7da]"
                  title="清空當前對話"
                >
                  清空
                </button>
              )}
            </div>
          </div>
        )}

        {/* 聊天內容區域 */}
        <ChatContent
          messages={messages}
          isLoading={isLoading}
          error={error}
          chatContainerRef={chatContainerRef}
          onQuickQuestion={onQuickQuestion}
          projectId={projectId}
          embedded={embedded}
        />

        {/* 輸入區域 */}
        <ChatInput
          inputRef={inputRef}
          isLoading={isLoading}
          projectId={projectId}
          onSubmit={onSubmit}
          embedded={embedded}
        />
      </div>
    </Container>
  );
};

export default ChatWindow;
