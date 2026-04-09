import { useState, useEffect, useMemo } from 'react';
import { getIdeaWallMessages, createIdeaWallMessage, getIdeaWallContext } from '../api/ideaWallMessage';
import { socket } from '../utils/socket';
import { getCurrentUsername, getCurrentUserId } from '../utils/userUtils';

export const useIdeaWallChat = (ideaWallId) => {
    const [allMessages, setAllMessages] = useState([]);
    const [wallContext, setWallContext] = useState(null); // New State for Context
    const [contextLoading, setContextLoading] = useState(false);
    const [filterNodeId, setFilterNodeId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const refreshWallContext = async () => {
        if (!ideaWallId) return;
        setContextLoading(true);
        try {
            const ctx = await getIdeaWallContext(ideaWallId);
            setWallContext(ctx);
        } catch (err) {
            console.warn("Failed to load wall context:", err);
        } finally {
            setContextLoading(false);
        }
    };

    // 1. 初始化：加入房間並載入歷史訊息
    useEffect(() => {
        if (!ideaWallId) return;

        const initChat = async () => {
            setLoading(true);
            try {
                // 加入 Socket 房間
                socket.emit('join_ideawall', ideaWallId);

                // 載入歷史訊息 (全域)
                const data = await getIdeaWallMessages(ideaWallId);
                if (Array.isArray(data)) {
                    setAllMessages(data);
                } else {
                    console.error("Unexpected response format for messages:", data);
                    setAllMessages([]);
                }

                // 載入牆面摘要 (非同步，不阻塞 UI)
                // refreshWallContext(); // 改為手動觸發，節省資源

            } catch (err) {
                console.error("Failed to load chat messages:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        initChat();

        // M8: 離開頁面時離開房間，避免收到不相關的訊息
        return () => {
            socket.emit('leave_ideawall', ideaWallId);
        };
    }, [ideaWallId]);

    // 2. 監聽即時訊息
    useEffect(() => {
        if (!ideaWallId) return;

        const handleNewMessage = (newMessage) => {
            console.log("收到新訊息:", newMessage);
            setAllMessages(prev => {
                // 避免重複 (以防萬一)
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
        };

        socket.on('EVENT_IDEA_WALL_MSG', handleNewMessage);

        return () => {
            socket.off('EVENT_IDEA_WALL_MSG', handleNewMessage);
        };
    }, [ideaWallId]);

    // 3. 發送訊息
    const sendMessage = async (content, relatedNodeId = null) => {
        if (!content.trim()) return;
        
        // Optimistic UI update (optional, but safer to wait for server ack in this case)
        // 這裡我們選擇等待伺服器回應，確保資料一致性
        try {
            await createIdeaWallMessage(ideaWallId, {
                content,
                relatedNodeId
            });
            // 不需要手動 setMessages，因為 Socket 會廣播回來 (包括給發送者)
            // 但如果 Socket 延遲，可以考慮在這裡先 append
        } catch (err) {
            console.error("Failed to send message:", err);
            // TODO: Show toast error
        }
    };

    // 4. 根據 filterNodeId 過濾訊息
    const filteredMessages = useMemo(() => {
        let msgs = allMessages;
        
        if (filterNodeId) {
            msgs = msgs.filter(m => 
                m.relatedNodeId === filterNodeId || 
                m.relatedNodeId === parseInt(filterNodeId)
            );
        }

        // 格式化訊息以符合 UI 需求
        return msgs.map(msg => ({
            ...msg,
            senderName: msg.isAiIntervention ? "AI 學習助手" : (msg.user ? (msg.user.username || msg.user.account) : "未知用戶"),
            isSelf: msg.user?.id === getCurrentUserId()
        }));
    }, [allMessages, filterNodeId]);

    return {
        messages: filteredMessages,
        wallContext, // Export context
        contextLoading,
        refreshWallContext, // Export refresh function
        sendMessage,
        filterNodeId,
        setFilterNodeId,
        loading,
        error
    };
};
