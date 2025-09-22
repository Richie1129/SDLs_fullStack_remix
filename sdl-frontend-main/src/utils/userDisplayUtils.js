/**
 * 用戶顯示格式化工具 - Linus式統一解決方案
 * "好程式設計師關心數據結構" - 統一的用戶顯示邏輯
 */

/**
 * 格式化用戶顯示名稱
 * @param {Object} user - 用戶對象
 * @param {string} user.username - 用戶名
 * @param {string} user.role - 用戶角色
 * @param {string} user.class - 班級
 * @param {string} user.seatNumber - 座號
 * @param {number|string} user.id - 用戶ID
 * @returns {string} 格式化後的顯示名稱
 */
export const formatUserDisplay = (user) => {
  const username = user?.username || `使用者 #${user?.id || 'Unknown'}`;

  // 教師角色顯示為 username(指導老師)
  if (user?.role === 'teacher' || user?.role === '教師') {
    return `${username}(指導老師)`;
  }

  // 學生有班級和座號時顯示 username(class_seatNumber)
  if (user?.class && user?.seatNumber) {
    return `${username}(${user.class}_${user.seatNumber})`;
  }

  return username;
};

/**
 * 獲取用戶顯示名稱的純函數版本
 * 專門用於不涉及組件狀態的場景
 */
export const getUserDisplayName = formatUserDisplay;

export default formatUserDisplay;