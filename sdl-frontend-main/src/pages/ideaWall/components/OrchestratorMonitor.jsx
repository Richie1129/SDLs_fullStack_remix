/**
 * Phase 2 Orchestrator 驗證頁面
 *
 * 這個元件讓你能看到 Orchestrator 在背景做了什麼決策
 * 放在 IdeaWall 頁面的底部或側邊欄
 */

import React, { useState, useEffect } from 'react';
import { FiSearch, FiTool, FiLink, FiInfo } from 'react-icons/fi';
import { FaBrain, FaGavel } from 'react-icons/fa';
import apiClient from '../../../api/client';

const OrchestratorMonitor = ({ ideaWallId, projectId }) => {
    const [status, setStatus] = useState(null);
    const [decision, setDecision] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 檢查冷卻狀態
    const checkStatus = async () => {
        try {
            const response = await apiClient.get(`/kb-coach/orchestrator/status/${ideaWallId}`);
            setStatus(response.data);
        } catch (error) {
            console.error('Failed to get orchestrator status:', error);
        }
    };

    // 手動觸發分析（模擬自動分析的結果）
    const triggerAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const response = await apiClient.post('/kb-coach/orchestrator/analyze', {
                ideaWallId,
                projectId
            });
            setDecision(response.data);
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (ideaWallId) {
            checkStatus();
        }
    }, [ideaWallId]);

    if (!ideaWallId) return null;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-component-base mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-body-sm font-bold text-gray-700 flex items-center">
                    <FaBrain className="w-4 h-4 mr-2 text-purple-600" />
                    Phase 2 Orchestrator 監控
                </h3>
                <button
                    onClick={checkStatus}
                    className="text-caption text-blue-600 hover:underline"
                >
                    重新整理
                </button>
            </div>

            {/* 冷卻狀態 */}
            {status && (
                <div className="mb-3 p-component-sm bg-white rounded border border-gray-100 text-caption">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-600">冷卻狀態：</span>
                        <span className={`px-2 py-1 rounded ${
                            status.canIntervene
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {status.message}
                        </span>
                    </div>

                    {status.cooldownStatus && (
                        <div className="text-gray-500 space-y-1">
                            <div>最後介入：{status.cooldownStatus.lastIntervention ? new Date(status.cooldownStatus.lastIntervention).toLocaleString('zh-TW') : '從未介入'}</div>
                            {!status.canIntervene && (
                                <div>剩餘冷卻：{Math.round(status.cooldownStatus.cooldownRemaining)} 分鐘</div>
                            )}
                        </div>
                    )}

                    <div className="mt-2 text-gray-500">
                        目前貼文數：{status.nodeCount}
                    </div>
                </div>
            )}

            {/* 手動觸發分析 */}
            <button
                onClick={triggerAnalysis}
                disabled={isAnalyzing}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-body-sm font-medium transition"
            >
                {isAnalyzing ? <><FiSearch className="w-4 h-4 inline mr-1" /> 分析中...</> : <><FiSearch className="w-4 h-4 inline mr-1" /> 查看自動分析結果</>}
            </button>

            {/* 分析結果 */}
            {decision && (
                <div className="mt-3 p-component-sm bg-white rounded border border-gray-100 text-caption">
                    <div className="font-bold text-gray-700 mb-2 flex items-center justify-between">
                        <span>Orchestrator 決策：</span>
                        <span className={`px-2 py-1 rounded text-caption ${
                            decision.action === 'TRIGGER'
                                ? 'bg-red-100 text-red-700'
                                : decision.action === 'WAIT'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {decision.action}
                        </span>
                    </div>

                    {decision.role && (
                        <div className="mb-2 p-component-xs bg-blue-50 rounded">
                            <span className="font-medium">建議 Agent：</span>
                            <span className="ml-2 text-blue-700">
                                {decision.role === 'IMPROVER' && <><FiTool className="w-3.5 h-3.5 inline mr-1" /> Idea Improver</>}
                                {decision.role === 'SYNTHESIZER' && <><FiLink className="w-3.5 h-3.5 inline mr-1" /> Synthesizer</>}
                                {decision.role === 'DEVIL' && <><FaGavel className="w-3.5 h-3.5 inline mr-1" /> Devil's Advocate</>}
                            </span>
                        </div>
                    )}

                    <div className="text-gray-600 mb-2">
                        <span className="font-medium">理由：</span>
                        <div className="mt-1 text-gray-700">{decision.reason}</div>
                    </div>

                    {decision.analysis && (
                        <div className="grid grid-cols-3 gap-stack-xs mt-2 pt-2 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-gray-500 text-caption">深度</div>
                                <div className="font-bold text-blue-600">{decision.analysis.depth}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500 text-caption">多樣性</div>
                                <div className="font-bold text-green-600">{decision.analysis.diversity}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500 text-caption">收斂度</div>
                                <div className="font-bold text-purple-600">{decision.analysis.convergence}</div>
                            </div>
                        </div>
                    )}

                    {decision.discussionType && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-gray-500">
                            討論類型：<span className="font-medium text-gray-700">{decision.discussionType}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 說明 */}
            <div className="mt-3 p-component-xs bg-blue-50 rounded text-caption text-blue-700">
                <span className="font-bold flex items-center gap-1"><FiInfo className="w-3.5 h-3.5" /> Phase 2 說明：</span>
                每次發文時，Orchestrator 會在背景自動分析討論品質。Phase 3 會將建議自動顯示在討論區。
            </div>
        </div>
    );
};

export default OrchestratorMonitor;
