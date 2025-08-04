import React, { useState, useRef, useEffect } from "react";
import { socket } from "../../../utils/socket";
import { getUserSessions, getRagMessageBySession, testConnection, deleteSession, deleteSessionMessages, createNewSessionInDB } from "../../../api/rag";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Swal from 'sweetalert2';

const API_URL = "/proxy/api/v1/chats/a159fe08e2d411efb3910242ac120004"; // 指向後端代理
const API_KEY = "ragflow-U0ZTc4MzdlZTJjYjExZWZiMzcyMDI0Mm"; // 保持不變，後端已使用此 Key

// 提取為常數，避免重複宣告
const OPENING_MESSAGE = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";

const DraggableImage = () => {
  const initialPosition = { x: window.innerWidth - 100, y: window.innerHeight / 2 };
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSrc, setImageSrc] = useState("/說話.png");
  const [showMessage, setShowMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // 新增的狀態變量
  const [showSidebar, setShowSidebar] = useState(true);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false); // 新增全螢幕模式狀態
  const [screenWidth, setScreenWidth] = useState(window.innerWidth); // 新增螢幕寬度狀態用於響應式設計
  const [isMinimized, setIsMinimized] = useState(false); // 新增最小化狀態
  
  const imgRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    // 只在組件初始化時設置開場白
    if (history.length === 0) {
      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
    }

    // 每 10 秒顯示一次訊息
    messageTimeoutRef.current = setInterval(() => {
      if (!showChat) {
        setShowMessage(true);
      }
    }, 10000);

    return () => clearInterval(messageTimeoutRef.current);
  }, [showChat]); // 修復依賴項

  // 新增：當 showChat 變為 true 時獲取歷史對話列表
  useEffect(() => {
    if (showChat && chatSessions.length === 0 && !isLoadingSessions) {
      fetchChatSessions();
    }
  }, [showChat]); // 移除 chatSessions.length 和 isLoadingSessions 從依賴項

  // 新增：當 currentChatId 改變時載入對話歷史
  useEffect(() => {
    if (currentChatId && currentChatId !== sessionId && !isLoadingHistory) {
      loadChatHistory(currentChatId);
      setSessionId(currentChatId);
    }
  }, [currentChatId]); // 移除 sessionId 和 isLoadingHistory 從依賴項

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setPosition((prevPosition) => ({
        x: window.innerWidth - 100, // 保持貼齊右側
        y: prevPosition.y, // 保持原來的 Y 軸位置
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 新增：監聽 ESC 鍵退出全螢幕模式
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  const handleImageClick = () => {
      setShowMessage(false);
      setShowChat(true);
  };

  // 新增：獲取歷史對話列表
  const fetchChatSessions = async () => {
    if (isLoadingSessions) return; // 防止重複調用
    
    try {
      setIsLoadingSessions(true);
      console.log("正在獲取對話列表...");
      
      // 從 localStorage 獲取用戶 ID
      const userId = localStorage.getItem('id') || '1';
      console.log("獲取用戶 ID:", userId);
      
      // 先測試 API 連接
      try {
        const testResult = await testConnection(userId);
        console.log("API 連接測試成功:", testResult);
      } catch (testError) {
        console.error("API 連接測試失敗:", testError);
        throw new Error("無法連接到後端 API");
      }
      
      // 使用後端 API 獲取用戶的會話列表
      const sessions = await getUserSessions(userId);
      console.log("獲取到的對話數據:", sessions);

      if (sessions.length === 0) {
        console.log("沒有歷史對話，顯示空狀態");
        setChatSessions([]);
        // 設置開場白，確保不會重複觸發 fetchChatSessions
        if (history.length === 0) {
          setHistory([{ question: null, answer: OPENING_MESSAGE }]);
        }
      } else {
        console.log(`找到 ${sessions.length} 個歷史對話`);
        
        // 轉換數據格式以符合 UI 需求
        const formattedSessions = sessions.map((session, index) => ({
          id: session.sessionId,
          name: `對話 ${index + 1} - ${session.userName || '未知用戶'}`
        }));
        
        setChatSessions(formattedSessions);
        // 設置第一個對話為當前對話（只有在沒有設置時）
        if (!currentChatId && formattedSessions.length > 0) {
          setCurrentChatId(formattedSessions[0].id);
        }
      }
    } catch (error) {
      console.error("獲取對話列表失敗:", error);
      console.error("錯誤詳情:", error.response?.data || error.message);
      setChatSessions([]);
      // 設置開場白作為默認狀態
      if (history.length === 0) {
        setHistory([{ question: null, answer: OPENING_MESSAGE }]);
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // 新增：載入單一對話歷史訊息
  const loadChatHistory = async (sessionId) => {
    if (isLoadingHistory) return; // 防止重複調用
    
    try {
      setIsLoadingHistory(true);
      console.log(`正在載入對話歷史，Session ID: ${sessionId}`);
      
      // 從 localStorage 獲取用戶 ID
      const userId = localStorage.getItem('id') || '1';
      console.log("使用用戶 ID:", userId);
      
      // 使用後端 API 獲取特定會話的歷史訊息
      const messages = await getRagMessageBySession(userId, sessionId);
      console.log("獲取到的對話歷史:", messages);

      // 轉換訊息格式為 { question, answer } 格式
      const conversationHistory = [];
      
      // 先添加開場白
      conversationHistory.push({ question: null, answer: OPENING_MESSAGE });

      // 將後端返回的訊息轉換為對話格式
      console.log(`處理 ${messages.length} 條訊息`);
      
      if (messages.length > 0) {
        for (const message of messages) {
          // 檢查訊息是否同時有輸入和回應
          if (message.input_message && message.response_message) {
            conversationHistory.push({
              question: message.input_message,
              answer: message.response_message
            });
          } else if (message.input_message && !message.response_message) {
            // 只有問題沒有回答
            conversationHistory.push({
              question: message.input_message,
              answer: "正在處理您的問題..."
            });
          } else if (!message.input_message && message.response_message) {
            // 只有回答沒有問題（系統訊息）
            conversationHistory.push({
              question: null,
              answer: message.response_message
            });
          }
        }
      }

      console.log("轉換後的對話歷史:", conversationHistory);
      setHistory(conversationHistory);
    } catch (error) {
      console.error("載入對話歷史失敗:", error);
      // 如果載入失敗，設置為開場白
      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 修改：新對話功能
  const handleNewConversation = async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error("創建新對話失敗:", error);
    }
  };

  // 新增：創建新會話的輔助函數
  const createNewSession = async () => {
    try {
      const newSessionId = await createSession();
      
      // 重置歷史記錄為開場白
      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
      
      // 立即更新當前會話 ID
      setCurrentChatId(newSessionId);
      setSessionId(newSessionId);
      
      // 將新會話添加到會話列表（添加到最前面）
      const newSession = {
        id: newSessionId,
        name: `新對話 - ${new Date().toLocaleTimeString()}`
      };
      setChatSessions(prevSessions => [newSession, ...prevSessions]);
      
      // 將開場白保存到資料庫，確保新會話會出現在歷史記錄中
      try {
        const userId = localStorage.getItem('id') || '1';
        const userName = localStorage.getItem('username') || '未知用戶';
        
        // 使用新的 API 來創建會話記錄
        await createNewSessionInDB(userId, newSessionId, userName);
        console.log("新會話已保存到資料庫");
        
        // 延遲刷新對話歷史，確保資料庫記錄已生效
        setTimeout(() => {
          console.log("自動刷新對話歷史列表（新對話創建後）");
          refreshChatSessions();
        }, 1000);
      } catch (saveError) {
        console.warn("保存新會話到資料庫失敗，但不影響會話創建:", saveError);
      }
      
      console.log("新會話創建成功:", newSessionId);
      return newSessionId;
    } catch (error) {
      console.error("創建新會話失敗:", error);
      throw error;
    }
  };

  // 修改：建立新的 session
  const createSession = async () => {
    try {
      // 調用 RAGFlow API 創建 session
      const sessionPayload = { 
        name: `對話 - ${new Date().toLocaleTimeString()}` 
      };
      
      console.log("正在向 RAGFlow 創建 session...");
      
      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(sessionPayload),
      });
      
      if (!response.ok) {
        throw new Error(`創建 session 失敗: ${response.status}`);
      }
      
      const data = await response.json();
      const ragflowSessionId = data?.data?.id;
      
      if (!ragflowSessionId) {
        throw new Error("無法從 RAGFlow 獲取 session_id");
      }
      
      console.log("成功從 RAGFlow 獲取 session ID:", ragflowSessionId);

      // 設置當前會話ID
      setCurrentChatId(ragflowSessionId);
      setSessionId(ragflowSessionId);
      
      return ragflowSessionId;
    } catch (error) {
      console.error("建立 session 失敗:", error);
      throw error;
    }
  };

  // 修改：發送問題並處理回應
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true); // 禁用按鈕，顯示送出中
    let currentSessionId = currentChatId;
    let isNewSession = false; // 追蹤是否是新會話

    // 先將用戶的問題添加到歷史記錄中，立即顯示
    const userQuestion = question;
    setHistory((prevHistory) => [...prevHistory, { question: userQuestion, answer: "正在思考中..." }]);
    setQuestion(""); // 立即清空輸入框

    try {
      // 如果還沒有 session ID，先建立一個
      if (!currentSessionId) {
        currentSessionId = await createSession();
        isNewSession = true; // 標記為新會話
      }

      // 發送對話請求到 RAGFlow，包含 session_id
      const payload = {
        question: userQuestion,
        stream: false,
        session_id: currentSessionId, // 使用 RAGFlow 提供的 session_id
      };

      console.log("發送問題到 RAGFlow，使用 session ID:", currentSessionId, "問題:", userQuestion);

      const response = await fetch(`${API_URL}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      const answer = data?.data?.answer || "無法取得回答";

      // 更新最後一條訊息的回答
      setHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        const lastIndex = newHistory.length - 1;
        if (lastIndex >= 0 && newHistory[lastIndex].question === userQuestion) {
          newHistory[lastIndex] = { question: userQuestion, answer };
        }
        return newHistory;
      });

      // 從 localStorage 獲取用戶信息
      const userId = localStorage.getItem('id') || '1';
      const userName = localStorage.getItem('username') || '未知用戶';
      const projectId = localStorage.getItem('projectId') || 'default';
      
      console.log('發送訊息的用戶資訊:', { userId, userName, projectId });

      // 發送輸入訊息到後端的 socket，包含用戶資訊
      socket.emit("rag_message", {
        messageType: "input",
        message: userQuestion,
        author: userName || "用戶",
        creator: userId,
        room: projectId,
        userName: userName,
        sessionId: currentSessionId
      });

      // 處理後端回傳的訊息 ID，並將回答存回 socket
      socket.once("input_stored", (storedData) => {
        socket.emit("rag_message", {
          messageType: "response",
          message: answer,
          author: "科學助手",
          creator: userId,
          messageId: storedData.id,
          room: projectId,
          userName: userName,
          sessionId: currentSessionId
        });
        
        // 如果是新會話，在訊息保存完成後更新對話歷史列表
        if (isNewSession) {
          console.log("檢測到新會話，3秒後自動更新對話歷史列表");
          setTimeout(() => {
            refreshChatSessions();
          }, 3000); // 3秒後刷新對話歷史
        }
      });

    } catch (error) {
      console.error("處理訊息失敗:", error);
      
      // 如果發生錯誤，更新最後一條訊息顯示錯誤
      setHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        const lastIndex = newHistory.length - 1;
        if (lastIndex >= 0 && newHistory[lastIndex].question === userQuestion) {
          newHistory[lastIndex] = { question: userQuestion, answer: "抱歉，發生錯誤，請稍後再試。" };
        }
        return newHistory;
      });
      
      // 如果是因為 session 問題，重置 sessionId 讓下次重新建立
      if (error.message.includes("session")) {
        setSessionId(null);
        setCurrentChatId(null);
      }
    } finally {
      setIsSubmitting(false); // 啟用按鈕
    }
  };
  
  // 滾動到最新訊息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // 新增：處理對話項目點擊
  const handleChatSessionClick = (sessionId) => {
    console.log(`切換到對話: ${sessionId}`);
    if (sessionId !== currentChatId && !isLoadingHistory) {
      setCurrentChatId(sessionId);
    }
  };

  // 新增：切換全螢幕模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 新增：切換最小化模式
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 新增：確保 SweetAlert2 在全螢幕模式下正確顯示的輔助函數
  const showSwalWithCorrectZIndex = (options) => {
    // 在全螢幕模式下，確保 SweetAlert2 能正確顯示
    if (isFullscreen) {
      // 找到聊天容器並臨時降低其 z-index
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
          // 確保對話框顯示在最頂層 - 使用 didOpen 而不是 willOpen
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
          // 恢復聊天容器的 z-index - 使用 didClose 而不是 willClose
          if (chatContainer && originalZIndex) {
            chatContainer.style.zIndex = originalZIndex;
          } else if (chatContainer) {
            chatContainer.style.zIndex = '9999';
          }
        }
      });
      
      return result;
    } else {
      // 非全螢幕模式使用正常設定
      return Swal.fire(options);
    }
  };

  // 新增：刪除對話功能
  const handleDeleteSession = async (sessionId, sessionName) => {
    const result = await showSwalWithCorrectZIndex({
      title: `確定要刪除「${sessionName}」這個對話嗎？`,
      text: '刪除後將無法恢復！',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '是的，刪除！',
      cancelButtonText: '取消',
      reverseButtons: true
    });
  
    if (!result.isConfirmed) return;
  
    try {
      const userId = localStorage.getItem('id') || '1';
       
      console.log(`正在刪除對話: ${sessionId}`);
      
      // 1. 嘗試從 RAGFlow 刪除會話（允許失敗，因為可能不支持或會話不存在）
      let ragflowDeleteSuccess = false;
      try {
        await deleteSession(sessionId);
        console.log("已從 RAGFlow 刪除會話");
        ragflowDeleteSuccess = true;
      } catch (ragflowError) {
        console.warn("從 RAGFlow 刪除會話失敗:", ragflowError.message);
        // 檢查是否是 405 Method Not Allowed，這表示 RAGFlow 不支持此操作
        if (ragflowError.message.includes("405") || ragflowError.message.includes("Method Not Allowed")) {
          console.log("RAGFlow 不支持刪除操作，這是正常的");
          ragflowDeleteSuccess = true; // 視為成功，因為不支持是正常的
        }
      }
      
      // 2. 從後端資料庫刪除相關訊息
      let dbDeleteSuccess = false;
      try {
        await deleteSessionMessages(userId, sessionId);
        console.log("已從資料庫刪除會話訊息");
        dbDeleteSuccess = true;
      } catch (dbError) {
        console.error("從資料庫刪除會話訊息失敗:", dbError);
        // 如果是 404，可能該會話在資料庫中不存在，也視為成功
        if (dbError.message.includes("404") || dbError.response?.status === 404) {
          console.log("資料庫中沒有找到該會話的訊息，可能已不存在");
          dbDeleteSuccess = true;
        }
      }
      
      // 3. 只要至少有一個操作成功或資源不存在，就更新前端狀態
      if (ragflowDeleteSuccess || dbDeleteSuccess) {
        // 更新前端狀態
        setChatSessions(prevSessions => 
          prevSessions.filter(session => session.id !== sessionId)
        );
        
        // 如果刪除的是當前對話，重置為開場白
        if (currentChatId === sessionId) {
          setCurrentChatId(null);
          setSessionId(null);
          setHistory([{ question: null, answer: OPENING_MESSAGE }]);
        }
        
        console.log("對話刪除完成");
        
        await showSwalWithCorrectZIndex({
          title: '刪除成功！',
          text: `對話「${sessionName}」已成功刪除。`,
          icon: 'success',
          confirmButtonText: '確定'
        });
      } else {
        // 只有在兩個都失敗且不是資源不存在的情況下才顯示錯誤
        throw new Error('無法刪除會話：所有刪除操作都失敗了');
      }

    } catch (error) {
      console.error("刪除對話失敗:", error);
  
      await showSwalWithCorrectZIndex({
        title: '刪除失敗',
        text: '刪除對話失敗，請稍後再試。',
        icon: 'error',
        confirmButtonText: '確定'
      });
    }
  };

  // 新增：刷新對話歷史列表（不影響當前對話狀態）
  const refreshChatSessions = async () => {
    try {
      console.log("正在刷新對話歷史列表...");
      
      const userId = localStorage.getItem('id') || '1';
      const sessions = await getUserSessions(userId);
      
      // 轉換數據格式
      const formattedSessions = sessions.map((session, index) => ({
        id: session.sessionId,
        name: `對話 ${index + 1} - ${session.userName || '未知用戶'}`
      }));
      
      setChatSessions(formattedSessions);
      console.log(`對話歷史列表已更新，共 ${formattedSessions.length} 個對話`);
      
      // 如果當前沒有選中的對話，但有對話列表，選中最新的對話
      if (!currentChatId && formattedSessions.length > 0) {
        const latestSession = formattedSessions[0];
        setCurrentChatId(latestSession.id);
        console.log("自動選中最新對話:", latestSession.id);
      }
    } catch (error) {
      console.error("刷新對話歷史列表失敗:", error);
    }
  };

  // 樣式常數，提高可維護性
  const styles = {
    assistantImage: {
      position: "fixed",
      left: `${position.x}px`,
      top: `${position.y + 150}px`,
      cursor: "pointer",
      userSelect: "none",
      zIndex: 1000,
      width: "80px",
      height: "80px",
      transition: "all 0.3s ease",
      borderRadius: "50%",
      boxShadow: "0 4px 12px rgba(91, 164, 145, 0.3)",
    },
    messagePopup: {
      position: "fixed",
      left: `${position.x - 280}px`,
      top: `${position.y + 150}px`,
      backgroundColor: "#5BA491",
      color: "white",
      padding: "12px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      cursor: "pointer",
      zIndex: 1001,
      maxWidth: "250px",
      animation: "fadeIn 0.3s ease",
      fontWeight: "500",
    },
    chatContainer: {
      position: "fixed",
      // 全螢幕模式時占滿整個視窗，否則使用原來的位置
      left: isFullscreen ? "0" : `${position.x - (showSidebar ? 580 : 380)}px`,
      top: isFullscreen ? "0" : `${position.y - 200}px`,
      width: isFullscreen ? "100vw" : (showSidebar ? "580px" : "380px"),
      height: isFullscreen ? "100vh" : "520px",
      backgroundColor: "white",
      borderRadius: isFullscreen ? "0" : "16px",
      boxShadow: isFullscreen ? "none" : "0 10px 30px rgba(0,0,0,0.2)",
      display: "flex",
      flexDirection: screenWidth < 768 && isFullscreen ? "column" : "row",
      zIndex: isFullscreen ? 9999 : 1002,
      overflow: "hidden",
      transition: "all 0.3s ease",
    },
    sidebar: {
      // RWD: 在全螢幕模式下調整側邊欄寬度
      width: isFullscreen ? (screenWidth >= 768 ? "280px" : "100%") : "220px",
      height: isFullscreen && screenWidth < 768 ? "auto" : "100%",
      minHeight: isFullscreen && screenWidth < 768 ? "180px" : "auto",
      backgroundColor: "#f8f9fa",
      borderTopLeftRadius: isFullscreen ? "0" : "16px",
      borderBottomLeftRadius: isFullscreen ? "0" : "16px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      borderRight: screenWidth < 768 && isFullscreen ? "none" : "1px solid #e9ecef",
      borderBottom: screenWidth < 768 && isFullscreen ? "1px solid #e9ecef" : "none",
    },
    newChatButton: {
      backgroundColor: "#5BA491",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "12px 16px",
      marginBottom: "16px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 4px rgba(91, 164, 145, 0.2)",
    },
    sessionItem: (isActive) => ({
      padding: "12px 14px",
      borderRadius: "8px",
      marginBottom: "6px",
      cursor: "pointer",
      fontSize: "13px",
      backgroundColor: isActive ? "#5BA491" : "transparent",
      color: isActive ? "white" : "#495057",
      transition: "all 0.2s ease",
      wordBreak: "break-word",
      fontWeight: isActive ? "500" : "400",
      border: isActive ? "none" : "1px solid transparent",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }),
    sessionName: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      marginRight: "8px",
    },
    deleteButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "4px",
      border: "none",
      backgroundColor: "transparent",
      color: "#dc3545",
      cursor: "pointer",
      fontSize: "12px",
      opacity: 0,
      transition: "all 0.2s ease",
      padding: 0,
      marginLeft: "4px",
    },
    mainChatArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "white",
      minWidth: 0, // 防止 flex item 溢出
    },
    chatHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: screenWidth < 768 ? "12px 16px" : "16px 20px",
      borderBottom: "1px solid #e9ecef",
      backgroundColor: "#f8f9fa",
      position: "relative",
      minHeight: "60px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      flex: "0 0 auto",
      gap: "8px",
    },
    headerCenter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "1",
      gap: "12px",
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "300px",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      flex: "0 0 auto",
      gap: "4px",
    },
    titleIcon: {
      fontSize: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      backgroundColor: "#5BA491",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(91, 164, 145, 0.2)",
    },
    titleText: {
      fontSize: isFullscreen ? "18px" : "16px",
      fontWeight: "600",
      color: "#343a40",
      margin: 0,
      userSelect: "none",
      whiteSpace: "nowrap",
      display: screenWidth < 480 ? "none" : "block",
    },
    headerButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
      backgroundColor: "transparent",
      color: "#6c757d",
    },
    backButton: {
      backgroundColor: "transparent",
      color: "#5BA491",
      fontSize: "18px",
    },
    controlButtons: {
      minButton: {
        color: "#ffc107",
        fontSize: "16px",
      },
      maxButton: {
        color: "#28a745",
        fontSize: "14px",
      },
      closeButton: {
        color: "#dc3545",
        fontSize: "16px",
      },
    },
    toggleButton: {
      border: "none",
      background: "transparent",
      fontSize: "16px",
      cursor: "pointer",
      color: "#5BA491",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "background-color 0.2s ease",
    },
    fullscreenButton: {
      border: "none",
      background: "transparent",
      fontSize: "16px",
      cursor: "pointer",
      color: "#5BA491",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "all 0.2s ease",
      marginLeft: "8px",
    },
    closeButton: {
      border: "none",
      background: "transparent",
      fontSize: "18px",
      cursor: "pointer",
      color: "#6c757d",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "all 0.2s ease",
    },
    chatContent: {
      flex: 1,
      overflowY: "auto",
      padding: isFullscreen ? (screenWidth < 768 ? "16px" : "24px") : (screenWidth < 768 ? "12px" : "20px"),
      backgroundColor: "#fdfdfd",
    },
    messageContainer: {
      marginBottom: "16px",
    },
    userMessage: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "8px",
    },
    userBubble: {
      backgroundColor: "#5BA491",
      color: "white",
      padding: "12px 16px",
      borderRadius: "18px 18px 4px 18px",
      maxWidth: isFullscreen ? (screenWidth < 768 ? "85%" : "60%") : (screenWidth < 768 ? "85%" : "75%"),
      fontSize: screenWidth < 768 ? "13px" : "14px",
      lineHeight: "1.4",
      boxShadow: "0 2px 8px rgba(91, 164, 145, 0.2)",
    },
    assistantMessage: {
      display: "flex",
      justifyContent: "flex-start",
      marginBottom: "8px",
    },
    assistantBubble: {
      backgroundColor: "white",
      color: "#495057",
      padding: "12px 16px",
      borderRadius: "18px 18px 18px 4px",
      maxWidth: isFullscreen ? (screenWidth < 768 ? "90%" : "70%") : (screenWidth < 768 ? "90%" : "85%"),
      fontSize: screenWidth < 768 ? "13px" : "14px",
      lineHeight: "1.4",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      border: "1px solid #e9ecef",
    },
    inputArea: {
      padding: screenWidth < 768 ? "12px 16px" : "16px 20px",
      borderTop: "1px solid #e9ecef",
      backgroundColor: "white",
      display: "flex",
      alignItems: "center",
      gap: screenWidth < 768 ? "8px" : "12px",
    },
    textInput: {
      flex: 1,
      padding: screenWidth < 768 ? "10px 14px" : "12px 16px",
      border: "1px solid #dee2e6",
      borderRadius: "24px",
      fontSize: screenWidth < 768 ? "13px" : "14px",
      outline: "none",
      transition: "all 0.2s ease",
      backgroundColor: "#f8f9fa",
    },
    submitButton: (isSubmitting) => ({
      padding: screenWidth < 768 ? "10px 16px" : "12px 20px",
      borderRadius: "24px",
      border: "none",
      fontSize: screenWidth < 768 ? "13px" : "14px",
      fontWeight: "600",
      cursor: isSubmitting ? "not-allowed" : "pointer",
      backgroundColor: isSubmitting ? "#dee2e6" : "#5BA491",
      color: "white",
      transition: "all 0.2s ease",
      boxShadow: isSubmitting ? "none" : "0 2px 8px rgba(91, 164, 145, 0.3)",
      minWidth: screenWidth < 768 ? "70px" : "80px",
    }),
    loadingSpinner: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
      color: "#6c757d",
      fontSize: "14px",
    },
  };

  return (
    <>
      <img
        ref={imgRef}
        src={imageSrc}
        alt="科學助手"
        style={styles.assistantImage}
        onClick={handleImageClick}
        onMouseOver={(e) => {
          e.target.style.transform = "scale(1.05)";
          e.target.style.boxShadow = "0 6px 20px rgba(91, 164, 145, 0.4)";
        }}
        onMouseOut={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 4px 12px rgba(91, 164, 145, 0.3)";
        }}
      />

      {showMessage && (
        <div
          style={styles.messagePopup}
          onClick={handleImageClick}
        >
          有什麼問題需要我幫你解答的嗎？
        </div>
      )}

      {showChat && (
        <div 
          style={styles.chatContainer}
          className={`chat-container ${isFullscreen ? 'fullscreen' : ''} ${isMinimized ? 'minimized' : ''}`.trim()}
        >
          {/* 側邊欄 */}
          {showSidebar && (
            <div 
              style={styles.sidebar}
              className="sidebar"
            >
              {/* 新對話按鈕 */}
              <button
                onClick={handleNewConversation}
                style={styles.newChatButton}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#4a9076";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#5BA491";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                ✨ 新對話
              </button>

              {/* 對話列表 */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {isLoadingSessions ? (
                  <div style={styles.loadingSpinner}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ 
                        width: "16px", 
                        height: "16px", 
                        border: "2px solid #5BA491", 
                        borderTop: "2px solid transparent", 
                        borderRadius: "50%", 
                        animation: "spin 1s linear infinite" 
                      }}></div>
                      載入中...
                    </div>
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div style={{ 
                    padding: "20px", 
                    textAlign: "center", 
                    color: "#6c757d", 
                    fontSize: "13px",
                    fontStyle: "italic"
                  }}>
                    🌟 開始你的第一次對話吧！
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        ...styles.sessionItem(currentChatId === session.id),
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                        if (deleteBtn) {
                          deleteBtn.style.opacity = '1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                        if (deleteBtn && currentChatId !== session.id) {
                          deleteBtn.style.opacity = '0';
                        }
                      }}
                    >
                      <div 
                        style={styles.sessionName}
                        onClick={() => handleChatSessionClick(session.id)}
                        onMouseOver={(e) => {
                          if (currentChatId !== session.id) {
                            e.target.parentElement.style.backgroundColor = "#e9ecef";
                            e.target.parentElement.style.borderColor = "#dee2e6";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (currentChatId !== session.id) {
                            e.target.parentElement.style.backgroundColor = "transparent";
                            e.target.parentElement.style.borderColor = "transparent";
                          }
                        }}
                      >
                        💬 {session.name || `對話 ${session.id.substring(0, 8)}`}
                      </div>
                      
                      {/* 刪除按鈕 */}
                      <button
                        className="delete-btn"
                        style={{
                          ...styles.deleteButton,
                          opacity: currentChatId === session.id ? 1 : 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(
                            session.id, 
                            session.name || `對話 ${session.id.substring(0, 8)}`
                          );
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#f8d7da";
                          e.target.style.transform = "scale(1.1)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.transform = "scale(1)";
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
          )}

          {/* 主聊天區域 */}
          <div style={styles.mainChatArea}>
            {/* 頂部工具欄 - 重新設計 */}
            <div 
              style={styles.chatHeader}
              className="chat-header"
            >
              {/* 左側區域 */}
              <div style={styles.headerLeft}>
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  style={{
                    ...styles.headerButton,
                    ...styles.backButton,
                  }}
                  title={showSidebar ? "隱藏側邊欄" : "顯示側邊欄"}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#f1f3f4";
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  {showSidebar ? "◂" : "▸"}
                </button>
              </div>

              {/* 中央區域 - 圖示與標題 */}
              <div style={styles.headerCenter}>
                <h3 style={styles.titleText}>
                  🧑‍🔬科學助手
                </h3>
              </div>

              {/* 右側控制按鈕區域 */}
              <div style={styles.headerRight}>
                {/* 最大化/還原按鈕 */}
                <button
                  onClick={toggleFullscreen}
                  style={{
                    ...styles.headerButton,
                    ...styles.controlButtons.maxButton,
                  }}
                  title={isFullscreen ? "還原視窗" : "最大化"}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#d1e7dd";
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  {isFullscreen ? "🗗" : "🗖"}
                </button>

                {/* 關閉按鈕 */}
                <button 
                  onClick={() => setShowChat(false)} 
                  style={{
                    ...styles.headerButton,
                    ...styles.controlButtons.closeButton,
                  }}
                  title="關閉聊天室"
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#f8d7da";
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 聊天內容區域 */}
            <div 
              style={styles.chatContent}
              className="chat-content"
            >
              {isLoadingHistory ? (
                <div style={styles.loadingSpinner}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      border: "2px solid #5BA491", 
                      borderTop: "2px solid transparent", 
                      borderRadius: "50%", 
                      animation: "spin 1s linear infinite" 
                    }}></div>
                    載入對話歷史...
                  </div>
                </div>
              ) : (
                <>
                  {history.map((item, index) => (
                    <div key={index} style={styles.messageContainer}>
                      {item.question && (
                        <div style={styles.userMessage}>
                          <div style={styles.userBubble}>
                            {item.question}
                          </div>
                        </div>
                      )}
                      {item.answer && (
                        <div style={styles.assistantMessage}>
                          <div style={styles.assistantBubble}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: ({ node, className, children, ...props }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  // 移除不應該傳遞給 DOM 的屬性
                                  const { jsx, ...domProps } = props;
                                  return match ? (
                                    <pre style={{ 
                                      backgroundColor: "#f8f9fa", 
                                      padding: "12px", 
                                      borderRadius: "8px", 
                                      margin: "8px 0", 
                                      overflowX: "auto",
                                      border: "1px solid #e9ecef"
                                    }}>
                                      <code style={{ 
                                        backgroundColor: "transparent", 
                                        color: "#495057", 
                                        fontSize: "12px",
                                        fontFamily: "Monaco, Consolas, 'Courier New', monospace"
                                      }} {...domProps}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code style={{ 
                                      backgroundColor: "#f1f3f4", 
                                      color: "#5f6368", 
                                      padding: "2px 6px", 
                                      borderRadius: "4px", 
                                      fontSize: "12px",
                                      fontFamily: "Monaco, Consolas, 'Courier New', monospace"
                                    }} {...domProps}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                                ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>{children}</ul>,
                                ol: ({ children }) => <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>{children}</ol>,
                                li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                                h1: ({ children }) => <h1 style={{ fontSize: "16px", fontWeight: "600", margin: "16px 0 8px 0", color: "#343a40" }}>{children}</h1>,
                                h2: ({ children }) => <h2 style={{ fontSize: "15px", fontWeight: "600", margin: "16px 0 8px 0", color: "#343a40" }}>{children}</h2>,
                                h3: ({ children }) => <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "16px 0 8px 0", color: "#343a40" }}>{children}</h3>,
                                blockquote: ({ children }) => <blockquote style={{ borderLeft: "4px solid #5BA491", paddingLeft: "16px", margin: "8px 0", fontStyle: "italic", color: "#6c757d" }}>{children}</blockquote>,
                                strong: ({ children }) => <strong style={{ fontWeight: "600", color: "#343a40" }}>{children}</strong>,
                              }}
                            >
                              {item.answer}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef}></div>
                </>
              )}
            </div>

            {/* 輸入區域 */}
            <form 
              onSubmit={handleSubmit} 
              style={styles.inputArea}
              className="input-area"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="輸入您的問題..."
                style={styles.textInput}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5BA491";
                  e.target.style.backgroundColor = "white";
                  e.target.style.boxShadow = "0 0 0 3px rgba(91, 164, 145, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#dee2e6";
                  e.target.style.backgroundColor = "#f8f9fa";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                style={styles.submitButton(isSubmitting)}
                disabled={isSubmitting}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.target.style.backgroundColor = "#4a9076";
                    e.target.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) {
                    e.target.style.backgroundColor = "#5BA491";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                {isSubmitting ? "送出中..." : "送出"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 添加 CSS 動畫和 RWD 樣式 */}
      <style jsx={true}>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .markdown-content p:last-child {
          margin-bottom: 0 !important;
        }

        /* SweetAlert2 自訂樣式 - 確保在全螢幕模式下可見 */
        .swal2-container-custom {
          z-index: 99999 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        .swal2-popup-custom {
          z-index: 99999 !important;
          position: relative !important;
        }

        /* 強制 SweetAlert2 顯示在最頂層 */
        .swal2-container {
          z-index: 99999 !important;
        }

        .swal2-container.swal2-shown {
          z-index: 99999 !important;
        }

        .swal2-popup {
          z-index: 99999 !important;
        }
        
        .swal2-backdrop {
          z-index: 99998 !important;
        }

        /* 確保 backdrop 不會被遮住 */
        .swal2-container:not(.swal2-backdrop-show) .swal2-backdrop {
          z-index: 99998 !important;
        }

        /* 針對全螢幕模式的特殊處理 */
        body.swal2-shown .chat-container.fullscreen {
          z-index: 9998 !important;
        }

        /* 全螢幕模式覆蓋樣式 */
        .chat-container.fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
          z-index: 9999 !important;
          box-shadow: none !important;
        }

        /* 最小化模式樣式 */
        .chat-container.minimized {
          height: 60px !important;
          overflow: hidden !important;
        }
        
        .chat-container.minimized .chat-content,
        .chat-container.minimized .input-area,
        .chat-container.minimized .sidebar {
          display: none !important;
        }

        /* 標題列 hover 效果 */
        .chat-header:hover {
          background-color: #f1f3f4 !important;
        }

        /* 按鈕 hover 效果增強 */
        .chat-header button {
          position: relative;
          overflow: hidden;
        }

        .chat-header button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(91, 164, 145, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease;
        }

        .chat-header button:hover::before {
          width: 40px;
          height: 40px;
        }

        /* 對話項目 hover 效果 */
        .chat-container .sidebar .session-item {
          position: relative;
        }
        
        .chat-container .sidebar .session-item:hover .delete-btn {
          opacity: 1 !important;
        }
        
        .delete-btn {
          transition: all 0.2s ease !important;
        }
        
        .delete-btn:hover {
          background-color: #f8d7da !important;
          transform: scale(1.1) !important;
        }

        /* RWD 媒體查詢 */
        @media (max-width: 768px) {
          .chat-container.fullscreen {
            flex-direction: column !important;
          }
          
          .chat-container.fullscreen .sidebar {
            width: 100% !important;
            height: auto !important;
            min-height: 180px !important;
            border-right: none !important;
            border-bottom: 1px solid #e9ecef !important;
            border-radius: 0 !important;
          }
        }

        @media (max-width: 480px) {
          .chat-header {
            padding: 8px 12px !important;
            min-height: 50px !important;
          }
          
          .chat-header .header-center {
            max-width: 200px !important;
          }
          
          .chat-header button {
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
          }
          
          .title-icon {
            width: 24px !important;
            height: 24px !important;
            font-size: 16px !important;
          }
          
          .chat-content {
            padding: 12px !important;
          }
          .input-area {
            padding: 8px 12px !important;
          }
        }

        /* 防止全螢幕時背景滾動 */
        ${isFullscreen ? `
          body {
            overflow: hidden !important;
          }
        ` : ''}

        /* 平滑過渡動畫 */
        .chat-container {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* 在全螢幕模式添加漸入效果 */
        .chat-container.fullscreen {
          animation: fullscreenExpand 0.3s ease-out;
        }

        /* 最小化動畫 */
        .chat-container.minimized {
          animation: minimizeCollapse 0.3s ease-out;
        }

        @keyframes fullscreenExpand {
          from {
            transform: scale(0.95);
            opacity: 0.8;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes minimizeCollapse {
          from {
            height: 520px;
          }
          to {
            height: 60px;
          }
        }

        /* 漸變背景動畫 */
        .chat-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 2px solid #dee2e6;
        }

        /* 增強視覺層次 */
        .title-icon {
          background: linear-gradient(135deg, #5BA491 0%, #4a9076 100%) !important;
          color: white !important;
          box-shadow: 0 4px 8px rgba(91, 164, 145, 0.3) !important;
        }
      `}</style>
    </>
  );
};

export default DraggableImage;