/**
 * 個人反思日誌錯誤碼定義（前端）
 * 與後端保持同步：sdl-backend-main/constants/dailyErrorCodes.js
 *
 * 使用方式：
 * import { getErrorMessage } from '@/constants/dailyErrorCodes';
 * errorNotify(getErrorMessage(error.response?.data?.errorCode, error.response?.data?.message));
 */

export const DAILY_ERROR_CODES = {
  // 前端驗證錯誤 (400)
  EMPTY_TITLE: {
    code: 'EMPTY_TITLE',
    en: 'Title is required',
    zh: '請輸入標題'
  },
  EMPTY_CONTENT: {
    code: 'EMPTY_CONTENT',
    en: 'Content is required',
    zh: '請輸入內容'
  },
  EMPTY_TITLE_AND_CONTENT: {
    code: 'EMPTY_TITLE_AND_CONTENT',
    en: 'Both title and content are required',
    zh: '標題及內容請填寫完整'
  },
  INVALID_5RS_FORMAT: {
    code: 'INVALID_5RS_FORMAT',
    en: '5Rs reflection data validation failed',
    zh: '5Rs 反思格式驗證失敗'
  },
  NO_DAILY_SELECTED: {
    code: 'NO_DAILY_SELECTED',
    en: 'No daily log selected for editing',
    zh: '未選擇日誌'
  },
  INVALID_5RS_CONTENT: {
    code: 'INVALID_5RS_CONTENT',
    en: 'Unable to parse 5Rs reflection content',
    zh: '無法解析 5Rs 反思內容'
  },
  INSUFFICIENT_5RS_STEPS: {
    code: 'INSUFFICIENT_5RS_STEPS',
    en: 'At least 3 sections must be completed for AI analysis',
    zh: '請至少完成 3 個部分再請求 AI 分析'
  },

  // 檔案上傳錯誤 (400)
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    en: 'File size exceeds 100MB limit',
    zh: '檔案大小超過 100MB 限制'
  },
  TOO_MANY_FILES: {
    code: 'TOO_MANY_FILES',
    en: 'Maximum 10 files allowed',
    zh: '最多只能上傳 10 個檔案'
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    en: 'File type not supported',
    zh: '不支援的檔案格式'
  },
  MINIO_UPLOAD_FAILED: {
    code: 'MINIO_UPLOAD_FAILED',
    en: 'File upload failed',
    zh: '檔案上傳失敗'
  },

  // Token 驗證錯誤 (401)
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    en: 'Token expired, please login again',
    zh: 'Token 過期，請重新登入'
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    en: 'Unauthorized user',
    zh: '未認證用戶，請先登入'
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    en: 'Invalid authentication token',
    zh: '無效的認證 Token'
  },

  // 權限錯誤 (403)
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    en: 'No permission to access this project',
    zh: '無權限訪問此專案'
  },
  WRITE_PERMISSION_DENIED: {
    code: 'WRITE_PERMISSION_DENIED',
    en: 'No permission to perform this operation',
    zh: '沒有權限進行此操作'
  },
  VIEWER_CANNOT_EDIT: {
    code: 'VIEWER_CANNOT_EDIT',
    en: 'Cross-class viewers cannot edit logs',
    zh: '跨班觀摩者無法編輯日誌'
  },
  TEACHER_CANNOT_EDIT_STUDENT_LOG: {
    code: 'TEACHER_CANNOT_EDIT_STUDENT_LOG',
    en: 'Teachers can only view student logs',
    zh: '指導教師僅能查看學生日誌'
  },
  CANNOT_EDIT_OTHERS_LOG: {
    code: 'CANNOT_EDIT_OTHERS_LOG',
    en: 'Cannot edit other students\' personal logs',
    zh: '無法編輯其他學生的個人日誌'
  },

  // 資源不存在錯誤 (404)
  PROJECT_NOT_FOUND: {
    code: 'PROJECT_NOT_FOUND',
    en: 'Project not found',
    zh: '專案不存在'
  },
  DAILY_NOT_FOUND: {
    code: 'DAILY_NOT_FOUND',
    en: 'Daily log not found',
    zh: '日誌未找到'
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    en: 'User not found',
    zh: '用戶不存在'
  },

  // 資料庫錯誤 (500)
  CREATE_FAILED: {
    code: 'CREATE_FAILED',
    en: 'Failed to create daily log',
    zh: '創建日誌失敗'
  },
  UPDATE_FAILED: {
    code: 'UPDATE_FAILED',
    en: 'Failed to update daily log',
    zh: '更新日誌失敗'
  },
  DELETE_FAILED: {
    code: 'DELETE_FAILED',
    en: 'Failed to delete daily log',
    zh: '刪除日誌失敗'
  },
  DELETE_ATTACHMENT_FAILED: {
    code: 'DELETE_ATTACHMENT_FAILED',
    en: 'Failed to delete attachment',
    zh: '刪除附件失敗'
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    en: 'Database operation failed',
    zh: '資料庫操作失敗'
  },
  QUERY_FAILED: {
    code: 'QUERY_FAILED',
    en: 'Failed to fetch daily logs',
    zh: '獲取日誌失敗'
  },

  // AI 分析錯誤 (500)
  AI_ANALYSIS_FAILED: {
    code: 'AI_ANALYSIS_FAILED',
    en: 'AI analysis failed',
    zh: 'AI 分析失敗'
  },
  AI_SAVE_FAILED: {
    code: 'AI_SAVE_FAILED',
    en: 'Failed to save AI analysis result',
    zh: '儲存 AI 分析結果失敗'
  },
  AI_SERVICE_ERROR: {
    code: 'AI_SERVICE_ERROR',
    en: 'AI analysis service error',
    zh: 'AI 分析過程中發生錯誤'
  },

  // MinIO 檔案錯誤 (500)
  MINIO_CONNECTION_FAILED: {
    code: 'MINIO_CONNECTION_FAILED',
    en: 'File storage service unavailable',
    zh: '檔案儲存服務不可用'
  },
  MINIO_DELETE_FAILED: {
    code: 'MINIO_DELETE_FAILED',
    en: 'Failed to delete file from storage',
    zh: '從儲存服務刪除檔案失敗'
  },

  // 網路錯誤 (前端處理)
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    en: 'Network connection error',
    zh: '網路連接失敗'
  },
  REQUEST_TIMEOUT: {
    code: 'REQUEST_TIMEOUT',
    en: 'Request timeout',
    zh: '請求超時'
  },

  // 通用錯誤
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    en: 'Unknown error occurred',
    zh: '發生未知錯誤'
  },
  PERMISSION_CHECK_ERROR: {
    code: 'PERMISSION_CHECK_ERROR',
    en: 'Error during permission check',
    zh: '權限檢查時發生錯誤'
  }
};

/**
 * 根據錯誤碼獲取中文錯誤訊息
 * @param {string} errorCode - 錯誤碼
 * @param {string} fallbackMessage - 後備訊息（通常是後端返回的英文訊息）
 * @returns {string} 中文錯誤訊息
 */
export const getErrorMessage = (errorCode, fallbackMessage = null) => {
  // 優先使用錯誤碼對照表
  if (errorCode && DAILY_ERROR_CODES[errorCode]) {
    return DAILY_ERROR_CODES[errorCode].zh;
  }

  // 如果有 fallbackMessage，檢查是否是已知的英文訊息
  if (fallbackMessage) {
    // 尋找對應的錯誤碼
    const errorEntry = Object.values(DAILY_ERROR_CODES).find(
      entry => entry.en === fallbackMessage
    );
    if (errorEntry) {
      return errorEntry.zh;
    }

    // 如果找不到對應，直接返回 fallbackMessage
    return fallbackMessage;
  }

  // 完全沒有資訊時，返回通用錯誤訊息
  return DAILY_ERROR_CODES.UNKNOWN_ERROR.zh;
};

/**
 * 根據錯誤碼獲取英文錯誤訊息
 * @param {string} errorCode - 錯誤碼
 * @returns {string} 英文錯誤訊息
 */
export const getErrorMessageEn = (errorCode) => {
  if (errorCode && DAILY_ERROR_CODES[errorCode]) {
    return DAILY_ERROR_CODES[errorCode].en;
  }
  return DAILY_ERROR_CODES.UNKNOWN_ERROR.en;
};

/**
 * 從 axios 錯誤中提取並格式化錯誤訊息
 * @param {Error} error - axios 錯誤對象
 * @returns {string} 格式化的中文錯誤訊息
 */
export const extractErrorMessage = (error) => {
  console.log('=== 錯誤訊息提取 ===');
  console.log('錯誤對象:', error);
  console.log('錯誤回應:', error.response);
  console.log('錯誤資料:', error.response?.data);

  // 檢查是否有後端返回的標準格式
  if (error.response?.data) {
    const { errorCode, message, messageZh } = error.response.data;

    console.log('errorCode:', errorCode);
    console.log('message (en):', message);
    console.log('messageZh:', messageZh);

    // 優先使用後端返回的中文訊息
    if (messageZh) {
      return messageZh;
    }

    // 其次使用錯誤碼對照表
    if (errorCode) {
      return getErrorMessage(errorCode, message);
    }

    // 最後使用後端返回的英文訊息
    if (message) {
      return getErrorMessage(null, message);
    }
  }

  // 處理網路錯誤
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return DAILY_ERROR_CODES.REQUEST_TIMEOUT.zh;
    }
    return DAILY_ERROR_CODES.NETWORK_ERROR.zh;
  }

  // 完全沒有資訊時返回通用錯誤
  return DAILY_ERROR_CODES.UNKNOWN_ERROR.zh;
};

/**
 * 將舊的錯誤訊息映射到新的錯誤碼（向後相容）
 * @param {string} oldMessage - 舊的錯誤訊息
 * @returns {string} 對應的中文錯誤訊息
 */
export const mapLegacyErrorMessage = (oldMessage) => {
  const legacyMapping = {
    'please enter title!': DAILY_ERROR_CODES.EMPTY_TITLE.zh,
    'please fill in the form!': DAILY_ERROR_CODES.EMPTY_CONTENT.zh,
    '標題及內容請填寫完整!': DAILY_ERROR_CODES.EMPTY_TITLE_AND_CONTENT.zh,
    '未選擇日誌': DAILY_ERROR_CODES.NO_DAILY_SELECTED.zh,
    '更新失敗': DAILY_ERROR_CODES.UPDATE_FAILED.zh,
    '小組日誌更新失敗': DAILY_ERROR_CODES.UPDATE_FAILED.zh,
    'create failed!': DAILY_ERROR_CODES.CREATE_FAILED.zh,
    '無法解析 5Rs 反思內容': DAILY_ERROR_CODES.INVALID_5RS_CONTENT.zh,
    '請至少完成 3 個部分再請求 AI 分析': DAILY_ERROR_CODES.INSUFFICIENT_5RS_STEPS.zh,
    'AI 分析失敗': DAILY_ERROR_CODES.AI_ANALYSIS_FAILED.zh,
    '儲存 AI 分析結果失敗': DAILY_ERROR_CODES.AI_SAVE_FAILED.zh,
    'AI 分析過程中發生錯誤': DAILY_ERROR_CODES.AI_SERVICE_ERROR.zh,
    '刪除個人日誌失敗': DAILY_ERROR_CODES.DELETE_FAILED.zh,
    '刪除小組日誌失敗': DAILY_ERROR_CODES.DELETE_FAILED.zh,
    '刪除附件失敗': DAILY_ERROR_CODES.DELETE_ATTACHMENT_FAILED.zh
  };

  return legacyMapping[oldMessage] || oldMessage;
};

// 匯出預設對照表
export default DAILY_ERROR_CODES;
