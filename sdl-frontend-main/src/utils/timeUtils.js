/**
 * 格式化時間為台灣時區顯示
 * @param {string|Date} dateString - 時間字串或 Date 物件
 * @param {string} format - 格式類型 ('full', 'date', 'time', 'relative')
 * @returns {string} 格式化後的時間字串
 */
export function formatTime(dateString, format = 'full') {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    // 轉換為台灣時區 (UTC+8)
    const taipeiDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));

    const now = new Date();
    const nowTaipei = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));

    switch (format) {
        case 'date':
            return taipeiDate.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

        case 'time':
            return taipeiDate.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit'
            });

        case 'relative': {
            const diffMs = nowTaipei - taipeiDate;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return '剛剛';
            if (diffMins < 60) return `${diffMins} 分鐘前`;
            if (diffHours < 24) return `${diffHours} 小時前`;
            if (diffDays < 7) return `${diffDays} 天前`;

            return formatTime(dateString, 'date');
        }

        case 'full':
        default:
            return taipeiDate.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
    }
}

/**
 * 檢查是否為今天
 * @param {string|Date} dateString - 時間字串
 * @returns {boolean}
 */
export function isToday(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const today = new Date();

    const dateTaipei = new Date(date.toLocaleDateString("en-US", { timeZone: "Asia/Taipei" }));
    const todayTaipei = new Date(today.toLocaleDateString("en-US", { timeZone: "Asia/Taipei" }));

    return dateTaipei.toDateString() === todayTaipei.toDateString();
}

/**
 * 格式化相對時間（統一全站使用）
 * 
 * 整合了 7 處重複實作的最佳版本：
 * - 支援 秒/分/時/天/月/年 的顯示
 * - 支援 string / number / Date 多種輸入型別
 * - 包含 try-catch 錯誤處理
 * 
 * @param {string|number|Date} dateInput - 日期輸入
 * @returns {string} 格式化後的相對時間，例如 '剛剛', '5 分鐘前', '3 天前'
 */
export function formatRelativeTime(dateInput) {
    if (!dateInput) return '未知時間';

    try {
        const date = typeof dateInput === 'string' || typeof dateInput === 'number'
            ? new Date(dateInput)
            : dateInput;

        if (isNaN(date.getTime())) return '未知時間';

        const diff = Date.now() - date.getTime();
        const seconds = Math.max(0, Math.floor(diff / 1000));

        if (seconds < 10) return '剛剛';
        if (seconds < 60) return `${seconds} 秒前`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} 分鐘前`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} 小時前`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} 天前`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} 個月前`;

        const years = Math.floor(months / 12);
        return `${years} 年前`;
    } catch {
        return '';
    }
}

export default { formatTime, isToday, formatRelativeTime }; 