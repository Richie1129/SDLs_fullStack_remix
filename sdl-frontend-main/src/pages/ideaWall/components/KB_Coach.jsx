/**
 * KB Coach Component
 * 
 * 基於Knowledge Building 12原則的AI教練面板
 * 零破壞性設計：與Idea_development.jsx並存
 */

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import apiClient from '../../../api/client';

const KB_Coach = ({ nodeInfo, onClose, onNewNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [coaching, setCoaching] = useState(null);

    /**
     * 行動圖示映射
     */
    const getActionIcon = (action) => {
        const icons = {
            CREATE_NODE: '📝',
            CONNECT_IDEA: '🔗',
            RESEARCH_TOPIC: '🔍',
            COLLABORATE: '👥'
        };
        return icons[action] || '💡';
    };

    /**
     * 取得KB Coach建議
     */
    const getGuidance = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.post('/kb-coach/guidance', {
                title: nodeInfo.title,
                content: nodeInfo.content,
                nodeId: nodeInfo.id,
                relatedNodes: [] // Phase 2可以加入相關節點
            });

            if (response.data) {
                setCoaching(response.data);
                toast.success('KB Coach建議已生成！');
            }
        } catch (error) {
            console.error('Error getting KB guidance:', error);
            toast.error('取得KB Coach建議時發生錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 執行建議行動（以CREATE_NODE為例）
     */
    const executeSuggestion = (suggestion) => {
        if (suggestion.action === 'CREATE_NODE') {
            const newNodeData = {
                title: `[延伸] ${nodeInfo.title}`,
                content: suggestion.description,
                from_id: nodeInfo.id,
                ideaWallId: nodeInfo.ideaWallId,
                owner: localStorage.getItem("username") || "學生",
                projectId: nodeInfo.projectId,
                colorindex: localStorage.getItem("id")
            };
            
            onNewNode(newNodeData);
            onClose();
            toast.success('已建立延伸想法節點！');
        } else {
            toast.info(`建議：${suggestion.description}`);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl max-h-[80vh] overflow-y-auto">
            {/* 標題 */}
            <div className="mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">🎓</span>
                    KB Coach - 知識翻新教練
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    基於Knowledge Building 12原則，引導你深化想法
                </p>
            </div>

            {/* 原始想法 */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
                <p className="font-semibold text-gray-700 mb-2">你的想法：</p>
                <p className="text-gray-900 font-medium">{nodeInfo.title}</p>
                <p className="text-gray-600 mt-2 text-sm">{nodeInfo.content}</p>
            </div>

            {/* 建議結果 */}
            {coaching && (
                <div className="space-y-6">
                    {/* KB原則 */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                            <span className="mr-2">📚</span>
                            適用的KB原則
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {coaching.principles.map((principle, idx) => (
                                <div
                                    key={idx}
                                    className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm"
                                    title={principle.description}
                                >
                                    {principle.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 引導問題 */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                            <span className="mr-2">💭</span>
                            引導問題
                        </h4>
                        <ul className="space-y-3">
                            {coaching.questions.map((question, idx) => (
                                <li
                                    key={idx}
                                    className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-gray-800"
                                >
                                    {question}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 推薦的思考鷹架 */}
                    {coaching.recommendedScaffolds && coaching.recommendedScaffolds.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                                <span className="mr-2">🧭</span>
                                推薦的思考鷹架
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                點擊按鈕可將鷹架文字複製，然後在編輯想法時貼上使用
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {coaching.recommendedScaffolds.map((scaffold, idx) => {
                                    const scaffoldColors = {
                                        '我的理論：': 'bg-blue-100 hover:bg-blue-200 text-blue-800',
                                        '我需要了解：': 'bg-green-100 hover:bg-green-200 text-green-800',
                                        '新資訊：': 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
                                        '這種理論無法解釋：': 'bg-red-100 hover:bg-red-200 text-red-800',
                                        '更好的理論：': 'bg-purple-100 hover:bg-purple-200 text-purple-800',
                                        '整合我們的知識：': 'bg-pink-100 hover:bg-pink-200 text-pink-800'
                                    };
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                navigator.clipboard.writeText(scaffold);
                                                toast.success(`已複製「${scaffold.replace('：', '')}」`);
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scaffoldColors[scaffold] || 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                                            title="點擊複製此鷹架文字"
                                        >
                                            {scaffold.replace('：', '')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 建議行動 */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                            <span className="mr-2">🚀</span>
                            建議行動
                        </h4>
                        <div className="space-y-3">
                            {coaching.suggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-green-50 border border-green-200 rounded-lg"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 mb-1">
                                                <span className="mr-2">{getActionIcon(suggestion.action)}</span>
                                                {suggestion.description}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                原因：{suggestion.reason}
                                            </p>
                                        </div>
                                        {suggestion.action === 'CREATE_NODE' && (
                                            <button
                                                onClick={() => executeSuggestion(suggestion)}
                                                className="ml-3 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition whitespace-nowrap"
                                            >
                                                執行
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                    onClick={onClose}
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                    關閉
                </button>
                <button
                    onClick={getGuidance}
                    disabled={isLoading}
                    className="px-5 py-2 bg-customgreen text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition"
                >
                    {isLoading ? '分析中...' : (coaching ? '🔄 重新分析' : '取得KB Coach建議')}
                </button>
            </div>
        </div>
    );
};

export default KB_Coach;
