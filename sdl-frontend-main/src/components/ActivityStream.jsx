import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getProjectActivity } from '../api/kanban';
import { formatTime } from '../utils/timeUtils';
import { socket } from '../utils/socket';
import { FiActivity, FiEdit, FiTrash2, FiMove, FiPlus, FiColumns, FiShuffle, FiCircle, FiGitBranch } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

const ActivityStream = ({ projectId, isOpen, onClose }) => {
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

    // 監聽實時活動更新（不依賴視窗開啟狀態）
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
                // 創建去重鍵，避免短時間內的重複活動
                const createDedupeKey = (act) => {
                    if (act.source === 'column') {
                        return `column_${act.type}_${act.columnId || act.columnName}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
                    } else if (act.source === 'node') {
                        return `node_${act.type}_${act.nodeId}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
                    } else {
                        return `task_${act.type}_${act.taskId}_${act.user}_${Math.floor(new Date(act.timestamp).getTime() / 10000)}`;
                    }
                };

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
                    id: Date.now(),
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
    }, [projectId, isOpen]);

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

    const getActivityDescription = (activity) => {
        // 統一處理 activity.type (Socket事件) 和 activity.changeType (資料庫記錄)
        const changeType = activity.type || activity.changeType;
        const source = activity.source; // 'task' 或 'column'
        
        // 如果已經有描述且不是移動操作，直接使用
        if (activity.description && changeType !== 'move') {
            return activity.description;
        }
        
        // 處理節點活動
        if (source === 'node') {
            const nodeTitle = activity.node?.title || 
                             activity.nodeTitle || 
                             activity.nodeData?.title ||
                             '未知節點';
            const nodeType = activity.node?.type || 
                           activity.nodeType || 
                           activity.nodeData?.type ||
                           'unknown';
            
            switch (changeType) {
                case 'create':
                    // 備用邏輯：根據 nodeType 判斷（用於實時事件）
                    if (nodeType === 'extension') {
                        return `延伸了節點「${nodeTitle}」`;
                    } else {
                        return `創建了新節點「${nodeTitle}」`;
                    }
                case 'update':
                    if (activity.changes && activity.changes.length > 0) {
                        const changesSummary = activity.changes.map(change => {
                            switch (change.fieldName) {
                                case 'title':
                                    return '標題';
                                case 'content':
                                    return '內容';
                                case 'position':
                                    return '位置';
                                case 'connections':
                                    return '連接';
                                default:
                                    return change.fieldName;
                            }
                        }).join('、');
                        return `更新了節點「${nodeTitle}」的${changesSummary}`;
                    }
                    return `更新了節點「${nodeTitle}」`;
                case 'delete':
                    return `刪除了節點「${nodeTitle}」`;
                case 'move':
                    return `移動了節點「${nodeTitle}」的位置`;
                case 'connect':
                    const targetNode = activity.targetNodeTitle || '另一個節點';
                    return `將節點「${nodeTitle}」連接到「${targetNode}」`;
                case 'disconnect':
                    const disconnectedNode = activity.targetNodeTitle || '另一個節點';
                    return `斷開節點「${nodeTitle}」與「${disconnectedNode}」的連接`;
                default:
                    return `節點「${nodeTitle}」進行了${changeType}操作`;
            }
        }
        
        // 處理列表活動
        if (source === 'column') {
            // 優先從多個可能的來源獲取列表名稱
            const columnName = activity.column?.name || 
                              activity.columnName || 
                              activity.columnData?.name ||
                              '未知列表';
            
            switch (changeType) {
                case 'create':
                    return `創建了新列表「${columnName}」`;
                case 'delete':
                    // 列表刪除時顯示更詳細的資訊
                    let deleteMessage = `刪除了列表「${columnName}」`;
                    
                    // 檢查多種可能的任務數量來源
                    const taskCount = activity.columnData?.taskCount || 
                                     (activity.columnData?.task ? activity.columnData.task.length : 0);
                    
                    if (taskCount > 0) {
                        deleteMessage += ` (包含 ${taskCount} 個任務)`;
                    } else if (taskCount === 0) {
                        deleteMessage += ` (空列表)`;
                    }
                    
                    return deleteMessage;
                case 'reorder':
                    return `調整了列表順序`;
                default:
                    return `列表「${columnName}」進行了${changeType}操作`;
            }
        }
        
        // 處理任務活動
        let taskTitle = activity.taskTitle || (activity.task && activity.task.title);
        
        // 如果沒有任務標題，嘗試從描述中提取
        if (!taskTitle && activity.description) {
            let titleMatch;
            
            // 嘗試不同的模式來提取任務標題
            if (changeType === 'move') {
                titleMatch = activity.description.match(/將任務「(.+?)」從/);
            } else if (changeType === 'create') {
                titleMatch = activity.description.match(/創建新任務「(.+?)」/);
            } else if (changeType === 'delete') {
                titleMatch = activity.description.match(/刪除了任務「(.+?)」/);
            } else if (changeType === 'update') {
                titleMatch = activity.description.match(/任務「(.+?)」:/);
            }
            
            if (titleMatch) {
                taskTitle = titleMatch[1];
            }
        }
        
        // 如果仍然沒有標題，使用預設值
        if (!taskTitle) {
            taskTitle = `任務 #${activity.taskId || activity.task?.id || '未知'}`;
        }
        
        switch (changeType) {
            case 'create':
                let createDesc = `在「${activity.columnName || '未知列表'}」中創建了任務「${taskTitle}」`;
                if (activity.taskDetails) {
                    const details = [];
                    if (activity.taskDetails.assignees && activity.taskDetails.assignees.length > 0) {
                        const assigneeNames = activity.taskDetails.assignees
                            .map(a => a.username || a.userId || a)
                            .filter(name => name)
                            .join(', ');
                        if (assigneeNames) {
                            details.push(`指派給: ${assigneeNames}`);
                        }
                    }
                    if (activity.taskDetails.labels && activity.taskDetails.labels.length > 0) {
                        details.push(`標籤: ${activity.taskDetails.labels.map(l => l.content).join(', ')}`);
                    }
                    if (details.length > 0) {
                        createDesc += ` (${details.join(', ')})`;
                    }
                }
                return createDesc;
            
            case 'update':
                if (activity.changes && activity.changes.length > 0) {
                    // 如果只有一個變更，顯示詳細描述
                    if (activity.changes.length === 1) {
                        const change = activity.changes[0];
                        
                        // 針對不同欄位提供更詳細的描述
                        if (change.fieldName === 'content') {
                            const columnInfo = activity.columnName ? ` （位於「${activity.columnName}」）` : '';
                            if (!change.oldValue && change.newValue) {
                                const preview = change.newValue.length > 30 ? 
                                    change.newValue.substring(0, 30) + '...' : change.newValue;
                                return `在任務「${taskTitle}」中新增了內容: "${preview}"${columnInfo}`;
                            } else if (change.oldValue && change.newValue) {
                                const preview = change.newValue.length > 30 ? 
                                    change.newValue.substring(0, 30) + '...' : change.newValue;
                                return `將任務「${taskTitle}」的內容更新為: "${preview}"${columnInfo}`;
                            }
                        }
                        
                        // 使用後端提供的描述，但加上任務標題
                        if (change.description) {
                            return `任務「${taskTitle}」: ${change.description}`;
                        }
                        
                        return `更新了任務「${taskTitle}」的${change.fieldName}`;
                    }
                    // 多個變更，顯示摘要
                    const summary = formatChangesSummary(activity.changes);
                    return `任務「${taskTitle}」: ${summary}`;
                }
                return `更新了任務「${taskTitle}」`;
            
            case 'delete':
                let deleteDesc = `刪除了任務「${taskTitle}」`;
                if (activity.columnName) {
                    deleteDesc += `（來自「${activity.columnName}」）`;
                }
                return deleteDesc;
            
            case 'move':
                // 統一處理移動操作的描述，無論是實時事件還是資料庫記錄
                const fromColumn = activity.from || '未知來源';
                const toColumn = activity.to || '未知目標';
                return `將任務「${taskTitle}」從「${fromColumn}」移動到「${toColumn}」`;
            
            default:
                return '進行了某項操作';
        }
    };

    const getActivityIcon = (changeType, source) => {
        // 節點活動的特殊圖示
        if (source === 'node') {
            switch (changeType) {
                case 'create':
                    return <FiCircle className="text-indigo-500" />;
                case 'update':
                    return <FiEdit className="text-indigo-500" />;
                case 'delete':
                    return <FiTrash2 className="text-indigo-500" />;
                case 'move':
                    return <FiMove className="text-indigo-500" />;
                case 'connect':
                case 'disconnect':
                    return <FiGitBranch className="text-indigo-500" />;
                default:
                    return <FiCircle className="text-indigo-500" />;
            }
        }
        
        // 列表活動的特殊圖示
        if (source === 'column') {
            switch (changeType) {
                case 'create':
                    return <FiColumns className="text-green-500" />;
                case 'delete':
                    return <FiTrash2 className="text-red-500" />;
                case 'reorder':
                    return <FiShuffle className="text-orange-500" />;
                default:
                    return <FiColumns className="text-gray-500" />;
            }
        }
        
        // 任務活動的圖示
        switch (changeType) {
            case 'create':
                return <FiPlus className="text-green-500" />;
            case 'update':
                return <FiEdit className="text-blue-500" />;
            case 'delete':
                return <FiTrash2 className="text-red-500" />;
            case 'move':
                return <FiMove className="text-purple-500" />;
            default:
                return <FiActivity className="text-gray-500" />;
        }
    };

    const getActivityColor = (changeType, source) => {
        // 節點活動的特殊顏色 - 使用靛青色系
        if (source === 'node') {
            switch (changeType) {
                case 'create':
                    return 'border-l-indigo-500 bg-indigo-50';
                case 'update':
                    return 'border-l-indigo-500 bg-indigo-50';
                case 'delete':
                    return 'border-l-indigo-600 bg-indigo-100';
                case 'move':
                    return 'border-l-indigo-400 bg-indigo-50';
                case 'connect':
                case 'disconnect':
                    return 'border-l-indigo-500 bg-indigo-50';
                default:
                    return 'border-l-indigo-500 bg-indigo-50';
            }
        }
        
        // 列表活動的特殊顏色
        if (source === 'column') {
            switch (changeType) {
                case 'create':
                    return 'border-l-green-500 bg-green-50';
                case 'delete':
                    return 'border-l-red-500 bg-red-50';
                case 'reorder':
                    return 'border-l-orange-500 bg-orange-50';
                default:
                    return 'border-l-gray-500 bg-gray-50';
            }
        }
        
        // 任務活動的顏色
        switch (changeType) {
            case 'create':
                return 'border-l-green-500 bg-green-50';
            case 'update':
                return 'border-l-blue-500 bg-blue-50';
            case 'delete':
                return 'border-l-red-500 bg-red-50';
            case 'move':
                return 'border-l-purple-500 bg-purple-50';
            default:
                return 'border-l-gray-500 bg-gray-50';
        }
    };

    // 格式化變更摘要
    const formatChangesSummary = (changes) => {
        if (!changes || changes.length === 0) return '';
        
        const summary = changes.map(change => {
            switch (change.fieldName) {
                case 'title':
                    return '標題';
                case 'content':
                    return '內容';
                case 'assignees':
                    return '指派成員';
                case 'labels':
                    return '標籤';
                default:
                    return change.fieldName;
            }
        }).join('、');
        
        return `更新了 ${summary}`;
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-16 h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-8rem)] w-72 sm:w-80 lg:w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-hidden"
        >
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                    <FiActivity className="mr-2 text-sm sm:text-base" />
                    <span className="hidden sm:inline">專案活動</span>
                    <span className="sm:hidden">活動</span>
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-lg sm:text-xl"
                >
                    ✕
                </button>
            </div>

            <div className="overflow-y-auto h-full pb-16 sm:pb-20 lg:pb-24">
                {activities.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-500">
                        <div className="text-center">
                            <FiActivity className="mx-auto mb-2 text-xl sm:text-2xl" />
                            <p className="text-sm sm:text-base">尚無活動記錄</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 pb-16 sm:pb-20 lg:pb-24">
                        <AnimatePresence>
                            {activities.map((activity, index) => {
                                // 判斷是否為新活動 - 支援任務和列表活動
                                const isNew = newActivity && 
                                    (activity.changeType === newActivity.type || activity.type === newActivity.type) &&
                                    Math.abs(new Date(activity.createdAt) - new Date(newActivity.timestamp)) < 5000 && // 5秒內的活動視為新活動
                                    (
                                        // 任務活動：比較任務ID
                                        (activity.task?.id === newActivity.taskId && newActivity.taskId) ||
                                        // 列表活動：比較列表ID
                                        (activity.column?.id === newActivity.columnId && newActivity.columnId) ||
                                        // 列表順序活動：比較專案ID
                                        (newActivity.type === 'reorder' && activity.source === 'column') ||
                                        // 節點活動：比較節點ID
                                        (activity.node?.id === newActivity.nodeId && newActivity.nodeId)
                                    );
                                
                                return (
                                    <motion.div
                                        key={activity.id || index}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ 
                                            opacity: 1, 
                                            y: 0,
                                            scale: isNew ? [1, 1.02, 1] : 1
                                        }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ 
                                            duration: 0.3,
                                            scale: { duration: 0.6 }
                                        }}
                                        className={`
                                            p-2 sm:p-3 rounded-lg border-l-4 transition-all duration-300
                                            ${getActivityColor(activity.changeType || activity.type, activity.source)}
                                            ${isNew ? 'ring-2 ring-blue-300 shadow-lg' : 'hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-start space-x-2 sm:space-x-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getActivityIcon(activity.changeType || activity.type, activity.source)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs sm:text-sm text-gray-800 font-medium break-words">
                                                        {activity.changedBy}
                                                    </p>
                                                    <span className="text-xs text-gray-400">
                                                        {formatTime(activity.createdAt, 'relative')}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-600 break-words leading-relaxed">
                                                    {/* 對於移動操作，總是使用動態生成的詳細描述 */}
                                                    {(activity.changeType === 'move' || activity.type === 'move') 
                                                        ? getActivityDescription(activity)
                                                        : (activity.description || getActivityDescription(activity))
                                                    }
                                                </p>
                                                
                                                {/* 顯示額外的變更詳情 */}
                                                {(activity.changeType === 'update' || activity.type === 'update') && activity.changes && activity.changes.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {activity.changes.map((change, idx) => (
                                                            <div key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                <span className="font-medium text-gray-600">
                                                                    {change.fieldName === 'title' && '標題'}
                                                                    {change.fieldName === 'content' && '內容'}
                                                                    {change.fieldName === 'assignees' && '指派成員'}
                                                                    {change.fieldName === 'labels' && '標籤'}
                                                                    {!['title', 'content', 'assignees', 'labels'].includes(change.fieldName) && change.fieldName}
                                                                </span>
                                                                {/* 針對內容變更顯示更詳細的資訊 */}
                                                                {change.fieldName === 'content' && (
                                                                    <div className="mt-1">
                                                                        {!change.oldValue && change.newValue && (
                                                                            <div className="text-green-600">
                                                                                <span className="font-medium">新增:</span> {change.newValue.substring(0, 100)}{change.newValue.length > 100 ? '...' : ''}
                                                                            </div>
                                                                        )}
                                                                        {change.oldValue && change.newValue && change.oldValue !== change.newValue && (
                                                                            <div>
                                                                                <div className="text-red-500">
                                                                                    <span className="font-medium">原本:</span> {change.oldValue.substring(0, 50)}{change.oldValue.length > 50 ? '...' : ''}
                                                                                </div>
                                                                                <div className="text-green-600 mt-1">
                                                                                    <span className="font-medium">更新為:</span> {change.newValue.substring(0, 50)}{change.newValue.length > 50 ? '...' : ''}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {change.oldValue && !change.newValue && (
                                                                            <div className="text-red-500">
                                                                                <span className="font-medium">清空了內容</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* 針對指派成員變更顯示更詳細的資訊 */}
                                                                {change.fieldName === 'assignees' && (
                                                                    <div className="mt-1">
                                                                        {(() => {
                                                                            try {
                                                                                const oldAssignees = change.oldValue ? JSON.parse(change.oldValue) : [];
                                                                                const newAssignees = change.newValue ? JSON.parse(change.newValue) : [];
                                                                                
                                                                                const oldNames = oldAssignees.map(a => a.username || a.userId || a).filter(name => name);
                                                                                const newNames = newAssignees.map(a => a.username || a.userId || a).filter(name => name);
                                                                                
                                                                                if (oldNames.length === 0 && newNames.length > 0) {
                                                                                    return (
                                                                                        <div className="text-green-600">
                                                                                            <span className="font-medium">指派給:</span> {newNames.join(', ')}
                                                                                        </div>
                                                                                    );
                                                                                } else if (oldNames.length > 0 && newNames.length === 0) {
                                                                                    return (
                                                                                        <div className="text-red-500">
                                                                                            <span className="font-medium">取消指派:</span> {oldNames.join(', ')}
                                                                                        </div>
                                                                                    );
                                                                                } else if (oldNames.join(', ') !== newNames.join(', ')) {
                                                                                    return (
                                                                                        <div>
                                                                                            <div className="text-red-500">
                                                                                                <span className="font-medium">原本:</span> {oldNames.join(', ') || '無'}
                                                                                            </div>
                                                                                            <div className="text-green-600 mt-1">
                                                                                                <span className="font-medium">更新為:</span> {newNames.join(', ') || '無'}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            } catch (error) {
                                                                                return (
                                                                                    <div className="text-gray-500">
                                                                                        <span className="font-medium">指派成員已更新</span>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        })()}
                                                                    </div>
                                                                )}
                                                                {/* 對於非內容和非指派成員欄位，顯示簡化的變更資訊 */}
                                                                {!['content', 'assignees'].includes(change.fieldName) && change.oldValue && change.newValue && (
                                                                    <span className="ml-1">
                                                                        : {change.oldValue.substring(0, 20)}{change.oldValue.length > 20 ? '...' : ''} → {change.newValue.substring(0, 20)}{change.newValue.length > 20 ? '...' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-500">
                                                        {/* 節點活動標籤 */}
                                                        {activity.source === 'node' && (
                                                            <>
                                                                {(activity.changeType === 'create' || activity.type === 'create') && (
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                                                                        節點
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'update' || activity.type === 'update') && (
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                                                                        節點
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'delete' || activity.type === 'delete') && (
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                                                                        節點
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'move' || activity.type === 'move') && (
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                                                                        節點移動
                                                                    </span>
                                                                )}
                                                                {((activity.changeType === 'connect' || activity.type === 'connect') || 
                                                                  (activity.changeType === 'disconnect' || activity.type === 'disconnect')) && (
                                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
                                                                        節點連接
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        
                                                        {/* 列表活動標籤 */}
                                                        {activity.source === 'column' && (
                                                            <>
                                                                {(activity.changeType === 'create' || activity.type === 'create') && (
                                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                                                        列表
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'delete' || activity.type === 'delete') && (
                                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                                                                        列表
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'reorder' || activity.type === 'reorder') && (
                                                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                                                                        列表順序
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        
                                                        {/* 任務活動標籤 */}
                                                        {activity.source !== 'column' && (
                                                            <>
                                                                {(activity.changeType === 'create' || activity.type === 'create') && activity.columnName && (
                                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                                                        {activity.columnName}
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'update' || activity.type === 'update') && activity.columnName && (
                                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                                                        {activity.columnName}
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'move' || activity.type === 'move') && activity.from && activity.to && (
                                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                                                        {activity.from} → {activity.to}
                                                                    </span>
                                                                )}
                                                                {(activity.changeType === 'delete' || activity.type === 'delete') && activity.columnName && (
                                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                                                                        來自 {activity.columnName}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </span>
                                                    
                                                    {/* 右側ID標籤 */}
                                                    {activity.node && activity.source === 'node' && (
                                                        <span className="text-xs text-indigo-600 bg-indigo-50 px-1 sm:px-2 py-1 rounded border border-indigo-200">
                                                            #{activity.node.id}
                                                        </span>
                                                    )}
                                                    {activity.task && (
                                                        <span className="text-xs text-gray-500 bg-white px-1 sm:px-2 py-1 rounded border">
                                                            #{activity.task.id}
                                                        </span>
                                                    )}
                                                    {activity.column && activity.source === 'column' && (
                                                        <span className="text-xs text-gray-500 bg-white px-1 sm:px-2 py-1 rounded border">
                                                            #{activity.column.id}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        
                        {/* 顯示更多按鈕 */}
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={loadMoreActivities}
                                    disabled={isLoadingMore}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                                            <span>載入中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiActivity className="text-gray-500" />
                                            <span>顯示更多</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ActivityStream; 