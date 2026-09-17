import { useState, useEffect, useRef } from "react";
import Swal from 'sweetalert2';

export const useUIState = () => {
  const [showMessage, setShowMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('science');
  const [mentorStarted, setMentorStarted] = useState(false);

  const messageTimeoutRef = useRef(null);
  const prevTabRef = useRef('science');
  const dismissedRef = useRef(false);

  // 每 10 秒顯示一次訊息（拖曳中不顯示；使用者關過一次後不再跳出）
  useEffect(() => {
    messageTimeoutRef.current = setInterval(() => {
      if (!showChat && !dismissedRef.current) {
        setShowMessage(true);
      }
    }, 10000);

    return () => clearInterval(messageTimeoutRef.current);
  }, [showChat]);

  // 使用者按 X 關閉提示氣泡
  const dismissMessage = () => {
    dismissedRef.current = true;
    setShowMessage(false);
  };

  // 監聽 ESC 鍵退出全螢幕模式
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  // 每次從其他分頁切回「自主學習助手」時，強制要求重新點擊開始
  useEffect(() => {
    if (activeTab === 'mentor' && prevTabRef.current !== 'mentor') {
      setMentorStarted(false);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // 確保 SweetAlert2 在全螢幕模式下正確顯示的輔助函數
  // SweetAlert2 預設 z-index（1060）已高於 z-fullscreen（100），不需再手動改 zIndex
  const showSwalWithCorrectZIndex = (options) => {
    return Swal.fire(options);
  };

  // 切換全螢幕模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 切換最小化模式
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 處理圖像點擊
  const handleImageClick = () => {
    setShowMessage(false);
    setShowChat(true);
  };

  // 關閉聊天
  const closeChat = () => {
    setShowChat(false);
    setMentorStarted(false);
  };

  // 拖拽時隱藏消息和聊天
  const onDragStart = () => {
    setShowMessage(false);
  };

  const onDragMove = () => {
    if (showMessage) setShowMessage(false);
  };

  const onDragEnd = () => {
    // 拖拽結束後不需要特殊處理
  };

  return {
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
    dismissMessage,
    showSwalWithCorrectZIndex,
    toggleFullscreen,
    toggleMinimize,
    handleImageClick,
    closeChat,
    onDragStart,
    onDragMove,
    onDragEnd,
  };
};