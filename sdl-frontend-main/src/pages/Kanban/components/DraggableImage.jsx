import React, { useState, useRef, useEffect } from "react";
import { socket } from "../../../utils/socket";
import { getUserSessions, getRagMessageBySession, testConnection } from "../../../api/rag";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = "/proxy/api/v1/chats/a159fe08e2d411efb3910242ac120004"; // 指向後端代理
const API_KEY = "ragflow-U0ZTc4MzdlZTJjYjExZWZiMzcyMDI0Mm"; // 保持不變，後端已使用此 Key

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
  
  const imgRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    // 設定開場白
    const openingMessage =
      "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
    
    // 只在組件初始化時設置開場白
    if (history.length === 0) {
      setHistory([{ question: null, answer: openingMessage }]);
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
  }, [showChat, chatSessions.length, isLoadingSessions]);

  // 新增：當 currentChatId 改變時載入對話歷史
  useEffect(() => {
    if (currentChatId && currentChatId !== sessionId && !isLoadingHistory) {
      loadChatHistory(currentChatId);
      setSessionId(currentChatId);
    }
  }, [currentChatId, sessionId, isLoadingHistory]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prevPosition) => ({
        x: window.innerWidth - 100, // 保持貼齊右側
        y: prevPosition.y, // 保持原來的 Y 軸位置
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        // 不自動創建新對話，讓用戶手動點擊「新對話」按鈕
        // 設置開場白但不設置 currentChatId
        const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
        setHistory([{ question: null, answer: openingMessage }]);
      } else {
        console.log(`找到 ${sessions.length} 個歷史對話`);
        
        // 轉換數據格式以符合 UI 需求
        const formattedSessions = sessions.map((session, index) => ({
          id: session.sessionId,
          name: `對話 ${index + 1} - ${session.userName || '未知用戶'}`
        }));
        
        setChatSessions(formattedSessions);
        // 設置第一個對話為當前對話
        if (!currentChatId) {
          setCurrentChatId(formattedSessions[0].id);
        }
      }
    } catch (error) {
      console.error("獲取對話列表失敗:", error);
      console.error("錯誤詳情:", error.response?.data || error.message);
      setChatSessions([]);
      // 設置開場白作為默認狀態
      const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
      setHistory([{ question: null, answer: openingMessage }]);
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
      const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
      
      // 先添加開場白
      conversationHistory.push({ question: null, answer: openingMessage });

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
      const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
      setHistory([{ question: null, answer: openingMessage }]);
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
      const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
      setHistory([{ question: null, answer: openingMessage }]);
      
      // 將新會話添加到會話列表
      const newSession = {
        id: newSessionId,
        name: `新對話 - ${new Date().toLocaleTimeString()}`
      };
      setChatSessions(prevSessions => [newSession, ...prevSessions]);
      
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

    try {
      // 如果還沒有 session ID，先建立一個
      if (!currentSessionId) {
        currentSessionId = await createSession();
      }

      // 發送對話請求到 RAGFlow，包含 session_id
      const payload = {
        question,
        stream: false,
        session_id: currentSessionId, // 使用 RAGFlow 提供的 session_id
      };

      console.log("發送問題到 RAGFlow，使用 session ID:", currentSessionId, "問題:", question);

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

      // 更新訊息記錄
      setHistory((prevHistory) => [...prevHistory, { question, answer }]);

      // 從 localStorage 獲取用戶信息
      const userId = localStorage.getItem('id') || '1';
      const userName = localStorage.getItem('username') || '未知用戶';
      const projectId = localStorage.getItem('projectId') || 'default';
      
      console.log('發送訊息的用戶資訊:', { userId, userName, projectId });

      // 發送輸入訊息到後端的 socket，包含用戶資訊
      socket.emit("rag_message", {
        messageType: "input",
        message: question,
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
      });

      setQuestion(""); // 清空輸入框
    } catch (error) {
      console.error("處理訊息失敗:", error);
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

  return (
    <>
      <img
        ref={imgRef} // 參考 (Ref)，用於操作 DOM 元素
        src={imageSrc} // 設定圖片來源
        alt="draggable" // 圖片的替代文字
        style={{
          position: "fixed", // 固定位置，不隨滾動改變
          left: `${position.x}px`, // X 軸位置
          top: `${position.y + 150}px`, // Y 軸位置
          cursor: "pointer", // 滑鼠樣式設為可點擊
          userSelect: "none", // 禁止選取
          zIndex: 1000, // 控制層級，確保圖片在其他元素之上
          width: "80px", // 設定圖片寬度
          height: "80px", // 設定圖片高度
          transition: "left 0.5s ease, top 0.5s ease", // 平滑移動動畫
        }}
        onClick={handleImageClick} // 點擊圖片時觸發的事件
      />

      {showMessage && ( // 如果 showMessage 為 true，則顯示提示訊息
        <div
          style={{
            position: "fixed", // 固定位置
            left: `${position.x - 250}px`, // 使訊息顯示在圖片左側
            top: `${position.y + 150}px`, // Y 軸位置與圖片對齊
            backgroundColor: "#5BA491", // 設定背景顏色
            color: "white", // 設定文字顏色
            padding: "10px", // 內距
            borderRadius: "10px", // 圓角
            fontSize: "14px", // 文字大小
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)", // 陰影效果
            cursor: "pointer", // 設定為可點擊
            zIndex: 1001, // 層級比圖片高，確保顯示在圖片上方
          }}
          onClick={handleImageClick} // 點擊時可能會關閉或觸發其他功能
        >
          有什麼問題需要我幫你解答的嗎？
        </div>
      )}

      {showChat && ( // 如果 showChat 為 true，則顯示對話框
        <div
          style={{
            position: "fixed", // 固定位置
            left: `${position.x - (showSidebar ? 550 : 350)}px`, // 根據側邊欄狀態調整位置
            top: `${position.y - 200}px`, // 讓對話框與圖片對齊
            width: showSidebar ? "550px" : "350px", // 根據側邊欄狀態調整寬度
            height: "500px", // 設定對話框高度
            backgroundColor: "white", // 設定背景顏色
            borderRadius: "10px", // 設定圓角
            boxShadow: "0px 4px 10px rgba(0,0,0,0.2)", // 設定陰影效果
            display: "flex", // 使用 flex 排版
            flexDirection: "row", // 水平排列
            zIndex: 1002, // 層級最高，確保對話框顯示在最上層
            overflow: "hidden",
          }}
        >
          {/* 側邊欄 */}
          {showSidebar && (
            <div
              style={{
                width: "200px",
                backgroundColor: "#E0E0E0",
                borderTopLeftRadius: "10px",
                borderBottomLeftRadius: "10px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* 新對話按鈕 */}
              <button
                onClick={handleNewConversation}
                style={{
                  backgroundColor: "#5BA491",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  marginBottom: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#4a9076"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#5BA491"}
              >
                + 新對話
              </button>

              {/* 對話列表 */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {isLoadingSessions ? (
                  <div style={{ 
                    padding: "20px", 
                    textAlign: "center", 
                    color: "#666", 
                    fontSize: "13px" 
                  }}>
                    載入對話列表...
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div style={{ 
                    padding: "20px", 
                    textAlign: "center", 
                    color: "#666", 
                    fontSize: "13px" 
                  }}>
                    暫無對話記錄
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleChatSessionClick(session.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "5px",
                        marginBottom: "5px",
                        cursor: "pointer",
                        fontSize: "13px",
                        backgroundColor: currentChatId === session.id ? "#5BA491" : "transparent",
                        color: currentChatId === session.id ? "white" : "#333",
                        transition: "all 0.2s ease",
                        wordBreak: "break-word",
                      }}
                      onMouseOver={(e) => {
                        if (currentChatId !== session.id) {
                          e.target.style.backgroundColor = "#D0D0D0";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentChatId !== session.id) {
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {session.name || `對話 ${session.id.substring(0, 8)}`}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 主聊天區域 */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
          >
            {/* 頂部工具欄 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              {/* 側邊欄切換按鈕 */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#5BA491",
                  padding: "2px 6px",
                }}
              >
                {showSidebar ? "◀" : "▶"}
              </button>
              
              <h3 style={{ fontSize: "16px", color: "#5BA491", margin: 0 }}>科學助手</h3>
              
              {/* 關閉按鈕 */}
              <button 
                onClick={() => setShowChat(false)} 
                style={{ 
                  border: "none", 
                  background: "transparent", 
                  fontSize: "16px", 
                  cursor: "pointer", 
                  color: "#5BA491" 
                }}
              >
                ✖
              </button>
            </div>

            {/* 聊天內容區域 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "5px", fontSize: "14px" }}>
              {isLoadingHistory ? (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  height: "100%", 
                  color: "#666" 
                }}>
                  載入對話歷史...
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="space-y-4">
                  {item.question && (
                    <div className="flex justify-end">
                      <div
                        className="p-3 rounded-lg shadow max-w-lg"
                        style={{ backgroundColor: "#5BA491", color: "white" }}
                      >
                        <p>{item.question}</p>
                      </div>
                    </div>
                  )}
                  {item.answer && (
                <div className="flex justify-start">
                  <div
                    className="p-3 rounded-lg shadow max-w-lg"
                    style={{ backgroundColor: "#F0F0F0", color: "#333" }}
                  >
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // Custom components for better styling
                              code: ({ node, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return match ? (
                                  <pre className="bg-gray-100 p-3 rounded my-2 overflow-x-auto">
                                    <code className="bg-transparent text-gray-800 text-xs" {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                ) : (
                                  <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 pl-4 list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              h1: ({ children }) => <h1 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2 first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-2 first:mt-0">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 my-2 italic">{children}</blockquote>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              // 如果需要，可以在這裡添加更多 HTML 元素的自定義組件
                            }}
                          >
                            {item.answer}
                          </ReactMarkdown>
                        </div>
                  </div>
                </div>
              )}
            </div>
                ))
              )}
            <div ref={chatEndRef}></div>
          </div>

            {/* 輸入區域 */}
          <form
            onSubmit={handleSubmit}
            className="p-4 bg-white border-t flex items-center"
              style={{ padding: "10px 0 0 0", borderTop: "1px solid #E0E0E0" }}
            >
            <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="輸入您的問題..."
                className="flex-1 p-2 border border-gray-300 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
            />
            <button
                type="submit"
                className={`py-1 px-3 rounded-lg shadow transition-all text-white ${
                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#5BA491] hover:bg-[#4a9076]"
                }`}
                disabled={isSubmitting}
            >
                {isSubmitting ? "送出中..." : "送出"}
            </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DraggableImage;