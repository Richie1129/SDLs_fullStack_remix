import React, { useEffect, useState } from "react";
import { FiCpu, FiMaximize2, FiMinimize2, FiClock, FiPlusCircle, FiMessageSquare, FiTrash2, FiX } from 'react-icons/fi';
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
  const [showMobileHistory, setShowMobileHistory] = useState(false);

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

  const isMobileView = screenWidth < 768;

  // 行動裝置：Bottom Sheet 樣式（從底部滑出）
  // 桌面：浮動視窗（依頭像位置計算）
  let containerClassName, containerStyle;
  if (isFullscreen) {
    containerClassName = 'chat-container fixed w-screen h-screen rounded-none shadow-none z-[9999] bg-white flex flex-row transition-all duration-normal ease-in-out';
    containerStyle = { left: 0, top: 0 };
  } else if (isMobileView) {
    containerClassName = `chat-container fixed z-[1002] bg-white flex flex-col rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.18)] overflow-hidden transition-all duration-normal ease-in-out ${isMinimized ? 'h-[60px]' : 'h-[85vh]'}`;
    containerStyle = { bottom: 0, left: 0, right: 0, width: '100%' };
  } else {
    containerClassName = `chat-container fixed ${showSidebar ? 'w-[580px]' : 'w-[380px]'} ${isMinimized ? 'h-[60px] overflow-hidden' : 'h-[520px]'} rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-[1002] max-w-[95vw] max-h-[90vh] bg-white flex flex-row transition-all duration-normal ease-in-out`;
    containerStyle = computeChatPosition(position, showSidebar, isFullscreen);
  }

  return (
    <div className={containerClassName} style={containerStyle}>
      {/* Bottom Sheet 拖拽把手 (手機限定) */}
      {isMobileView && !isFullscreen && (
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-[5px] bg-gray-300 rounded-full" />
        </div>
      )}
      {/* 側邊欄：手機預設隱藏（Bottom Sheet空間有限） */}
      {activeTab === 'science' && !isMobileView && (
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
      <div className="relative flex flex-1 flex-col bg-white min-w-0 overflow-hidden">
        {/* 頂部工具欄 */}
        <div
          className={`chat-header flex justify-between items-center ${
            isMobileView ? 'px-4 py-2' : 'px-5 py-4'
          } border-b border-[#e9ecef] bg-[#f8f9fa] relative min-h-[52px] flex-shrink-0`}
        >
          {/* 左側區域：手機隱藏 Sidebar 切換鈕，改為歷史按鈕 */}
          <div className="flex items-center gap-stack-xs shrink-0">
            {!isMobileView && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[18px] font-medium transition-colors duration-fast bg-transparent text-[#5BA491] hover:bg-[#f1f3f4]"
                title={showSidebar ? "隱藏側邊欄" : "顯示側邊欄"}
              >
                {showSidebar ? "◂" : "▸"}
              </button>
            )}
            {isMobileView && (
              <button
                onClick={() => setShowMobileHistory(!showMobileHistory)}
                className="flex items-center justify-center w-8 h-8 rounded cursor-pointer transition-colors duration-fast bg-transparent text-[#5BA491] hover:bg-[#f1f3f4]"
                title="對話歷史"
              >
                <FiClock className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 中央區域 - 切換分頁 */}
          <div className="header-center flex items-center justify-center flex-1 gap-stack-xs absolute left-1/2 -translate-x-1/2 max-w-[360px]">
            <button
              className={`px-3 py-1 rounded-full text-body-sm ${
                activeTab === 'science' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('science')}
            >
              <FiCpu className="w-4 h-4 inline mr-1" /> 科學助手
            </button>
            {/* <button
              className={`px-3 py-1 rounded-full text-body-sm ${
                activeTab === 'project-assistant' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('project-assistant')}
            >
              <FiCpu className="w-4 h-4 inline mr-1" /> 專案助理
            </button> */}
            {/* <button
              className={`px-3 py-1 rounded-full text-body-sm ${
                activeTab === 'mentor' ? 'bg-[#5BA491] text-white' : 'bg-white border border-[#e9ecef] text-[#495057]'
              }`}
              onClick={() => setActiveTab('mentor')}
            >
              <FiCpu className="w-4 h-4 inline mr-1" /> 自主學習助手
            </button> */}
          </div>

          {/* 右側控制按鈕區域 */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 最大化/還原按鈕 */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[14px] font-medium transition-colors duration-fast bg-transparent text-[#28a745] hover:bg-[#d1e7dd]"
              title={isFullscreen ? "還原視窗" : "最大化"}
            >
              {isFullscreen ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
            </button>

            {/* 關閉按鈕 */}
            <button
              onClick={closeChat}
              className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[16px] font-medium transition-colors duration-fast bg-transparent text-[#dc3545] hover:bg-[#f8d7da]"
              title="關閉聊天室"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 聊天內容區域 */}
        {/* 手機歷史對話覆蓋面板 */}
        {isMobileView && showMobileHistory && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col rounded-t-2xl overflow-hidden">
            {/* 面板 Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e9ecef] bg-[#f8f9fa] flex-shrink-0">
              <span className="font-semibold text-body-sm text-[#343a40]">對話歷史</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { handleNewConversation(); setShowMobileHistory(false); }}
                  className="flex items-center gap-1 bg-[#5BA491] text-white rounded-lg px-3 py-1.5 text-body-sm font-medium"
                >
                  <FiPlusCircle className="w-3.5 h-3.5" /> 新對話
                </button>
                <button
                  onClick={() => setShowMobileHistory(false)}
                  className="flex items-center justify-center w-7 h-7 rounded text-[#6c757d] hover:bg-[#e9ecef] transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* 對話列表 */}
            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full text-[#6c757d] text-body-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#5BA491] border-t-transparent rounded-full animate-spin"></div>
                    載入中...
                  </div>
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="p-4 text-center text-[#6c757d] text-[13px] italic">還沒有任何對話紀錄</div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between px-3 py-3 rounded-lg mb-2 cursor-pointer text-[13px] transition-all ${
                      currentChatId === session.id
                        ? 'bg-[#5BA491] text-white font-medium'
                        : 'text-[#495057] bg-[#f8f9fa] hover:bg-[#e9ecef]'
                    }`}
                    onClick={() => { handleChatSessionClick(session.id); setShowMobileHistory(false); }}
                  >
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <FiMessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{session.name || `對話 ${session.id.substring(0, 8)}`}</span>
                    </div>
                    <button
                      className={`flex items-center justify-center w-6 h-6 rounded border-0 bg-transparent text-[#dc3545] cursor-pointer transition-all ml-2 ${
                        currentChatId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteSessionWithSwal(session.id, session.name || `對話 ${session.id.substring(0, 8)}`); }}
                      title="刪除對話"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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