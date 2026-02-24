/**
 * useActivityData Hook
 * 
 * 功能：
 * - 管理活動資料狀態（activities, newActivity, isLoadingMore, hasMore）
 * - 初始載入活動資料（使用 react-query）
 * - 載入更多活動（分頁）
 * - 當視窗重新開啟時重新載入資料
 */

import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getProjectActivity } from '../../../api/kanban';

/**
 * useActivityData Hook
 * @param {string} projectId - 專案 ID
 * @param {boolean} isOpen - 視窗是否開啟
 * @returns {Object} 活動資料和操作函式
 */
export const useActivityData = (projectId, isOpen) => {
    const [activities, setActivities] = useState([]);
    const [newActivity, setNewActivity] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const { refetch } = useQuery(
        ['projectActivity', projectId],
        () => getProjectActivity(projectId, { limit: 20 }),
        {
            onSuccess: (data) => {
                console.log('ActivityStream 載入活動記錄:', data);
                // Debug: 檢查是否包含節點刪除記錄
                const nodeDeleteActivities = data?.filter(act => act.source === 'node' && act.changeType === 'delete');
                if (nodeDeleteActivities?.length > 0) {
                    console.log('發現節點刪除記錄:', nodeDeleteActivities);
                }
                setActivities(data);
                setHasMore(data && data.length === 20);
            },
            enabled: !!projectId && isOpen,
            refetchOnWindowFocus: false,
            staleTime: 0 // 確保每次開啟都會重新載入最新資料
        }
    );

    // 當視窗重新開啟時，重新載入活動資料
    useEffect(() => {
        if (isOpen && projectId) {
            refetch();
        }
    }, [isOpen, projectId, refetch]);

    // 載入更多活動記錄
    const loadMoreActivities = async () => {
        if (isLoadingMore || !hasMore) return;
        
        setIsLoadingMore(true);
        try {
            const oldestActivity = activities[activities.length - 1];
            const beforeTimestamp = oldestActivity ? oldestActivity.createdAt : null;
            
            const moreData = await getProjectActivity(projectId, { 
                limit: 20, 
                before: beforeTimestamp 
            });
            
            if (moreData && moreData.length > 0) {
                // 過濾掉已存在的活動（基於 id 和 createdAt）
                const existingIds = new Set(activities.map(a => `${a.id}-${a.createdAt}`));
                const newActivities = moreData.filter(activity => 
                    !existingIds.has(`${activity.id}-${activity.createdAt}`)
                );
                
                if (newActivities.length > 0) {
                    setActivities(prev => [...prev, ...newActivities]);
                    // 如果返回的新記錄數少於請求的數量，表示已到底部
                    setHasMore(newActivities.length === 20);
                } else {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('載入更多活動失敗:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return {
        activities,
        setActivities,
        newActivity,
        setNewActivity,
        isLoadingMore,
        hasMore,
        loadMoreActivities
    };
};
