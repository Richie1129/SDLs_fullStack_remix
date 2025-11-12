import React, { useRef, useEffect, useState } from 'react';
import { useAssistantChat } from '../../hooks/useAssistantChat';
import ChatWindow from './components/ChatWindow';

/**
 * 專案助理聊天介面（支援 Streaming + Session Management + 響應式）
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
  // 使用 hook 獲取狀態和函數
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    chatSessions,
    currentSessionId,
    isLoadingSessions,
    fetchSessions,
    createNewSession,
    switchSession,
    deleteSession
  } = useAssistantChat();

  // 本地 UI 狀態
  const [showSidebar, setShowSidebar] = useState(true);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 監聽螢幕寬度變化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 載入對話 sessions
  useEffect(() => {
    if (projectId) {
      fetchSessions(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // fetchSessions has empty deps array, so it's stable - no need to include it

  // 🔑 首次載入時，如果 currentSessionId 不是新生成的，自動載入該 session 的歷史記錄
  useEffect(() => {
    if (projectId && currentSessionId && messages.length === 0 && !isLoading) {
      // 檢查是否有該 session 的歷史記錄
      const sessionExists = chatSessions.some(s => s.id === currentSessionId);
      if (sessionExists) {
        console.log(`📚 [前端] 自動載入 session 歷史: ${currentSessionId}`);
        switchSession(projectId, currentSessionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentSessionId, chatSessions.length]); // 只在 projectId, currentSessionId 或 sessions 列表變化時執行

  // 🔑 發送第一條訊息後，刷新 sessions 列表（這樣新對話會出現在左側）
  useEffect(() => {
    // 當訊息數量 >= 2（user + assistant）且當前 session 不在列表中，刷新列表
    // 這表示剛完成第一輪對話，後端已經創建了記錄
    if (projectId && messages.length >= 2 && !isLoading) {
      const sessionExists = chatSessions.some(s => s.id === currentSessionId);
      if (!sessionExists) {
        console.log(`🔄 [前端] 檢測到新對話的第一輪完成，刷新 sessions 列表`);
        // 使用 setTimeout 確保後端已經保存記錄
        setTimeout(() => {
          fetchSessions(projectId);
        }, 500); // 延遲 500ms 確保後端寫入完成
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, projectId, currentSessionId, isLoading]); // 監聽訊息數量和 loading 狀態變化

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

  // 處理側邊欄回調
  const handleNewConversation = async () => {
    if (!projectId) return;
    await createNewSession(projectId);
  };

  const handleSessionClick = async (sessionId) => {
    if (!projectId) return;
    await switchSession(projectId, sessionId);
  };

  const handleDeleteSession = async (sessionId, sessionName) => {
    if (!projectId) return;

    // 使用簡單的 confirm 對話框（如需要可替換為更好的 UI）
    if (window.confirm(`確定要刪除「${sessionName}」這個對話嗎？刪除後將無法恢復！`)) {
      await deleteSession(projectId, sessionId);
    }
  };

  return (
    <ChatWindow
      // UI 狀態
      showSidebar={showSidebar}
      setShowSidebar={setShowSidebar}
      embedded={embedded}
      className={className}
      provider={provider}
      isMinimized={isMinimized}
      isFullscreen={isFullscreen}
      screenWidth={screenWidth}

      // 消息相關
      messages={messages}
      clearMessages={clearMessages}

      // Session 相關
      chatSessions={chatSessions}
      currentSessionId={currentSessionId}
      isLoadingSessions={isLoadingSessions}
      onNewConversation={handleNewConversation}
      onSessionClick={handleSessionClick}
      onDeleteSession={handleDeleteSession}

      // 聊天功能
      isLoading={isLoading}
      error={error}
      chatContainerRef={chatContainerRef}
      inputRef={inputRef}
      onSubmit={handleSend}
      onQuickQuestion={handleQuickQuestion}
      projectId={projectId}
    />
  );
}
