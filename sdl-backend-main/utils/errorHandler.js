/**
 * 統一錯誤處理系統 - Linus 式簡潔設計
 * "好代碼沒有特殊情況" - 統一所有錯誤處理邏輯
 */

const fs = require('fs');
const path = require('path');

// 預先建立 logs 目錄（只執行一次，避免每次 request 都 mkdirSync）
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs', 'errors');
try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch {}

// 請求 body 中需要遮蔽的敏感欄位
const SENSITIVE_FIELDS = ['password', 'newPassword', 'oldPassword', 'token', 'secret', 'refreshToken'];

function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    const cleaned = { ...body };
    SENSITIVE_FIELDS.forEach(field => {
        if (field in cleaned) cleaned[field] = '***';
    });
    return cleaned;
}

// 登入路由：401 需要記錄（帳號密碼錯誤，方便排查學生問題）
const LOGIN_ROUTES = ['/api/users/login'];

function writeErrorReport(err, req, statusCode) {
    try {
        // 忽略：401，但登入路由例外（帳號密碼錯誤仍要排查）
        if (statusCode === 401 && !LOGIN_ROUTES.includes(req.originalUrl)) return;
        // 忽略：非 /api/ 路徑（靜態檔案 404 等噪音）
        if (!req.originalUrl.startsWith('/api/')) return;

        const now = new Date();
        const date = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }); // YYYY-MM-DD
        const time = now.toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' });
        const filePath = path.join(LOGS_DIR, `${date}.md`);

        const user = req.user
            ? `${req.user.username || '未知'} / ${req.user.email || '無 email'} (ID: ${req.user.id})`
            : '未登入';

        const body = sanitizeBody(req.body);
        const hasBody = body && Object.keys(body).length > 0;

        const lines = [
            `## ${time} — ${req.method} ${req.originalUrl} \`${statusCode}\``,
            '',
            `- **使用者:** ${user}`,
            `- **錯誤代碼:** \`${err.code || 'INTERNAL_ERROR'}\``,
            `- **錯誤訊息:** ${err.message}`,
        ];

        if (hasBody) {
            lines.push(`- **請求內容:**`);
            lines.push('  ```json');
            lines.push('  ' + JSON.stringify(body, null, 2).replace(/\n/g, '\n  '));
            lines.push('  ```');
        }

        if (err.stack && !err.isOperational) {
            lines.push('- **堆疊追蹤:**');
            lines.push('  ```');
            lines.push('  ' + err.stack.replace(/\n/g, '\n  '));
            lines.push('  ```');
        }

        lines.push('', '---', '');

        // 非阻塞寫入，不阻塞 event loop
        fs.appendFile(filePath, lines.join('\n'), (writeErr) => {
            if (writeErr) console.error('[ErrorReport] 寫入失敗:', writeErr.message);
        });
    } catch (buildErr) {
        console.error('[ErrorReport] 建構失敗:', buildErr.message);
    }
}

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

    // 寫入 MD 錯誤報告（設 flag 防止 errorInterceptor 雙重寫入）
    res.__errorReported = true;
    writeErrorReport(err, req, statusCode);

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

/**
 * 全域錯誤攔截中間件
 * 攔截 res.json()，當 status >= 400 時自動寫入 logs/errors/
 * 不需要修改任何 controller，一個 middleware 覆蓋全部
 */
function errorInterceptor(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
        // 只在 4xx/5xx 時記錄，且 errorHandler 還沒處理過（防止雙重寫入）
        if (res.statusCode >= 400 && !res.__errorReported) {
            res.__errorReported = true;
            const err = {
                message: body?.error?.message || body?.message || body?.error || '未知錯誤',
                code: body?.error?.code || body?.code || (res.statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
                isOperational: true
            };
            writeErrorReport(err, req, res.statusCode);
        }
        return originalJson(body);
    };

    next();
}

/**
 * Socket 錯誤記錄（給 socket handler 使用）
 * Socket 不走 Express middleware，需要獨立的 log 函式
 */
function writeSocketErrorReport(error, eventName, socketUser) {
    try {
        const now = new Date();
        const date = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
        const time = now.toLocaleTimeString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' });
        const filePath = path.join(LOGS_DIR, `${date}.md`);

        const user = socketUser
            ? `${socketUser.username || '未知'} (ID: ${socketUser.id})`
            : '未知使用者';

        const lines = [
            `## ${time} — [Socket] ${eventName} \`ERROR\``,
            '',
            `- **使用者:** ${user}`,
            `- **錯誤代碼:** \`SOCKET_ERROR\``,
            `- **錯誤訊息:** ${error.message || String(error)}`,
        ];

        if (error.stack) {
            lines.push('- **堆疊追蹤:**');
            lines.push('  ```');
            lines.push('  ' + error.stack.replace(/\n/g, '\n  '));
            lines.push('  ```');
        }

        lines.push('', '---', '');

        // 非阻塞寫入
        fs.appendFile(filePath, lines.join('\n'), (writeErr) => {
            if (writeErr) console.error('[SocketErrorReport] 寫入失敗:', writeErr.message);
        });
    } catch (buildErr) {
        console.error('[SocketErrorReport] 建構失敗:', buildErr.message);
    }
}

module.exports = {
    // 錯誤報告
    writeErrorReport,
    writeSocketErrorReport,

    // 全域攔截
    errorInterceptor,

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