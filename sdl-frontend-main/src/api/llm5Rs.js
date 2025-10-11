import apiClient from './client';
const API_BASE_URL = '/llm';

// 分析 5Rs 反思內容
export const analyze5RsReflection = async (studentContent, preferredProvider = 'auto') => {
  try {
    const requestPayload = {
      studentContent,
      preferredProvider
    };

    const response = await apiClient.post(`${API_BASE_URL}/analyze-5rs`, requestPayload);
    return response.data;
  } catch (error) {
    console.error('5Rs analysis failed | 5Rs 分析失敗:', error);
    throw new Error(error.response?.data?.message || '分析過程中發生錯誤');
  }
};

// 獲取 5Rs 框架資訊
export const get5RsFramework = async () => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/5rs-framework`);
    return response.data;
  } catch (error) {
    console.error('獲取 5Rs 框架失敗:', error);
    throw new Error(error.response?.data?.message || '獲取框架資訊失敗');
  }
};

// 驗證 5Rs 內容格式
export const validate5RsContent = async (content) => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/validate-5rs`, {
      content
    });
    return response.data;
  } catch (error) {
    console.error('驗證 5Rs 內容失敗:', error);
    throw new Error(error.response?.data?.message || '驗證過程中發生錯誤');
  }
};
