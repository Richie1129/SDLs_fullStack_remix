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

const DraggableImage = ({ containerRef }) => {
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
  const dragStateRef = useRef({ offsetX: 0, offsetY: 0, containerRect: null, imgW: 0, imgH: 0, lastLeft: 0, lastTop: 0 });
  const dragIntentRef = useRef({ moved: false, startX: 0, startY: 0 });
  const draggingRef = useRef(false);
  const chatClosedByDragRef = useRef(false);
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

    // 每 10 秒顯示一次訊息（拖曳中不顯示）
    messageTimeoutRef.current = setInterval(() => {
      if (!showChat && !draggingRef.current) {
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
    if (dragIntentRef.current.moved) return; // 拖曳後不觸發點擊
    setShowMessage(false);
    setShowChat(true);
  };

  // 動態計算聊天視窗位置，確保不被裁切
  const computeChatPosition = () => {
    if (isFullscreen) {
      return { left: 0, top: 0 };
    }
    const padding = 8;
    const imgW = 80; // 與 w-20 一致
    const containerW = showSidebar ? 580 : 380;
    const containerH = 520;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // 優先顯示在圖示左側；若左側空間不足，改顯示在右側
    let left;
    const preferLeft = position.x - containerW; // 貼齊左側（與現有邏輯一致）
    const canPlaceLeft = preferLeft >= padding;
    const rightSideLeft = position.x + imgW + padding;
    const canPlaceRight = rightSideLeft + containerW + padding <= viewW;

    if (canPlaceLeft) {
      left = preferLeft;
    } else if (canPlaceRight) {
      left = rightSideLeft;
    } else {
      // 左右都不夠，強制夾在畫面內
      left = Math.min(
        Math.max(padding, preferLeft),
        viewW - containerW - padding
      );
    }

    // 垂直方向也做夾取，避免超出上下邊界
    let top = position.y - 200;
    top = Math.min(
      Math.max(padding, top),
      viewH - containerH - padding
    );
    return { left, top };
  };

  // 動態計算氣泡提示位置，避免被裁切
  const computeMessagePosition = () => {
    const padding = 8;
    const bubbleW = 300; // 與 max-w-[300px] 一致
    const imgW = 80;
    const viewW = window.innerWidth;
    let left;
    const preferLeft = position.x - (bubbleW - 20); // 原本約 position.x - 280
    const canPlaceLeft = preferLeft >= padding;
    const rightSideLeft = position.x + imgW + padding;
    const canPlaceRight = rightSideLeft + bubbleW + padding <= viewW;
    if (canPlaceLeft) left = preferLeft;
    else if (canPlaceRight) left = rightSideLeft;
    else left = Math.min(Math.max(padding, preferLeft), viewW - bubbleW - padding);

    // 垂直位置維持靠近圖示下方
    const top = position.y + 165;
    return { left, top };
  };

  // 拖曳處理：限制在 Kanban 容器內
  const getBounds = () => {
    const containerRect = dragStateRef.current.containerRect || (containerRef?.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight });
    return { containerRect };
  };

  const onMouseDown = (e) => {
    const imgEl = imgRef.current;
    if (!imgEl) return;
    e.preventDefault();
    const rect = imgEl.getBoundingClientRect();
    const containerRect = containerRef?.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
    dragStateRef.current.offsetX = e.clientX - rect.left;
    dragStateRef.current.offsetY = e.clientY - rect.top;
    dragStateRef.current.containerRect = containerRect;
    dragStateRef.current.imgW = imgEl.offsetWidth || 0;
    dragStateRef.current.imgH = imgEl.offsetHeight || 0;
    dragStateRef.current.lastLeft = rect.left;
    dragStateRef.current.lastTop = rect.top;
    dragIntentRef.current.startX = e.clientX;
    dragIntentRef.current.startY = e.clientY;
    dragIntentRef.current.moved = false;
    draggingRef.current = true;
    setIsDragging(true);
    // 拖曳開始時隱藏提示泡泡
    setShowMessage(false);
    chatClosedByDragRef.current = false;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const bounds = getBounds();
    if (!bounds) return;
    const { containerRect } = bounds;
    const imgEl = imgRef.current;
    const imgW = dragStateRef.current.imgW || imgEl?.offsetWidth || 0;
    const imgH = dragStateRef.current.imgH || imgEl?.offsetHeight || 0;
    let targetLeft = e.clientX - dragStateRef.current.offsetX;
    let targetTop = e.clientY - dragStateRef.current.offsetY;

    // 限制在容器內（容器座標是相對視窗）
    const minLeft = containerRect.left;
    const maxLeft = containerRect.right - imgW;
    const minTop = containerRect.top;
    const maxTop = containerRect.bottom - imgH;
    if (targetLeft < minLeft) targetLeft = minLeft;
    if (targetLeft > maxLeft) targetLeft = maxLeft;
    if (targetTop < minTop) targetTop = minTop;
    if (targetTop > maxTop) targetTop = maxTop;

    // 小位移視為點擊，不標記為拖曳
    const moveDX = Math.abs(e.clientX - dragIntentRef.current.startX);
    const moveDY = Math.abs(e.clientY - dragIntentRef.current.startY);
    if (moveDX > 3 || moveDY > 3) {
      dragIntentRef.current.moved = true;
      // 正在拖曳時關閉已開啟的聊天
      if (!chatClosedByDragRef.current) {
        setShowChat(false);
        chatClosedByDragRef.current = true;
      }
      // 拖曳中持續隱藏提示泡泡
      if (showMessage) setShowMessage(false);
    }

    // 立即以 DOM 方式移動，避免頻繁 re-render 造成卡頓
    dragStateRef.current.lastLeft = targetLeft;
    dragStateRef.current.lastTop = targetTop;
    if (imgEl) {
      imgEl.style.left = `${Math.round(targetLeft)}px`;
      imgEl.style.top = `${Math.round(targetTop)}px`;
    }
  };

  const onMouseUp = () => {
    draggingRef.current = false;
    setIsDragging(false);
    chatClosedByDragRef.current = false;
    // 將最終位置同步到 React 狀態
    const finalLeft = dragStateRef.current.lastLeft;
    const finalTop = dragStateRef.current.lastTop;
    if (Number.isFinite(finalLeft) && Number.isFinite(finalTop)) {
      setPosition({ x: Math.round(finalLeft), y: Math.round(finalTop - 150) });
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
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

      // 從 localStorage 獲取用戶與專案資訊並做型別/有效性檢查
      const userIdRaw = localStorage.getItem('id') ?? localStorage.getItem('userId');
      const userId = Number(userIdRaw);
      const userName = localStorage.getItem('username') || '未知用戶';
      let projectIdRaw = localStorage.getItem('projectId');
      // 後備：從 URL 提取 projectId
      if (!projectIdRaw) {
        const m = window.location.pathname.match(/\/project\/(\d+)/);
        if (m && m[1]) projectIdRaw = m[1];
      }
      const projectIdNum = Number(projectIdRaw);

      const payloadInput = {
        messageType: "input",
        message: userQuestion,
        author: userName || "用戶",
        creator: Number.isFinite(userId) ? userId : undefined,
        // room 用於廣播；保持為字串但僅在有效時提供
        room: Number.isFinite(projectIdNum) ? String(projectIdNum) : undefined,
        // 明確提供數字型別的 projectId 以供後端 DB 使用
        projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        userName,
        sessionId: currentSessionId,
      };

      console.log('發送訊息的用戶資訊:', {
        userId: payloadInput.creator,
        userName,
        projectId: payloadInput.projectId,
        room: payloadInput.room,
      });

      socket.emit("rag_message", payloadInput);

      // 處理後端回傳的訊息 ID，並將回答存回 socket
      socket.once("input_stored", (storedData) => {
        const payloadResponse = {
          messageType: "response",
          message: answer,
          author: "科學助手",
          creator: Number.isFinite(userId) ? userId : undefined,
          messageId: storedData?.id,
          room: Number.isFinite(projectIdNum) ? String(projectIdNum) : undefined,
          projectId: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
          userName,
          sessionId: currentSessionId,
        };
        socket.emit("rag_message", payloadResponse);
        
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

  // Tailwind-only styling; keep inline style only for dynamic left/top positions

  return (
    <>
      <img
        ref={imgRef}
        src={imageSrc}
        alt="科學助手"
        className={`fixed cursor-pointer select-none z-[1000] w-20 h-20 rounded-full shadow-[0_4px_12px_rgba(91,164,145,0.3)] hover:scale-105 hover:shadow-[0_6px_20px_rgba(91,164,145,0.4)] ${isDragging ? 'transition-none' : 'transition-all duration-300 ease-in-out'}`}
        style={{ left: position.x, top: position.y + 150 }}
        onClick={handleImageClick}
        onMouseDown={onMouseDown}
        draggable={false}
      />

      {showMessage && (
        <div
          className="fixed bg-[#5BA491] text-white px-3 py-3 rounded-xl text-sm shadow-[0_6px_20px_rgba(0,0,0,0.15)] cursor-pointer z-[1001] max-w-[300px] font-medium animate-fade-in"
          style={computeMessagePosition()}
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

      {showChat && (
        <div 
          className={`chat-container fixed ${
            isFullscreen
              ? 'w-screen rounded-none shadow-none z-[9999]'
              : `${showSidebar ? 'w-[580px]' : 'w-[380px]'} rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-[1002]`
          } ${isMinimized ? 'h-[60px] overflow-hidden' : (isFullscreen ? 'h-screen' : 'h-[520px]')} bg-white transition-all duration-300 ease-in-out flex ${isFullscreen && screenWidth < 768 ? 'flex-col' : 'flex-row'}`.trim()}
          style={isFullscreen ? { left: 0, top: 0 } : computeChatPosition()}
        >
          {/* 側邊欄 */}
          {showSidebar && (
            <div 
              className={`sidebar ${isMinimized ? 'hidden' : ''} ${isFullscreen ? (screenWidth >= 768 ? 'w-[280px] h-full' : 'w-full h-auto min-h-[180px] border-b border-[#e9ecef]') : 'w-[220px] h-full border-r border-[#e9ecef]'} ${isFullscreen ? 'rounded-none' : 'rounded-l-2xl'} bg-[#f8f9fa] p-4 flex flex-col`}
            >
              {/* 新對話按鈕 */}
              <button
                onClick={handleNewConversation}
                className="bg-[#5BA491] text-white border-0 rounded-lg py-3 px-4 mb-4 cursor-pointer text-sm font-semibold transition-all shadow-[0_2px_4px_rgba(91,164,145,0.2)] hover:bg-[#4a9076] hover:-translate-y-px"
              >
                ✨ 新對話
              </button>

              {/* 對話列表 */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center h-full text-[#6c757d] text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#5BA491] border-t-transparent rounded-full animate-spin"></div>
                      載入中...
                    </div>
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="p-5 text-center text-[#6c757d] text-[13px] italic">
                    🌟 開始你的第一次對話吧！
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`session-item group p-[12px_14px] rounded mb-1.5 cursor-default text-[13px] transition-all break-words flex items-center justify-between ${currentChatId === session.id ? 'bg-[#5BA491] text-white font-medium' : 'text-[#495057] border border-transparent hover:bg-[#e9ecef] hover:border-[#dee2e6]'}`}
                    >
                      <div 
                        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap mr-2"
                        onClick={() => handleChatSessionClick(session.id)}
                      >
                        💬 {session.name || `對話 ${session.id.substring(0, 8)}`}
                      </div>
                      
                      {/* 刪除按鈕 */}
                      <button
                        className={`delete-btn flex items-center justify-center w-5 h-5 rounded border-0 bg-transparent text-[#dc3545] cursor-pointer text-[12px] transition-all ml-1 ${currentChatId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(
                            session.id, 
                            session.name || `對話 ${session.id.substring(0, 8)}`
                          );
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
          <div className="flex flex-1 flex-col bg-white min-w-0">
            {/* 頂部工具欄 - 重新設計 */}
            <div 
              className={`chat-header flex justify-between items-center ${screenWidth < 768 ? 'px-4 py-3' : 'px-5 py-4'} border-b border-[#e9ecef] bg-[#f8f9fa] relative min-h-[60px]`}
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

              {/* 中央區域 - 圖示與標題 */}
              <div className="header-center flex items-center justify-center flex-1 gap-3 absolute left-1/2 -translate-x-1/2 max-w-[300px]">
                <h3 className={`${isFullscreen ? 'text-[18px]' : 'text-[16px]'} font-semibold text-[#343a40] m-0 select-none whitespace-nowrap ${screenWidth < 480 ? 'hidden' : 'block'}`}>
                  🧑‍🔬科學助手
                </h3>
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
                  onClick={() => setShowChat(false)} 
                  className="flex items-center justify-center w-8 h-8 rounded cursor-pointer text-[16px] font-medium transition-all bg-transparent text-[#dc3545] hover:bg-[#f8d7da] hover:scale-110"
                  title="關閉聊天室"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 聊天內容區域 */}
            <div 
              className={`chat-content ${isMinimized ? 'hidden' : ''} flex-1 overflow-y-auto ${isFullscreen ? (screenWidth < 768 ? 'p-4' : 'p-6') : (screenWidth < 768 ? 'p-3' : 'p-5')} bg-[#fdfdfd]`}
            >
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full text-[#6c757d] text-[14px]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#5BA491] border-t-transparent rounded-full animate-spin"></div>
                    載入對話歷史...
                  </div>
                </div>
              ) : (
                <>
                  {history.map((item, index) => (
                    <div key={index} className="mb-4">
                      {item.question && (
                        <div className="flex justify-end mb-2">
                          <div className={`bg-[#5BA491] text-white px-4 py-3 rounded-[18px_18px_4px_18px] ${isFullscreen ? (screenWidth < 768 ? 'max-w-[85%]' : 'max-w-[60%]') : (screenWidth < 768 ? 'max-w-[85%]' : 'max-w-[75%]')} ${screenWidth < 768 ? 'text-[13px]' : 'text-[14px]'} leading-[1.4] shadow-[0_2px_8px_rgba(91,164,145,0.2)]`}>
                            {item.question}
                          </div>
                        </div>
                      )}
                      {item.answer && (
                        <div className="flex justify-start mb-2">
                          <div className={`bg-white text-[#495057] px-4 py-3 rounded-[18px_18px_18px_4px] ${isFullscreen ? (screenWidth < 768 ? 'max-w-[90%]' : 'max-w-[70%]') : (screenWidth < 768 ? 'max-w-[90%]' : 'max-w-[85%]')} ${screenWidth < 768 ? 'text-[13px]' : 'text-[14px]'} leading-[1.4] shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-[#e9ecef]`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: ({ node, className, children, ...props }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  // 移除不應該傳遞給 DOM 的屬性
                                  const { jsx, ...domProps } = props;
                                  return match ? (
                                    <pre className="bg-[#f8f9fa] p-3 rounded-lg my-2 overflow-x-auto border border-[#e9ecef]">
                                      <code className="bg-transparent text-[#495057] text-[12px] font-mono" {...domProps}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code className="bg-[#f1f3f4] text-[#5f6368] px-[6px] py-[2px] rounded text-[12px] font-mono" {...domProps}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p className="m-0 mb-2">{children}</p>,
                                ul: ({ children }) => <ul className="my-2 pl-5">{children}</ul>,
                                ol: ({ children }) => <ol className="my-2 pl-5">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                h1: ({ children }) => <h1 className="text-[16px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-[15px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-[14px] font-semibold my-4 mt-4 mb-2 text-[#343a40]">{children}</h3>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-[#5BA491] pl-4 my-2 italic text-[#6c757d]">{children}</blockquote>,
                                strong: ({ children }) => <strong className="font-semibold text-[#343a40]">{children}</strong>,
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
              className={`input-area ${isMinimized ? 'hidden' : ''} ${screenWidth < 768 ? 'px-4 py-3 gap-2' : 'px-5 py-4 gap-3'} border-t border-[#e9ecef] bg-white flex items-center`}
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="輸入您的問題..."
                className={`flex-1 ${screenWidth < 768 ? 'py-[10px] px-[14px] text-[13px]' : 'py-3 px-4 text-[14px]'} border border-[#dee2e6] rounded-full outline-none transition-all bg-[#f8f9fa] focus:border-[#5BA491] focus:bg-white focus:ring-2 focus:ring-[rgba(91,164,145,0.1)]`}
              />
              <button
                type="submit"
                className={`${screenWidth < 768 ? 'py-[10px] px-4 text-[13px] min-w-[70px]' : 'py-3 px-5 text-[14px] min-w-[80px]'} rounded-full border-0 font-semibold ${isSubmitting ? 'bg-[#dee2e6] cursor-not-allowed shadow-none' : 'bg-[#5BA491] cursor-pointer shadow-[0_2px_8px_rgba(91,164,145,0.3)] hover:bg-[#4a9076] hover:-translate-y-px'} text-white transition-all`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "送出中..." : "送出"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 移除內嵌 <style>：轉為 Tailwind 類與配置 */}
    </>
  );
};

export default DraggableImage;
