import React, { useState, useEffect, useRef } from 'react';
import { useIdeaWallChat } from '../../hooks/useIdeaWallChat';
import { motion } from 'framer-motion';
import { FiX, FiSend } from 'react-icons/fi';

const IdeaWallChatPanel = ({ ideaWallId, selectedNodeId, nodes, onClose }) => {
    const { messages, sendMessage, filterNodeId, setFilterNodeId, loading, wallContext, contextLoading, refreshWallContext } = useIdeaWallChat(ideaWallId);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef(null);
    const [showContext, setShowContext] = useState(true);

    // 格式化訊息內容，將 Node #ID 替換為 Node #ID (Title)
    const formatMessageContent = (content) => {
        if (!nodes || nodes.length === 0 || !content) return content;
        
        return content.replace(/Node #(\d+)/g, (match, id) => {
            const node = nodes.find(n => String(n.id) === String(id));
            return node ? `Node #${id} (${node.title})` : match;
        });
    };

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
            <div className={`p-3 flex justify-between items-center ${filterNodeId ? 'bg-teal-700' : 'bg-customgreen'} text-white`}>
                <div className="flex flex-col">
                    <span className="font-bold text-sm">
                        {filterNodeId ? `節點討論 (Node #${filterNodeId})` : "IdeaWall 討論室"}
                    </span>
                    {filterNodeId && (
                        <button 
                            onClick={() => setFilterNodeId(null)}
                            className="text-xs text-teal-200 hover:text-white text-left underline mt-1"
                        >
                            切換回全域模式
                        </button>
                    )}
                </div>
                <button onClick={onClose} className="text-teal-100 hover:text-white">
                    <FiX className="h-5 w-5" />
                </button>
            </div>

            {/* AI Context Summary (Global Mode Only) */}
            {!filterNodeId && (
                showContext ? (
                    <>
                        {contextLoading ? (
                            <div className="bg-customgreen/10 p-3 border-b border-customgreen/20 relative">
                                <button 
                                    onClick={() => setShowContext(false)}
                                    className="absolute top-1 right-1 text-customgreen hover:text-teal-700"
                                >
                                    <FiX className="h-3 w-3" />
                                </button>
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg animate-pulse">🤖</span>
                                    <span className="text-xs text-customgreen font-medium animate-pulse">
                                        AI 正在分析牆面想法中...
                                    </span>
                                </div>
                            </div>
                        ) : wallContext ? (
                            <div className="bg-customgreen/10 p-3 border-b border-customgreen/20 relative">
                                <button 
                                    onClick={() => setShowContext(false)}
                                    className="absolute top-1 right-1 text-customgreen hover:text-teal-700"
                                >
                                    <FiX className="h-3 w-3" />
                                </button>
                                <div className="flex items-start space-x-2">
                                    <span className="text-lg">🤖</span>
                                    <div>
                                        <p className="text-xs font-bold text-teal-800 mb-1">
                                            AI 觀察報告 (已捕捉 {wallContext.nodeCount} 個想法)
                                        </p>
                                        <p className="text-xs text-teal-700 leading-relaxed">
                                            {wallContext.summary}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-customgreen/10 p-3 border-b border-customgreen/20 flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">🤖</span>
                                    <span className="text-xs text-teal-800 font-medium">
                                        AI 觀察報告尚未生成
                                    </span>
                                </div>
                                <button 
                                    onClick={refreshWallContext}
                                    className="text-xs bg-customgreen hover:bg-teal-600 text-white px-3 py-1 rounded shadow-sm transition-colors"
                                >
                                    生成報告
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-customgreen/10 p-2 border-b border-customgreen/20 flex justify-between items-center">
                        <span 
                            className="text-xs text-teal-800 flex items-center cursor-pointer hover:text-teal-900" 
                            onClick={() => setShowContext(true)}
                        >
                            <span className="mr-1">🤖</span> {wallContext ? "AI 觀察報告 (已隱藏)" : "AI 觀察報告 (未生成)"}
                        </span>
                        <button 
                            onClick={() => {
                                setShowContext(true);
                                refreshWallContext();
                            }}
                            className="text-xs bg-customgreen/20 hover:bg-customgreen/30 text-teal-800 px-2 py-1 rounded transition-colors flex items-center"
                            disabled={contextLoading}
                        >
                            {contextLoading ? "分析中..." : (wallContext ? "重新分析" : "開始分析")}
                        </button>
                    </div>
                )
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 bg-customgreen/5 space-y-3 scrollbar-thin">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        尚無討論訊息
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}>
                            <div className="flex items-baseline space-x-2 mb-1">
                                <span className={`text-xs font-bold ${msg.isAiIntervention ? "text-purple-600" : "text-teal-700"}`}>
                                    {msg.isAiIntervention ? "🤖 " + msg.senderName : msg.senderName}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(msg.createdAt).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <div 
                                className={`max-w-[85%] rounded-lg p-2 text-sm shadow-sm 
                                    ${msg.isAiIntervention 
                                        ? "bg-purple-50 border border-purple-200 text-purple-900" 
                                        : msg.isSelf 
                                            ? "bg-customgreen text-white" 
                                            : "bg-white border border-customgreen/20 text-gray-800"
                                    }`}
                            >
                                {formatMessageContent(msg.content)}
                            </div>
                            {/* 如果在全域模式下顯示該訊息屬於哪個節點 */}
                            {!filterNodeId && msg.relatedNodeId && (
                                <span 
                                    className="text-[10px] text-customgreen cursor-pointer hover:underline mt-1"
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
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-customgreen focus:border-transparent"
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !inputValue.trim()}
                        className={`p-2 rounded-full ${loading || !inputValue.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-customgreen hover:bg-teal-600 text-white shadow-md'}`}
                    >
                        <FiSend className="h-5 w-5" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default IdeaWallChatPanel;
