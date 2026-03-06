require('dotenv').config();

/**
 * 配置管理 - 統一管理所有環境變數
 * 避免硬編碼並提供預設值
 */
class Config {
    constructor() {
        this.validateRequiredEnvVars();
    }

    // 資料庫配置
    get database() {
        return {
            host: process.env.PG_HOST || 'localhost',
            port: parseInt(process.env.PG_PORT) || 5432,
            database: process.env.PG_NAME || 'postgres',
            username: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD || 'postgres',
            dialect: 'postgres'
        };
    }

    // JWT 配置
    get jwt() {
        // expiresIn：支援純數字秒數（'3600'）或 jsonwebtoken 時間字串（'24h', '7d'）
        // refreshExpiresIn：僅支援數字秒數（用於資料庫日期計算）
        const parseExpiresIn = (val, defaultVal) => {
            if (!val) return defaultVal;
            const num = Number(val);
            if (!isNaN(num)) return num;  // 純數字字串 → 秒數
            return val;  // '24h', '7d' 等交給 jsonwebtoken 解析
        };
        return {
            secret: process.env.JWT_SECRET || this.getDefaultJwtSecret(),
            expiresIn: parseExpiresIn(process.env.JWT_EXPIRES_IN, 86400),            // 預設 24h
            refreshExpiresIn: parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, 604800)  // 預設 7d（秒數）
        };
    }

    // API Keys
    get apiKeys() {
        return {
            ragflow: process.env.RAGFLOW_API_KEY,
            gemini: process.env.GEMINI_API_KEY,
            gemini2: process.env.GEMINI_API_KEY_2
        };
    }

    // 服務配置
    get server() {
        return {
            port: parseInt(process.env.API_PORT) || 3000,
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
        };
    }

    // RAGFlow 配置
    get ragflow() {
        return {
            baseUrl: process.env.RAGFLOW_BASE_URL || 'https://ragflow.lazyinwork.com/',
            apiKey: process.env.RAGFLOW_API_KEY
        };
    }

    // SSL 配置
    get ssl() {
        return {
            verify: process.env.SSL_VERIFY !== 'false'
        };
    }

    // MinIO 配置
    get minio() {
        return {
            endpoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT) || 9000,
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
            bucketName: process.env.MINIO_BUCKET_NAME || 'sdls-files',
            useSSL: process.env.MINIO_USE_SSL === 'true'
        };
    }

    // CORS 配置
    get cors() {
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'];
        
        return {
            origin: allowedOrigins,
            methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
            credentials: true
        };
    }

    /**
     * 生成預設的 JWT 密鑰（開發環境用）
     */
    getDefaultJwtSecret() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production environment');
        }
        return 'dev-secret-key-change-in-production';
    }

    /**
     * 驗證必要的環境變數
     */
    validateRequiredEnvVars() {
        const required = [];
        
        if (process.env.NODE_ENV === 'production') {
            required.push(
                'JWT_SECRET',
                'RAGFLOW_API_KEY'
            );
        }

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * 檢查是否為開發環境
     */
    get isDevelopment() {
        return process.env.NODE_ENV !== 'production';
    }

    /**
     * 檢查是否為生產環境
     */
    get isProduction() {
        return process.env.NODE_ENV === 'production';
    }
}

module.exports = new Config();