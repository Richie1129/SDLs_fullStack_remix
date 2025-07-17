// 輔助函式工具

/**
 * 格式化相對時間
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化後的相對時間
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '未知時間';
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '剛剛';
  if (diffInHours < 24) return `${diffInHours}小時前`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}天前`;
};

/**
 * 獲取活動類型的顏色
 * @param {string} type - 活動類型
 * @returns {string} CSS 類名
 */
export const getActivityColor = (type) => {
  switch (type) {
    case 'progress': return 'bg-teal-500';
    case 'idea': return 'bg-yellow-500';
    case 'reflection': return 'bg-blue-500';
    case 'chat': return 'bg-green-500';
    case 'task': return 'bg-indigo-500';
    case 'qa': return 'bg-purple-500';
    case 'ai': return 'bg-pink-500';
    case 'file': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

/**
 * 獲取優先級顏色
 * @param {string} priority - 優先級
 * @returns {string} CSS 類名
 */
export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * 獲取成就圖標
 * @param {string} type - 成就類型
 * @returns {string} 圖標字符
 */
export const getAchievementIcon = (type) => {
  switch (type) {
    case 'creativity': return '💡';
    case 'reflection': return '📝';
    case 'collaboration': return '🤝';
    case 'ai': return '🤖';
    default: return '🏆';
  }
};

/**
 * 獲取列樣式
 * @param {string} columnName - 列名
 * @returns {object} 包含顏色和圖標的對象
 */
export const getColumnStyle = (columnName) => {
  const name = columnName.toLowerCase();
  
  if (name.includes('待處理') || name.includes('待辦') || name.includes('to do') || 
      name.includes('todo') || name.includes('backlog')) {
    return { color: 'text-orange-600', icon: '⏳' };
  }
  
  if (name.includes('進行中') || name.includes('in progress') || name.includes('doing') ||
      name.includes('進展') || name.includes('工作中') || name.includes('處理中')) {
    return { color: 'text-blue-600', icon: '🔄' };
  }
  
  if (name.includes('完成') || name.includes('done') || name.includes('finished') ||
      name.includes('completed') || name.includes('完畢')) {
    return { color: 'text-green-600', icon: '✅' };
  }
  
  if (name.includes('審核') || name.includes('review') || name.includes('檢查') ||
      name.includes('驗證') || name.includes('測試')) {
    return { color: 'text-purple-600', icon: '👀' };
  }
  
  if (name.includes('暫停') || name.includes('擱置') || name.includes('on hold') ||
      name.includes('blocked') || name.includes('延期')) {
    return { color: 'text-gray-600', icon: '⏸️' };
  }
  
  return { color: 'text-green-600', icon: '📋' };
};
