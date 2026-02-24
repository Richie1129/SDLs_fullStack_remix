/**
 * 學習歷程匯出 API
 */
import apiClient from './client';
import { authStorage } from '../services/storageService';

/**
 * 獲取專案匯出資料
 * @param {number} projectId - 專案 ID
 * @returns {Promise<object>} - 格式化的匯出資料
 */
export const getExportData = async (projectId) => {
  const token = authStorage.get('accessToken');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'accessToken': token })
    }
  };

  const response = await apiClient.get(`/projects/${projectId}/export-data`, config);
  return response.data;
};
