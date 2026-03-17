/**
 * Metrics Dashboard API - 監控數據查詢接口
 *
 * 端點：GET /api/metrics
 *
 * 功能：
 * 1. 返回所有監控數據（API效能、記憶體、系統資訊）
 * 2. 提供權限保護（production需要token）
 * 3. 結構化 JSON 格式，易於解析
 *
 * 安全性：
 * - Development: 完全開放
 * - Production: 需要 X-Metrics-Token header
 *
 * 使用方式：
 * ```bash
 * # Development (透過 Nginx)
 * curl http://localhost/api/metrics
 *
 * # Production
 * curl -H "X-Metrics-Token: your-secret-token" \
 *      https://your-domain.com/api/metrics
 * ```
 *
 * 零破壞性：
 * - 新增 endpoint，不影響現有 API
 * - 只讀操作，不修改任何數據
 * - 有權限保護，production 安全
 */

const express = require('express');
const router = express.Router();

/**
 * 權限驗證中間件
 *
 * 邏輯：
 * - Development mode：無需驗證（isDev = true）
 * - Production mode：需要正確的 X-Metrics-Token
 *
 * Token 設定：
 * export METRICS_TOKEN=your-random-secret-token
 *
 * 為什麼用 header 而不是 query？
 * - Header 不會被記錄在 access log
 * - Header 不會在瀏覽器歷史中保留
 * - 更安全
 */
const authMetrics = (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const metricsToken = process.env.METRICS_TOKEN;
  const providedToken = req.headers['x-metrics-token'];

  // Development: 直接通過
  if (isDev) {
    return next();
  }

  // Production: 檢查 token
  if (!metricsToken) {
    // 未設定 METRICS_TOKEN = 不允許訪問（安全預設）
    return res.status(500).json({
      error: 'Metrics token not configured',
      message: 'Set METRICS_TOKEN environment variable'
    });
  }

  if (providedToken !== metricsToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing X-Metrics-Token header'
    });
  }

  next();
};

/**
 * GET /api/metrics
 *
 * 返回完整的監控數據
 *
 * Response 結構：
 * {
 *   timestamp: 當前時間,
 *   uptime: 運行時間,
 *   performance: {
 *     totalRequests: 總請求數,
 *     slowRequests: 慢請求列表,
 *     apiStats: API 統計
 *   },
 *   memory: {
 *     current: 當前記憶體,
 *     history: 歷史記錄,
 *     trend: 趨勢
 *   },
 *   environment: {
 *     nodeVersion: Node.js 版本,
 *     platform: 平台,
 *     pid: 進程 ID
 *   }
 * }
 */
router.get('/metrics', authMetrics, (req, res) => {
  try {
    // 從 app 中取得監控實例
    const performanceMonitor = req.app.get('performanceMonitor');
    const memoryMonitor = req.app.get('memoryMonitor');

    // 檢查監控是否已初始化
    if (!performanceMonitor || !memoryMonitor) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Monitoring services not initialized'
      });
    }

    // 組裝數據
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),

      // API 效能數據
      performance: performanceMonitor.getMetrics(),

      // 記憶體數據
      memory: memoryMonitor.getMetrics(),

      // 系統環境資訊
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        nodeEnv: process.env.NODE_ENV || 'development'
      },

      // 元資訊
      meta: {
        monitoringVersion: '1.0.0',
        generatedAt: new Date().toISOString()
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/metrics/performance
 *
 * 只返回 API 效能數據（較小的 payload）
 */
router.get('/metrics/performance', authMetrics, (req, res) => {
  try {
    const performanceMonitor = req.app.get('performanceMonitor');

    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitor not initialized'
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      performance: performanceMonitor.getMetrics()
    });
  } catch (error) {
    console.error('Error generating performance metrics:', error);
    res.status(500).json({
      error: 'Failed to generate performance metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/metrics/memory
 *
 * 只返回記憶體數據（較小的 payload）
 */
router.get('/metrics/memory', authMetrics, (req, res) => {
  try {
    const memoryMonitor = req.app.get('memoryMonitor');

    if (!memoryMonitor) {
      return res.status(503).json({
        error: 'Memory monitor not initialized'
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      memory: memoryMonitor.getMetrics()
    });
  } catch (error) {
    console.error('Error generating memory metrics:', error);
    res.status(500).json({
      error: 'Failed to generate memory metrics',
      details: error.message
    });
  }
});

/**
 * POST /api/metrics/reset
 *
 * 重置效能統計（用於測試或定期重置）
 *
 * 安全性：
 * - 需要相同的權限驗證
 * - 只重置統計，不影響服務
 */
router.post('/metrics/reset', authMetrics, (req, res) => {
  try {
    const performanceMonitor = req.app.get('performanceMonitor');

    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitor not initialized'
      });
    }

    performanceMonitor.reset();

    res.json({
      success: true,
      message: 'Performance metrics reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      error: 'Failed to reset metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/metrics/heapsnapshot
 *
 * 拍攝 V8 Heap Snapshot（僅限開發環境）
 * 輸出的 .heapsnapshot 可用 Chrome DevTools Memory 分析記憶體洩漏
 *
 * 注意：此操作會短暫暫停 Node.js（Stop-the-World GC）
 * 僅在開發環境可用，生產環境會拒絕請求
 */
router.post('/metrics/heapsnapshot', authMetrics, (req, res) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (!isDev) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Heap snapshot is only available in development mode',
    });
  }

  try {
    const v8 = require('v8');
    const path = require('path');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = path.join('/tmp', `sdl-heap-${timestamp}.heapsnapshot`);

    console.warn('[Metrics] 開始拍攝 Heap Snapshot（服務將短暫停頓）...');
    const snapshotPath = v8.writeHeapSnapshot(filename);
    console.warn(`[Metrics] Heap Snapshot 已儲存: ${snapshotPath}`);

    const mem = process.memoryUsage();

    res.json({
      success: true,
      path: snapshotPath,
      instructions: '使用 Chrome DevTools → Memory → Load profile 載入此檔案',
      memoryAtSnapshot: {
        heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error taking heap snapshot:', error);
    res.status(500).json({
      error: 'Failed to take heap snapshot',
      details: error.message,
    });
  }
});

/**
 * 格式化運行時間
 *
 * 將秒數轉換為易讀格式
 * 例如：3661 → "1h 1m 1s"
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;
