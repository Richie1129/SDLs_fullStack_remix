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

/**
 * 計算專案進度百分比
 * @param {number} stage - 當前階段
 * @param {number} subStage - 當前子階段
 * @returns {number} 進度百分比 (0-100)
 */
export const calculateProgress = (stage, subStage) => {
    if (!stage || !subStage) return 0;
    const totalSubStages = [3, 4, 5, 3]; // 各階段的子階段數量
    let completedSubStages = 0;
    
    for (let i = 1; i < stage; i++) {
        completedSubStages += totalSubStages[i - 1] || 0;
    }
    completedSubStages += Math.max(0, subStage - 1);
    
    const totalStages = totalSubStages.reduce((sum, stages) => sum + stages, 0);
    return Math.min(Math.round((completedSubStages / totalStages) * 100), 100);
};

/**
 * 格式化相對時間
 * @param {string} dateString - ISO 日期字串
 * @returns {string} 相對時間描述
 */
export const formatRelativeTime = (dateString) => {
    if (!dateString) return '未知時間';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return '剛剛';
    if (diffInMinutes < 60) return `${diffInMinutes}分鐘前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小時前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}天前`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}個月前`;
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}年前`;
};

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
 * @returns {string} Emoji 圖示
 */
export const getActivityIcon = (type) => {
    const icons = {
        'reflection': '📝',
        'chat': '💬',
        'ai': '🤖',
        'idea': '💡',
        'task': '✅',
        'progress': '📈',
        'submission': '📤',
        'review': '👀',
        'feedback': '💬',
        'project': '📚',
        'team': '👥'
    };
    return icons[type] || '📋';
};

/**
 * 為 Kanban 列表名稱分配顏色和圖標
 * @param {string} columnName - 列表名稱
 * @returns {Object} { color: string, icon: string }
 */
export const getColumnStyle = (columnName) => {
    const name = columnName.toLowerCase();
    
    // 待處理類型
    if (name.includes('待處理') || name.includes('待辦') || name.includes('to do') || 
        name.includes('todo') || name.includes('backlog')) {
        return { color: 'text-orange-600', icon: '⏳' };
    }
    
    // 進行中類型
    if (name.includes('進行中') || name.includes('in progress') || name.includes('doing') ||
        name.includes('進展') || name.includes('工作中') || name.includes('處理中')) {
        return { color: 'text-blue-600', icon: '🔄' };
    }
    
    // 完成類型
    if (name.includes('完成') || name.includes('done') || name.includes('finished') ||
        name.includes('completed') || name.includes('完畢')) {
        return { color: 'text-green-600', icon: '✅' };
    }
    
    // 審核/檢查類型
    if (name.includes('審核') || name.includes('review') || name.includes('檢查') ||
        name.includes('驗證') || name.includes('測試')) {
        return { color: 'text-purple-600', icon: '👀' };
    }
    
    // 暫停/擱置類型
    if (name.includes('暫停') || name.includes('擱置') || name.includes('on hold') ||
        name.includes('blocked') || name.includes('延期')) {
        return { color: 'text-gray-600', icon: '⏸️' };
    }
    
    // 默認類型
    return { color: 'text-gray-800', icon: '📋' };
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
