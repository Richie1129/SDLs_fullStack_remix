const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sequelize = require('./util/database');
const config = require('./config');

// Socket 管理器
const SocketManager = require('./sockets/socketManager');

// 中間件
const { httpLogger } = require('./middlewares/logging');
const { uploadToMinio } = require('./middlewares/minioUploadMiddleware');
const { logAudit, clampMetadataSize } = require('./services/auditService');

// Express 應用和 Socket.IO 設定
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: config.cors
});

// 初始化 Socket 管理器
const socketManager = new SocketManager(io);

// 基礎中間件設定
app.set('trust proxy', 1);
app.set('io', io);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(require('cors')(config.cors));
app.options('*', require('cors')());

// HTTP 日誌
try {
    app.use(httpLogger);
} catch (error) {
    console.warn('HTTP 日誌中間件初始化失敗:', error.message);
}

// 靜態檔案服務
app.use('/api/daily_file', express.static(path.join(__dirname, 'daily_file')));
console.log('Static file directory:', path.join(__dirname, 'daily_file'));

// 檔案上傳路由 - 使用 MinIO
app.post('/api/upload', uploadToMinio('files', 10), (req, res) => {
    console.log('MinIO uploaded files:', req.uploadedFiles);
    try {
        if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const files = req.uploadedFiles.map((file) => ({
            url: file.url,
            fileName: file.fileName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size
        }));

        // 記錄審計日誌
        logAudit(req, {
            action: 'FILE_UPLOAD',
            targetType: 'upload',
            targetId: (files.length === 1 ? files[0].fileName : undefined) || null,
            projectId: null,
            metadata: clampMetadataSize({ 
                files: files.map(f => ({ 
                    name: f.originalName || f.fileName, 
                    size: f.size, 
                    mimeType: f.mimeType 
                })) 
            })
        });

        res.status(200).json({ 
            message: '檔案上傳成功',
            files 
        });
    } catch (error) {
        console.error('檔案上傳失敗:', error);
        res.status(500).json({ message: '檔案上傳失敗', error: error.message });
    }
});

// RAGFlow 代理路由
const RAGFlowProxy = require('./routes/ragflowProxy');
app.use('/proxy/api/v1/chats', RAGFlowProxy);

// API 路由
app.use('/api/users', require('./routes/user'));
app.use('/api/projects', require('./routes/project'));
app.use('/api/kanbans', require('./routes/kanban'));
app.use('/api/ideaWall', require('./routes/ideaWall'));
app.use('/api/node', require('./routes/node'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/submit', require('./routes/submit'));
app.use('/api/stage', require('./routes/stage'));
app.use('/api/chatroom', require('./routes/chatroom'));
app.use('/api/question', require('./routes/question'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/rag_message', require('./routes/rag_message'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/llm', require('./routes/llm'));
app.use('/api/file', require('./routes/file'));
app.use('/api/audit', require('./routes/auditClient'));
app.use('/api/usage', require('./routes/usage'));
app.use('/api', require('./routes/projectComments'));
app.use('/api', require('./routes/comments'));
app.use('/api/auth', require('./routes/auth'));  // Refresh Token 路由
app.use('/api/auth', require('./routes/passwordReset'));

// 統一錯誤處理中間件 - Linus 式簡潔設計
const { errorHandler, NotFoundError } = require('./utils/errorHandler');

// 404 處理 - 在所有路由之後
app.use((req, res, next) => {
    next(new NotFoundError(`API endpoint ${req.method} ${req.originalUrl} not found`));
});

// 統一錯誤處理中間件 - 必須放在最後
app.use(errorHandler);

// 註冊 Sequelize 審計 hooks
try {
    const { registerAuditHooks } = require('./hooks/registerAuditHooks');
    registerAuditHooks();
} catch (e) {
    console.warn('Audit hooks registration failed:', e?.message);
}

// 啟動使用會話清理服務
let stopUsageCleanup;
try {
    const { startPeriodicCleanup } = require('./services/usageCleanupService');
    stopUsageCleanup = startPeriodicCleanup();
} catch (e) {
    console.warn('Usage cleanup service not started:', e?.message);
}

// 安裝優雅關閉處理器
try {
    const { installAuditShutdownHooks } = require('./services/auditService');
    installAuditShutdownHooks();
} catch (e) {
    console.warn('Audit shutdown hooks not installed:', e?.message);
}

// 啟動服務器
const PORT = config.server.port;
server.listen(PORT, () => {
    console.log(`✅ 伺服器已啟動，監聽端口 ${PORT}`);
    console.log(`🔗 Socket.IO 已初始化並準備連接`);
    console.log(`📂 所有路由已加載完成`);
    console.log(`🔧 配置模式: ${config.isDevelopment ? '開發' : '生產'}`);
    
    // 顯示 Socket 連接統計
    setInterval(() => {
        const stats = socketManager.getStats();
        if (stats.totalConnections > 0) {
            console.log(`📊 Socket 連接統計: ${stats.totalConnections} 總連接, ${stats.authenticatedUsers} 已認證用戶`);
        }
    }, 30000); // 每30秒顯示一次
});

console.log('Models loaded:', Object.keys(sequelize.models));

// 優雅關閉處理
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    
    // 停止使用會話清理服務
    if (stopUsageCleanup) {
        stopUsageCleanup();
    }
    
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C 處理

module.exports = { app, server, io, socketManager };