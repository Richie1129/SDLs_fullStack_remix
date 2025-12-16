/**
 * API Performance Monitor - 追蹤 API 效能
 *
 * 核心功能：
 * 1. 記錄每個 API 的回應時間
 * 2. 統計平均值、最大值、錯誤率
 * 3. 警告慢 API (> 1000ms)
 * 4. 提供 metrics 查詢介面
 *
 * 架構設計：
 * - 使用 Map 儲存統計（O(1) 查找）
 * - 使用 res.on('finish') 不阻塞請求
 * - 滾動記錄最近 100 個慢請求
 *
 * 零破壞性：
 * - 不改變 API 行為
 * - 只在記憶體中儲存（重啟清空）
 * - 只在 > 1000ms 時輸出警告
 */

class PerformanceMonitor {
  constructor(options = {}) {
    // 配置
    this.slowThreshold = options.slowThreshold || 1000;  // 慢請求閾值（ms）
    this.maxSlowRequests = options.maxSlowRequests || 100;  // 保留最近 N 個慢請求

    // 統計數據
    this.metrics = {
      totalRequests: 0,
      slowRequests: [],  // 最近的慢請求列表
      apiStats: new Map(),  // API path → 統計數據
    };

    console.log(`📊 Performance Monitor initialized (slow threshold: ${this.slowThreshold}ms)`);
  }

  /**
   * Express Middleware
   *
   * 用法：
   * const monitor = new PerformanceMonitor();
   * app.use(monitor.middleware());
   */
  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      // 在 response 完成時記錄
      res.on('finish', () => {
        const duration = Date.now() - start;
        const path = this.normalizePath(req);

        // 更新統計
        this.updateStats(req.method, path, duration, res.statusCode);

        // 警告慢請求
        if (duration > this.slowThreshold) {
          this.logSlowRequest(req, duration, res.statusCode);
          this.recordSlowRequest(req, duration, res.statusCode);
        }
      });

      next();
    };
  }

  /**
   * 標準化 API path
   *
   * 為什麼需要：
   * - /api/projects/1 → /api/projects/:id
   * - /api/projects/2 → /api/projects/:id
   * 合併為同一個統計
   *
   * 實作：優先使用 route.path（Express 提供），否則用原始 path
   */
  normalizePath(req) {
    if (req.route && req.route.path) {
      // Express 自動把 :id 參數化
      return req.baseUrl + req.route.path;
    }

    // Fallback：使用原始 path
    return req.path;
  }

  /**
   * 更新 API 統計
   *
   * 數據結構：
   * {
   *   count: 總請求數,
   *   totalTime: 累計時間,
   *   maxTime: 最大時間,
   *   minTime: 最小時間,
   *   errors: 錯誤數（4xx/5xx）
   * }
   */
  updateStats(method, path, duration, statusCode) {
    this.metrics.totalRequests++;

    const key = `${method} ${path}`;
    const stats = this.metrics.apiStats.get(key) || {
      count: 0,
      totalTime: 0,
      maxTime: 0,
      minTime: Infinity,
      errors: 0
    };

    stats.count++;
    stats.totalTime += duration;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);

    if (statusCode >= 400) {
      stats.errors++;
    }

    this.metrics.apiStats.set(key, stats);
  }

  /**
   * 輸出慢請求警告
   *
   * 格式：清晰易讀，包含關鍵資訊
   */
  logSlowRequest(req, duration, statusCode) {
    console.warn('\n' + '⚠'.repeat(40));
    console.warn(`⚠️  [SLOW API] ${duration}ms - ${new Date().toISOString()}`);
    console.warn('─'.repeat(80));
    console.warn(`   Method: ${req.method}`);
    console.warn(`   Path: ${req.path}`);
    console.warn(`   Status: ${statusCode}`);
    console.warn(`   User: ${req.user?.account || 'anonymous'}`);
    console.warn(`   IP: ${req.ip}`);
    console.warn('⚠'.repeat(40) + '\n');
  }

  /**
   * 記錄慢請求詳細資訊
   *
   * 滾動記錄：只保留最近 N 個
   */
  recordSlowRequest(req, duration, statusCode) {
    this.metrics.slowRequests.push({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      duration,
      statusCode,
      user: req.user?.account || 'anonymous',
      ip: req.ip
    });

    // 保持列表大小
    if (this.metrics.slowRequests.length > this.maxSlowRequests) {
      this.metrics.slowRequests.shift();  // 移除最舊的
    }
  }

  /**
   * 獲取監控數據
   *
   * 返回格式：
   * {
   *   totalRequests: 總請求數,
   *   slowRequests: 最近的慢請求,
   *   apiStats: Top 20 API 統計（按平均時間排序）
   * }
   */
  getMetrics() {
    // 將 Map 轉換為 Array，計算平均值
    const apiStats = Array.from(this.metrics.apiStats.entries()).map(([path, stats]) => ({
      path,
      count: stats.count,
      avgTime: Math.round(stats.totalTime / stats.count),
      maxTime: stats.maxTime,
      minTime: stats.minTime === Infinity ? 0 : stats.minTime,
      errorRate: ((stats.errors / stats.count) * 100).toFixed(1) + '%'
    }));

    // 排序：平均時間最慢的在前
    apiStats.sort((a, b) => b.avgTime - a.avgTime);

    return {
      totalRequests: this.metrics.totalRequests,
      slowRequests: this.metrics.slowRequests.slice(-20), // 最近 20 個
      apiStats: apiStats.slice(0, 20), // Top 20 最慢的 API
      topErrors: this.getTopErrors(apiStats)
    };
  }

  /**
   * 獲取錯誤率最高的 API
   */
  getTopErrors(apiStats) {
    return apiStats
      .filter(stat => parseFloat(stat.errorRate) > 0)
      .sort((a, b) => parseFloat(b.errorRate) - parseFloat(a.errorRate))
      .slice(0, 10);
  }

  /**
   * 重置統計（用於測試或定期重置）
   */
  reset() {
    this.metrics.totalRequests = 0;
    this.metrics.slowRequests = [];
    this.metrics.apiStats.clear();
    console.log('📊 Performance metrics reset');
  }
}

module.exports = PerformanceMonitor;
