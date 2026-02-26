/**
 * KB Coach Component (AI-Scaffold Orchestrator - Phase 1 MVP + Phase 3 Enhancement)
 * 
 * 支援三種 Agent 人格的手動觸發介面
 * Phase 3: 支援接收 Orchestrator 建議的 Agent 類型 + Feedback 機制
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiCpu, FiTool, FiLink, FiPlusCircle, FiThumbsUp, FiThumbsDown, FiLoader, FiClock, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { FaGavel } from 'react-icons/fa';
import apiClient from '../../../api/client';
import ReactMarkdown from 'react-markdown';
import { socket } from '../../../utils/socket';

const KB_Coach = ({ nodeInfo, nodes = [], onClose, onNewNode, suggestedAgent = null, isOwner = true }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState(null); // 'IMPROVER', 'SYNTHESIZER', 'DEVIL'
    const [coaching, setCoaching] = useState(null);
    const [showThinking, setShowThinking] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false); // Phase 3: 追蹤是否已給過回饋
    const [responseId, setResponseId] = useState(null); // 用於追蹤特定回應
    const [showHistory, setShowHistory] = useState(false); // 顯示歷史記錄面板
    const [history, setHistory] = useState([]); // 歷史記錄列表
    const [historyLoading, setHistoryLoading] = useState(false); // 歷史記錄載入狀態

    // 當節點變更時，清空舊狀態
    useEffect(() => {
        setCoaching(null);
        setActiveAgent(null);
        setShowThinking(false);
        setFeedbackGiven(false);
        setResponseId(null);
        setShowHistory(false);
        setHistory([]);
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
     * 載入歷史記錄
     */
    const loadHistory = async () => {
        try {
            setHistoryLoading(true);
            const response = await apiClient.get('/kb-coach/history', {
                params: {
                    nodeId: nodeInfo.id,
                    limit: 10
                }
            });
            setHistory(response.data.histories || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('載入歷史記錄失敗');
        } finally {
            setHistoryLoading(false);
        }
    };

    /**
     * 檢視特定歷史記錄
     */
    const viewHistoryItem = (item) => {
        setCoaching({
            thinkingProcess: item.thinkingProcess,
            content: item.responseContent,
            suggestedActions: item.suggestedActions || []
        });
        setActiveAgent(item.agentType);
        setShowHistory(false);
        toast.success(`已載入 ${item.agentType} 的歷史建議`);
    };

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
     * 解析思考過程字串為步驟陣列（按 → 分割）
     */
    const parseThinkingSteps = (text) => {
        if (!text) return [];
        const parts = text.split(/\s*→\s*/).filter(s => s.trim());
        return parts.map(step => step.replace(/^步驟\d+[：:]\s*/, '').trim());
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
            const triggerSource = suggestedAgent ? 'orchestrator' : 'manual';

            const response = await apiClient.post('/kb-coach/guidance', {
                title: nodeInfo.title,
                content: nodeInfo.content,
                nodeId: nodeInfo.id,
                projectId: nodeInfo.projectId,
                relatedNodes: related,
                agentType: agentType,
                helpSeekingIntent: null,
                triggerSource: triggerSource,
                isOwner: isOwner
            });

            if (response.data) {
                if (response.data.isCoachable === false) {
                    // 內容不足，AI 判定無法引導
                    setCoaching({ _uncoachable: true, uncoachableReason: response.data.uncoachableReason });
                    setActiveAgent(null);
                } else {
                    setCoaching(response.data);
                    setResponseId(Date.now().toString());
                    setFeedbackGiven(false);
                    toast.success(`${agentType} 分析完成！`);
                }
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
                content: '',
                from_id: nodeInfo.id,
                ideaWallId: nodeInfo.ideaWallId,
                owner: localStorage.getItem("username") || "學生",
                projectId: nodeInfo.projectId,
                colorindex: localStorage.getItem("id"),
                aiCoachingNote: coaching?.content || null
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
            // 只在 socket 已連線時才發送事件，避免 "WebSocket is already in CLOSING or CLOSED state" 錯誤
            if (socket.connected) {
                socket.emit('aiCoachFeedback', {
                    projectId: nodeInfo.projectId,
                    ideaWallId: nodeInfo.ideaWallId,
                    nodeId: nodeInfo.id,
                    agentType: activeAgent,
                    feedbackType: feedbackType, // 'helpful' or 'not_helpful'
                    responseId: responseId,
                    userId: localStorage.getItem("id")
                });
            } else {
                console.warn('[KB Coach] Socket 未連線，回饋事件已略過');
            }

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
                <div className="flex-1">
                    <h3 className="text-h3 font-bold text-gray-800 flex items-center">
                        <FiCpu className="w-6 h-6 mr-2 text-[#5BA491]" />
                        AI 協作夥伴
                    </h3>
                    <p className="text-body-sm text-gray-500 mt-1">
                        {isOwner ? 'AI 協作夥伴，幫助你深化想法' : 'AI 引導你理解這個想法並形成回應'}
                    </p>
                </div>
                <div className="flex items-center gap-stack-xs">
                    <button 
                        onClick={loadHistory}
                        disabled={historyLoading}
                        className="px-3 py-1.5 text-body-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
                        title="查看歷史記錄"
                    >
                        {historyLoading ? (
                            <FiLoader className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                            <FiClock className="w-4 h-4 mr-1" />
                        )}
                        歷史
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-h2">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 原始想法摘要 */}
            <div className="mb-6 p-component-sm bg-gray-50 rounded border border-gray-100 text-body-sm text-gray-600 truncate">
                <span className="font-bold mr-2">當前想法:</span> {nodeInfo.title}
            </div>

            {/* 觸發按鈕（尚未取得回應時顯示） */}
            {!coaching && !isLoading && (
                <div className="flex justify-center mb-6">
                    <button
                        onClick={() => triggerAgent(isOwner ? 'IMPROVER' : 'SYNTHESIZER')}
                        className="px-btn-x-lg py-btn-y-lg bg-[#5BA491] text-white rounded-xl font-semibold text-body hover:bg-[#5BA491]/90 hover:shadow-lg transition-shadow duration-fast flex items-center gap-2"
                    >
                        <FiCpu className="w-5 h-5" />
                        {isOwner ? '讓 AI 看看這個想法' : '讓 AI 引導我思考如何回應'}
                    </button>
                </div>
            )}

            {/* 歷史記錄面板 */}
            {showHistory && (
                <div className="mb-6 p-component-md bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-body font-bold text-gray-700 flex items-center">
                            <FiClock className="w-5 h-5 mr-2" />
                            歷史記錄
                        </h4>
                        <button 
                            onClick={() => setShowHistory(false)}
                            className="text-caption text-gray-400 hover:text-gray-600"
                        >
                            收起
                        </button>
                    </div>
                    
                    {history.length === 0 ? (
                        <p className="text-body-sm text-gray-500 text-center py-4">
                            目前沒有歷史記錄
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {history.map((item, idx) => (
                                <div 
                                    key={item.id}
                                    onClick={() => viewHistoryItem(item)}
                                    className="p-component-sm bg-white rounded-lg border border-gray-200 hover:border-[#5BA491] hover:shadow-sm transition cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-caption font-medium ${
                                                item.agentType === 'IMPROVER' ? 'bg-blue-100 text-blue-700' :
                                                item.agentType === 'SYNTHESIZER' ? 'bg-purple-100 text-purple-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.agentType === 'IMPROVER' ? '改進者' : 
                                                 item.agentType === 'SYNTHESIZER' ? '綜合者' : '魔鬼代言人'}
                                            </span>
                                            <span className="text-caption text-gray-400">{item.model}</span>
                                        </div>
                                        <span className="text-caption text-gray-400">
                                            {new Date(item.timestamp).toLocaleDateString('zh-TW', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-body-sm text-gray-600 line-clamp-2">
                                        {item.responseContent.substring(0, 100)}...
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 animate-pulse">
                    <div className="mb-4"><FiLoader className="w-10 h-10 animate-spin" /></div>
                    <p>AI 正在閱讀上下文並思考中...</p>
                </div>
            )}

            {/* 無法引導狀態（AI 判定內容不足） */}
            {!isLoading && coaching?._uncoachable && (
                <div className="p-component-md bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-body-sm font-semibold text-amber-800 mb-2">
                        AI 需要更多資訊才能提供引導
                    </p>
                    <p className="text-body-sm text-amber-700 whitespace-pre-wrap">
                        {coaching.uncoachableReason}
                    </p>
                    <button
                        onClick={() => { setCoaching(null); setActiveAgent(null); }}
                        className="mt-4 text-caption text-amber-600 hover:text-amber-800 underline"
                    >
                        回到選擇
                    </button>
                </div>
            )}

            {/* 結果顯示區 */}
            {!isLoading && coaching && !coaching._uncoachable && (
                <div className="flex-1 overflow-y-auto pr-2">
                    {/* Thinking Process (Collapsible) */}
                    {coaching.thinkingProcess && (() => {
                        const steps = parseThinkingSteps(coaching.thinkingProcess);
                        return (
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowThinking(!showThinking)}
                                    className="text-caption text-gray-400 hover:text-gray-600 flex items-center gap-1.5 mb-2 transition-colors duration-fast"
                                >
                                    {showThinking ? '▼ 隱藏思考過程' : '▶ 顯示 AI 思考過程'}
                                </button>
                                {showThinking && (
                                    steps.length > 1 ? (
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                                            {steps.map((step, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    {/* 左側時間軸 */}
                                                    <div className="flex flex-col items-center flex-shrink-0">
                                                        <div className="w-5 h-5 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-caption font-bold">
                                                            {idx + 1}
                                                        </div>
                                                        {idx < steps.length - 1 && (
                                                            <div className="w-0.5 bg-gray-200 flex-1 my-1 min-h-[0.75rem]" />
                                                        )}
                                                    </div>
                                                    {/* 右側文字 */}
                                                    <div className={`flex-1 ${idx < steps.length - 1 ? 'pb-3' : ''}`}>
                                                        <p className="text-caption text-gray-400 font-medium mb-0.5">步驟 {idx + 1}</p>
                                                        <p className="text-caption text-gray-600 leading-relaxed">{step}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-caption text-gray-600 leading-relaxed">
                                            {coaching.thinkingProcess}
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })()}

                    {/* Main Content */}
                    {(() => {
                        const borderClass = { IMPROVER: 'border-l-blue-400', SYNTHESIZER: 'border-l-purple-400', DEVIL: 'border-l-red-400' }[activeAgent] || 'border-l-gray-300';
                        return (
                            <div className="rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
                                <div className={`bg-white p-4 border-l-4 ${borderClass}`}>
                                    <div className="prose prose-sm max-w-none text-gray-800
                                        prose-p:leading-relaxed prose-p:mb-3 prose-p:text-gray-700
                                        prose-headings:font-bold prose-headings:text-gray-800 prose-headings:mb-2
                                        prose-ul:my-2 prose-li:text-gray-700 prose-li:leading-relaxed
                                        prose-ol:my-2 prose-ol:pl-5
                                        prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-gray-500
                                        prose-strong:text-gray-800
                                    ">
                                        <ReactMarkdown>{coaching.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                                        className="px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition shadow-sm flex items-center text-body-sm font-medium"
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
                                    <FiCheck className="w-4 h-4 mr-1" />
                                    感謝回饋！
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 換個角度看（顯示其他兩個 Agent） */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-body-sm text-gray-500">換個角度看？</p>
                            <button
                                onClick={() => triggerAgent(activeAgent)}
                                disabled={isLoading}
                                className="text-caption text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors duration-fast"
                                title="重新用相同角度分析一次"
                            >
                                <FiRefreshCw className="w-3 h-3" />
                                重新分析
                            </button>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {activeAgent !== 'SYNTHESIZER' && (
                                <button
                                    onClick={() => triggerAgent('SYNTHESIZER')}
                                    disabled={isLoading}
                                    className="px-btn-x py-btn-y bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-shadow duration-fast flex items-center text-body-sm font-medium"
                                >
                                    <FiLink className="w-4 h-4 mr-2" />
                                    整合觀點
                                </button>
                            )}
                            {activeAgent !== 'DEVIL' && (
                                <button
                                    onClick={() => triggerAgent('DEVIL')}
                                    disabled={isLoading}
                                    className="px-btn-x py-btn-y bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-shadow duration-fast flex items-center text-body-sm font-medium"
                                >
                                    <FaGavel className="w-4 h-4 mr-2" />
                                    找出漏洞
                                </button>
                            )}
                            {activeAgent !== 'IMPROVER' && (
                                <button
                                    onClick={() => triggerAgent('IMPROVER')}
                                    disabled={isLoading}
                                    className="px-btn-x py-btn-y bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-shadow duration-fast flex items-center text-body-sm font-medium"
                                >
                                    <FiTool className="w-4 h-4 mr-2" />
                                    改進想法
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KB_Coach;
