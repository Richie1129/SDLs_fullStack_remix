/**
 * Auth Utilities - 認證相關便捷函式
 * 提供統一的使用者資訊存取介面
 */

import storageService, { authStorage, userStorage } from '../services/storageService';

/**
 * 獲取當前使用者 ID
 * @returns {number} 使用者 ID，預設為 0
 */
export const getCurrentUserId = () => {
  return userStorage.getInt('id', 0);
};

/**
 * 獲取當前使用者角色
 * @returns {string} 使用者角色 ('student' | 'teacher' | 'admin' | 'guest')
 */
export const getCurrentUserRole = () => {
  return userStorage.get('role', 'guest');
};

/**
 * 獲取當前使用者名稱
 * @returns {string} 使用者名稱
 */
export const getCurrentUsername = () => {
  return userStorage.get('username', '');
};

/**
 * 獲取當前使用者完整資訊
 * @returns {object} 使用者資訊物件
 */
export const getCurrentUser = () => {
  return {
    id: getCurrentUserId(),
    role: getCurrentUserRole(),
    username: getCurrentUsername(),
    email: userStorage.get('email', ''),
    account: userStorage.get('account', ''),
    class: userStorage.get('class', ''),
    seatNumber: userStorage.get('seatNumber', '')
  };
};

/**
 * 檢查使用者是否已登入
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return authStorage.get('accessToken') !== null;
};

/**
 * 檢查使用者是否為教師
 * @returns {boolean}
 */
export const isTeacher = () => {
  return getCurrentUserRole() === 'teacher';
};

/**
 * 檢查使用者是否為學生
 * @returns {boolean}
 */
export const isStudent = () => {
  return getCurrentUserRole() === 'student';
};

/**
 * 檢查使用者是否為管理員
 * @returns {boolean}
 */
export const isAdmin = () => {
  return getCurrentUserRole() === 'admin';
};

/**
 * 獲取 Access Token
 * @returns {string|null}
 */
export const getAccessToken = () => {
  return authStorage.get('accessToken');
};

/**
 * 獲取 Refresh Token
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  return authStorage.get('refreshToken');
};

/**
 * 設定認證 Token
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export const setAuthTokens = (accessToken, refreshToken) => {
  authStorage.set('accessToken', accessToken);
  authStorage.set('refreshToken', refreshToken);
};

/**
 * 清除認證資訊 (登出)
 */
export const clearAuth = () => {
  authStorage.clear();
  userStorage.clear();
};

/**
 * 設定使用者資訊
 * @param {object} userData - 使用者資料
 */
export const setUserData = (userData) => {
  if (userData.id) userStorage.set('id', userData.id);
  if (userData.role) userStorage.set('role', userData.role);
  if (userData.username) userStorage.set('username', userData.username);
  if (userData.email) userStorage.set('email', userData.email);
  if (userData.account) userStorage.set('account', userData.account);
  if (userData.class) userStorage.set('class', userData.class);
  if (userData.seatNumber) userStorage.set('seatNumber', userData.seatNumber);
};

/**
 * 獲取專案階段資訊
 * @returns {object} { currentStage, currentSubStage, stageEnd }
 */
export const getStageInfo = () => {
  return {
    currentStage: storageService.getInt('currentStage', 1),
    currentSubStage: storageService.getInt('currentSubStage', 1),
    stageEnd: storageService.getBoolean('stageEnd', false)
  };
};

/**
 * 設定專案階段資訊
 * @param {number} stage - 當前階段
 * @param {number} subStage - 當前子階段
 */
export const setStageInfo = (stage, subStage) => {
  storageService.set('currentStage', stage);
  storageService.set('currentSubStage', subStage);
};

/**
 * 清除專案階段資訊
 */
export const clearStageInfo = () => {
  storageService.removeMultiple(['currentStage', 'currentSubStage', 'stageEnd']);
};

/**
 * 設定階段結束標記
 * @param {boolean} ended
 */
export const setStageEnd = (ended) => {
  storageService.set('stageEnd', ended ? 'true' : 'false');
};

export default {
  // User Info
  getCurrentUserId,
  getCurrentUserRole,
  getCurrentUsername,
  getCurrentUser,
  
  // Auth Status
  isAuthenticated,
  isTeacher,
  isStudent,
  isAdmin,
  
  // Token Management
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuth,
  
  // User Data
  setUserData,
  
  // Stage Management
  getStageInfo,
  setStageInfo,
  clearStageInfo,
  setStageEnd
};
