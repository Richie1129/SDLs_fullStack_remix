import { useCallback } from 'react';
import axios from 'axios';
import FileDownload from 'js-file-download';
import toast from 'react-hot-toast';
import { buildApiUrl, buildFileImageUrl, buildFileDownloadUrl } from '@/utils/fileUrlBuilder.js';

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
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(buildApiUrl('/upload'), formData, {
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
          fileName: file.fileName // 保存 MinIO 檔名
        }));

      const uploadedImages = response.data.files
        .filter((file) => file.mimeType.startsWith("image/"))
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

      toast.success('檔案上傳成功');
    } catch (err) {
      console.error('檔案上傳失敗:', err);
      toast.error('檔案上傳失敗');
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

      const response = await axios.get(downloadUrl, {
        responseType: 'blob'
      });
      FileDownload(response.data, file.originalName || file.fileName || 'download');
      toast.success(`下載成功: ${file.originalName || file.fileName}`);
    } catch (err) {
      console.error('檔案下載失敗:', err);
      toast.error('檔案下載失敗');
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
        await axios.delete(buildApiUrl(`/file/${fileName}`));
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
      console.error('檔案刪除失敗:', error);
      if (error.response?.status === 404) {
        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newFiles = [...prev.files];
          newFiles.splice(index, 1);
          return { ...prev, files: newFiles };
        });
        toast.success('檔案已移除');
      } else {
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
        await axios.delete(buildApiUrl(`/file/${fileName}`));
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
      console.error('圖片刪除失敗:', error);
      if (error.response?.status === 404) {
        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newImages = [...prev.images];
          newImages.splice(index, 1);
          return { ...prev, images: newImages };
        });
        toast.success('圖片已移除');
      } else {
        toast.error('圖片刪除失敗');
      }
    }
  }, [cardData.images, setCardData]);

  return {
    handleFileUpload,
    handleFileDownload,
    removeFile,
    removeImage
  };
}
