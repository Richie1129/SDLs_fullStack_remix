import axios from 'axios';

// Base URL from env, fallback to '/api'
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach token on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
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

// Unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const errorCode = error?.response?.data?.code;
    const currentPath = window.location.pathname;

    // 只有真正的認證失敗才重定向（NO_TOKEN 或 TOKEN_EXPIRED）
    // 其他錯誤（如權限錯誤）不應該強制登出
    if (status === 401 && !currentPath.includes('/login')) {
      // 如果是 NO_TOKEN 或 TOKEN_EXPIRED，清除 token 並重定向
      if (errorCode === 'NO_TOKEN' || errorCode === 'TOKEN_EXPIRED') {
        try { localStorage.removeItem('accessToken'); } catch {}
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
      }
      // INVALID_TOKEN 或 AUTH_FAILED：可能是配置問題，讓錯誤自然傳播給呼叫者處理
      // 不自動重定向，讓用戶看到具體錯誤
    }

    // 403 不重定向，僅傳播錯誤（可能是權限問題，不是認證問題）

    return Promise.reject(error);
  }
);

export default apiClient;

