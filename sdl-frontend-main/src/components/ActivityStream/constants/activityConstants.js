/**
 * ActivityStream 常數定義
 * 
 * 包含：
 * - 活動類型的圖示對應
 * - 活動類型的顏色對應
 * - 活動來源類型
 */

import { 
    FiActivity, 
    FiEdit, 
    FiTrash2, 
    FiMove, 
    FiPlus, 
    FiColumns, 
    FiShuffle, 
    FiCircle, 
    FiGitBranch, 
    FiMessageCircle 
} from 'react-icons/fi';

/**
 * 活動來源類型
 */
export const ACTIVITY_SOURCES = {
    TASK: 'task',
    COLUMN: 'column',
    NODE: 'node',
    COMMENT: 'comment',
    PROJECT_COMMENT: 'project_comment'
};

/**
 * 變更類型
 */
export const CHANGE_TYPES = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    MOVE: 'move',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    REORDER: 'reorder',
    // 評論類型
    COMMENT_CREATE: 'comment_create',
    COMMENT_UPDATE: 'comment_update',
    COMMENT_DELETE: 'comment_delete',
    PROJECT_COMMENT_CREATE: 'project_comment_create',
    PROJECT_COMMENT_UPDATE: 'project_comment_update',
    PROJECT_COMMENT_DELETE: 'project_comment_delete'
};

/**
 * 根據活動類型和來源獲取圖示
 * @param {string} changeType - 變更類型
 * @param {string} source - 來源類型
 * @returns {JSX.Element} React Icon 元件
 */
export const getActivityIcon = (changeType, source) => {
    // 評論活動的圖示
    if (source === ACTIVITY_SOURCES.COMMENT || source === ACTIVITY_SOURCES.PROJECT_COMMENT) {
        switch (changeType) {
            case CHANGE_TYPES.COMMENT_CREATE:
            case CHANGE_TYPES.PROJECT_COMMENT_CREATE:
                return FiMessageCircle;
            case CHANGE_TYPES.COMMENT_UPDATE:
            case CHANGE_TYPES.PROJECT_COMMENT_UPDATE:
                return FiEdit;
            case CHANGE_TYPES.COMMENT_DELETE:
            case CHANGE_TYPES.PROJECT_COMMENT_DELETE:
                return FiTrash2;
            default:
                return FiMessageCircle;
        }
    }

    // 節點活動的特殊圖示
    if (source === ACTIVITY_SOURCES.NODE) {
        switch (changeType) {
            case CHANGE_TYPES.CREATE:
                return FiCircle;
            case CHANGE_TYPES.UPDATE:
                return FiEdit;
            case CHANGE_TYPES.DELETE:
                return FiTrash2;
            case CHANGE_TYPES.MOVE:
                return FiMove;
            case CHANGE_TYPES.CONNECT:
            case CHANGE_TYPES.DISCONNECT:
                return FiGitBranch;
            default:
                return FiCircle;
        }
    }
    
    // 列表活動的特殊圖示
    if (source === ACTIVITY_SOURCES.COLUMN) {
        switch (changeType) {
            case CHANGE_TYPES.CREATE:
                return FiColumns;
            case CHANGE_TYPES.DELETE:
                return FiTrash2;
            case CHANGE_TYPES.REORDER:
                return FiShuffle;
            default:
                return FiColumns;
        }
    }
    
    // 任務活動的圖示
    switch (changeType) {
        case CHANGE_TYPES.CREATE:
            return FiPlus;
        case CHANGE_TYPES.UPDATE:
            return FiEdit;
        case CHANGE_TYPES.DELETE:
            return FiTrash2;
        case CHANGE_TYPES.MOVE:
            return FiMove;
        default:
            return FiActivity;
    }
};

/**
 * 根據活動類型和來源獲取顏色樣式
 * @param {string} changeType - 變更類型
 * @param {string} source - 來源類型
 * @returns {string} Tailwind CSS 類別字串
 */
export const getActivityColor = (changeType, source) => {
    // 評論活動的顏色 - 使用藍色系
    if (source === ACTIVITY_SOURCES.COMMENT || source === ACTIVITY_SOURCES.PROJECT_COMMENT) {
        switch (changeType) {
            case CHANGE_TYPES.COMMENT_CREATE:
            case CHANGE_TYPES.PROJECT_COMMENT_CREATE:
                return 'border-l-blue-500 bg-blue-50';
            case CHANGE_TYPES.COMMENT_UPDATE:
            case CHANGE_TYPES.PROJECT_COMMENT_UPDATE:
                return 'border-l-blue-500 bg-blue-50';
            case CHANGE_TYPES.COMMENT_DELETE:
            case CHANGE_TYPES.PROJECT_COMMENT_DELETE:
                return 'border-l-blue-600 bg-blue-100';
            default:
                return 'border-l-blue-500 bg-blue-50';
        }
    }

    // 節點活動的特殊顏色 - 使用靛青色系
    if (source === ACTIVITY_SOURCES.NODE) {
        switch (changeType) {
            case CHANGE_TYPES.CREATE:
                return 'border-l-indigo-500 bg-indigo-50';
            case CHANGE_TYPES.UPDATE:
                return 'border-l-indigo-500 bg-indigo-50';
            case CHANGE_TYPES.DELETE:
                return 'border-l-indigo-600 bg-indigo-100';
            case CHANGE_TYPES.MOVE:
                return 'border-l-indigo-400 bg-indigo-50';
            case CHANGE_TYPES.CONNECT:
            case CHANGE_TYPES.DISCONNECT:
                return 'border-l-indigo-500 bg-indigo-50';
            default:
                return 'border-l-indigo-500 bg-indigo-50';
        }
    }
    
    // 列表活動的特殊顏色
    if (source === ACTIVITY_SOURCES.COLUMN) {
        switch (changeType) {
            case CHANGE_TYPES.CREATE:
                return 'border-l-green-500 bg-green-50';
            case CHANGE_TYPES.DELETE:
                return 'border-l-red-500 bg-red-50';
            case CHANGE_TYPES.REORDER:
                return 'border-l-orange-500 bg-orange-50';
            default:
                return 'border-l-gray-500 bg-gray-50';
        }
    }
    
    // 任務活動的顏色
    switch (changeType) {
        case CHANGE_TYPES.CREATE:
            return 'border-l-green-500 bg-green-50';
        case CHANGE_TYPES.UPDATE:
            return 'border-l-blue-500 bg-blue-50';
        case CHANGE_TYPES.DELETE:
            return 'border-l-red-500 bg-red-50';
        case CHANGE_TYPES.MOVE:
            return 'border-l-purple-500 bg-purple-50';
        default:
            return 'border-l-gray-500 bg-gray-50';
    }
};

/**
 * 圖示顏色樣式對應
 * @param {string} source - 來源類型
 * @returns {string} Tailwind CSS 文字顏色類別
 */
export const getIconColorClass = (source) => {
    switch (source) {
        case ACTIVITY_SOURCES.NODE:
            return 'text-indigo-500';
        case ACTIVITY_SOURCES.COLUMN:
            return 'text-green-500';
        case ACTIVITY_SOURCES.COMMENT:
        case ACTIVITY_SOURCES.PROJECT_COMMENT:
            return 'text-blue-500';
        case ACTIVITY_SOURCES.TASK:
        default:
            return 'text-gray-500';
    }
};
