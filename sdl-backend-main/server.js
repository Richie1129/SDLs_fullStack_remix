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
const { validateToken } = require('./middlewares/AuthMiddleware');

// 安全套件
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 監控系統 - Phase 2 監控基礎設施
const PerformanceMonitor = require('./middlewares/performanceMonitor');
const MemoryMonitor = require('./utils/memoryMonitor');

// Express 應用和 Socket.IO 設定
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: config.cors
});

// 初始化 Socket 管理器
const socketManager = new SocketManager(io);

// Phase 3: 注入 Socket.io 到 Orchestrator
try {
    const { setSocketIO } = require('./services/orchestrator');
    setSocketIO(io);
} catch (error) {
    console.warn('Orchestrator Socket.io 注入失敗 (非關鍵):', error.message);
}

// 基礎中間件設定
app.set('trust proxy', 1);
app.set('io', io);

// 安全 HTTP Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允許跨域圖片載入
}));

// Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 分鐘
    max: 10,                    // 最多 10 次嘗試
    message: { message: '登入嘗試次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
});
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 小時
    max: 5,
    message: { message: '密碼重設請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
});
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 分鐘
    max: 30,
    message: { message: 'AI 請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/users/login', loginLimiter);
app.use('/api/auth/forgot-password', resetLimiter);
app.use('/api/auth/reset-password', resetLimiter);
app.use('/api/llm', aiLimiter);
app.use('/proxy/api/v1/chats', aiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(require('cors')(config.cors));
app.options('*', require('cors')(config.cors)); // 修復：預檢請求也使用相同CORS配置

// Linus: 消除前端錯誤回報的 404 噪音
app.post('/api/errors', (req, res) => {
    // 靜默接收前端錯誤，未來可以接上日誌系統
    res.status(200).json({ status: 'ok' });
});

// HTTP 日誌
try {
    app.use(httpLogger);
} catch (error) {
    console.warn('HTTP 日誌中間件初始化失敗:', error.message);
}

// ============================================================================
// 監控系統初始化 - Linus 式實用主義
// ============================================================================
// 為什麼需要監控？
// - 找出真實問題，不是假想問題
// - "You can't fix what you can't measure"
// - Phase 1 修復了已知問題，Phase 2 找出未知問題
//
// 零破壞性保證：
// - Performance Monitor: 使用 res.on('finish')，不阻塞請求
// - Memory Monitor: 背景執行，定期檢查
// - 只在異常時輸出警告（慢查詢、高記憶體、洩漏趨勢）
// ============================================================================

let performanceMonitor = null;
let memoryMonitor = null;

try {
    // 初始化 API 效能監控
    performanceMonitor = new PerformanceMonitor({
        slowThreshold: 1000,      // 警告 > 1000ms 的 API
        maxSlowRequests: 100      // 保留最近 100 個慢請求
    });

    // 註冊 Performance Monitor middleware
    // 必須在所有業務路由之前註冊，才能追蹤所有 API
    app.use(performanceMonitor.middleware());

    // 儲存到 app，供 metrics API 使用
    app.set('performanceMonitor', performanceMonitor);

    console.log('✅ Performance Monitor initialized');
} catch (error) {
    console.error('❌ Performance Monitor initialization failed:', error.message);
}

try {
    // 初始化記憶體監控
    memoryMonitor = new MemoryMonitor({
        thresholdMB: 500,         // 警告 > 500MB
        checkInterval: 60000,     // 每分鐘檢查
        maxHistorySize: 60        // 保留 1 小時歷史
    });

    // 啟動記憶體監控（背景執行）
    memoryMonitor.start();

    // 儲存到 app，供 metrics API 和 gracefulShutdown 使用
    app.set('memoryMonitor', memoryMonitor);

    console.log('✅ Memory Monitor started');
} catch (error) {
    console.error('❌ Memory Monitor initialization failed:', error.message);
}

// 靜態檔案服務
app.use('/api/daily_file', express.static(path.join(__dirname, 'daily_file')));
console.log('Static file directory:', path.join(__dirname, 'daily_file'));

// 檔案上傳路由 - 使用 MinIO（需要認證）
app.post('/api/upload', validateToken, uploadToMinio('files', 10), (req, res) => {
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
app.use('/api/kb-coach', require('./routes/kbCoach')); // KB Coach - Phase 1
app.use('/api/ai-task-assistant', require('./routes/aiTaskAssistant')); // AI Task Assistant
app.use('/api/teacher/help-seeking', require('./routes/teacherHelpSeeking')); // Teacher Help-Seeking Dashboard
app.use('/api/file', require('./routes/file'));
app.use('/api/audit', require('./routes/auditClient'));
app.use('/api/usage', require('./routes/usage'));
app.use('/api', require('./routes/projectComments'));
app.use('/api', require('./routes/comments'));
app.use('/api/auth', require('./routes/auth'));  // Refresh Token 路由
app.use('/api/auth', require('./routes/passwordReset'));

// 監控儀表板 API - 查看系統效能和記憶體數據
// Development: 直接訪問 http://localhost:3000/api/metrics
// Production: 需要 X-Metrics-Token header
app.use('/api', require('./routes/metrics'));

// 學習歷程匯出 API
app.use('/api', require('./routes/export'));

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

// Socket 統計 timer ID - 用於清理
let statsIntervalId = null;

server.listen(PORT, () => {
    console.log(`✅ 伺服器已啟動，監聽端口 ${PORT}`);
    console.log(`🔗 Socket.IO 已初始化並準備連接`);
    console.log(`📂 所有路由已加載完成`);
    console.log(`🔧 配置模式: ${config.isDevelopment ? '開發' : '生產'}`);

    // Phase 6: 啟動審計事件自動清理排程
    try {
        const { startPurgeSchedule } = require('./services/auditPurgeService');
        startPurgeSchedule();
        console.log('🧹 審計事件自動清理排程已啟動');
    } catch (err) {
        console.warn('⚠️ 審計清理排程啟動失敗 (非關鍵):', err.message);
    }

    // Help-Seeking 分析排程任務
    try {
        const { startHelpSeekingScheduledTasks } = require('./services/helpSeekingScheduler');
        startHelpSeekingScheduledTasks();
        console.log('🔍 Help-Seeking 分析排程任務已啟動');
    } catch (err) {
        console.warn('⚠️ Help-Seeking 排程啟動失敗 (非關鍵):', err.message);
    }

    // 顯示 Socket 連接統計
    statsIntervalId = setInterval(() => {
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

    // 清理 Socket 統計 timer
    if (statsIntervalId) {
        clearInterval(statsIntervalId);
        statsIntervalId = null;
        console.log('Socket 統計 timer 已清理');
    }

    // 停止監控系統（Phase 2）
    // 關鍵：防止記憶體洩漏，像 Phase 1 修的 timer 洩漏
    if (memoryMonitor) {
        memoryMonitor.stop();
        console.log('💾 Memory Monitor stopped');
    }

    // Performance Monitor 不需要清理（無背景任務）
    // 但可以輸出最終統計
    if (performanceMonitor) {
        const metrics = performanceMonitor.getMetrics();
        console.log(`📊 Final stats: ${metrics.totalRequests} total requests`);
    }

    // 停止使用會話清理服務
    if (stopUsageCleanup) {
        stopUsageCleanup();
    }

    // Phase 6: 停止審計清理排程
    try {
        const { stopPurgeSchedule } = require('./services/auditPurgeService');
        stopPurgeSchedule();
    } catch (_) {}

    // 清理所有 Socket 連線
    if (io) {
        io.close(() => {
            console.log('Socket.IO server closed');
        });
    }

    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C 處理

module.exports = { app, server, io, socketManager };