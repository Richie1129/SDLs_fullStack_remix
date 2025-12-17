import React, { useState, useEffect, useRef } from 'react';
import { useIdeaWallChat } from '../../hooks/useIdeaWallChat';
import { motion } from 'framer-motion';
import { FiX, FiSend } from 'react-icons/fi';

const IdeaWallChatPanel = ({ ideaWallId, selectedNodeId, onClose }) => {
    const { messages, sendMessage, filterNodeId, setFilterNodeId, loading } = useIdeaWallChat(ideaWallId);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef(null);

    // 當外部選取的節點改變時，更新過濾器
    useEffect(() => {
        setFilterNodeId(selectedNodeId);
    }, [selectedNodeId, setFilterNodeId]);

    // 自動捲動到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        
        await sendMessage(inputValue, filterNodeId);
        setInputValue("");
    };

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-16 h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-10rem)] w-72 sm:w-80 lg:w-96 bg-white shadow-xl border-l border-gray-200 z-[120] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className={`p-3 flex justify-between items-center ${filterNodeId ? 'bg-indigo-600' : 'bg-gray-800'} text-white`}>
                <div className="flex flex-col">
                    <span className="font-bold text-sm">
                        {filterNodeId ? `節點討論 (Node #${filterNodeId})` : "IdeaWall 全域討論"}
                    </span>
                    {filterNodeId && (
                        <button 
                            onClick={() => setFilterNodeId(null)}
                            className="text-xs text-indigo-200 hover:text-white text-left underline mt-1"
                        >
                            切換回全域模式
                        </button>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-300 hover:text-white">
                    <FiX className="h-5 w-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-3 scrollbar-thin">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        尚無討論訊息
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}>
                            <div className="flex items-baseline space-x-2 mb-1">
                                <span className={`text-xs font-bold ${msg.isAiIntervention ? "text-purple-600" : "text-gray-600"}`}>
                                    {msg.isAiIntervention ? "🤖 " + msg.senderName : msg.senderName}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <div 
                                className={`max-w-[85%] rounded-lg p-2 text-sm shadow-sm 
                                    ${msg.isAiIntervention 
                                        ? "bg-purple-50 border border-purple-200 text-purple-900" 
                                        : msg.isSelf 
                                            ? "bg-blue-500 text-white" 
                                            : "bg-white border border-gray-200 text-gray-800"
                                    }`}
                            >
                                {msg.content}
                            </div>
                            {/* 如果在全域模式下顯示該訊息屬於哪個節點 */}
                            {!filterNodeId && msg.relatedNodeId && (
                                <span 
                                    className="text-[10px] text-indigo-500 cursor-pointer hover:underline mt-1"
                                    onClick={() => setFilterNodeId(msg.relatedNodeId)}
                                >
                                    # 關聯節點 {msg.relatedNodeId}
                                </span>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={filterNodeId ? `針對節點 #${filterNodeId} 發言...` : "輸入訊息..."}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !inputValue.trim()}
                        className={`p-2 rounded-full ${loading || !inputValue.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
                    >
                        <FiSend className="h-5 w-5" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default IdeaWallChatPanel;
