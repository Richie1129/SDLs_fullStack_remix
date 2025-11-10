import { useState, useCallback } from 'react';

/**
 * 專案助理聊天 Hook（支援 streaming）
 *
 * 使用範例：
 * ```jsx
 * const { messages, isLoading, sendMessage, clearMessages } = useAssistantChat();
 *
 * const handleSend = async () => {
 *   await sendMessage(projectId, '我的專案進度如何？');
 * };
 * ```
 */
export function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    // AI 訊息的索引位置（加入 user message 後，AI message 會是下一個）
    const aiMessageIndex = messages.length + 1;

    // 先建立一個空的 AI 訊息槽位
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
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
      console.log('📦 [前端] 請求參數:', { projectId, message: userMessage, provider });

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

              if (data.type === 'content' && data.content) {
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
                      timestamp: new Date().toISOString(),
                    };
                  }
                  return newMessages;
                });

              } else if (data.type === 'done') {
                // 串流完成
                console.log(`✅ [前端] 串流完成 - 收到 ${chunkCount} 個 chunks，總共 ${aiResponse.length} 個字元`);

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
  }, [messages.length]);

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

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
  };
}
