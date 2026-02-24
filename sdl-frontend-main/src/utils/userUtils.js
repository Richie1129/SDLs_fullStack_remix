/**
 * 全域用戶資訊工具
 * 提供統一的用戶資訊獲取和監聽功能
 * 
 * ⚠️ DEPRECATED: 這個文件中的許多函式已被 authUtils.js 取代
 * 新代碼應該使用 authUtils.js 中的函式
 * 這個文件保留是為了向後兼容
 */

import { getCurrentUserId as getIdFromAuth, getCurrentUserRole as getRoleFromAuth } from './authUtils';
import { userStorage } from '../services/storageService';

// 獲取當前用戶名稱（即時更新）
export const getCurrentUsername = () => {
  return userStorage.get('username', '');
};

// 獲取當前用戶 ID
// ⚠️ DEPRECATED: 請使用 authUtils.getCurrentUserId()
export const getCurrentUserId = () => {
  return getIdFromAuth();
};

// 獲取當前用戶帳號
export const getCurrentUserAccount = () => {
  return userStorage.get('account', '');
};

// 獲取當前用戶角色
// ⚠️ DEPRECATED: 請使用 authUtils.getCurrentUserRole()
export const getCurrentUserRole = () => {
  return getRoleFromAuth();
};

// 獲取當前用戶班級
export const getCurrentUserClass = () => {
  return userStorage.get('class', '');
};

// 獲取用戶顯示名稱（優先順序：有效用戶名 > 用戶ID > null）
export const getUserDisplayName = () => {
  const username = getCurrentUsername();
  const userId = getCurrentUserId();

  // 檢查 username 是否有效且不是預設值
  if (username && username.trim() && username !== '未知用戶') {
    return username;
  } else if (userId) {
    return `用戶${userId}`;
  } else {
    return null; // 讓呼叫端處理
  }
};

// 獲取完整的用戶資訊物件
export const getCurrentUserInfo = () => {
  return {
    username: getCurrentUsername(),
    account: getCurrentUserAccount(),
    role: getCurrentUserRole(),
    class: getCurrentUserClass(),
    id: getCurrentUserId()
  };
};

// 檢查是否為當前用戶
export const isCurrentUser = (username) => {
  return username === getCurrentUsername();
};

// 為 socket 事件準備用戶資訊
export const getUserForSocket = () => {
  return {
    username: getCurrentUsername(),
    id: getCurrentUserId()
  };
};

// 監聽用戶資料更新的事件監聽器
export const addUserUpdateListener = (callback) => {
  const handleUserUpdate = (event) => {
    callback(event.detail);
  };

  window.addEventListener('userProfileUpdated', handleUserUpdate);

  // 返回清理函數
  return () => {
    window.removeEventListener('userProfileUpdated', handleUserUpdate);
  };
};

// 觸發用戶資料更新事件
export const triggerUserUpdate = (userInfo) => {
  window.dispatchEvent(new CustomEvent('userProfileUpdated', {
    detail: userInfo
  }));
};