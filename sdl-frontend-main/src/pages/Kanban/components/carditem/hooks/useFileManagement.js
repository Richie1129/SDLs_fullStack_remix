import { useCallback } from 'react';
import apiClient from '@/api/client';
import FileDownload from 'js-file-download';
import toast from 'react-hot-toast';
import { buildApiUrl, buildFileImageUrl, buildFileDownloadUrl } from '@/utils/fileUrlBuilder.js';
import { validateFileSize } from '@/utils/fileValidation';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * useFileManagement - 文件操作邏輯
 *
 * 完全按照原始 Carditem.jsx 的邏輯實現
 * "Never break userspace" - 保持原始行為
 */
export function useFileManagement(cardData, setCardData) {
  /**
   * 上傳文件（原始邏輯）
   */
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!validateFileSize(files)) {
      e.target.value = '';
      return;
    }
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // Fix: Use apiClient and remove buildApiUrl (apiClient handles baseURL)
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 處理 MinIO 回傳的完整 URL 或本地相對路徑
      const uploadedFiles = response.data.files
        .filter((file) => !file.mimeType.startsWith("image/"))
        .map((file) => ({
          url: file.fileName ? buildFileDownloadUrl(file.fileName) : file.url,
          originalName: file.originalName,
          mimeType: file.mimeType,
          fileName: file.fileName, // 保存 MinIO 檔名
          size: file.size
        }));

      // Linus: 分離原始圖片資料與 URL，以便顯示詳細資訊
      const rawImageFiles = response.data.files
        .filter((file) => file.mimeType.startsWith("image/"));

      const uploadedImages = rawImageFiles
        .map((file) => {
          // 使用 MinIO 檔名建構圖片 URL
          if (file.fileName) {
            return buildFileImageUrl(file.fileName);
          }
          return file.url;
        });

      setCardData((prev) => ({
        ...prev,
        files: Array.isArray(prev.files)
          ? [...prev.files, ...uploadedFiles]
          : [...uploadedFiles],
        images: Array.isArray(prev.images)
          ? [...prev.images, ...uploadedImages]
          : uploadedImages,
      }));

      // Fix: Improved UX with file details
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0]; // Show first file info
        const sizeInfo = file.size ? ` (${formatSize(file.size)})` : '';
        const countInfo = uploadedFiles.length > 1 ? ` ...等 ${uploadedFiles.length} 個檔案` : '';
        toast.success(`上傳成功: ${file.originalName}${sizeInfo}${countInfo}`, { duration: 5000 });
      } else if (uploadedImages.length > 0) {
         // Linus: 顯示圖片詳細資訊
         const file = rawImageFiles[0];
         const sizeInfo = file.size ? ` (${formatSize(file.size)})` : '';
         const countInfo = rawImageFiles.length > 1 ? ` ...等 ${rawImageFiles.length} 張圖片` : '';
         toast.success(`圖片上傳成功: ${file.originalName}${sizeInfo}${countInfo}`, { duration: 5000 });
      } else {
         toast.success('檔案上傳成功');
      }
    } catch (err) {
      console.error('檔案上傳失敗:', err);
      // Linus: 顯示詳細錯誤訊息
      const errorMessage = err.response?.data?.message || '檔案上傳失敗';
      const errorDetail = err.response?.data?.error;
      toast.error(errorDetail ? `${errorMessage}: ${errorDetail}` : errorMessage);
    }
  }, [setCardData]);

  /**
   * 下載文件（原始邏輯）
   */
  const handleFileDownload = useCallback(async (file) => {
    try {
      // 統一使用後端 API 代理下載（支援 MinIO 和 BLOB）
      const downloadUrl = file.fileName
        ? buildFileDownloadUrl(file.fileName) // MinIO 檔案
        : buildApiUrl(file.url); // 向後相容舊的路徑

      console.log('下載檔案 URL:', downloadUrl);

      // Fix: Use apiClient. Override baseURL to empty because downloadUrl is already full path (from buildApiUrl)
      const response = await apiClient.get(downloadUrl, {
        responseType: 'blob',
        baseURL: '' 
      });
      FileDownload(response.data, file.originalName || file.fileName || 'download');
      toast.success(`下載成功: ${file.originalName || file.fileName}`);
    } catch (err) {
      console.error('檔案下載失敗:', err);
      toast.error('檔案下載失敗');
    }
  }, []);

  /**
   * 下載圖片
   */
  const handleImageDownload = useCallback(async (imageUrl) => {
    try {
      // Fix: Use apiClient with baseURL: ''
      const response = await apiClient.get(imageUrl, {
        responseType: 'blob',
        baseURL: ''
      });
      // 從 URL 提取檔名，如果失敗則使用預設值
      const fileName = imageUrl.split('/').pop() || 'download_image.png';
      FileDownload(response.data, fileName);
      toast.success('圖片下載成功');
    } catch (err) {
      console.error('圖片下載失敗:', err);
      toast.error('圖片下載失敗');
    }
  }, []);

  /**
   * 刪除文件（原始邏輯）
   */
  const removeFile = useCallback(async (index) => {
    const fileToRemove = cardData.files[index];
    if (!fileToRemove) return;

    try {
      // 提取 MinIO 檔案名稱
      let fileName = null;
      if (fileToRemove.fileName) {
        fileName = fileToRemove.fileName;
      } else if (fileToRemove.url && fileToRemove.url.includes('sdl-files/')) {
        fileName = fileToRemove.url.split('/').pop();
      }

      // 如果有 MinIO 檔案名稱，先從 MinIO 刪除
      if (fileName) {
        // Linus: 使用 apiClient 替代 axios，並移除 buildApiUrl
        await apiClient.delete(`/file/${fileName}`);
        console.log(`✅ MinIO 檔案刪除成功: ${fileName}`);
      }

      // 從前端狀態移除
      setCardData((prev) => {
        const newFiles = [...prev.files];
        newFiles.splice(index, 1);
        return { ...prev, files: newFiles };
      });

      toast.success(`檔案移除成功: ${fileToRemove.originalName || fileName}`);
    } catch (error) {
      // Linus: 優先檢查 404 錯誤 (檔案已不存在 = 刪除成功)
      if (error.response?.status == 404 || error.message?.includes('404')) {
        console.warn('檔案在伺服器上不存在 (404)，僅從前端移除');
        
        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newFiles = [...prev.files];
          newFiles.splice(index, 1);
          return { ...prev, files: newFiles };
        });
        toast.success('檔案已移除 (檔案原先已不存在)');
      } else {
        console.error('檔案刪除失敗:', error);
        toast.error('檔案刪除失敗');
      }
    }
  }, [cardData.files, setCardData]);

  /**
   * 刪除圖片（原始邏輯）
   */
  const removeImage = useCallback(async (index) => {
    const imageToRemove = cardData.images[index];
    if (!imageToRemove) return;

    try {
      // 提取 MinIO 檔案名稱
      let fileName = null;
      if (imageToRemove.includes('api/file/image/')) {
        // 從代理 API URL 中提取檔案名
        fileName = imageToRemove.split('/').pop();
      } else if (imageToRemove.includes('sdl-files/')) {
        // 從直接 MinIO URL 中提取檔案名
        fileName = imageToRemove.split('/').pop();
      }

      // 如果有 MinIO 檔案名稱，先從 MinIO 刪除
      if (fileName) {
        // Linus: 使用 apiClient 替代 axios，並移除 buildApiUrl
        await apiClient.delete(`/file/${fileName}`);
        console.log(`✅ MinIO 圖片刪除成功: ${fileName}`);
      }

      // 從前端狀態移除
      setCardData((prev) => {
        const newImages = [...prev.images];
        newImages.splice(index, 1);
        return { ...prev, images: newImages };
      });

      toast.success('圖片移除成功');
    } catch (error) {
      // Linus: 優先檢查 404 錯誤 (檔案已不存在 = 刪除成功)
      if (error.response?.status == 404 || error.message?.includes('404')) {
        console.warn('圖片在伺服器上不存在 (404)，僅從前端移除');

        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newImages = [...prev.images];
          newImages.splice(index, 1);
          return { ...prev, images: newImages };
        });
        toast.success('圖片已移除 (檔案原先已不存在)');
      } else {
        console.error('圖片刪除失敗:', error);
        console.log('Error details:', {
          status: error.response?.status,
          message: error.message,
          code: error.code
        });
        const errorMsg = error.response?.data?.message || '圖片刪除失敗';
        toast.error(errorMsg);
      }
    }
  }, [cardData.images, setCardData]);

  return {
    handleFileUpload,
    handleFileDownload,    handleImageDownload,    removeFile,
    removeImage
  };
}
