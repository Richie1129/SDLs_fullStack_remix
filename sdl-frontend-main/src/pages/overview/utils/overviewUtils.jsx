import React from 'react';
import { FiFileText, FiMessageSquare, FiCpu, FiInfo, FiCheckCircle, FiTrendingUp, FiUpload, FiEye, FiBookOpen, FiUsers, FiClipboard, FiLoader, FiRefreshCw, FiPause } from 'react-icons/fi';

/**
 * Overview 頁面共用工具函式
 *
 * 包含：
 * - 進度計算
 * - 時間格式化
 * - 狀態顏色
 * - 活動圖示
 * - 列表樣式
 */

// 計算專案進度（統一使用 stageUtils 共用版本）
export { calculateProgress } from '@/utils/stageUtils';

// [Refactored] 統一使用 timeUtils.js 的 formatRelativeTime
export { formatRelativeTime } from '@/utils/timeUtils';

/**
 * 獲取進度狀態顏色
 * @param {number} progress - 進度百分比
 * @returns {string} Tailwind CSS 類別
 */
export const getStatusColor = (progress) => {
    if (progress >= 80) return "bg-green-100 text-green-800";
    if (progress >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
};

/**
 * 獲取活動類型圖示
 * @param {string} type - 活動類型
 * @returns {JSX.Element} Icon 元件
 */
export const getActivityIcon = (type) => {
    const icons = {
        'reflection': <FiFileText className="w-4 h-4" />,
        'chat': <FiMessageSquare className="w-4 h-4" />,
        'ai': <FiCpu className="w-4 h-4" />,
        'idea': <FiInfo className="w-4 h-4" />,
        'task': <FiCheckCircle className="w-4 h-4" />,
        'progress': <FiTrendingUp className="w-4 h-4" />,
        'submission': <FiUpload className="w-4 h-4" />,
        'review': <FiEye className="w-4 h-4" />,
        'feedback': <FiMessageSquare className="w-4 h-4" />,
        'project': <FiBookOpen className="w-4 h-4" />,
        'team': <FiUsers className="w-4 h-4" />
    };
    return icons[type] || <FiClipboard className="w-4 h-4" />;
};

/**
 * 為 Kanban 列表名稱分配顏色和圖標
 * @param {string} columnName - 列表名稱
 * @returns {Object} { color: string, icon: JSX.Element }
 */
export const getColumnStyle = (columnName) => {
    const name = columnName.toLowerCase();

    // 待處理類型
    if (name.includes('待處理') || name.includes('待辦') || name.includes('to do') ||
        name.includes('todo') || name.includes('backlog')) {
        return { color: 'text-orange-600', icon: <FiLoader className="w-4 h-4" /> };
    }

    // 進行中類型
    if (name.includes('進行中') || name.includes('in progress') || name.includes('doing') ||
        name.includes('進展') || name.includes('工作中') || name.includes('處理中')) {
        return { color: 'text-blue-600', icon: <FiRefreshCw className="w-4 h-4" /> };
    }

    // 完成類型
    if (name.includes('完成') || name.includes('done') || name.includes('finished') ||
        name.includes('completed') || name.includes('完畢')) {
        return { color: 'text-green-600', icon: <FiCheckCircle className="w-4 h-4" /> };
    }

    // 審核/檢查類型
    if (name.includes('審核') || name.includes('review') || name.includes('檢查') ||
        name.includes('驗證') || name.includes('測試')) {
        return { color: 'text-purple-600', icon: <FiEye className="w-4 h-4" /> };
    }

    // 暫停/擱置類型
    if (name.includes('暫停') || name.includes('擱置') || name.includes('on hold') ||
        name.includes('blocked') || name.includes('延期')) {
        return { color: 'text-gray-600', icon: <FiPause className="w-4 h-4" /> };
    }

    // 默認類型
    return { color: 'text-gray-800', icon: <FiClipboard className="w-4 h-4" /> };
};

/**
 * 檢查任務是否為完成狀態
 * @param {string} columnName - 列表名稱
 * @returns {boolean} 是否為完成狀態
 */
export const isCompletedStatus = (columnName) => {
    if (!columnName) return false;
    const status = columnName.toLowerCase();
    return status.includes('完成') || status.includes('done') || 
           status.includes('完畢') || status.includes('finished') ||
           status.includes('completed') || status === '完成';
};

/**
 * 格式化日期為易讀格式
 * @param {string} dateString - ISO 日期字串
 * @returns {string} 格式化的日期
 */
export const formatDate = (dateString) => {
    if (!dateString) return '未知日期';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * 截斷文字
 * @param {string} text - 原始文字
 * @param {number} maxLength - 最大長度
 * @returns {string} 截斷後的文字
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};
