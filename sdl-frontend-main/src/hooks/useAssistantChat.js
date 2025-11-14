import { useState, useCallback, useEffect } from 'react';
import { getChatHistory, getChatSessions, deleteChatSession, createChatTurn } from '../api/assistant';

/**
 * 專案助理聊天 Hook（支援 streaming + session management）
 *
 * 使用範例：
 * ```jsx
 * const { messages, isLoading, sendMessage, clearMessages, chatSessions, currentSessionId, createNewSession } = useAssistantChat();
 *
 * const handleSend = async () => {
 *   await sendMessage(projectId, '我的專案進度如何？');
 * };
 * ```
 */
export function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [historyMessages, setHistoryMessages] = useState([]); // 歷史對話記錄（已廢棄，保留以維持零破壞性）
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Session management state
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    // 🔑 0破壞性改進：從 localStorage 讀取上次的 sessionId（如果有）
    // 如果沒有，預設使用 'default'（向後相容）
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assistant_current_session');
      return saved || 'default';
    }
    return 'default';
  });
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  /**
   * 🔑 生成唯一的 UUID（替代簡單的時間戳）
   * 使用 crypto.randomUUID() 如果可用，否則 fallback 到簡單實作
   */
  const generateSessionId = useCallback(() => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback: 簡單的 UUID v4 實作
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }, []);

  /**
   * 🔑 更新 currentSessionId 並同步到 localStorage（確保持久化）
   */
  const updateCurrentSessionId = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assistant_current_session', sessionId);
    }
  }, []);

  /**
   * 發送訊息給 AI 助理
   * @param {number} projectId - 專案 ID
   * @param {string} userMessage - 使用者的訊息
   * @param {string} provider - AI 提供者（'gemini' 或 'openai'），預設使用 gemini
   */
  const sendMessage = useCallback(async (projectId, userMessage, provider = 'gemini') => {
    if (!projectId || !userMessage?.trim()) {
      setError('專案 ID 和訊息不能為空');
      return;
    }

    // 1. 新增使用者訊息到對話列表
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setError(null);

    // 2. 準備接收 AI 回應
    let aiResponse = '';
    let aiThinking = '';  // Store thinking process
    // AI 訊息的索引位置（加入 user message 後，AI message 會是下一個）
    const aiMessageIndex = messages.length + 1;

    // 先建立一個空的 AI 訊息槽位
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      thinking: '',  // Initialize thinking field
      timestamp: new Date().toISOString(),
    }]);

    try {
      // 取得 token（你的專案用 accessToken）
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

      if (!token) {
        throw new Error('請先登入');
      }

      // 3. 連接到後端 streaming endpoint
      // 使用 /api 路徑（跟其他 API 一致）
      const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
      console.log('🚀 [前端] 發送請求到:', `${baseURL}/assistant/chat`);
      console.log('📦 [前端] 請求參數:', { projectId, message: userMessage, provider, sessionId: currentSessionId });

      const response = await fetch(`${baseURL}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'accessToken': token, // 你的後端也檢查這個 header
        },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          provider,
          sessionId: currentSessionId,  // Include currentSessionId for session management
        }),
      });

      if (!response.ok) {
        console.error('❌ [前端] 請求失敗:', response.status, response.statusText);
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || '請求失敗');
      }

      console.log('✅ [前端] 開始接收 SSE 串流...');

      // 4. 讀取 SSE 串流資料
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // 解析 SSE 格式資料
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim(); // 去掉 "data: "

            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'thinking' && data.content) {
                // Received thinking process (sent as complete chunk)
                aiThinking = data.content;
                console.log(`💭 [前端] 收到思考過程 - ${aiThinking.length} 個字元`);
                console.log(`💭 [前端] 思考內容預覽:`, aiThinking.substring(0, 100) + '...');

                // Update UI with thinking content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      thinking: aiThinking,
                      timestamp: new Date().toISOString(),
                    };
                    
                    // Debug: 確認 thinking 已設定
                    console.log(`✅ [前端] thinking 已更新到 message:`, {
                      hasThinking: !!newMessages[lastIndex].thinking,
                      thinkingLength: newMessages[lastIndex].thinking?.length || 0
                    });
                  }
                  return newMessages;
                });

              } else if (data.type === 'content' && data.content) {
                // 收到內容，逐字累加
                aiResponse += data.content;
                chunkCount++;

                // 即時更新 UI（使用函數式更新確保正確性）
                setMessages(prev => {
                  const newMessages = [...prev];
                  // 更新最後一條訊息（AI 的回應）
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: aiResponse,
                      thinking: aiThinking,  // Keep thinking content
                      timestamp: new Date().toISOString(),
                    };
                  }
                  return newMessages;
                });

              } else if (data.type === 'done') {
                // 串流完成
                console.log(`✅ [前端] 串流完成 - 收到 ${chunkCount} 個 chunks`);
                console.log(`📊 [前端] 思考: ${aiThinking.length} 字元, 答案: ${aiResponse.length} 字元`);
                
                // 最終檢查：確認 thinking 是否正確保存
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    console.log(`🔍 [前端] 最終檢查 - thinking 狀態:`, {
                      hasThinking: !!lastMessage.thinking,
                      thinkingLength: lastMessage.thinking?.length || 0,
                      thinkingPreview: lastMessage.thinking?.substring(0, 50) || '(無)'
                    });
                    
                    // 如果 thinking 未設定但變數有值（異常情況），強制更新
                    if (!lastMessage.thinking && aiThinking) {
                      console.warn(`⚠️ [前端] 偵測到 thinking 遺失，強制更新`);
                      return prev.map((msg, idx) => 
                        idx === prev.length - 1 
                          ? { ...msg, thinking: aiThinking }
                          : msg
                      );
                    }
                  }
                  return prev;
                });

              } else if (data.type === 'error') {
                // 收到錯誤
                throw new Error(data.error || '發生錯誤');
              }

            } catch (parseError) {
              // 忽略 JSON 解析錯誤（可能是部分資料）
              console.debug('Parse error (可忽略):', parseError);
            }
          }
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || '發生未知錯誤');

      // 更新 AI 訊息為錯誤狀態
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: `❌ 抱歉，發生錯誤：${err.message}`,
            timestamp: new Date().toISOString(),
            isError: true,
          };
        }
        return newMessages;
      });

    } finally {
      setIsLoading(false);
    }
  }, [messages.length, currentSessionId]);

  /**
   * 載入對話歷史記錄
   * @param {number} projectId - 專案 ID
   */
  const loadHistory = useCallback(async (projectId) => {
    if (!projectId) return;

    try {
      const history = await getChatHistory({ projectId });

      // 扁平化：ChatTurn[] → Message[]
      const flattened = [];
      for (const turn of (history || [])) {
        if (turn.userContent) {
          flattened.push({
            role: 'user',
            content: turn.userContent,
            username: turn.username,
            timestamp: turn.createdAt,
          });
        }
        if (turn.assistantContent) {
          flattened.push({
            role: 'assistant',
            content: turn.assistantContent,
            thinking: turn.thinkingContent || '', // 包含思考過程
            username: turn.assistantUsername || 'AI 導師',
            timestamp: turn.updatedAt || turn.createdAt,
          });
        }
      }

      setHistoryMessages(flattened);
      console.log(`📚 [前端] 載入了 ${flattened.length} 條歷史訊息`);
    } catch (err) {
      console.error('載入歷史記錄失敗:', err);
      // 不影響正常使用，靜默失敗
    }
  }, []);

  /**
   * 清除所有訊息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * 重試最後一次失敗的訊息
   */
  const retryLastMessage = useCallback(async (projectId, provider = 'gemini') => {
    if (messages.length < 2) return;

    // 找到最後一個使用者訊息
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

    if (lastUserMessage) {
      // 移除最後一個 AI 回應（如果有錯誤）
      setMessages(prev => prev.slice(0, -1));
      await sendMessage(projectId, lastUserMessage.content, provider);
    }
  }, [messages, sendMessage]);

  /**
   * 載入專案的所有對話 sessions
   * @param {number} projectId - 專案 ID
   */
  const fetchSessions = useCallback(async (projectId) => {
    if (!projectId) return;

    try {
      setIsLoadingSessions(true);
      const sessions = await getChatSessions({ projectId });
      setChatSessions(sessions);
      console.log(`📚 [前端] 載入了 ${sessions.length} 個對話 sessions`);
    } catch (err) {
      console.error('載入 sessions 失敗:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []); // Remove dependencies to prevent infinite loop

  /**
   * 建立新對話 session
   * @param {number} projectId - 專案 ID
   */
  const createNewSession = useCallback(async (projectId) => {
    if (!projectId) return;

    try {
      // 🔑 使用標準 UUID 生成唯一 session ID（0破壞性改進）
      const newSessionId = generateSessionId();

      // 🔑 使用統一的更新函數（自動同步 localStorage）
      updateCurrentSessionId(newSessionId);
      setMessages([]);
      setError(null);

      // 🔧 移除刷新邏輯：創建新對話時不需要刷新 sessions 列表
      // 原因：後端還沒有這個 session 的記錄（要等發送第一條訊息後才會創建）
      // sessions 列表會在發送訊息後自動更新，或者用戶切換到其他對話時再刷新

      console.log(`✨ [前端] 建立新對話: ${newSessionId}`);
      return newSessionId;
    } catch (err) {
      console.error('建立新對話失敗:', err);
      setError('建立新對話失敗');
    }
  }, [generateSessionId, updateCurrentSessionId]); // Add dependencies for stable functions

  /**
   * 切換到不同的 session
   * @param {number} projectId - 專案 ID
   * @param {string} sessionId - Session ID
   */
  const switchSession = useCallback(async (projectId, sessionId) => {
    if (!projectId || !sessionId) return;

    try {
      // 🔑 使用統一的更新函數（自動同步 localStorage）
      updateCurrentSessionId(sessionId);
      setMessages([]);
      setError(null);

      // Load history for this session
      const history = await getChatHistory({ projectId, sessionId });

      // Convert to messages format
      const flattened = [];
      for (const turn of (history || [])) {
        if (turn.userContent) {
          flattened.push({
            role: 'user',
            content: turn.userContent,
            username: turn.username,
            timestamp: turn.createdAt,
          });
        }
        if (turn.assistantContent) {
          flattened.push({
            role: 'assistant',
            content: turn.assistantContent,
            thinking: turn.thinkingContent || '',
            username: turn.assistantUsername || 'AI 導師',
            timestamp: turn.updatedAt || turn.createdAt,
          });
        }
      }

      setMessages(flattened);
      console.log(`🔄 [前端] 切換到對話: ${sessionId}, 載入了 ${flattened.length} 條訊息`);
    } catch (err) {
      console.error('切換對話失敗:', err);
      setError('切換對話失敗');
    }
  }, [updateCurrentSessionId]); // Add dependency for stable function

  /**
   * 刪除對話 session
   * @param {number} projectId - 專案 ID
   * @param {string} sessionId - Session ID
   */
  const deleteSession = useCallback(async (projectId, sessionId) => {
    if (!projectId || !sessionId) return;

    try {
      await deleteChatSession({ projectId, sessionId });

      // Remove from local state and get updated sessions
      setChatSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);

        // If we deleted the current session, switch to first available
        if (sessionId === currentSessionId) {
          if (updated.length > 0) {
            // Switch to first available session
            const newSessionId = updated[0].id;
            // 🔑 更新 localStorage
            updateCurrentSessionId(newSessionId);

            // Load history for the new session asynchronously
            getChatHistory({ projectId, sessionId: newSessionId }).then(history => {
              const flattened = [];
              for (const turn of (history || [])) {
                if (turn.userContent) {
                  flattened.push({
                    role: 'user',
                    content: turn.userContent,
                    username: turn.username,
                    timestamp: turn.createdAt,
                  });
                }
                if (turn.assistantContent) {
                  flattened.push({
                    role: 'assistant',
                    content: turn.assistantContent,
                    thinking: turn.thinkingContent || '',
                    username: turn.assistantUsername || 'AI 導師',
                    timestamp: turn.updatedAt || turn.createdAt,
                  });
                }
              }
              setMessages(flattened);
            }).catch(err => {
              console.error('載入對話歷史失敗:', err);
              setMessages([]);
            });
          } else {
            // No sessions left, reset to default
            // 🔑 生成新的 UUID session（而不是使用 'default'）
            const freshSessionId = generateSessionId();
            updateCurrentSessionId(freshSessionId);
            setMessages([]);
            console.log(`🆕 [前端] 所有對話已刪除，建立新對話: ${freshSessionId}`);
          }
        }

        return updated;
      });

      console.log(`🗑️ [前端] 刪除對話: ${sessionId}`);
    } catch (err) {
      console.error('刪除對話失敗:', err);
      setError('刪除對話失敗');
    }
  }, [currentSessionId, generateSessionId, updateCurrentSessionId]); // Add necessary dependencies

  /**
   * 🔑 智能初始化邏輯（0破壞性）
   *
   * 策略：
   * 1. 如果 currentSessionId 是 'default' 且沒有舊對話，生成新 UUID
   * 2. 如果 localStorage 保存的 sessionId 在伺服器不存在，切換到最新對話
   * 3. 完全向後相容：舊的 'default' 對話會被正常載入
   * 4. 🔧 修正：如果 currentSessionId 已經是最新狀態，不要覆蓋（避免創建新對話時被切回舊對話）
   */
  useEffect(() => {
    // 只在 sessions 載入完成後執行一次初始化
    if (isLoadingSessions || chatSessions.length === 0) return;

    const savedSessionId = typeof window !== 'undefined'
      ? localStorage.getItem('assistant_current_session')
      : null;

    // 🔧 關鍵修正：如果 currentSessionId 和 savedSessionId 相同，說明已經同步，不需要切換
    // 這樣可以避免「創建新對話後，因為後端還沒有記錄，又被切回舊對話」的問題
    if (currentSessionId === savedSessionId) {
      // currentSessionId 已經是最新狀態，不需要切換
      return;
    }

    // 檢查 savedSessionId 是否存在於 sessions 列表中
    const sessionExists = chatSessions.some(s => s.id === savedSessionId);

    if (!sessionExists) {
      // localStorage 的 session 不存在（可能被刪除了）
      // 切換到最新的 session（第一個）
      const latestSession = chatSessions[0];
      if (latestSession) {
        console.log(`🔄 [前端] localStorage session 不存在，切換到最新對話: ${latestSession.id}`);
        updateCurrentSessionId(latestSession.id);
      }
    }
  }, [chatSessions, isLoadingSessions, updateCurrentSessionId, currentSessionId]);

  /**
   * 🔑 首次發送訊息時，如果還在用 'default'，自動生成新 UUID
   * 這樣可以確保新對話都有唯一 ID，同時不破壞舊資料
   */
  useEffect(() => {
    if (currentSessionId === 'default' && messages.length === 0 && chatSessions.length === 0) {
      // 只有在「新用戶首次使用」或「清空所有對話後」才會觸發
      // 不影響已有 'default' 對話的用戶
      const hasDefaultSession = chatSessions.some(s => s.id === 'default');
      if (!hasDefaultSession) {
        const newSessionId = generateSessionId();
        updateCurrentSessionId(newSessionId);
        console.log(`🆕 [前端] 首次使用，生成新對話 ID: ${newSessionId}`);
      }
    }
  }, [currentSessionId, messages.length, chatSessions, generateSessionId, updateCurrentSessionId]);

  return {
    messages,
    historyMessages,
    isLoading,
    error,
    sendMessage,
    loadHistory,
    clearMessages,
    retryLastMessage,
    // Session management
    chatSessions,
    currentSessionId,
    isLoadingSessions,
    fetchSessions,
    createNewSession,
    switchSession,
    deleteSession,
  };
}
