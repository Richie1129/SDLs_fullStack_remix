/**
 * ActivityItem 元件
 * 
 * 功能：
 * - 顯示單一活動項目
 * - 根據活動類型顯示不同的圖示和顏色
 * - 顯示變更詳情（update 操作）
 * - 顯示活動標籤（節點、列表、評論、任務）
 * - 新活動高亮效果
 */

import React from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '../../../utils/timeUtils';
import { getActivityDescription } from '../utils/activityDescriptionUtils';
import { getActivityIcon, getActivityColor } from '../constants/activityConstants';

/**
 * 渲染變更詳情（針對 update 操作）
 */
const ChangeDetails = ({ changes, activity, index }) => {
    if (!changes || changes.length === 0) return null;

    return (
        <div className="mt-2 space-y-1">
            {changes.map((change, idx) => (
                <div 
                    key={`activity-${activity.id || index}-${activity.createdAt || index}-change-${idx}-${change.fieldName}`} 
                    className="text-caption text-gray-500 bg-gray-100 px-2 py-1 rounded"
                >
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
    );
};

/**
 * 活動標籤元件
 */
const ActivityLabel = ({ activity }) => {
    const { source, changeType, type, columnName, from, to } = activity;
    
    // 節點活動標籤
    if (source === 'node') {
        let label = '節點';
        if (changeType === 'move' || type === 'move') {
            label = '節點移動';
        } else if ((changeType === 'connect' || type === 'connect') || 
                   (changeType === 'disconnect' || type === 'disconnect')) {
            label = '節點連接';
        }
        return (
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-caption">
                {label}
            </span>
        );
    }
    
    // 列表活動標籤
    if (source === 'column') {
        let label = '列表';
        let bgColor = 'bg-green-100 text-green-700';
        
        if (changeType === 'delete' || type === 'delete') {
            bgColor = 'bg-red-100 text-red-700';
        } else if (changeType === 'reorder' || type === 'reorder') {
            label = '列表順序';
            bgColor = 'bg-orange-100 text-orange-700';
        }
        
        return (
            <span className={`${bgColor} px-2 py-1 rounded text-caption`}>
                {label}
            </span>
        );
    }
    
    // 評論活動標籤
    if (source === 'comment' || source === 'project_comment') {
        const label = source === 'project_comment' ? '專案評論' : '任務評論';
        return (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-caption">
                {label}
            </span>
        );
    }
    
    // 任務活動標籤
    if (source === 'task' || (source !== 'column' && source !== 'comment' && source !== 'project_comment' && source !== 'node')) {
        if ((changeType === 'create' || type === 'create') && columnName) {
            return (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-caption">
                    {columnName}
                </span>
            );
        }
        if ((changeType === 'update' || type === 'update') && columnName) {
            return (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-caption">
                    {columnName}
                </span>
            );
        }
        if ((changeType === 'move' || type === 'move') && from && to) {
            return (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-caption">
                    {from} → {to}
                </span>
            );
        }
        if ((changeType === 'delete' || type === 'delete') && columnName) {
            return (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-caption">
                    來自 {columnName}
                </span>
            );
        }
    }
    
    return null;
};

/**
 * 活動 ID 標籤元件
 */
const ActivityIdBadge = ({ activity }) => {
    if (activity.source === 'node' && activity.node) {
        return (
            <span className="text-caption text-indigo-600 bg-indigo-50 px-1 sm:px-2 py-1 rounded border border-indigo-200">
                #{activity.node.id}
            </span>
        );
    }
    if (activity.source === 'column' && activity.column) {
        return (
            <span className="text-caption text-gray-500 bg-white px-1 sm:px-2 py-1 rounded border">
                #{activity.column.id}
            </span>
        );
    }
    if ((activity.source === 'comment' || activity.source === 'project_comment') && activity.comment) {
        return (
            <span className="text-caption text-blue-600 bg-blue-50 px-1 sm:px-2 py-1 rounded border border-blue-200">
                #{activity.comment.id}
            </span>
        );
    }
    if (activity.source === 'task' && activity.task) {
        return (
            <span className="text-caption text-gray-500 bg-white px-1 sm:px-2 py-1 rounded border">
                #{activity.task.id}
            </span>
        );
    }
    return null;
};

/**
 * ActivityItem 主元件
 */
const ActivityItem = ({ activity, index, isNew }) => {
    const changeType = activity.changeType || activity.type;
    const IconComponent = getActivityIcon(changeType, activity.source);

    return (
        <motion.div
            key={`activity-${activity.id || index}-${activity.createdAt || index}`}
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
                p-component-xs sm:p-component-sm rounded-lg border-l-4 transition-all duration-slow
                ${getActivityColor(changeType, activity.source)}
                ${isNew ? 'ring-2 ring-blue-300 shadow-lg' : 'hover:shadow-md'}
            `}
        >
            <div className="flex items-start space-x-stack-xs sm:space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className={getIconColorClass(activity.source)} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-caption sm:text-body-sm text-gray-800 font-medium break-words">
                            {activity.changedBy}
                        </p>
                        <span className="text-caption text-gray-400">
                            {formatTime(activity.createdAt, 'relative')}
                        </span>
                    </div>
                    <p className="text-caption sm:text-body-sm text-gray-600 break-words leading-relaxed">
                        {/* 對於移動操作，總是使用動態生成的詳細描述 */}
                        {(changeType === 'move') 
                            ? getActivityDescription(activity)
                            : (activity.description || getActivityDescription(activity))
                        }
                    </p>
                    
                    {/* 顯示額外的變更詳情 */}
                    {(changeType === 'update') && activity.changes && activity.changes.length > 0 && (
                        <ChangeDetails changes={activity.changes} activity={activity} index={index} />
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-caption text-gray-500">
                            <ActivityLabel activity={activity} />
                        </span>
                        
                        {/* 右側ID標籤 */}
                        <ActivityIdBadge activity={activity} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// 輔助函式：獲取圖示顏色類別
const getIconColorClass = (source) => {
    switch (source) {
        case 'node':
            return 'text-indigo-500';
        case 'column':
            return 'text-green-500';
        case 'comment':
        case 'project_comment':
            return 'text-blue-500';
        case 'task':
        default:
            return 'text-gray-500';
    }
};

export default ActivityItem;
