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
    // 檔案上傳自動延長 timeout（校園 WiFi 網速慢，30 秒不夠）
    if (config.data instanceof FormData) {
      config.timeout = 300000; // 5 分鐘
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh queue — 避免多個 401 同時觸發多次 refresh
let isRefreshing = false;
let refreshQueue = []; // { resolve, reject } 等待 refresh 完成的請求

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
}

// Response Interceptor - 自動 Refresh Token（含 queue 機制）
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;
    const originalRequest = error.config;

    if (status === 401 && !currentPath.includes('/login') && !originalRequest.__isRetry) {
      originalRequest.__isRetry = true;

      const refreshToken = authStorage.get('refreshToken');

      if (!refreshToken) {
        try { storageService.clear(); } catch {}
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      }

      // 如果已經有人在 refresh，排隊等待
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers['accessToken'] = newToken;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      // 第一個 401：負責 refresh
      isRefreshing = true;

      try {
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = response.data.accessToken;
        authStorage.set('accessToken', newAccessToken);

        // 通知排隊中的請求
        processQueue(null, newAccessToken);

        // 重試原始請求
        originalRequest.headers['accessToken'] = newAccessToken;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh 失敗，通知所有排隊的請求也失敗
        processQueue(refreshError, null);
        try { storageService.clear(); } catch {}
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 不重定向，僅傳播錯誤（可能是權限問題，不是認證問題）
    return Promise.reject(error);
  }
);

export default apiClient;
