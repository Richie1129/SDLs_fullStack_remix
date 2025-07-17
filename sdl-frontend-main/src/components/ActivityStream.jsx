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

    const { data: activityData, refetch } = useQuery(
        ['projectActivity', projectId],
        () => getProjectActivity(projectId, { limit: 20 }),
        {
            onSuccess: (data) => setActivities(data),
            enabled: !!projectId && isOpen
        }
    );

    // 監聽實時活動更新
    useEffect(() => {
        if (!isOpen) return;

        const handleActivityUpdate = (activity) => {
            console.log('收到新活動:', activity);
            setNewActivity(activity);
            
            // 添加新活動到列表頂部
            setActivities(prev => [
                {
                    id: Date.now(),
                    changeType: activity.type,
                    description: getActivityDescription(activity),
                    changedBy: activity.user,
                    createdAt: activity.timestamp,
                    task: { id: activity.taskId, title: activity.taskTitle }
                },
                ...prev.slice(0, 19) // 保持最多20條記錄
            ]);

            // 3秒後清除新活動高亮
            setTimeout(() => setNewActivity(null), 3000);
        };

        socket.on('activityUpdate', handleActivityUpdate);

        return () => {
            socket.off('activityUpdate', handleActivityUpdate);
        };
    }, [isOpen]);

    const getActivityDescription = (activity) => {
        switch (activity.type) {
            case 'create':
                return `創建了任務「${activity.taskTitle}」`;
            case 'update':
                return `更新了任務「${activity.taskTitle}」`;
            case 'delete':
                return `刪除了任務「${activity.taskTitle}」`;
            case 'move':
                return `將任務「${activity.taskTitle}」從「${activity.from}」移動到「${activity.to}」`;
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
                                    activity.changeType === newActivity.type;
                                
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
                                            ${getActivityColor(activity.changeType)}
                                            ${isNew ? 'ring-2 ring-blue-300 shadow-lg' : 'hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-start space-x-2 sm:space-x-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getActivityIcon(activity.changeType)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm text-gray-800 font-medium break-words">
                                                    {activity.changedBy}
                                                </p>
                                                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                                                    {activity.description}
                                                </p>
                                                <div className="flex items-center justify-between mt-1 sm:mt-2">
                                                    <span className="text-xs text-gray-400">
                                                        {formatTime(activity.createdAt, 'relative')}
                                                    </span>
                                                    {activity.task && (
                                                        <span className="text-xs text-gray-500 bg-white px-1 sm:px-2 py-1 rounded">
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
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ActivityStream; 