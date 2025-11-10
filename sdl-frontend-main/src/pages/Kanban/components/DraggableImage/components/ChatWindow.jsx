import React, { useEffect } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";

const ChatWindow = ({
  showChat,
  isFullscreen,
  isMinimized,
  showSidebar,
  setShowSidebar,
  activeTab,
  setActiveTab,
  mentorStarted,
  setMentorStarted,
  screenWidth,
  position,
  computeChatPosition,
  toggleFullscreen,
  closeChat,
  // Chat session props
  chatSessions,
  currentChatId,
  isLoadingSessions,
  isLoadingHistory,
  history,
  isSubmitting,
  chatEndRef,
  fetchChatSessions,
  handleSubmit,
  handleChatSessionClick,
  handleDeleteSession,
  createNewSession,
  refreshChatSessions,
  showSwalWithCorrectZIndex,
  // ✅ 外部連結開關
  enableExternalLinks,
  toggleExternalLinks,
  // Other props
  projectId,
  currentStage,
  currentSubStage
}) => {
  // 當 showChat 變為 true 時獲取歷史對話列表（只執行一次）
  useEffect(() => {
    if (showChat && !isLoadingSessions) {
      fetchChatSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat]); // 只依賴 showChat，避免無限循環

  if (!showChat) return null;

  const handleNewConversation = async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error("創建新對話失敗:", error);
    }
  };

  const handleDeleteSessionWithSwal = (sessionId, sessionName) => {
    handleDeleteSession(sessionId, sessionName, showSwalWithCorrectZIndex);
  };

  return (
    <div
      className={`chat-container fixed ${
        isFullscreen
          ? 'w-screen rounded-none shadow-none z-[9999]'
          : `${showSidebar ? 'w-[580px]' : 'w-[380px]'} rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-[1002]`
      } ${isMinimized ? 'h-[60px] overflow-hidden' : (isFullscreen ? 'h-screen' : 'h-[520px]')} bg-white transition-all duration-300 ease-in-out flex ${
        isFullscreen && screenWidth < 768 ? 'flex-col' : 'flex-row'
      }`.trim()}
      style={isFullscreen ? { left: 0, top: 0 } : computeChatPosition(position, showSidebar, isFullscreen)}
    >
      {/* 側邊欄 */}
      {activeTab === 'science' && (
        <ChatSidebar
          showSidebar={showSidebar}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          screenWidth={screenWidth}
          chatSessions={chatSessions}
          currentChatId={currentChatId}
          isLoadingSessions={isLoadingSessions}
          onNewConversation={handleNewConversation}
          onChatSessionClick={handleChatSessionClick}
          onDeleteSession={handleDeleteSessionWithSwal}
        />
      )}

      {/* 主聊天區域 */}
      <div className="flex flex-1 flex-col bg-white min-w-0">
        {/* 頂部工具欄 */}
        <div
          className={`chat-header flex justify-between items-center ${
            screenWidth < 768 ? 'px-4 py-3' : 'px-5 py-4'
          } border-b border-[#e9ecef] bg-[#f8f9fa] relative min-h-[60px]`}
        >
          {/* 左側區域 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[18px] font-medium transition-all bg-transparent text-[#5BA491] hover:bg-[#f1f3f4] hover:scale-110"
              title={showSidebar ? "隱藏側邊欄" : "顯示側邊欄"}
            >
              {showSidebar ? "◂" : "▸"}
            </button>
          </div>

          {/* 中央區域 - 切換分頁 */}
          <div className="header-center flex items-center justify-center flex-1 gap-2 absolute left-1/2 -translate-x-1/2 max-w-[360px]">
            <button
              className={`px-3 py-1 rounded-full text-sm ${
                activeTab === 'science' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('science')}
            >
              🧑‍🔬 科學助手
            </button>
            <button
              className={`px-3 py-1 rounded-full text-sm ${
                activeTab === 'project-assistant' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('project-assistant')}
            >
              🤖 專案助理
            </button>
            {/* <button
              className={`px-3 py-1 rounded-full text-sm ${
                activeTab === 'mentor' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('mentor')}
            >
              🧑‍🏫 自主學習助手
            </button> */}
          </div>

          {/* 右側控制按鈕區域 */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 最大化/還原按鈕 */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[14px] font-medium transition-all bg-transparent text-[#28a745] hover:bg-[#d1e7dd] hover:scale-110"
              title={isFullscreen ? "還原視窗" : "最大化"}
            >
              {isFullscreen ? "🗗" : "🗖"}
            </button>

            {/* 關閉按鈕 */}
            <button
              onClick={closeChat}
              className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[16px] font-medium transition-all bg-transparent text-[#dc3545] hover:bg-[#f8d7da] hover:scale-110"
              title="關閉聊天室"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 聊天內容區域 */}
        <ChatContent
          activeTab={activeTab}
          mentorStarted={mentorStarted}
          setMentorStarted={setMentorStarted}
          isLoadingHistory={isLoadingHistory}
          history={history}
          chatEndRef={chatEndRef}
          isFullscreen={isFullscreen}
          screenWidth={screenWidth}
          isMinimized={isMinimized}
          projectId={projectId}
          currentStage={currentStage}
          currentSubStage={currentSubStage}
        />

        {/* 輸入區域 */}
        <ChatInput
          activeTab={activeTab}
          isMinimized={isMinimized}
          screenWidth={screenWidth}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          projectId={projectId}
          // ✅ 外部連結開關
          enableExternalLinks={enableExternalLinks}
          toggleExternalLinks={toggleExternalLinks}
        />
      </div>
    </div>
  );
};

export default ChatWindow;