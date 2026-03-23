import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiCpu, FiCopy, FiCheck, FiAlertCircle, FiClock, FiDatabase, FiZap, FiChevronDown, FiChevronRight, FiLayers } from 'react-icons/fi';
import { authStorage } from '../../../services/storageService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================================
// API 工具
// ============================================================================

function getAuthHeaders() {
    const token = authStorage.get('accessToken') || authStorage.get('token');
    return { Authorization: `Bearer ${token}`, accessToken: token };
}

async function fetchHistory(projectId) {
    const res = await fetch(`${BASE_URL}/teacher-agent/history/${projectId}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
}

async function fetchCooldownStatus(projectId) {
    const res = await fetch(`${BASE_URL}/teacher-agent/status/${projectId}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
}

// ============================================================================
// Markdown 渲染（支援 **粗體** 內嵌語法）
// ============================================================================

function renderInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

function renderMarkdown(text) {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
            return <h3 key={i} className="text-body font-bold text-gray-800 mt-4 mb-1">{renderInline(line.slice(3))}</h3>;
        }
        if (line.startsWith('### ')) {
            return <h4 key={i} className="text-body-sm font-semibold text-gray-700 mt-3 mb-1">{renderInline(line.slice(4))}</h4>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
                <div key={i} className="flex items-start gap-2 my-0.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                    <span className="text-body-sm text-gray-700">{renderInline(line.slice(2))}</span>
                </div>
            );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-body-sm text-gray-700 my-0.5">{renderInline(line)}</p>;
    });
}

// ============================================================================
// 子元件：進度狀態列表
// ============================================================================

function StatusLog({ messages }) {
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (messages.length === 0) return null;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-component-sm space-y-1.5">
            <p className="text-caption font-semibold text-gray-500 uppercase tracking-wider mb-2">思考過程</p>
            {messages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 text-body-sm text-gray-600">
                    <span className="mt-0.5 text-teal-500 flex-shrink-0">›</span>
                    <span>{msg}</span>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}

// ============================================================================
// 子元件：數據快照摘要
// ============================================================================

function SnapshotSummary({ snapshot }) {
    if (!snapshot) return null;

    const items = [
        { label: '學生', value: `${snapshot.activeStudents} / ${snapshot.totalStudents} 位活躍` },
        { label: '本週提交', value: `${snapshot.totalSubmits} 筆` },
        { label: '本週反思', value: `${snapshot.totalReflections} 篇` },
        { label: '卡頓任務', value: `${snapshot.stalledTaskCount} 個` },
        { label: '求助高風險', value: `${snapshot.highRiskCount} 人` },
    ];

    return (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-component-sm space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiDatabase className="w-4 h-4 text-teal-600" />
                    <p className="text-caption font-semibold text-teal-700 uppercase tracking-wider">已讀取的數據範圍（近 7 天）</p>
                </div>
                {snapshot.subStageInfo && (
                    <span className="text-caption text-teal-700 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full">
                        {snapshot.subStageInfo.stageName} {snapshot.subStageInfo.stageNum}-{snapshot.subStageInfo.subStageNum}・{snapshot.subStageInfo.subStageName}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {items.map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-lg p-2 text-center border border-teal-100">
                        <p className="text-caption text-gray-500">{label}</p>
                        <p className="text-body-sm font-semibold text-teal-700">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// 子元件：分析報告
// ============================================================================

function ReportDisplay({ content, model, onCopy, copied }) {
    if (!content) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-component-sm py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <FiZap className="w-4 h-4 text-teal-600" />
                    <span className="text-body-sm font-semibold text-gray-700">班級洞察報告</span>
                    {model && (
                        <span className="text-caption text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {model}
                        </span>
                    )}
                </div>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-1.5 text-caption text-gray-500 hover:text-teal-600 transition-colors duration-fast"
                >
                    {copied ? <FiCheck className="w-3.5 h-3.5 text-teal-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                    {copied ? '已複製' : '複製報告'}
                </button>
            </div>
            <div className="p-component-sm">
                {renderMarkdown(content)}
            </div>
        </div>
    );
}

// ============================================================================
// 子元件：歷史紀錄
// ============================================================================

function HistoryPanel({ history, onRestore }) {
    const [open, setOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    if (history.length === 0) return null;

    const handleCopy = (entry) => {
        navigator.clipboard.writeText(entry.content).then(() => {
            setCopiedId(entry.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-component-sm py-3 hover:bg-gray-50 transition-colors duration-fast"
            >
                <span className="text-body-sm font-semibold text-gray-600">
                    過去分析紀錄（共 {history.length} 筆）
                </span>
                {open
                    ? <FiChevronDown className="w-4 h-4 text-gray-400" />
                    : <FiChevronRight className="w-4 h-4 text-gray-400" />
                }
            </button>

            {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {history.map((entry) => (
                        <div key={entry.id} className="p-component-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-body-sm font-medium text-gray-700">
                                        {new Date(entry.createdAt).toLocaleString('zh-TW', {
                                            month: 'numeric', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                    {entry.model && (
                                        <span className="text-caption text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {entry.model}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onRestore(entry)}
                                        className="text-caption text-teal-600 hover:text-teal-700 font-medium transition-colors duration-fast"
                                    >
                                        載入
                                    </button>
                                    <button
                                        onClick={() => handleCopy(entry)}
                                        className="flex items-center gap-1 text-caption text-gray-400 hover:text-gray-600 transition-colors duration-fast"
                                    >
                                        {copiedId === entry.id
                                            ? <FiCheck className="w-3 h-3 text-teal-500" />
                                            : <FiCopy className="w-3 h-3" />
                                        }
                                    </button>
                                </div>
                            </div>
                            <p className="text-caption text-gray-400 line-clamp-2 leading-relaxed">
                                {entry.content.replace(/[#*]/g, '').trim().slice(0, 120)}...
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 主元件
// ============================================================================

export default function AgentInsightsPanel({ projectId }) {
    const [phase, setPhase] = useState('idle');
    const [statusMessages, setStatusMessages] = useState([]);
    const [snapshot, setSnapshot] = useState(null);
    const [report, setReport] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [geminiCooldown, setGeminiCooldown] = useState(null);
    const [lastAnalysis, setLastAnalysis] = useState(null);
    const [history, setHistory] = useState([]);
    const [platformSpecific, setPlatformSpecific] = useState(false);
    const abortRef = useRef(null);

    // 初始化：從 API 讀取冷卻狀態與歷史紀錄
    useEffect(() => {
        if (!projectId) return;

        fetchCooldownStatus(projectId).then(data => {
            if (!data) return;
            setGeminiCooldown({
                onCooldown: data.geminiOnCooldown,
                cooldownUntil: data.cooldownUntil,
                cooldownMinutes: data.cooldownMinutes,
            });
        });

        fetchHistory(projectId).then(data => {
            setHistory(data);
            if (data.length > 0) {
                setLastAnalysis({ timestamp: data[0].createdAt, model: data[0].model });
            }
        });
    }, [projectId]);

    // 冷卻倒計時
    const [cooldownDisplay, setCooldownDisplay] = useState('');
    useEffect(() => {
        if (!geminiCooldown?.onCooldown) { setCooldownDisplay(''); return; }
        const update = () => {
            const remaining = geminiCooldown.cooldownUntil - Date.now();
            if (remaining <= 0) { setGeminiCooldown(prev => ({ ...prev, onCooldown: false })); return; }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setCooldownDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [geminiCooldown]);

    const handleStartAnalysis = useCallback(async () => {
        if (!projectId || phase === 'running') return;

        setPhase('running');
        setStatusMessages([]);
        setSnapshot(null);
        setReport(null);
        setErrorMsg('');

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await fetch(`${BASE_URL}/teacher-agent/analyze/${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ platformSpecific }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || '請求失敗');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            handleSseEvent(currentEvent, data);
                        } catch { /* 忽略 */ }
                    }
                }
            }

            // 分析完成後重新拉取歷史
            const updated = await fetchHistory(projectId);
            setHistory(updated);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setErrorMsg(err.message || '分析過程發生錯誤');
                setPhase('error');
            }
        }
    }, [projectId, phase]);

    function handleSseEvent(eventType, data) {
        switch (eventType) {
            case 'status':
                setStatusMessages(prev => [...prev, data.message]);
                break;
            case 'snapshot':
                setSnapshot(data);
                setStatusMessages(prev => [...prev, '資料收集完成，正在生成分析報告...']);
                break;
            case 'report':
                setReport({ content: data.content, model: data.model });
                break;
            case 'done':
                setPhase('done');
                setLastAnalysis({ timestamp: data.timestamp, model: data.model });
                if (data.geminiOnCooldown) {
                    setGeminiCooldown({
                        onCooldown: true,
                        cooldownUntil: data.cooldownUntil,
                        cooldownMinutes: data.cooldownMinutes,
                    });
                }
                break;
            case 'error':
                setErrorMsg(data.message);
                setPhase('error');
                break;
        }
    }

    const handleCopy = () => {
        if (!report?.content) return;
        navigator.clipboard.writeText(report.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleRestore = (entry) => {
        setReport({ content: entry.content, model: entry.model });
        setSnapshot(entry.snapshot || null);
        setStatusMessages([]);
        setPhase('done');
    };

    // -------------------------------------------------------------------------

    const canAnalyze = phase !== 'running';
    const modelHint = geminiCooldown?.onCooldown
        ? `Gemini 冷卻中（${cooldownDisplay}），將使用 vLLM`
        : 'Gemini 優先，vLLM 備援';

    return (
        <div className="space-y-stack-sm">
            {/* 頂部說明與觸發區 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-component-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FiCpu className="w-5 h-5 text-teal-600" />
                            <h2 className="text-h3 font-bold text-gray-800">AI 班級洞察</h2>
                        </div>
                        <p className="text-body-sm text-gray-500">
                            收集近 7 天的學習數據，生成可執行的介入建議
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <FiClock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-caption text-gray-400">{modelHint}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {/* 平台操作模式 toggle */}
                        <button
                            onClick={() => setPlatformSpecific(prev => !prev)}
                            disabled={phase === 'running'}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg border text-caption font-medium
                                transition-all duration-fast
                                ${platformSpecific
                                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }
                                ${phase === 'running' ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <FiLayers className="w-3.5 h-3.5" />
                            平台操作建議{platformSpecific ? '：開' : '：關'}
                        </button>

                        <button
                            onClick={handleStartAnalysis}
                            disabled={!canAnalyze}
                            className={`
                                flex items-center gap-2 px-btn-x-lg py-btn-y-lg rounded-xl
                                text-body-sm font-semibold transition-all duration-fast
                                ${canAnalyze
                                    ? 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            <FiCpu className="w-4 h-4" />
                            {phase === 'running' ? '分析中...' : '開始分析'}
                        </button>

                        {lastAnalysis && (
                            <span className="text-caption text-gray-400">
                                上次分析：{new Date(lastAnalysis.timestamp).toLocaleString('zh-TW', {
                                    month: 'numeric', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                                {lastAnalysis.model && ` · ${lastAnalysis.model}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 錯誤狀態 */}
            {phase === 'error' && errorMsg && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-component-sm">
                    <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-body-sm text-red-700">{errorMsg}</p>
                </div>
            )}

            {/* 思考過程 */}
            {(phase === 'running' || phase === 'done') && statusMessages.length > 0 && (
                <StatusLog messages={statusMessages} />
            )}

            {/* 數據快照摘要 */}
            {snapshot && <SnapshotSummary snapshot={snapshot} />}

            {/* 分析報告 */}
            {report && (
                <ReportDisplay
                    content={report.content}
                    model={report.model}
                    onCopy={handleCopy}
                    copied={copied}
                />
            )}

            {/* 歷史紀錄（從資料庫讀取） */}
            <HistoryPanel history={history} onRestore={handleRestore} />
        </div>
    );
}
