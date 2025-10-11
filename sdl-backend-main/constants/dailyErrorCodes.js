/**
 * 個人反思日誌錯誤碼定義
 * 統一前後端的錯誤訊息系統
 *
 * 使用方式：
 * 後端：return res.status(400).json({ success: false, errorCode: 'EMPTY_TITLE', message: DAILY_ERROR_CODES.EMPTY_TITLE.en });
 * 前端：errorNotify(DAILY_ERROR_CODES[error.response.data.errorCode]?.zh || error.response.data.message);
 */

const DAILY_ERROR_CODES = {
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

// 輔助函數：根據錯誤碼生成標準回應
const createErrorResponse = (errorCode, customMessage = null) => {
  const error = DAILY_ERROR_CODES[errorCode] || DAILY_ERROR_CODES.UNKNOWN_ERROR;
  return {
    success: false,
    errorCode: error.code,
    message: customMessage || error.en,
    messageZh: error.zh
  };
};

// 輔助函數：根據錯誤碼獲取 HTTP 狀態碼
const getHttpStatusByErrorCode = (errorCode) => {
  const statusMap = {
    // 400 錯誤
    EMPTY_TITLE: 400,
    EMPTY_CONTENT: 400,
    EMPTY_TITLE_AND_CONTENT: 400,
    INVALID_5RS_FORMAT: 400,
    NO_DAILY_SELECTED: 400,
    INVALID_5RS_CONTENT: 400,
    INSUFFICIENT_5RS_STEPS: 400,
    FILE_TOO_LARGE: 400,
    TOO_MANY_FILES: 400,
    INVALID_FILE_TYPE: 400,

    // 401 錯誤
    TOKEN_EXPIRED: 401,
    UNAUTHORIZED: 401,
    INVALID_TOKEN: 401,

    // 403 錯誤
    INSUFFICIENT_PERMISSIONS: 403,
    WRITE_PERMISSION_DENIED: 403,
    VIEWER_CANNOT_EDIT: 403,
    TEACHER_CANNOT_EDIT_STUDENT_LOG: 403,
    CANNOT_EDIT_OTHERS_LOG: 403,

    // 404 錯誤
    PROJECT_NOT_FOUND: 404,
    DAILY_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,

    // 500 錯誤
    CREATE_FAILED: 500,
    UPDATE_FAILED: 500,
    DELETE_FAILED: 500,
    DELETE_ATTACHMENT_FAILED: 500,
    DATABASE_ERROR: 500,
    QUERY_FAILED: 500,
    AI_ANALYSIS_FAILED: 500,
    AI_SAVE_FAILED: 500,
    AI_SERVICE_ERROR: 500,
    MINIO_UPLOAD_FAILED: 500,
    MINIO_CONNECTION_FAILED: 500,
    MINIO_DELETE_FAILED: 500,
    PERMISSION_CHECK_ERROR: 500,
    UNKNOWN_ERROR: 500
  };

  return statusMap[errorCode] || 500;
};

module.exports = {
  DAILY_ERROR_CODES,
  createErrorResponse,
  getHttpStatusByErrorCode
};
