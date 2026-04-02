import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB，與後端 multer 限制一致

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * 驗證檔案大小，超過限制時顯示 toast 並回傳 false
 * @param {FileList|File[]} files
 * @param {number} [maxSize=100MB]
 * @returns {boolean} 是否通過驗證
 */
export const validateFileSize = (files, maxSize = MAX_FILE_SIZE) => {
  if (!files) return true;
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (file.size > maxSize) {
      toast.error(`檔案「${file.name}」(${formatSize(file.size)}) 超過 ${formatSize(maxSize)} 限制`);
      return false;
    }
  }
  return true;
};
