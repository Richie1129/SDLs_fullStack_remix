/**
 * 學習歷程匯出 API
 */
import apiClient from './client';

/**
 * 獲取專案匯出資料
 * @param {number} projectId - 專案 ID
 * @returns {Promise<object>} - 格式化的匯出資料
 */
export const getExportData = async (projectId) => {
  const token = localStorage.getItem('accessToken');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'accessToken': token })
    }
  };

  const response = await apiClient.get(`/projects/${projectId}/export-data`, config);
  return response.data;
};
