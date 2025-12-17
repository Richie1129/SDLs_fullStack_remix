import { useState, useEffect, useMemo } from 'react';
import { getIdeaWallMessages, createIdeaWallMessage } from '../api/ideaWallMessage';
import { socket } from '../utils/socket';
import { getCurrentUsername } from '../utils/userUtils';

export const useIdeaWallChat = (ideaWallId) => {
    const [allMessages, setAllMessages] = useState([]);
    const [filterNodeId, setFilterNodeId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                setAllMessages(data);
            } catch (err) {
                console.error("Failed to load chat messages:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        initChat();

        // 清理：離開房間 (如果需要的話，目前後端沒有 leave_ideawall，但 socket 斷線會自動處理)
        return () => {
            // socket.emit('leave_ideawall', ideaWallId); 
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
            senderName: msg.user ? (msg.user.username || msg.user.account) : "未知用戶",
            isSelf: msg.user?.account === getCurrentUsername() // 假設 getCurrentUsername 回傳 account
        }));
    }, [allMessages, filterNodeId]);

    return {
        messages: filteredMessages,
        sendMessage,
        filterNodeId,
        setFilterNodeId,
        loading,
        error
    };
};
