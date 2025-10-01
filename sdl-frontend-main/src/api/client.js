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
    const currentPath = window.location.pathname;

    // 只在非登入頁面才重定向
    if ((status === 401 || status === 403) && !currentPath.includes('/login')) {
      try { localStorage.removeItem('accessToken'); } catch {}
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

