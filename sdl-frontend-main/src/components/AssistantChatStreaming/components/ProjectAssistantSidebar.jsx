import React from "react";

/**
 * ProjectAssistantSidebar - Sidebar for managing chat sessions in Project Assistant
 * Fully responsive, matches ChatSidebar from Science Assistant
 */
const ProjectAssistantSidebar = ({
  showSidebar,
  isMinimized,
  isFullscreen,
  screenWidth,
  chatSessions,
  currentSessionId,
  isLoadingSessions,
  onNewConversation,
  onSessionClick,
  onDeleteSession
}) => {
  if (!showSidebar) return null;

  return (
    <div
      className={`sidebar ${isMinimized ? 'hidden' : ''} ${
        isFullscreen
          ? (screenWidth >= 768 ? 'w-[280px] h-full' : 'w-full h-auto min-h-[180px] border-b border-[#e9ecef]')
          : 'w-[200px] h-full border-r border-[#e9ecef]'
      } ${isFullscreen ? 'rounded-none' : 'rounded-l-2xl'} bg-[#f8f9fa] p-component-base flex flex-col`}
    >
      {/* 新對話按鈕 */}
      <button
        onClick={onNewConversation}
        className="bg-[#5BA491] text-white border-0 rounded-lg py-3 px-4 mb-4 cursor-pointer text-body-sm font-semibold transition-all duration-fast shadow-[0_2px_4px_rgba(91,164,145,0.2)] hover:bg-[#4a9076] hover:shadow-lg"
      >
        ✨ 新對話
      </button>

      {/* 對話列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex items-center justify-center h-full text-[#6c757d] text-body-sm">
            <div className="flex items-center gap-stack-xs">
              <div className="w-4 h-4 border-2 border-[#5BA491] border-t-transparent rounded-full animate-spin"></div>
              載入中...
            </div>
          </div>
        ) : chatSessions.length === 0 ? (
          <div className="p-component-md text-center text-[#6c757d] text-[13px] italic">
            🌟 開始你的第一次對話吧！
          </div>
        ) : (
          chatSessions.map((session) => (
            <div
              key={session.id}
              className={`session-item group p-[12px_14px] rounded mb-1.5 cursor-default text-[13px] transition-all break-words flex items-center justify-between ${
                currentSessionId === session.id
                  ? 'bg-[#5BA491] text-white font-medium'
                  : 'text-[#495057] border border-transparent hover:bg-[#e9ecef] hover:border-[#dee2e6]'
              }`}
            >
              <div
                className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap mr-2 cursor-pointer"
                onClick={() => onSessionClick(session.id)}
              >
                💬 {session.name || `對話 ${session.id.substring(0, 8)}`}
              </div>

              {/* 刪除按鈕 */}
              <button
                className={`delete-btn flex items-center justify-center w-5 h-5 rounded border-0 bg-transparent text-[#dc3545] cursor-pointer text-[12px] transition-all ml-1 ${
                  currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id, session.name || `對話 ${session.id.substring(0, 8)}`);
                }}
                title="刪除對話"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectAssistantSidebar;
