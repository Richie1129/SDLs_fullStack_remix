/**
 * 使用者資訊工具：只保留 socket、事件監聽與組合函式。
 * 單一欄位 getter 一律從 authUtils 取得。
 */

import { getCurrentUserId, getCurrentUserRole, getCurrentUsername } from './authUtils';
import { userStorage } from '../services/storageService';

// 獲取當前用戶帳號
export const getCurrentUserAccount = () => {
  return userStorage.get('account', '');
};

// 獲取當前用戶班級
export const getCurrentUserClass = () => {
  return userStorage.get('class', '');
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