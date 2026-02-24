import React from 'react';
import { FiLoader, FiRefreshCw, FiCheckCircle, FiEye, FiPause, FiClipboard, FiInfo, FiFileText, FiUsers, FiCpu } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa';

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
    case 'creativity': return <FiInfo className="w-4 h-4" />;
    case 'reflection': return <FiFileText className="w-4 h-4" />;
    case 'collaboration': return <FiUsers className="w-4 h-4" />;
    case 'ai': return <FiCpu className="w-4 h-4" />;
    default: return <FaTrophy className="w-4 h-4" />;
  }
};

/**
 * 計算專案進度（以階段與子階段換算成百分比）
 * Option B: 四階段 SRL 循環模式（「歷程」階段已隱藏）
 * 規則：
 * - 若 `currentStage` 或 `currentSubStage` 缺失，回傳 0
 * - [Option B 隱藏] 原五階段模式：每階段 20%，stage 5-5 = 100%
 * - 四階段模式：每階段 25%，每子階段約 8.33%
 * - stage 4-3 視為 100%（專案完成）
 * - 向後兼容：stage > 4 視為 100%（處理舊數據）
 */
export const calculateProgress = (currentStage, currentSubStage) => {
  if (!currentStage || !currentSubStage) return 0;
  const stage = Number(currentStage);
  const sub = Number(currentSubStage);
  if (Number.isNaN(stage) || Number.isNaN(sub)) return 0;

  // 向後兼容：若為舊的 stage 5 數據，視為完成
  if (stage > 4) return 100;
  // 四階段完成條件：stage 4, substage 3
  if (stage === 4 && sub >= 3) return 100;

  // 四階段計算：每階段 25%，每子階段 25/3 ≈ 8.33%
  const stageProgress = (stage - 1) * 25;
  const subStageProgress = ((sub - 1) / 3) * 25;
  return Math.max(0, Math.min(100, Math.round(stageProgress + subStageProgress)));
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
    return { color: 'text-orange-600', icon: <FiLoader className="w-4 h-4" /> };
  }

  if (name.includes('進行中') || name.includes('in progress') || name.includes('doing') ||
      name.includes('進展') || name.includes('工作中') || name.includes('處理中')) {
    return { color: 'text-blue-600', icon: <FiRefreshCw className="w-4 h-4" /> };
  }

  if (name.includes('完成') || name.includes('done') || name.includes('finished') ||
      name.includes('completed') || name.includes('完畢')) {
    return { color: 'text-green-600', icon: <FiCheckCircle className="w-4 h-4" /> };
  }

  if (name.includes('審核') || name.includes('review') || name.includes('檢查') ||
      name.includes('驗證') || name.includes('測試')) {
    return { color: 'text-purple-600', icon: <FiEye className="w-4 h-4" /> };
  }

  if (name.includes('暫停') || name.includes('擱置') || name.includes('on hold') ||
      name.includes('blocked') || name.includes('延期')) {
    return { color: 'text-gray-600', icon: <FiPause className="w-4 h-4" /> };
  }

  return { color: 'text-green-600', icon: <FiClipboard className="w-4 h-4" /> };
};

// 從 teacher-dashboard 提取的共用工具函式

/**
 * 生成學生活動統計
 * @param {Array} students - 學生陣列
 * @param {Object} realData - 真實數據
 * @returns {Array} 排序後的學生活動統計
 */
export const generateStudentActivityStats = (students) => {
  return students.map(student => ({
    name: student.username || student.name,
    reflections: student.weeklyReflections || 0,
    nodes: student.ideaNodes || 0,
    tasks: student.kanbanTasks || 0,
    totalActivity: (student.weeklyReflections || 0) + (student.ideaNodes || 0) + (student.kanbanTasks || 0)
  })).sort((a, b) => b.totalActivity - a.totalActivity);
};

/**
 * 計算創作者統計
 * @param {Array} items - 項目陣列
 * @param {string} creatorField - 創作者欄位名稱
 * @returns {Object} 創作者統計物件
 */
export const calculateCreatorStats = (items, creatorField = 'owner') => {
  return items.reduce((acc, item) => {
    const creator = item[creatorField] || '未知';
    acc[creator] = (acc[creator] || 0) + 1;
    return acc;
  }, {});
};

/**
 * 生成排行榜資料
 * @param {Array} enhancedStudents - 增強學生資料
 * @param {Object} realData - 真實數據
 * @returns {Object|null} 排行榜資料物件
 */
export const generateRankingData = (enhancedStudents, realData) => {
  if (!realData || !enhancedStudents) {
    return null;
  }

  // 學生活動排行
  const studentActivity = generateStudentActivityStats(enhancedStudents);

  // 創作者統計
  const nodeCreators = calculateCreatorStats(realData.nodes || [], 'owner');
  const taskCreators = calculateCreatorStats(realData.tasks || [], 'owner');

  return {
    students: studentActivity,
    creators: nodeCreators,
    tasks: taskCreators
  };
};

// 安全資料處理工具函數 - Defensive Programming Utils

/**
 * 安全的陣列資料存取器
 * @param {*} data - 待檢查的資料
 * @param {Array} fallback - 預設值
 * @returns {Array} 安全的陣列
 */
export const getSafeArrayData = (data, fallback = []) => {
  return Array.isArray(data) ? data : fallback;
};

/**
 * 安全的物件資料存取器
 * @param {*} data - 待檢查的資料
 * @param {Object} fallback - 預設值
 * @returns {Object} 安全的物件
 */
export const getSafeObjectData = (data, fallback = {}) => {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : fallback;
};

/**
 * 安全的屬性存取器
 * @param {Object} item - 物件
 * @param {string} key - 屬性鍵
 * @param {*} fallback - 預設值
 * @returns {*} 安全的屬性值
 */
export const getSafeValue = (item, key, fallback = 0) => {
  if (!item || typeof item !== 'object') return fallback;
  const value = item[key];
  return value !== undefined && value !== null ? value : fallback;
};

/**
 * 安全的顯示名稱獲取
 * @param {Object} item - 使用者物件
 * @returns {string} 安全的顯示名稱
 */
export const getSafeDisplayName = (item) => {
  if (!item || typeof item !== 'object') return '未知用戶';
  return item.name || item.creator || item.username || '未知用戶';
};

/**
 * 安全的排行榜資料處理器
 * @param {*} rawData - 原始資料
 * @param {number} limit - 限制數量
 * @returns {Array} 處理後的排行榜資料
 */
export const processSafeRankingData = (rawData, limit = 3) => {
  const safeData = getSafeObjectData(rawData);

  try {
    return Object.entries(safeData)
      .filter(([key, value]) => {
        return key &&
               typeof key === 'string' &&
               key.trim() !== '' &&
               typeof value === 'number' &&
               !isNaN(value) &&
               value >= 0;
      })
      .sort(([,a], [,b]) => (b || 0) - (a || 0))
      .slice(0, Math.max(0, limit))
      .map(([creator, count]) => ({
        creator: creator.trim(),
        count: Math.floor(count)
      }));
  } catch (error) {
    console.warn('處理排行榜資料時發生錯誤:', error);
    return [];
  }
};

/**
 * 安全的陣列排序處理器
 * @param {*} data - 待排序資料
 * @param {string} sortKey - 排序鍵
 * @param {boolean} descending - 是否降序
 * @returns {Array} 排序後的安全陣列
 */
export const safeSortArray = (data, sortKey, descending = true) => {
  const safeData = getSafeArrayData(data);

  try {
    return [...safeData]
      .filter(item => item && typeof item === 'object')
      .sort((a, b) => {
        const aVal = getSafeValue(a, sortKey, 0);
        const bVal = getSafeValue(b, sortKey, 0);
        return descending ? bVal - aVal : aVal - bVal;
      });
  } catch (error) {
    console.warn('排序陣列時發生錯誤:', error);
    return [];
  }
};
