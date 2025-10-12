/**
 * 獲取 API 基礎 URL
 * @returns {string} API 基礎 URL（開發環境：/api，生產環境：環境變數）
 */
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

/**
 * 建立完整的 API URL
 * @param {string} path - API 路徑（不含 /api 前綴）
 * @returns {string} 完整的 API URL
 */
export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * 建立檔案下載 URL
 * @param {string} fileName - MinIO 檔案名稱
 * @returns {string} 檔案下載 URL
 */
export const buildFileDownloadUrl = (fileName) => {
  return buildApiUrl(`/file/direct/${fileName}`);
};

/**
 * 建立圖片顯示 URL
 * @param {string} fileName - MinIO 檔案名稱
 * @returns {string} 圖片顯示 URL
 */
export const buildFileImageUrl = (fileName) => {
  return buildApiUrl(`/file/image/${fileName}`);
};
