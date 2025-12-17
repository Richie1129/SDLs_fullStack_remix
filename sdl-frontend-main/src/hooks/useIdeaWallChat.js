import { useState, useEffect } from 'react';

// Mock data for MVP
const MOCK_MESSAGES = [
    { id: 1, senderId: 101, senderName: "小明", content: "大家覺得這個想法牆怎麼樣？", relatedNodeId: null, isAiIntervention: false, createdAt: new Date(Date.now() - 1000000).toISOString() },
    { id: 2, senderId: 102, senderName: "小華", content: "我覺得還不錯，但是節點有點亂。", relatedNodeId: null, isAiIntervention: false, createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 3, senderId: 101, senderName: "小明", content: "關於這個「光合作用」的節點，我覺得資料有點少。", relatedNodeId: 1, isAiIntervention: false, createdAt: new Date(Date.now() - 800000).toISOString() },
    { id: 4, senderId: 102, senderName: "小華", content: "確實，我們應該補充一些實驗數據。", relatedNodeId: 1, isAiIntervention: false, createdAt: new Date(Date.now() - 700000).toISOString() },
    { id: 5, senderId: 999, senderName: "AI 引導員", content: "這是一個很好的觀察。小明和小華，你們能具體提出一個實驗設計來驗證這個觀點嗎？", relatedNodeId: 1, isAiIntervention: true, createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 6, senderId: 103, senderName: "小美", content: "我剛剛加了一個關於「呼吸作用」的節點。", relatedNodeId: 2, isAiIntervention: false, createdAt: new Date(Date.now() - 500000).toISOString() },
];

export const useIdeaWallChat = (ideaWallId) => {
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [filterNodeId, setFilterNodeId] = useState(null);
    const [loading, setLoading] = useState(false);

    // 模擬接收 Socket 訊息
    useEffect(() => {
        const interval = setInterval(() => {
            // 模擬隨機收到訊息
            if (Math.random() > 0.8) {
                const newMsg = {
                    id: Date.now(),
                    senderId: 102,
                    senderName: "小華",
                    content: "這是一個模擬的新訊息 " + new Date().toLocaleTimeString(),
                    relatedNodeId: Math.random() > 0.5 ? 1 : null,
                    isAiIntervention: false,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, newMsg]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const sendMessage = async (content, relatedNodeId = null) => {
        setLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newMessage = {
            id: Date.now(),
            senderId: 1, // Current User
            senderName: "我",
            content,
            relatedNodeId,
            isAiIntervention: false,
            createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        setLoading(false);
    };

    const filteredMessages = filterNodeId 
        ? messages.filter(m => m.relatedNodeId === filterNodeId || m.relatedNodeId === parseInt(filterNodeId))
        : messages;

    return {
        messages: filteredMessages,
        sendMessage,
        filterNodeId,
        setFilterNodeId,
        loading
    };
};
