import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { socket } from '../../../utils/socket';
import { AGENT_NAMES, TOAST_DURATION } from '../constants/ideaWallConstants';

/**
 * IdeaWall Socket 事件處理 Hook
 * 處理所有 Socket.IO 相關的事件監聽和清理
 *
 * 方案 B 改造：
 * - 新增 nodeSync 事件監聽（差量更新 + self-echo 過濾）
 * - 新增 nodeCreateConfirm 事件（tempId → realId 替換）
 * - 新增 nodeCreateError/nodeUpdateError/nodeDeleteError 事件（回滾 optimistic update）
 * - 保留 aiSuggestion 等非節點事件不變
 */
export function useIdeaWallSocket({
    projectId,
    mutations,
    setAiSuggestion,
    setSuggestedAgentType,
    setKbCoachModalOpen,
}) {
    // 使用 ref 持有最新的函式，避免 effect 依賴變化頻繁重掛
    const applySyncRef = useRef(mutations?.applySyncEvent);
    const confirmCreateRef = useRef(mutations?.confirmCreate);
    const rollbackCreateRef = useRef(mutations?.rollbackCreate);
    const rollbackUpdateRef = useRef(mutations?.rollbackUpdate);
    const rollbackDeleteRef = useRef(mutations?.rollbackDelete);

    useEffect(() => { applySyncRef.current = mutations?.applySyncEvent; }, [mutations?.applySyncEvent]);
    useEffect(() => { confirmCreateRef.current = mutations?.confirmCreate; }, [mutations?.confirmCreate]);
    useEffect(() => { rollbackCreateRef.current = mutations?.rollbackCreate; }, [mutations?.rollbackCreate]);
    useEffect(() => { rollbackUpdateRef.current = mutations?.rollbackUpdate; }, [mutations?.rollbackUpdate]);
    useEffect(() => { rollbackDeleteRef.current = mutations?.rollbackDelete; }, [mutations?.rollbackDelete]);

    // AI 相關 setter refs
    const setAiSuggestionRef = useRef(setAiSuggestion);
    const setSuggestedAgentTypeRef = useRef(setSuggestedAgentType);
    const setKbCoachModalOpenRef = useRef(setKbCoachModalOpen);
    useEffect(() => { setAiSuggestionRef.current = setAiSuggestion; }, [setAiSuggestion]);
    useEffect(() => { setSuggestedAgentTypeRef.current = setSuggestedAgentType; }, [setSuggestedAgentType]);
    useEffect(() => { setKbCoachModalOpenRef.current = setKbCoachModalOpen; }, [setKbCoachModalOpen]);

    useEffect(() => {
        // ==========================================
        // 差量同步事件（取代原本的 nodeUpdated + refetch）
        // ==========================================
        function handleNodeSync(data) {
            applySyncRef.current?.(data);
        }

        // ==========================================
        // Server 確認建立成功 — 替換 tempId → realId
        // ==========================================
        function handleCreateConfirm(data) {
            confirmCreateRef.current?.(data);
        }

        // ==========================================
        // 錯誤處理：建立/更新/刪除節點失敗 — 回滾 optimistic update
        // ==========================================
        const handleNodeCreateError = (err) => {
            console.warn('節點建立失敗:', err);
            if (err?.tempId) {
                rollbackCreateRef.current?.({
                    tempId: err.tempId,
                    errorMessage: err?.message || '節點建立失敗',
                });
            } else {
                if (err?.code === 'READ_ONLY_MODE') {
                    toast.error('觀摩模式下無法建立節點');
                } else {
                    toast.error(err?.message || '節點建立失敗');
                }
            }
        };

        const handleNodeUpdateError = (err) => {
            console.warn('節點更新失敗:', err);
            const errorMessage = err?.code === 'READ_ONLY_MODE'
                ? '觀摩模式下無法編輯節點'
                : (err?.message || '節點更新失敗');
            rollbackUpdateRef.current?.({ errorMessage });
        };

        const handleNodeDeleteError = (err) => {
            console.warn('節點刪除失敗:', err);
            const errorMessage = err?.code === 'READ_ONLY_MODE'
                ? '觀摩模式下無法刪除節點'
                : (err?.message || '節點刪除失敗');
            rollbackDeleteRef.current?.({ errorMessage });
        };

        // 成功處理事件
        const handleNodeSuccess = (result) => {
            if (result?.code === 'NODE_DELETE_SUCCESS') {
                toast.success(`${result.nodeTitle || '節點'} 刪除成功`);
            }
        };

        // Phase 3: AI 建議通知處理器
        const handleAiSuggestion = (data) => {
            setAiSuggestionRef.current(data);
            setSuggestedAgentTypeRef.current(data.role);

            const agentName = AGENT_NAMES[data.role] || 'AI 助教';

            toast((t) => (
                <div className="flex flex-col gap-stack-xs">
                    <div className="font-medium">{agentName} 有建議給你！</div>
                    <div className="text-body-sm text-gray-600">{data.reason}</div>
                    <div className="flex gap-stack-xs mt-2">
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                setKbCoachModalOpenRef.current(true);
                            }}
                            className="px-3 py-1 bg-purple-600 text-white text-body-sm rounded hover:bg-purple-700"
                        >
                            查看建議
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-body-sm rounded hover:bg-gray-300"
                        >
                            稍後
                        </button>
                    </div>
                </div>
            ), {
                duration: TOAST_DURATION.LONG,
                position: 'top-right',
                style: {
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    padding: '16px',
                    maxWidth: '400px'
                }
            });
        };

        // 加入專案房間
        const joinProject = () => {
            socket.emit("join_project", projectId);
        };

        if (socket.connected) {
            joinProject();
        } else {
            socket.once('connect', joinProject);
            socket.connect();
        }

        // 註冊事件監聯器
        socket.off("nodeSync", handleNodeSync);
        socket.on("nodeSync", handleNodeSync);

        socket.off("nodeCreateConfirm", handleCreateConfirm);
        socket.on("nodeCreateConfirm", handleCreateConfirm);

        socket.off('nodeCreateError', handleNodeCreateError);
        socket.off('nodeUpdateError', handleNodeUpdateError);
        socket.off('nodeDeleteError', handleNodeDeleteError);
        socket.on('nodeCreateError', handleNodeCreateError);
        socket.on('nodeUpdateError', handleNodeUpdateError);
        socket.on('nodeDeleteError', handleNodeDeleteError);

        socket.off('nodeDeleteSuccess', handleNodeSuccess);
        socket.on('nodeDeleteSuccess', handleNodeSuccess);

        socket.off('aiSuggestion', handleAiSuggestion);
        socket.on('aiSuggestion', handleAiSuggestion);

        return () => {
            socket.off('connect', joinProject);
            socket.off("nodeSync", handleNodeSync);
            socket.off("nodeCreateConfirm", handleCreateConfirm);
            socket.off('nodeCreateError', handleNodeCreateError);
            socket.off('nodeUpdateError', handleNodeUpdateError);
            socket.off('nodeDeleteError', handleNodeDeleteError);
            socket.off('nodeDeleteSuccess', handleNodeSuccess);
            socket.off('aiSuggestion', handleAiSuggestion);
        };
    }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
}
