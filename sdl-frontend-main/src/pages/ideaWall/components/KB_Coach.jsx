/**
 * KB Coach Component (AI-Scaffold Orchestrator - Phase 1 MVP + Phase 3 Enhancement)
 * 
 * 支援三種 Agent 人格的手動觸發介面
 * Phase 3: 支援接收 Orchestrator 建議的 Agent 類型 + Feedback 機制
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiCpu, FiTool, FiLink, FiPlusCircle, FiThumbsUp, FiThumbsDown, FiLoader } from 'react-icons/fi';
import { FaGavel } from 'react-icons/fa';
import apiClient from '../../../api/client';
import ReactMarkdown from 'react-markdown';
import { socket } from '../../../utils/socket';

const KB_Coach = ({ nodeInfo, nodes = [], onClose, onNewNode, suggestedAgent = null }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState(null); // 'IMPROVER', 'SYNTHESIZER', 'DEVIL'
    const [coaching, setCoaching] = useState(null);
    const [showThinking, setShowThinking] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false); // Phase 3: 追蹤是否已給過回饋
    const [responseId, setResponseId] = useState(null); // 用於追蹤特定回應

    // 當節點變更時，清空舊狀態
    useEffect(() => {
        setCoaching(null);
        setActiveAgent(null);
        setShowThinking(false);
        setFeedbackGiven(false);
        setResponseId(null);
    }, [nodeInfo.id]);

    // Phase 3: 如果有建議的 Agent 類型，自動觸發
    useEffect(() => {
        if (suggestedAgent && !coaching && !isLoading) {
            // 延遲一點再觸發，讓使用者看到是哪個 Agent 被選中
            const timer = setTimeout(() => {
                triggerAgent(suggestedAgent);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [suggestedAgent]);

    /**
     * 取得相關節點上下文 (Client-side fallback)
     */
    const getRelatedNodes = () => {
        if (!nodes || nodes.length === 0) return [];
        return nodes
            .filter(n => n.id !== nodeInfo.id && n.title && n.content)
            .slice(-10) // 取最後10個
            .map(n => ({ title: n.title, content: n.content, owner: n.owner }));
    };

    /**
     * 觸發特定 Agent
     */
    const triggerAgent = async (agentType) => {
        try {
            setIsLoading(true);
            setActiveAgent(agentType);
            setCoaching(null); // 清除舊結果

            const related = getRelatedNodes();
            const response = await apiClient.post('/kb-coach/guidance', {
                title: nodeInfo.title,
                content: nodeInfo.content,
                nodeId: nodeInfo.id,
                projectId: nodeInfo.projectId,
                relatedNodes: related,
                agentType: agentType
            });

            if (response.data) {
                setCoaching(response.data);
                setResponseId(Date.now().toString()); // 用於追蹤此次回應
                setFeedbackGiven(false); // 重置回饋狀態
                toast.success(`${agentType} 分析完成！`);
            }
        } catch (error) {
            console.error('Error getting KB guidance:', error);
            toast.error('取得建議時發生錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 執行建議行動
     */
    const executeAction = (action) => {
        if (action.actionType === 'CREATE_NEW' || action.actionType === 'REPLY') {
            const newNodeData = {
                title: action.actionType === 'REPLY' ? `[回覆] ${nodeInfo.title}` : `[回應] ${nodeInfo.title}`,
                content: action.payload || '',
                from_id: nodeInfo.id,
                ideaWallId: nodeInfo.ideaWallId,
                owner: localStorage.getItem("username") || "學生",
                projectId: nodeInfo.projectId,
                colorindex: localStorage.getItem("id")
            };
            
            // 先關閉 KB Coach 視窗
            onClose();
            
            // 立即開啟新節點，由父層處理視窗切換
            onNewNode(newNodeData);
        } else {
            toast.info(`建議行動：${action.label}`);
        }
    };

    /**
     * Phase 3: 發送用戶回饋
     */
    const handleFeedback = async (feedbackType) => {
        try {
            // 發送 Socket 事件
            socket.emit('aiCoachFeedback', {
                projectId: nodeInfo.projectId,
                ideaWallId: nodeInfo.ideaWallId,
                nodeId: nodeInfo.id,
                agentType: activeAgent,
                feedbackType: feedbackType, // 'helpful' or 'not_helpful'
                responseId: responseId,
                userId: localStorage.getItem("id")
            });

            setFeedbackGiven(true);
            toast.success(feedbackType === 'helpful' ? '感謝您的回饋！' : '感謝您的回饋，我們會持續改進！');
        } catch (error) {
            console.error('Error sending feedback:', error);
        }
    };

    return (
        <div className="p-component-md-lg bg-white rounded-lg shadow-lg max-w-3xl max-h-[80vh] overflow-y-auto flex flex-col h-full">
            {/* 標題 */}
            <div className="mb-4 pb-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-h3 font-bold text-gray-800 flex items-center">
                        <FiCpu className="w-6 h-6 mr-2 text-[#5BA491]" />
                        AI 協作夥伴
                    </h3>
                    <p className="text-body-sm text-gray-500 mt-1">
                        選擇一位夥伴來協助你深化想法
                    </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    ✕
                </button>
            </div>

            {/* 原始想法摘要 */}
            <div className="mb-6 p-component-sm bg-gray-50 rounded border border-gray-100 text-body-sm text-gray-600 truncate">
                <span className="font-bold mr-2">當前想法:</span> {nodeInfo.title}
            </div>

            {/* Agent 選擇區 */}
            <div className="grid grid-cols-3 gap-stack-sm mb-6">
                <button
                    onClick={() => triggerAgent('IMPROVER')}
                    disabled={isLoading}
                    className={`p-component-base rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'IMPROVER' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="mb-2"><FiTool className="w-8 h-8" /></div>
                    <div className="font-bold mb-1">想法改進者</div>
                    <div className="text-caption opacity-80">深化單一觀點</div>
                </button>

                <button
                    onClick={() => triggerAgent('SYNTHESIZER')}
                    disabled={isLoading}
                    className={`p-component-base rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'SYNTHESIZER' 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="mb-2"><FiLink className="w-8 h-8" /></div>
                    <div className="font-bold mb-1">綜合者</div>
                    <div className="text-caption opacity-80">連結多個想法</div>
                </button>

                <button
                    onClick={() => triggerAgent('DEVIL')}
                    disabled={isLoading}
                    className={`p-component-base rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'DEVIL' 
                            ? 'border-red-500 bg-red-50 text-red-700' 
                            : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="mb-2"><FaGavel className="w-8 h-8" /></div>
                    <div className="font-bold mb-1">魔鬼代言人</div>
                    <div className="text-caption opacity-80">挑戰既有觀點</div>
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 animate-pulse">
                    <div className="mb-4"><FiLoader className="w-10 h-10 animate-spin" /></div>
                    <p>AI 正在閱讀上下文並思考中...</p>
                </div>
            )}

            {/* 結果顯示區 */}
            {!isLoading && coaching && (
                <div className="flex-1 overflow-y-auto pr-2">
                    {/* Thinking Process (Collapsible) */}
                    {coaching.thinkingProcess && (
                        <div className="mb-4">
                            <button 
                                onClick={() => setShowThinking(!showThinking)}
                                className="text-caption text-gray-400 hover:text-gray-600 flex items-center mb-2"
                            >
                                {showThinking ? '▼ 隱藏思考過程' : '▶ 顯示 AI 思考過程 (CoT)'}
                            </button>
                            {showThinking && (
                                <div className="p-component-sm bg-gray-100 rounded text-caption text-gray-600 font-mono whitespace-pre-wrap border border-gray-200">
                                    {coaching.thinkingProcess}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="bg-white p-component-md rounded-xl border border-gray-200 shadow-sm mb-6">
                        <div className="prose prose-sm max-w-none text-gray-800">
                            <ReactMarkdown>{coaching.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Suggested Actions */}
                    {coaching.suggestedActions && coaching.suggestedActions.length > 0 && (
                        <div>
                            <h4 className="text-body-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                建議行動
                            </h4>
                            <div className="flex flex-wrap gap-3">
                                {coaching.suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => executeAction(action)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm flex items-center text-body-sm font-medium"
                                    >
                                        <FiPlusCircle className="w-4 h-4 mr-2" />
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phase 3: Feedback Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-body-sm text-gray-500">這個建議對你有幫助嗎？</span>
                            {!feedbackGiven ? (
                                <div className="flex gap-stack-xs">
                                    <button
                                        onClick={() => handleFeedback('helpful')}
                                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center text-body-sm"
                                    >
                                        <FiThumbsUp className="w-4 h-4 mr-1" /> 有幫助
                                    </button>
                                    <button
                                        onClick={() => handleFeedback('not_helpful')}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center text-body-sm"
                                    >
                                        <FiThumbsDown className="w-4 h-4 mr-1" /> 需改進
                                    </button>
                                </div>
                            ) : (
                                <span className="text-body-sm text-green-600 flex items-center">
                                    <span className="mr-1">✓</span> 感謝回饋！
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KB_Coach;
