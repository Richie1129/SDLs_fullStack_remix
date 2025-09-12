/**
 * 任務處理工具
 */
import { safeFilter, isTaskCompleted } from './dataUtils';

/**
 * 安全獲取所有任務的列名
 */
export const getAllColumnNames = (kanbanTasks) => {
  if (!Array.isArray(kanbanTasks) || kanbanTasks.length === 0) {
    return [];
  }
  try {
    return [...new Set(kanbanTasks.map(task => task?.columnName).filter(Boolean))];
  } catch (error) {
    console.error('獲取列名錯誤:', error);
    return [];
  }
};

/**
 * 根據狀態分組任務
 */
export const getTasksByStatus = (kanbanTasks) => {
  try {
    const tasksByStatus = {};
    const allColumnNames = getAllColumnNames(kanbanTasks);
    
    allColumnNames.forEach(columnName => {
      tasksByStatus[columnName] = safeFilter(kanbanTasks, task => task?.columnName === columnName);
    });
    
    return tasksByStatus;
  } catch (error) {
    console.error('計算任務狀態錯誤:', error);
    return {};
  }
};

/**
 * 統計完成和未完成的任務數
 */
export const getTaskCompletionStats = (kanbanTasks) => {
  const completedTasks = safeFilter(kanbanTasks, isTaskCompleted).length;
  const totalTasks = Array.isArray(kanbanTasks) ? kanbanTasks.length : 0;
  const pendingTasks = totalTasks - completedTasks;

  return {
    completedTasks,
    pendingTasks,
    totalTasks
  };
};

/**
 * 檢查是否為目標任務
 */
export const isGoalTask = (task) => {
  const title = (task?.title || '').toLowerCase();
  const column = (task?.columnName || task?.status || '').toLowerCase();
  return (
    title.includes('goal') || title.includes('目標') || title.includes('milestone') ||
    column.includes('目標') || column.includes('milestone')
  );
};