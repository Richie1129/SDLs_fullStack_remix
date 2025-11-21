/**
 * KB Coach Component (AI-Scaffold Orchestrator - Phase 1 MVP)
 * 
 * 支援三種 Agent 人格的手動觸發介面
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../../../api/client';
import ReactMarkdown from 'react-markdown';

const KB_Coach = ({ nodeInfo, nodes = [], onClose, onNewNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState(null); // 'IMPROVER', 'SYNTHESIZER', 'DEVIL'
    const [coaching, setCoaching] = useState(null);
    const [showThinking, setShowThinking] = useState(false);

    // 當節點變更時，清空舊狀態
    useEffect(() => {
        setCoaching(null);
        setActiveAgent(null);
        setShowThinking(false);
    }, [nodeInfo.id]);

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

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl max-h-[80vh] overflow-y-auto flex flex-col h-full">
            {/* 標題 */}
            <div className="mb-4 pb-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <span className="mr-2">🤖</span>
                        AI 協作夥伴
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        選擇一位夥伴來協助你深化想法
                    </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    ✕
                </button>
            </div>

            {/* 原始想法摘要 */}
            <div className="mb-6 p-3 bg-gray-50 rounded border border-gray-100 text-sm text-gray-600 truncate">
                <span className="font-bold mr-2">當前想法:</span> {nodeInfo.title}
            </div>

            {/* Agent 選擇區 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => triggerAgent('IMPROVER')}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'IMPROVER' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="text-3xl mb-2">🛠️</div>
                    <div className="font-bold mb-1">想法改進者</div>
                    <div className="text-xs opacity-80">深化單一觀點</div>
                </button>

                <button
                    onClick={() => triggerAgent('SYNTHESIZER')}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'SYNTHESIZER' 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="text-3xl mb-2">🔗</div>
                    <div className="font-bold mb-1">綜合者</div>
                    <div className="text-xs opacity-80">連結多個想法</div>
                </button>

                <button
                    onClick={() => triggerAgent('DEVIL')}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${
                        activeAgent === 'DEVIL' 
                            ? 'border-red-500 bg-red-50 text-red-700' 
                            : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'
                    }`}
                >
                    <div className="text-3xl mb-2">😈</div>
                    <div className="font-bold mb-1">魔鬼代言人</div>
                    <div className="text-xs opacity-80">挑戰既有觀點</div>
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 animate-pulse">
                    <div className="text-4xl mb-4">🤔</div>
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
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center mb-2"
                            >
                                {showThinking ? '▼ 隱藏思考過程' : '▶ 顯示 AI 思考過程 (CoT)'}
                            </button>
                            {showThinking && (
                                <div className="p-3 bg-gray-100 rounded text-xs text-gray-600 font-mono whitespace-pre-wrap border border-gray-200">
                                    {coaching.thinkingProcess}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                        <div className="prose prose-sm max-w-none text-gray-800">
                            <ReactMarkdown>{coaching.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Suggested Actions */}
                    {coaching.suggestedActions && coaching.suggestedActions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                建議行動
                            </h4>
                            <div className="flex flex-wrap gap-3">
                                {coaching.suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => executeAction(action)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm flex items-center text-sm font-medium"
                                    >
                                        <span className="mr-2">✨</span>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default KB_Coach;
