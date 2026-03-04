import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { socket } from '../../../utils/socket';
import { AGENT_NAMES, TOAST_DURATION } from '../constants/ideaWallConstants';

/**
 * IdeaWall Socket 事件處理 Hook
 * 處理所有 Socket.IO 相關的事件監聽和清理
 */
export function useIdeaWallSocket({
    projectId,
    getNodesQuery,
    getNodeRelationQuery,
    setAiSuggestion,
    setSuggestedAgentType,
    setKbCoachModalOpen,
}) {
    const refetchTimeoutRef = useRef(null);

    // 使用 ref 持有最新的 refetch 函式，避免 effect 依賴 getNodesQuery 物件
    // （useQuery 每次 render 都回傳新物件，若放進 deps 會導致 effect 頻繁重跑，
    //  造成 nodeUpdated listener 在 teardown/re-attach 空隙中丟失事件）
    const refetchNodesRef = useRef(getNodesQuery.refetch);
    const refetchRelationsRef = useRef(getNodeRelationQuery.refetch);
    useEffect(() => { refetchNodesRef.current = getNodesQuery.refetch; }, [getNodesQuery.refetch]);
    useEffect(() => { refetchRelationsRef.current = getNodeRelationQuery.refetch; }, [getNodeRelationQuery.refetch]);

    // 使用 ref 持有最新的 AI 相關 setter，同樣避免頻繁重掛 effect
    const setAiSuggestionRef = useRef(setAiSuggestion);
    const setSuggestedAgentTypeRef = useRef(setSuggestedAgentType);
    const setKbCoachModalOpenRef = useRef(setKbCoachModalOpen);
    useEffect(() => { setAiSuggestionRef.current = setAiSuggestion; }, [setAiSuggestion]);
    useEffect(() => { setSuggestedAgentTypeRef.current = setSuggestedAgentType; }, [setSuggestedAgentType]);
    useEffect(() => { setKbCoachModalOpenRef.current = setKbCoachModalOpen; }, [setKbCoachModalOpen]);

    useEffect(() => {
        // 節點更新事件處理器（使用 debounce 避免頻繁重新載入）
        // 透過 ref 讀取最新 refetch，不需將 query 物件放入 deps
        function nodeUpdateEvent(data) {
            console.log("收到節點更新事件:", data);

            // 清除之前的 timeout
            if (refetchTimeoutRef.current) {
                clearTimeout(refetchTimeoutRef.current);
            }

            // 延遲 300ms 後才重新載入，避免連續事件導致畫面跳動
            refetchTimeoutRef.current = setTimeout(() => {
                refetchNodesRef.current?.();
                refetchRelationsRef.current?.();
            }, 300);
        }

        // 錯誤處理事件：建立/更新/刪除節點失敗
        const handleNodeError = (err) => {
            console.warn('節點操作失敗:', err);
            
            if (err?.code === 'READ_ONLY_MODE') {
                toast.error('觀摩模式下無法編輯或建立節點');
            } else if (err?.message) {
                toast.error(err.message);
            } else {
                toast.error('節點操作失敗，請稍後再試');
            }
        };

        // 成功處理事件：節點操作成功
        const handleNodeSuccess = (result) => {
            console.log('節點操作成功:', result);
            
            if (result?.code === 'NODE_DELETE_SUCCESS') {
                toast.success(`${result.nodeTitle || '節點'} 刪除成功！`);
            } else if (result?.message) {
                toast.success(result.message);
            }
        };

        // Phase 3: AI 建議通知處理器
        const handleAiSuggestion = (data) => {
            console.log('🤖 [Phase 3] Received AI suggestion:', data);
            
            // 儲存建議資訊（透過 ref 讀取最新 setter）
            setAiSuggestionRef.current(data);
            setSuggestedAgentTypeRef.current(data.role);
            
            // 顯示 Toast 通知
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

        // 加入專案房間的處理函式（確保 socket 已連線後才 emit）
        const joinProject = () => {
            socket.emit("join_project", projectId);
        };

        // 連接 socket 並加入專案房間
        if (socket.connected) {
            // 已連線：直接 emit
            joinProject();
        } else {
            // 未連線：等待連線完成後再 emit，避免在 CLOSING 狀態時發送造成錯誤
            socket.once('connect', joinProject);
            socket.connect();
        }

        // 註冊事件監聽器（先移除舊的避免重複）
        socket.off("nodeUpdated", nodeUpdateEvent);
        socket.on("nodeUpdated", nodeUpdateEvent);

        socket.off('nodeCreateError', handleNodeError);
        socket.off('nodeUpdateError', handleNodeError);
        socket.off('nodeDeleteError', handleNodeError);
        socket.on('nodeCreateError', handleNodeError);
        socket.on('nodeUpdateError', handleNodeError);
        socket.on('nodeDeleteError', handleNodeError);
        
        socket.off('nodeCreateSuccess', handleNodeSuccess);
        socket.off('nodeUpdateSuccess', handleNodeSuccess);
        socket.off('nodeDeleteSuccess', handleNodeSuccess);
        socket.on('nodeCreateSuccess', handleNodeSuccess);
        socket.on('nodeUpdateSuccess', handleNodeSuccess);
        socket.on('nodeDeleteSuccess', handleNodeSuccess);

        socket.off('aiSuggestion', handleAiSuggestion);
        socket.on('aiSuggestion', handleAiSuggestion);

        // 清理函式
        return () => {
            // 清除未完成的 timeout
            if (refetchTimeoutRef.current) {
                clearTimeout(refetchTimeoutRef.current);
            }

            // 若 socket 尚未連線就已卸載，移除待執行的 joinProject 監聽
            socket.off('connect', joinProject);

            socket.off("nodeUpdated", nodeUpdateEvent);
            socket.off('nodeCreateError', handleNodeError);
            socket.off('nodeUpdateError', handleNodeError);
            socket.off('nodeDeleteError', handleNodeError);
            socket.off('nodeCreateSuccess', handleNodeSuccess);
            socket.off('nodeUpdateSuccess', handleNodeSuccess);
            socket.off('nodeDeleteSuccess', handleNodeSuccess);
            socket.off('aiSuggestion', handleAiSuggestion);
        };
    // 只依賴 projectId：projectId 換了才需要重新加入房間並重新掛 listener
    // getNodesQuery / getNodeRelationQuery 每次 render 都是新物件，
    // 放入 deps 會讓 effect 頻繁重跑，在 teardown 空隙丟失 socket 事件
    // → 改用 ref 持有最新的 refetch，listener 只掛一次，永遠不漏接
    }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
}
