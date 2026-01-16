/**
 * useActivityStream Hook
 * 
 * 功能：
 * - 監聽 Socket.IO 活動更新事件
 * - 監聽自定義瀏覽器事件（nodeCreated, columnDeleted 等）
 * - 去重邏輯，避免重複活動
 * - 管理新活動高亮狀態
 */

import { useEffect } from 'react';
import { socket } from '../../../utils/socket';
import { getActivityDescription } from '../utils/activityDescriptionUtils';

/**
 * 創建去重鍵，避免短時間內的重複活動
 * @param {Object} act - 活動物件
 * @returns {string} 去重鍵
 */
const createDedupeKey = (act) => {
    if (act.source === 'column') {
        return `column_${act.type}_${act.columnId || act.columnName}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
    } else if (act.source === 'node') {
        return `node_${act.type}_${act.nodeId}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
    } else {
        return `task_${act.type}_${act.taskId}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
    }
};

/**
 * useActivityStream Hook
 * @param {string} projectId - 專案 ID
 * @param {boolean} isOpen - 視窗是否開啟
 * @param {Function} setActivities - 設置活動列表的函式
 * @param {Function} setNewActivity - 設置新活動高亮的函式
 * @returns {void}
 */
export const useActivityStream = (projectId, isOpen, setActivities, setNewActivity) => {
    useEffect(() => {
        if (!projectId) return;

        const handleActivityUpdate = (activity) => {
            console.log('收到新活動:', activity);
            
            // 只有當視窗開啟時才設置新活動高亮
            if (isOpen) {
                setNewActivity(activity);
                // 3秒後清除新活動高亮
                setTimeout(() => setNewActivity(null), 3000);
            }
            
            // 無論視窗是否開啟都更新活動列表
            setActivities(prev => {
                const newActivityKey = createDedupeKey(activity);
                
                // 檢查最近10秒內是否有相同的活動（避免重複）
                const isDuplicate = prev.slice(0, 5).some(existingActivity => {
                    const existingKey = createDedupeKey({
                        source: existingActivity.source,
                        type: existingActivity.changeType,
                        columnId: existingActivity.column?.id,
                        columnName: existingActivity.columnName,
                        taskId: existingActivity.task?.id,
                        nodeId: existingActivity.node?.id,
                        user: existingActivity.changedBy,
                        timestamp: existingActivity.createdAt
                    });
                    
                    return existingKey === newActivityKey;
                });

                if (isDuplicate) {
                    console.log('跳過重複活動:', newActivityKey);
                    return prev; // 不添加重複的活動
                }

                // 準備活動記錄資料結構
                const activityRecord = {
                    id: `${activity.source}_${activity.type}_${activity.taskId || activity.columnId || activity.nodeId}_${Date.now()}`,
                    changeType: activity.type,
                    description: getActivityDescription(activity),
                    changedBy: activity.user,
                    createdAt: activity.timestamp,
                    // 包含新的詳細資訊
                    changes: activity.changes || [],
                    columnName: activity.columnName,
                    from: activity.from,
                    to: activity.to,
                    taskDetails: activity.taskDetails,
                    source: activity.source
                };

                // 根據活動類型設定對應的資料
                if (activity.source === 'column') {
                    // 列表活動
                    activityRecord.column = {
                        id: activity.columnId,
                        name: activity.columnName || activity.column?.name
                    };
                    // 保存完整的列表資料（用於顯示刪除的任務數量等詳細資訊）
                    if (activity.columnData) {
                        activityRecord.columnData = activity.columnData;
                    }
                } else if (activity.source === 'node') {
                    // 節點活動
                    activityRecord.node = {
                        id: activity.nodeId,
                        title: activity.nodeTitle || activity.node?.title,
                        type: activity.nodeType || activity.node?.type
                    };
                    // 保存完整的節點資料
                    if (activity.nodeData) {
                        activityRecord.nodeData = activity.nodeData;
                    }
                } else {
                    // 任務活動
                    activityRecord.task = { 
                        id: activity.taskId, 
                        title: activity.taskTitle 
                    };
                }
                
                console.log('添加新活動:', newActivityKey);
                return [
                    activityRecord,
                    ...prev.slice(0, 19) // 只保留前19條舊記錄，總共20條
                ];
            });
        };

        // 監聽 Socket 活動更新
        socket.on('activityUpdate', handleActivityUpdate);

        // 監聽自定義事件（用於前端直接觸發的活動更新）
        const handleCustomColumnDeleted = (event) => {
            console.log('收到自定義列表刪除事件:', event.detail);
            
            // 只處理當前專案的事件
            if (event.detail.projectId === projectId) {
                handleActivityUpdate(event.detail);
            }
        };

        // 節點活動事件處理器
        const handleCustomNodeActivity = (event) => {
            console.log('收到自定義節點活動事件:', event.detail);
            
            // 只處理當前專案的事件
            if (event.detail.projectId === projectId) {
                handleActivityUpdate(event.detail);
            }
        };

        // 只在當前專案的情況下監聽自定義事件
        if (projectId) {
            // 列表事件
            window.addEventListener('columnDeleted', handleCustomColumnDeleted);
            
            // 節點活動事件
            window.addEventListener('nodeCreated', handleCustomNodeActivity);
            window.addEventListener('nodeUpdated', handleCustomNodeActivity);
            window.addEventListener('nodeDeleted', handleCustomNodeActivity);
            window.addEventListener('nodeMoved', handleCustomNodeActivity);
            window.addEventListener('nodeConnected', handleCustomNodeActivity);
            window.addEventListener('nodeDisconnected', handleCustomNodeActivity);
        }

        return () => {
            socket.off('activityUpdate', handleActivityUpdate);
            if (projectId) {
                // 移除列表事件監聽器
                window.removeEventListener('columnDeleted', handleCustomColumnDeleted);
                
                // 移除節點活動事件監聽器
                window.removeEventListener('nodeCreated', handleCustomNodeActivity);
                window.removeEventListener('nodeUpdated', handleCustomNodeActivity);
                window.removeEventListener('nodeDeleted', handleCustomNodeActivity);
                window.removeEventListener('nodeMoved', handleCustomNodeActivity);
                window.removeEventListener('nodeConnected', handleCustomNodeActivity);
                window.removeEventListener('nodeDisconnected', handleCustomNodeActivity);
            }
        };
    }, [projectId, isOpen, setActivities, setNewActivity]);
};
