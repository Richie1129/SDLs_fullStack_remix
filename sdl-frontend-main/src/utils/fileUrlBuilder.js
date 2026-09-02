import apiClient from '@/api/client';
import FileDownload from 'js-file-download';
import toast from 'react-hot-toast';

/** 檔案在物件儲存中已不存在時顯示給使用者的訊息 */
export const MISSING_FILE_MESSAGE = '檔案已遺失，請重新上傳';

/**
 * 判斷是否為「檔案不存在」錯誤
 * 後端 /api/file/image 與 /api/file/direct 在 MinIO 找不到物件時回 404
 * @param {unknown} err - axios 錯誤物件
 * @returns {boolean}
 */
export const isFileMissingError = (err) => err?.response?.status === 404;

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

/**
 * 使用 accessToken 認證下載 MinIO 檔案
 * 解決 window.open / <a href> 無法帶 token 的問題
 *
 * 錯誤一律在此處理並顯示 toast，不會向外拋出，
 * 呼叫端不需要各自 try/catch；需要知道結果時看回傳值即可。
 * @param {string} fileName - MinIO 儲存的檔案名稱
 * @param {string} [originalName] - 下載後的顯示名稱（選填）
 * @returns {Promise<boolean>} 下載是否成功
 */
export const downloadFileWithAuth = async (fileName, originalName) => {
  try {
    const response = await apiClient.get(`/file/direct/${fileName}`, {
      responseType: 'blob',
    });
    FileDownload(response.data, originalName || fileName);
    return true;
  } catch (err) {
    console.error('檔案下載失敗:', err);
    toast.error(isFileMissingError(err) ? MISSING_FILE_MESSAGE : '檔案下載失敗');
    return false;
  }
};
