import { useEffect } from 'react';
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
    useEffect(() => {
        // 節點更新事件處理器
        function nodeUpdateEvent(data) {
            console.log("收到節點更新事件:", data);
            // 無論資料為何都重新載入節點 - 確保UI與資料庫同步
            getNodesQuery.refetch();
            getNodeRelationQuery.refetch();
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
            
            // 儲存建議資訊
            setAiSuggestion(data);
            setSuggestedAgentType(data.role);
            
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
                                setKbCoachModalOpen(true);
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

        // 連接 socket 並加入專案房間
        socket.connect();
        socket.emit("join_project", projectId);

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
            socket.off("nodeUpdated", nodeUpdateEvent);
            socket.off('nodeCreateError', handleNodeError);
            socket.off('nodeUpdateError', handleNodeError);
            socket.off('nodeDeleteError', handleNodeError);
            socket.off('nodeCreateSuccess', handleNodeSuccess);
            socket.off('nodeUpdateSuccess', handleNodeSuccess);
            socket.off('nodeDeleteSuccess', handleNodeSuccess);
            socket.off('aiSuggestion', handleAiSuggestion);
        };
    }, [socket, projectId, getNodesQuery, getNodeRelationQuery, setAiSuggestion, setSuggestedAgentType, setKbCoachModalOpen]);
}
