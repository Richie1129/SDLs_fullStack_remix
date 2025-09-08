/**
 * 統一錯誤處理系統 - Linus 式簡潔設計
 * "好代碼沒有特殊情況" - 統一所有錯誤處理邏輯
 */

/**
 * 標準化的錯誤類別
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // 標記為可操作的錯誤（非程式 bug）
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 預定義的錯誤類型 - 消除特殊情況
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class NotFoundError extends AppError {
    constructor(resource = '資源') {
        super(`${resource}不存在`, 404, 'NOT_FOUND');
    }
}

class PermissionError extends AppError {
    constructor(message = '權限不足') {
        super(message, 403, 'PERMISSION_DENIED');
    }
}

class ConflictError extends AppError {
    constructor(message = '資源衝突') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * 控制器方法包裝器 - 統一錯誤捕獲
 * 這個函數消除了所有控制器中重複的 try-catch 邏輯
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Express 錯誤處理中間件
 */
function errorHandler(err, req, res, next) {
    // 日誌記錄
    console.error(`Error ${err.statusCode || 500}: ${err.message}`);
    if (!err.isOperational) {
        console.error('Stack trace:', err.stack);
    }

    // 處理 Sequelize 錯誤
    if (err.name === 'SequelizeValidationError') {
        const message = err.errors.map(e => e.message).join(', ');
        err = new ValidationError(message);
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        err = new ConflictError('資料重複');
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        err = new ValidationError('關聯資料不存在');
    }

    // 標準化回應格式
    const statusCode = err.statusCode || 500;
    const response = {
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || '伺服器內部錯誤'
        }
    };

    // 開發環境包含堆疊追蹤
    if (process.env.NODE_ENV === 'development' && err.stack) {
        response.error.stack = err.stack;
    }

    // 包含欄位資訊（用於表單驗證）
    if (err.field) {
        response.error.field = err.field;
    }

    res.status(statusCode).json(response);
}

/**
 * 成功回應標準化
 */
function successResponse(res, data = null, message = '操作成功', statusCode = 200) {
    const response = {
        success: true,
        message,
        data
    };

    res.status(statusCode).json(response);
}

/**
 * 分頁回應標準化
 */
function paginatedResponse(res, data, pagination, message = '查詢成功') {
    const response = {
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit)
        }
    };

    res.status(200).json(response);
}

module.exports = {
    // 錯誤類別
    AppError,
    ValidationError,
    NotFoundError,
    PermissionError,
    ConflictError,
    
    // 處理器
    asyncHandler,
    errorHandler,
    
    // 回應輔助
    successResponse,
    paginatedResponse
};