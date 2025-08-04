import axios from 'axios';

const API_BASE_URL = 'http://localhost/api/llm';

// 分析 5Rs 反思內容
export const analyze5RsReflection = async (studentContent, preferredProvider = 'auto') => {
  try {
    console.log('=== API 呼叫開始 ===');
    console.log('API URL:', `${API_BASE_URL}/analyze-5rs`);
    console.log('學生內容:', studentContent);
    console.log('偏好提供者:', preferredProvider);
    
    const requestPayload = {
      studentContent,
      preferredProvider
    };
    
    console.log('請求負載:', requestPayload);
    
    const response = await axios.post(`${API_BASE_URL}/analyze-5rs`, requestPayload);
    
    console.log('API 回應狀態:', response.status);
    console.log('API 回應資料:', response.data);
    console.log('=== API 呼叫結束 ===');
    
    return response.data;
  } catch (error) {
    console.error('=== API 呼叫失敗 ===');
    console.error('錯誤詳情:', error);
    console.error('錯誤回應:', error.response?.data);
    console.error('錯誤狀態:', error.response?.status);
    console.error('==================');
    throw new Error(error.response?.data?.message || '分析過程中發生錯誤');
  }
};

// 獲取 5Rs 框架資訊
export const get5RsFramework = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/5rs-framework`);
    return response.data;
  } catch (error) {
    console.error('獲取 5Rs 框架失敗:', error);
    throw new Error(error.response?.data?.message || '獲取框架資訊失敗');
  }
};

// 驗證 5Rs 內容格式
export const validate5RsContent = async (content) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/validate-5rs`, {
      content
    });
    return response.data;
  } catch (error) {
    console.error('驗證 5Rs 內容失敗:', error);
    throw new Error(error.response?.data?.message || '驗證過程中發生錯誤');
  }
};
