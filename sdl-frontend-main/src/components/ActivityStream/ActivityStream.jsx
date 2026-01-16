/**
 * ActivityStream 元件 - 專案活動流
 * 
 * 重構後的主容器元件，負責：
 * - 整合 useActivityData（資料管理）
 * - 整合 useActivityStream（Socket 事件）
 * - 渲染活動列表
 * - 處理視窗開關
 * 
 * 原始檔案：1,018 行
 * 重構後：~150 行 (↓ 85%)
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiActivity } from 'react-icons/fi';
import { useActivityData } from './hooks/useActivityData';
import { useActivityStream } from './hooks/useActivityStream';
import ActivityItem from './components/ActivityItem';

const ActivityStream = ({ projectId, isOpen, onClose }) => {
    // 使用自定義 Hooks 管理狀態和邏輯
    const {
        activities,
        setActivities,
        newActivity,
        setNewActivity,
        isLoadingMore,
        hasMore,
        loadMoreActivities
    } = useActivityData(projectId, isOpen);

    // 監聽實時活動更新
    useActivityStream(projectId, isOpen, setActivities, setNewActivity);

    if (!isOpen) return null;

    /**
     * 判斷是否為新活動
     */
    const isNewActivity = (activity) => {
        if (!newActivity) return false;

        const isTypeMatch = activity.changeType === newActivity.type || activity.type === newActivity.type;
        const isWithinTimeWindow = Math.abs(new Date(activity.createdAt) - new Date(newActivity.timestamp)) < 5000;

        if (!isTypeMatch || !isWithinTimeWindow) return false;

        // 任務活動：比較任務ID
        if (activity.task?.id === newActivity.taskId && newActivity.taskId) {
            return true;
        }

        // 列表活動：比較列表ID
        if (activity.column?.id === newActivity.columnId && newActivity.columnId) {
            return true;
        }

        // 列表順序活動：比較專案ID
        if (newActivity.type === 'reorder' && activity.source === 'column') {
            return true;
        }

        // 節點活動：比較節點ID
        if (activity.node?.id === newActivity.nodeId && newActivity.nodeId) {
            return true;
        }

        return false;
    };

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-16 h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-8rem)] w-72 sm:w-80 lg:w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-hidden"
        >
            {/* 標題列 */}
            <div className="flex items-center justify-between p-component-sm sm:p-component-base border-b border-gray-200">
                <h3 className="text-body sm:text-body-lg font-semibold text-gray-800 flex items-center">
                    <FiActivity className="mr-2 text-body-sm sm:text-body" />
                    <span className="hidden sm:inline">專案活動</span>
                    <span className="sm:hidden">活動</span>
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-body-lg sm:text-h3"
                >
                    ✕
                </button>
            </div>

            {/* 活動列表 */}
            <div className="overflow-y-auto h-full pb-16 sm:pb-20 lg:pb-24">
                {activities.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-500">
                        <div className="text-center">
                            <FiActivity className="mx-auto mb-2 text-h3 sm:text-h2" />
                            <p className="text-body-sm sm:text-body">尚無活動記錄</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-stack-xs sm:space-y-3 p-component-sm sm:p-component-base pb-16 sm:pb-20 lg:pb-24">
                        <AnimatePresence>
                            {activities.map((activity, index) => (
                                <ActivityItem
                                    key={`activity-${activity.id || index}-${activity.createdAt || index}`}
                                    activity={activity}
                                    index={index}
                                    isNew={isNewActivity(activity)}
                                />
                            ))}
                        </AnimatePresence>
                        
                        {/* 載入更多按鈕 */}
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={loadMoreActivities}
                                    disabled={isLoadingMore}
                                    className="flex items-center space-x-stack-xs px-4 py-2 text-body-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
