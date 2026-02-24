const pino = require('pino');

/**
 * 統一日誌系統配置 - Linus式簡潔設計
 * "Talk is cheap. Show me the code."
 * 
 * 設計原則：
 * 1. 生產環境不洩漏敏感資訊
 * 2. 結構化日誌便於追蹤和過濾
 * 3. 開發環境友善，生產環境高效
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// 敏感欄位列表（生產環境會被遮蔽）
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie'
];

// 遮蔽敏感資訊的序列化函式
function redact(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = { ...obj };
  fields.forEach(field => {
    if (field in redacted) {
      redacted[field] = '***REDACTED***';
    }
  });
  
  return redacted;
}

// Pino 配置
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // 開發環境使用美化輸出
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false
    }
  } : undefined,
  
  // 基礎配置
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version
      };
    }
  },
  
  // 生產環境序列化配置（遮蔽敏感資訊）
  serializers: {
    req: (req) => {
      if (isDevelopment) {
        return {
          method: req.method,
          url: req.url,
          headers: redact(req.headers, SENSITIVE_FIELDS),
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort
        };
      }
      // 生產環境只記錄必要資訊
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress
      };
    },
    res: (res) => {
      return {
        statusCode: res.statusCode
      };
    },
    err: pino.stdSerializers.err
  },
  
  // 基礎欄位
  base: {
    env: process.env.NODE_ENV || 'development'
  }
});

/**
 * 包裝的日誌函式 - 自動遮蔽敏感資訊
 */
const safeLogger = {
  debug: (obj, msg) => {
    if (typeof obj === 'object') {
      logger.debug(redact(obj, SENSITIVE_FIELDS), msg);
    } else {
      logger.debug(obj);
    }
  },
  
  info: (obj, msg) => {
    if (typeof obj === 'object') {
      logger.info(redact(obj, SENSITIVE_FIELDS), msg);
    } else {
      logger.info(obj);
    }
  },
  
  warn: (obj, msg) => {
    if (typeof obj === 'object') {
      logger.warn(redact(obj, SENSITIVE_FIELDS), msg);
    } else {
      logger.warn(obj);
    }
  },
  
  error: (obj, msg) => {
    if (typeof obj === 'object') {
      logger.error(redact(obj, SENSITIVE_FIELDS), msg);
    } else {
      logger.error(obj);
    }
  },
  
  fatal: (obj, msg) => {
    if (typeof obj === 'object') {
      logger.fatal(redact(obj, SENSITIVE_FIELDS), msg);
    } else {
      logger.fatal(obj);
    }
  },
  
  // 原始 logger (用於特殊情況)
  raw: logger
};

/**
 * 開發環境降級到 console (如果 pino-pretty 未安裝)
 */
if (isDevelopment && !logger.transport) {
  console.warn('⚠️  pino-pretty 未安裝，使用 console 輸出');
  
  const consoleLogger = {
    debug: (...args) => console.log('🔍 [DEBUG]', ...args),
    info: (...args) => console.log('ℹ️  [INFO]', ...args),
    warn: (...args) => console.warn('⚠️  [WARN]', ...args),
    error: (...args) => console.error('❌ [ERROR]', ...args),
    fatal: (...args) => console.error('💀 [FATAL]', ...args)
  };
  
  // 在物件建立後才加入 raw 屬性，避免循環引用
  consoleLogger.raw = consoleLogger;
  
  module.exports = consoleLogger;
} else {
  module.exports = safeLogger;
}

/**
 * 使用範例：
 * 
 * const logger = require('./config/logger');
 * 
 * // 基礎日誌
 * logger.info('Server started');
 * logger.debug('Database connection established');
 * 
 * // 結構化日誌
 * logger.info({ userId: 123, action: 'login' }, 'User logged in');
 * 
 * // 錯誤日誌
 * logger.error({ err, userId: 123 }, 'Failed to process request');
 * 
 * // 敏感資訊會自動遮蔽
 * logger.info({ email: 'user@example.com', password: '123456' }, 'Login attempt');
 * // 輸出: { email: 'user@example.com', password: '***REDACTED***' }
 */
