const { deleteFileFromMinio } = require('../config/minio');

/**
 * 從各種來源提取 MinIO 檔案名稱
 * @param {string|object} source - 檔案來源（URL、檔案物件等）
 * @returns {string|null} - MinIO 檔案名稱
 */
const extractMinioFileName = (source) => {
    if (!source) return null;
    
    // 如果是字串（URL）
    if (typeof source === 'string') {
        // 檢查是否為 MinIO URL
        if (source.includes('sdl-files/') || source.includes('sdls-files/')) {
            // 從 URL 中提取檔案名
            const parts = source.split('/');
            return parts[parts.length - 1];
        }
        // 如果是純檔案名
        if (!source.includes('/') && !source.includes('http')) {
            return source;
        }
        return null;
    }
    
    // 如果是物件
    if (typeof source === 'object') {
        // 檢查是否有 fileName 屬性（MinIO 檔案物件）
        if (source.fileName) {
            return source.fileName;
        }
        // 檢查是否有 filename 屬性（舊版格式）
        if (source.filename) {
            return source.filename;
        }
        // 檢查 URL 屬性
        if (source.url) {
            return extractMinioFileName(source.url);
        }
    }
    
    return null;
};

/**
 * 從陣列中提取所有 MinIO 檔案名稱
 * @param {Array} fileArray - 檔案陣列
 * @returns {Array} - MinIO 檔案名稱陣列
 */
const extractMinioFileNames = (fileArray) => {
    if (!Array.isArray(fileArray)) return [];
    
    return fileArray
        .map(file => extractMinioFileName(file))
        .filter(fileName => fileName !== null);
};

/**
 * 批量刪除 MinIO 檔案
 * @param {Array} fileNames - 要刪除的檔案名稱陣列
 * @returns {Promise<Object>} - 刪除結果
 */
const batchDeleteMinioFiles = async (fileNames) => {
    if (!Array.isArray(fileNames) || fileNames.length === 0) {
        return { success: 0, failed: 0, results: [] };
    }
    
    console.log(`🗑️ 開始批量刪除 ${fileNames.length} 個 MinIO 檔案:`, fileNames);
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    // 使用並發控制，避免同時發送過多請求
    const CONCURRENCY_LIMIT = 5;
    
    for (let i = 0; i < fileNames.length; i += CONCURRENCY_LIMIT) {
        const chunk = fileNames.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(async (fileName) => {
            try {
                await deleteFileFromMinio(fileName);
                console.log(`✅ MinIO 檔案刪除成功: ${fileName}`);
                return {
                    fileName,
                    success: true,
                    message: '刪除成功'
                };
            } catch (error) {
                console.error(`❌ MinIO 檔案刪除失敗: ${fileName}`, error.message);
                return {
                    fileName,
                    success: false,
                    message: error.message
                };
            }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
    }
    
    successCount = results.filter(r => r.success).length;
    failedCount = results.filter(r => !r.success).length;
    
    console.log(`🏁 批量刪除完成: ${successCount} 成功, ${failedCount} 失敗`);
    
    return {
        success: successCount,
        failed: failedCount,
        total: fileNames.length,
        results
    };
};

/**
 * 從任務資料中提取所有檔案名稱
 * @param {Object} taskData - 任務資料
 * @returns {Array} - 檔案名稱陣列
 */
const extractTaskFileNames = (taskData) => {
    const fileNames = [];
    
    // 提取圖片檔案名
    if (taskData.images && Array.isArray(taskData.images)) {
        const imageFileNames = extractMinioFileNames(taskData.images);
        fileNames.push(...imageFileNames);
    }
    
    // 提取附加檔案名
    if (taskData.files && Array.isArray(taskData.files)) {
        const attachmentFileNames = extractMinioFileNames(taskData.files);
        fileNames.push(...attachmentFileNames);
    }
    
    return fileNames;
};

/**
 * 從日誌資料中提取檔案名稱
 * @param {Object} dailyData - 日誌資料
 * @returns {Array} - 檔案名稱陣列
 */
const extractDailyFileNames = (dailyData) => {
    const fileNames = [];
    
    // 提取 MinIO 檔案名
    if (dailyData.fileName) {
        fileNames.push(dailyData.fileName);
    }
    
    return fileNames;
};

/**
 * 從提交資料中提取檔案名稱
 * @param {Object} submitData - 提交資料
 * @returns {Array} - 檔案名稱陣列
 */
const extractSubmitFileNames = (submitData) => {
    const fileNames = [];
    
    // 提取 MinIO 檔案名
    if (submitData.fileName) {
        fileNames.push(submitData.fileName);
    }
    
    return fileNames;
};

module.exports = {
    extractMinioFileName,
    extractMinioFileNames,
    batchDeleteMinioFiles,
    extractTaskFileNames,
    extractDailyFileNames,
    extractSubmitFileNames
}; 