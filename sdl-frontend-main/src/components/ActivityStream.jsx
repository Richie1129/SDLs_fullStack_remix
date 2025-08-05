import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getProjectActivity } from '../api/kanban';
import { formatTime } from '../utils/timeUtils';
import { socket } from '../utils/socket';
import { FiActivity, FiEdit, FiTrash2, FiMove, FiPlus } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

const ActivityStream = ({ projectId, isOpen, onClose }) => {
    const [activities, setActivities] = useState([]);
    const [newActivity, setNewActivity] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const { data: activityData, refetch } = useQuery(
        ['projectActivity', projectId],
        () => getProjectActivity(projectId, { limit: 20 }),
        {
            onSuccess: (data) => {
                setActivities(data);
                setHasMore(data && data.length === 20);
            },
            enabled: !!projectId && isOpen
        }
    );

    // 監聽實時活動更新
    useEffect(() => {
        if (!isOpen) return;

        const handleActivityUpdate = (activity) => {
            console.log('收到新活動:', activity);
            setNewActivity(activity);
            
            // 添加新活動到列表頂部，保持最多20條記錄
            setActivities(prev => [
                {
                    id: Date.now(),
                    changeType: activity.type,
                    description: getActivityDescription(activity),
                    changedBy: activity.user,
                    createdAt: activity.timestamp,
                    task: { id: activity.taskId, title: activity.taskTitle },
                    // 包含新的詳細資訊
                    changes: activity.changes || [],
                    columnName: activity.columnName,
                    from: activity.from,
                    to: activity.to,
                    taskDetails: activity.taskDetails
                },
                ...prev.slice(0, 19) // 只保留前19條舊記錄，總共20條
            ]);

            // 3秒後清除新活動高亮
            setTimeout(() => setNewActivity(null), 3000);
        };

        socket.on('activityUpdate', handleActivityUpdate);

        return () => {
            socket.off('activityUpdate', handleActivityUpdate);
        };
    }, [isOpen]);

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

    const getActivityIcon = (changeType) => {
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

    const getActivityColor = (changeType) => {
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
                                const isNew = newActivity && 
                                    activity.task?.id === newActivity.taskId && 
                                    (activity.changeType === newActivity.type || activity.type === newActivity.type) &&
                                    Math.abs(new Date(activity.createdAt) - new Date(newActivity.timestamp)) < 5000; // 5秒內的活動視為新活動
                                
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
                                            ${getActivityColor(activity.changeType || activity.type)}
                                            ${isNew ? 'ring-2 ring-blue-300 shadow-lg' : 'hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-start space-x-2 sm:space-x-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getActivityIcon(activity.changeType || activity.type)}
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
                                                    </span>
                                                    {activity.task && (
                                                        <span className="text-xs text-gray-500 bg-white px-1 sm:px-2 py-1 rounded border">
                                                            #{activity.task.id}
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