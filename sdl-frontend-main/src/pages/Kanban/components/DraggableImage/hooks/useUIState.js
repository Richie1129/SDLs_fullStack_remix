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

  // 每 10 秒顯示一次訊息（拖曳中不顯示）
  useEffect(() => {
    messageTimeoutRef.current = setInterval(() => {
      if (!showChat) {
        setShowMessage(true);
      }
    }, 10000);

    return () => clearInterval(messageTimeoutRef.current);
  }, [showChat]);

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
  const showSwalWithCorrectZIndex = (options) => {
    if (isFullscreen) {
      const chatContainer = document.querySelector('.chat-container.fullscreen');
      const originalZIndex = chatContainer?.style.zIndex;

      if (chatContainer) {
        chatContainer.style.zIndex = '9998';
      }

      const result = Swal.fire({
        ...options,
        backdrop: true,
        allowOutsideClick: true,
        customClass: {
          container: 'swal2-container-custom',
          popup: 'swal2-popup-custom',
          ...options.customClass
        },
        target: 'body',
        heightAuto: false,
        didOpen: () => {
          const swalContainer = document.querySelector('.swal2-container');
          if (swalContainer) {
            swalContainer.style.zIndex = '99999';
          }
          const swalPopup = document.querySelector('.swal2-popup');
          if (swalPopup) {
            swalPopup.style.zIndex = '99999';
          }
        },
        didClose: () => {
          if (chatContainer && originalZIndex) {
            chatContainer.style.zIndex = originalZIndex;
          } else if (chatContainer) {
            chatContainer.style.zIndex = '9999';
          }
        }
      });

      return result;
    } else {
      return Swal.fire(options);
    }
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