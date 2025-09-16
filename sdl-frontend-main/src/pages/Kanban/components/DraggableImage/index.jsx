import React from "react";
import { useDraggable } from "./hooks/useDraggable";
import { useChatSession } from "./hooks/useChatSession";
import { useUIState } from "./hooks/useUIState";
import { useResponsive } from "./hooks/useResponsive";
import DraggableAvatar from "./components/DraggableAvatar";
import ChatWindow from "./components/ChatWindow";

const DraggableImage = ({ containerRef, projectId, currentStage, currentSubStage }) => {
  // 使用自訂 hooks 來管理各種狀態
  const {
    position,
    isDragging,
    imgRef,
    dragIntentRef,
    draggingRef,
    onMouseDown,
    handleClick,
  } = useDraggable(containerRef);

  const {
    history,
    chatSessions,
    currentChatId,
    sessionId,
    isLoadingSessions,
    isLoadingHistory,
    isSubmitting,
    chatEndRef,
    fetchChatSessions,
    handleSubmit,
    handleChatSessionClick,
    handleDeleteSession,
    createNewSession,
    refreshChatSessions,
  } = useChatSession();

  const {
    showMessage,
    setShowMessage,
    showChat,
    setShowChat,
    isFullscreen,
    setIsFullscreen,
    isMinimized,
    setIsMinimized,
    showSidebar,
    setShowSidebar,
    activeTab,
    setActiveTab,
    mentorStarted,
    setMentorStarted,
    showSwalWithCorrectZIndex,
    toggleFullscreen,
    toggleMinimize,
    handleImageClick,
    closeChat,
    onDragStart,
    onDragMove,
    onDragEnd,
  } = useUIState();

  const {
    screenWidth,
    isMobile,
    computeChatPosition,
    computeMessagePosition,
  } = useResponsive();

  // 處理頭像點擊事件
  const handleAvatarClick = () => {
    handleClick(() => {
      onDragStart();
      handleImageClick();
    });
  };

  // 增強拖拽處理，加入 UI 狀態同步
  const handleMouseDown = (e) => {
    onDragStart();
    onMouseDown(e);
  };

  return (
    <>
      {/* 拖拽頭像 */}
      <DraggableAvatar
        position={position}
        isDragging={isDragging}
        imgRef={imgRef}
        onMouseDown={handleMouseDown}
        onClick={handleAvatarClick}
      />

      {/* 提示氣泡 */}
      {showMessage && (
        <div
          className="fixed bg-[#5BA491] text-white px-3 py-3 rounded-xl text-sm shadow-[0_6px_20px_rgba(0,0,0,0.15)] cursor-pointer z-[1001] max-w-[300px] font-medium animate-fade-in"
          style={computeMessagePosition(position)}
          onClick={handleImageClick}
        >
          <div className="flex items-center gap-2">
            <span>有什麼問題需要我幫你解答的嗎？</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMessage(false); }}
              title="關閉"
              className="ml-[2px] bg-transparent border-0 text-white cursor-pointer text-[14px] leading-none py-[2px] px-[6px] rounded hover:bg-white/15 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 聊天視窗 */}
      <ChatWindow
        showChat={showChat}
        isFullscreen={isFullscreen}
        isMinimized={isMinimized}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mentorStarted={mentorStarted}
        setMentorStarted={setMentorStarted}
        screenWidth={screenWidth}
        position={position}
        computeChatPosition={computeChatPosition}
        toggleFullscreen={toggleFullscreen}
        closeChat={closeChat}
        // Chat session props
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        isLoadingSessions={isLoadingSessions}
        isLoadingHistory={isLoadingHistory}
        history={history}
        isSubmitting={isSubmitting}
        chatEndRef={chatEndRef}
        fetchChatSessions={fetchChatSessions}
        handleSubmit={handleSubmit}
        handleChatSessionClick={handleChatSessionClick}
        handleDeleteSession={handleDeleteSession}
        createNewSession={createNewSession}
        refreshChatSessions={refreshChatSessions}
        showSwalWithCorrectZIndex={showSwalWithCorrectZIndex}
        // Other props
        projectId={projectId}
        currentStage={currentStage}
        currentSubStage={currentSubStage}
      />
    </>
  );
};

export default DraggableImage;
