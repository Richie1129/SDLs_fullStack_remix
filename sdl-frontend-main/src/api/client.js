import axios from 'axios';
import storageService, { authStorage } from '../services/storageService';

// Base URL from env, fallback to '/api'
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // 30秒全局超時，避免請求永久掛起
});

// Attach token on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.get('accessToken') || authStorage.get('token');
    if (token) {
      // Keep backward-compatibility with backend expecting 'accessToken'
      config.headers['accessToken'] = token;
      // Also set Authorization for future compatibility
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - 自動 Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    // 🟢 消除特殊情況: 401 就是 401，不需要檢查 code
    if (status === 401 && !currentPath.includes('/login') && !error.config.__isRetry) {
      error.config.__isRetry = true;  // 防止無限重試

      const refreshToken = authStorage.get('refreshToken');

      if (!refreshToken) {
        // 無 refresh token，清除並跳轉登入
        try {
          storageService.clear();
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      }

      try {
        // 刷新 Access Token
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = response.data.accessToken;
        authStorage.set('accessToken', newAccessToken);
        error.config.headers['accessToken'] = newAccessToken;
        error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // 重試原始請求
        return apiClient(error.config);

      } catch (refreshError) {
        // Refresh 失敗，清除並跳轉登入
        try {
          storageService.clear();
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
        return Promise.reject(refreshError);
      }
    }

    // 403 不重定向，僅傳播錯誤（可能是權限問題，不是認證問題）
    return Promise.reject(error);
  }
);

export default apiClient;

