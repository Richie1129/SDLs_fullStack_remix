import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../../../../../utils/socket";
import {
  getUserSessions,
  getRagMessageBySession,
  testConnection,
  deleteSession,
  deleteSessionMessages,
  createNewSessionInDB
} from "../../../../../api/rag";
import { getCurrentUsername } from "../../../../../utils/userUtils";

const API_URL = "/proxy/api/v1/chats/a159fe08e2d411efb3910242ac120004";
const OPENING_MESSAGE = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";

const headers = {
  "Content-Type": "application/json",
};

export const useChatSession = () => {
  const [history, setHistory] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ 外部連結開關狀態（從 localStorage 讀取，預設關閉）
  const [enableExternalLinks, setEnableExternalLinks] = useState(() => {
    const saved = localStorage.getItem('science-assistant-external-links');
    return saved === 'true';
  });

  const chatEndRef = useRef(null);

  // ✅ 當開關狀態改變時，儲存到 localStorage
  useEffect(() => {
    localStorage.setItem('science-assistant-external-links', enableExternalLinks);
  }, [enableExternalLinks]);

  // ✅ 切換開關函數
  const toggleExternalLinks = () => {
    setEnableExternalLinks(prev => !prev);
  };

  // 初始化歷史記錄為開場白
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
    }
  }, []);

  // 自動滾動到最新訊息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // 當 currentChatId 改變時載入對話歷史
  useEffect(() => {
    if (currentChatId && currentChatId !== sessionId && !isLoadingHistory) {
      loadChatHistory(currentChatId);
      setSessionId(currentChatId);
    }
  }, [currentChatId]);

  // 獲取歷史對話列表
  const fetchChatSessions = useCallback(async () => {
    if (isLoadingSessions) return;

    try {
      setIsLoadingSessions(true);
      console.log("正在獲取對話列表...");

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

      const sessions = await getUserSessions(userId);
      console.log("獲取到的對話數據:", sessions);

      if (sessions.length === 0) {
        console.log("沒有歷史對話，顯示空狀態");
        setChatSessions([]);
        setHistory(prev => prev.length === 0 ? [{ question: null, answer: OPENING_MESSAGE }] : prev);
      } else {
        console.log(`找到 ${sessions.length} 個歷史對話`);

        const formattedSessions = sessions.map((session, index) => {
          let displayName;

          if (session.userName && session.userName !== '未知用戶') {
            displayName = session.userName;
          } else if (session.userId) {
            displayName = `用戶${session.userId}`;
          } else {
            displayName = `對話${session.sessionId.substring(0, 8)}`;
          }

          return {
            id: session.sessionId,
            name: `對話 ${index + 1} - ${displayName}`
          };
        });

        setChatSessions(formattedSessions);
        if (!currentChatId && formattedSessions.length > 0) {
          setCurrentChatId(formattedSessions[0].id);
        }
      }
    } catch (error) {
      console.error("獲取對話列表失敗:", error);
      console.error("錯誤詳情:", error.response?.data || error.message);
      setChatSessions([]);
      setHistory(prev => prev.length === 0 ? [{ question: null, answer: OPENING_MESSAGE }] : prev);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [isLoadingSessions, currentChatId]); // 只依賴真正需要的狀態

  // 載入單一對話歷史訊息
  const loadChatHistory = async (sessionId) => {
    if (isLoadingHistory) return;

    try {
      setIsLoadingHistory(true);
      console.log(`正在載入對話歷史，Session ID: ${sessionId}`);

      const userId = localStorage.getItem('id') || '1';
      console.log("使用用戶 ID:", userId);

      const messages = await getRagMessageBySession(userId, sessionId);
      console.log("獲取到的對話歷史:", messages);

      const conversationHistory = [];
      conversationHistory.push({ question: null, answer: OPENING_MESSAGE });

      console.log(`處理 ${messages.length} 條訊息`);

      if (messages.length > 0) {
        for (const message of messages) {
          if (message.input_message && message.response_message) {
            conversationHistory.push({
              question: message.input_message,
              answer: message.response_message,
              // ✅ 從資料庫載入 reference 和 externalLinks
              reference: message.reference_data || null,
              externalLinks: message.external_links || []
            });
          } else if (message.input_message && !message.response_message) {
            conversationHistory.push({
              question: message.input_message,
              answer: "正在處理您的問題..."
            });
          } else if (!message.input_message && message.response_message) {
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
      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 創建新會話
  const createSession = async () => {
    try {
      const sessionPayload = {
        name: `對話 - ${new Date().toLocaleTimeString()}`
      };

      console.log("正在向 RAGFlow 創建 session...");

      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers,
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

      setCurrentChatId(ragflowSessionId);
      setSessionId(ragflowSessionId);

      return ragflowSessionId;
    } catch (error) {
      console.error("建立 session 失敗:", error);
      throw error;
    }
  };

  // 創建新會話的完整流程
  const createNewSession = async () => {
    try {
      const newSessionId = await createSession();

      setHistory([{ question: null, answer: OPENING_MESSAGE }]);
      setCurrentChatId(newSessionId);
      setSessionId(newSessionId);

      const newSession = {
        id: newSessionId,
        name: `新對話 - ${new Date().toLocaleTimeString()}`
      };
      setChatSessions(prevSessions => [newSession, ...prevSessions]);

      try {
        const userId = localStorage.getItem('id') || '1';
        const userName = getCurrentUsername() || '未知用戶';

        await createNewSessionInDB(userId, newSessionId, userName);
        console.log("新會話已保存到資料庫");

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

  // 處理訊息提交
  const handleSubmit = async (question, projectId) => {
    if (!question.trim()) return;

    setIsSubmitting(true);
    let currentSessionId = currentChatId;
    let isNewSession = false;

    const userQuestion = question;
    setHistory((prevHistory) => [...prevHistory, { question: userQuestion, answer: "正在思考中..." }]);

    try {
      if (!currentSessionId) {
        currentSessionId = await createSession();
        isNewSession = true;
      }

      const payload = {
        question: userQuestion,
        stream: false,
        session_id: currentSessionId,
      };

      console.log("發送問題到 RAGFlow，使用 session ID:", currentSessionId, "問題:", userQuestion);

      // ✅ 聲明變數（解決作用域問題）
      let answer;
      let reference;
      let externalLinks = [];

      // ✅ 根據開關決定是否平行呼叫 Gemini Grounding
      if (enableExternalLinks) {
        console.log("🔗 外部連結開關已開啟，將平行呼叫 RAGFlow 和 Gemini Grounding");

        // ✅ 取得認證令牌（優先使用 accessToken）
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

        const [ragflowResponse, geminiResponse] = await Promise.allSettled([
          // RAGFlow API 呼叫
          fetch(`${API_URL}/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          }).then(res => res.json()),

          // Gemini Grounding API 呼叫（✅ 加入 accessToken header）
          fetch('/api/assistant/grounding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accessToken': token // ✅ 後端期望 accessToken header
            },
            body: JSON.stringify({ question: userQuestion }),
          }).then(res => res.json())
        ]);

        // 處理 RAGFlow 回應（必須成功）
        if (ragflowResponse.status === 'rejected') {
          throw new Error('RAGFlow API 呼叫失敗');
        }
        const data = ragflowResponse.value;
        answer = data?.data?.answer || "無法取得回答";
        reference = data?.data?.reference || null;

        // 🔍 Debug: 檢查 reference 內容
        console.log('🔍 [Debug] RAGFlow reference:', JSON.stringify(reference, null, 2));
        console.log('🔍 [Debug] reference.doc_aggs 存在:', !!reference?.doc_aggs);
        console.log('🔍 [Debug] reference.doc_aggs 長度:', reference?.doc_aggs?.length || 0);

        // 處理 Gemini 回應（失敗不影響主功能）
        console.log('🔍 [Debug] Gemini Response 完整資料:', geminiResponse);
        console.log('🔍 [Debug] Gemini Response status:', geminiResponse.status);
        console.log('🔍 [Debug] Gemini Response value:', JSON.stringify(geminiResponse.value, null, 2));

        if (geminiResponse.status === 'fulfilled' && geminiResponse.value?.success) {
          externalLinks = geminiResponse.value.externalLinks || [];
          console.log(`✅ 成功取得 ${externalLinks.length} 個外部連結`);
          console.log('🔍 [Debug] externalLinks 詳細資料:', JSON.stringify(externalLinks, null, 2));
        } else {
          console.warn('⚠️ Gemini Grounding 呼叫失敗，但不影響主要功能');
          console.warn('🔍 [Debug] 失敗原因 (reason):', geminiResponse.reason);
          console.warn('🔍 [Debug] 失敗回應 (value):', geminiResponse.value);
          console.warn('🔍 [Debug] 錯誤訊息:', geminiResponse.value?.error);
        }

        // 更新歷史記錄
        setHistory((prevHistory) => {
          const newHistory = [...prevHistory];
          const lastIndex = newHistory.length - 1;
          if (lastIndex >= 0 && newHistory[lastIndex].question === userQuestion) {
            newHistory[lastIndex] = {
              question: userQuestion,
              answer,
              reference,
              externalLinks // ✅ 儲存外部連結
            };
          }
          return newHistory;
        });

      } else {
        // ✅ 開關關閉，只呼叫 RAGFlow（原有邏輯，0 破壞性）
        const response = await fetch(`${API_URL}/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        answer = data?.data?.answer || "無法取得回答";
        reference = data?.data?.reference || null; // ✅ 提取 RAGFlow 參考文獻

        setHistory((prevHistory) => {
          const newHistory = [...prevHistory];
          const lastIndex = newHistory.length - 1;
          if (lastIndex >= 0 && newHistory[lastIndex].question === userQuestion) {
            newHistory[lastIndex] = {
              question: userQuestion,
              answer,
              reference // ✅ 儲存參考文獻
            };
          }
          return newHistory;
        });
      }

      // Socket 事件處理
      const userIdRaw = localStorage.getItem('id') ?? localStorage.getItem('userId');
      const userId = Number(userIdRaw);
      const userName = getCurrentUsername() || '未知用戶';
      let projectIdRaw = localStorage.getItem('projectId');

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
        room: Number.isFinite(projectIdNum) ? String(projectIdNum) : undefined,
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

      socket.once("input_stored", (storedData) => {
        const payloadResponse = {
          // ✅ 新增欄位：儲存 reference 和 externalLinks
          reference,
          externalLinks,
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

        if (isNewSession) {
          console.log("檢測到新會話，3秒後自動更新對話歷史列表");
          setTimeout(() => {
            refreshChatSessions();
          }, 3000);
        }
      });

    } catch (error) {
      console.error("處理訊息失敗:", error);

      setHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        const lastIndex = newHistory.length - 1;
        if (lastIndex >= 0 && newHistory[lastIndex].question === userQuestion) {
          newHistory[lastIndex] = { question: userQuestion, answer: "抱歉，發生錯誤，請稍後再試。" };
        }
        return newHistory;
      });

      if (error.message.includes("session")) {
        setSessionId(null);
        setCurrentChatId(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理對話項目點擊
  const handleChatSessionClick = (sessionId) => {
    console.log(`切換到對話: ${sessionId}`);
    if (sessionId !== currentChatId && !isLoadingHistory) {
      setCurrentChatId(sessionId);
    }
  };

  // 刪除對話功能
  const handleDeleteSession = async (sessionId, sessionName, showSwalWithCorrectZIndex) => {
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

      let ragflowDeleteSuccess = false;
      try {
        await deleteSession(sessionId);
        console.log("已從 RAGFlow 刪除會話");
        ragflowDeleteSuccess = true;
      } catch (ragflowError) {
        console.warn("從 RAGFlow 刪除會話失敗:", ragflowError.message);
        if (ragflowError.message.includes("405") || ragflowError.message.includes("Method Not Allowed")) {
          console.log("RAGFlow 不支持刪除操作，這是正常的");
          ragflowDeleteSuccess = true;
        }
      }

      let dbDeleteSuccess = false;
      try {
        await deleteSessionMessages(userId, sessionId);
        console.log("已從資料庫刪除會話訊息");
        dbDeleteSuccess = true;
      } catch (dbError) {
        console.error("從資料庫刪除會話訊息失敗:", dbError);
        if (dbError.message.includes("404") || dbError.response?.status === 404) {
          console.log("資料庫中沒有找到該會話的訊息，可能已不存在");
          dbDeleteSuccess = true;
        }
      }

      if (ragflowDeleteSuccess || dbDeleteSuccess) {
        setChatSessions(prevSessions =>
          prevSessions.filter(session => session.id !== sessionId)
        );

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

  // 刷新對話歷史列表
  const refreshChatSessions = async () => {
    try {
      console.log("正在刷新對話歷史列表...");

      const userId = localStorage.getItem('id') || '1';
      const sessions = await getUserSessions(userId);

      const formattedSessions = sessions.map((session, index) => {
        let displayName;

        if (session.userName && session.userName !== '未知用戶') {
          displayName = session.userName;
        } else if (session.userId) {
          displayName = `用戶${session.userId}`;
        } else {
          displayName = `對話${session.sessionId.substring(0, 8)}`;
        }

        return {
          id: session.sessionId,
          name: `對話 ${index + 1} - ${displayName}`
        };
      });

      setChatSessions(formattedSessions);
      console.log(`對話歷史列表已更新，共 ${formattedSessions.length} 個對話`);

      if (!currentChatId && formattedSessions.length > 0) {
        const latestSession = formattedSessions[0];
        setCurrentChatId(latestSession.id);
        console.log("自動選中最新對話:", latestSession.id);
      }
    } catch (error) {
      console.error("刷新對話歷史列表失敗:", error);
    }
  };

  return {
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
    // ✅ 外部連結開關
    enableExternalLinks,
    toggleExternalLinks,
  };
};