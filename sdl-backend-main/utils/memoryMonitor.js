/**
 * Memory Usage Monitor - 記憶體監控
 *
 * 核心功能：
 * 1. 每分鐘檢查記憶體使用
 * 2. 警告高記憶體使用 (> 500MB)
 * 3. 檢測記憶體洩漏趨勢
 * 4. 保留 1 小時歷史數據
 *
 * 記憶體類型說明：
 * - heapUsed: V8 引擎實際使用的記憶體（最重要）
 * - heapTotal: V8 引擎分配的總記憶體
 * - rss: Resident Set Size，進程總記憶體（含 V8 + Node.js）
 * - external: C++ 物件綁定的記憶體
 *
 * 洩漏檢測算法：
 * - 看最近 5 筆記錄
 * - 如果 5 次中有 4 次 heapUsed 增長
 * - 判定為潛在記憶體洩漏
 *
 * 零破壞性：
 * - 背景執行，不阻塞主邏輯
 * - 使用 setInterval，在 gracefulShutdown 中清理
 * - 只在異常時輸出警告
 */

class MemoryMonitor {
  constructor(options = {}) {
    // 配置
    this.thresholdMB = options.thresholdMB || 500;  // 警告閾值（MB）
    this.checkInterval = options.checkInterval || 60000;  // 檢查間隔（ms）
    this.maxHistorySize = options.maxHistorySize || 60;  // 保留歷史數量

    // 狀態
    this.intervalId = null;
    this.history = [];  // 歷史記錄

    console.log(`💾 Memory Monitor initialized (threshold: ${this.thresholdMB}MB, interval: ${this.checkInterval / 1000}s)`);
  }

  /**
   * 啟動監控
   *
   * 用法：
   * const monitor = new MemoryMonitor();
   * monitor.start();
   */
  start() {
    if (this.intervalId) {
      console.warn('💾 Memory Monitor already running');
      return;
    }

    // 立即執行一次
    this.check();

    // 定期執行
    this.intervalId = setInterval(() => {
      this.check();
    }, this.checkInterval);

    console.log('💾 Memory Monitor started');
  }

  /**
   * 停止監控（用於 gracefulShutdown）
   *
   * 零破壞性關鍵：必須在 server shutdown 時呼叫
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('💾 Memory Monitor stopped');
    }
  }

  /**
   * 執行一次記憶體檢查
   */
  check() {
    const usage = process.memoryUsage();
    const record = {
      timestamp: new Date().toISOString(),
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),
      externalMB: Math.round(usage.external / 1024 / 1024)
    };

    // 記錄歷史
    this.history.push(record);

    // 保持歷史大小（滾動）
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();  // 移除最舊的
    }

    // 檢查警告條件
    this.checkWarnings(record);
  }

  /**
   * 檢查是否需要警告
   *
   * 兩種警告：
   * 1. 高記憶體使用（絕對值）
   * 2. 記憶體洩漏趨勢（相對增長）
   */
  checkWarnings(record) {
    // 警告 1：高記憶體使用
    if (record.heapUsedMB > this.thresholdMB) {
      console.warn('\n' + '💾'.repeat(40));
      console.warn(`⚠️  [HIGH MEMORY] ${record.heapUsedMB}MB - ${record.timestamp}`);
      console.warn('─'.repeat(80));
      console.warn(`   Heap Used: ${record.heapUsedMB}MB / ${record.heapTotalMB}MB`);
      console.warn(`   RSS: ${record.rssMB}MB`);
      console.warn(`   External: ${record.externalMB}MB`);
      console.warn('💾'.repeat(40) + '\n');
    }

    // 警告 2：記憶體洩漏趨勢
    if (this.detectMemoryLeak()) {
      console.error('\n' + '🚨'.repeat(40));
      console.error('🚨 [MEMORY LEAK DETECTED]');
      console.error('─'.repeat(80));
      console.error('   Memory has been growing consistently over the last 5 minutes!');
      console.error('   This indicates a potential memory leak.');
      console.error('');
      console.error('   Recent trend:');
      this.history.slice(-5).forEach((h, i) => {
        console.error(`     ${i + 1}. ${h.timestamp}: ${h.heapUsedMB}MB`);
      });
      console.error('');
      console.error('   Action required:');
      console.error('   1. Check recent code changes');
      console.error('   2. Look for timer/interval leaks (like Phase 1 fix)');
      console.error('   3. Check Socket.IO connections');
      console.error('   4. Review event listener cleanup');
      console.error('🚨'.repeat(40) + '\n');
    }
  }

  /**
   * 檢測記憶體洩漏
   *
   * 算法：
   * - 需要至少 5 筆歷史記錄
   * - 比較最近 5 筆的 heapUsedMB
   * - 如果 5 次中有 4 次增長 → 潛在洩漏
   *
   * 為什麼是 4/5 而不是 5/5？
   * - 允許偶爾的 GC（Garbage Collection）
   * - GC 會導致記憶體短暫下降
   * - 4/5 是穩定的趨勢判斷
   */
  detectMemoryLeak() {
    if (this.history.length < 5) {
      return false;  // 數據不足
    }

    const recent5 = this.history.slice(-5);
    let increasingCount = 0;

    // 比較相鄰的記錄
    for (let i = 1; i < recent5.length; i++) {
      if (recent5[i].heapUsedMB > recent5[i - 1].heapUsedMB) {
        increasingCount++;
      }
    }

    // 5 次中有 4 次增長 = 洩漏
    return increasingCount >= 4;
  }

  /**
   * 獲取監控數據
   *
   * 返回格式：
   * {
   *   current: 當前記憶體使用,
   *   history: 歷史記錄,
   *   trend: 趨勢（increasing/stable）
   * }
   */
  getMetrics() {
    const current = process.memoryUsage();

    return {
      current: {
        heapUsedMB: Math.round(current.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(current.heapTotal / 1024 / 1024),
        rssMB: Math.round(current.rss / 1024 / 1024),
        externalMB: Math.round(current.external / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime())
      },
      history: this.history,
      trend: this.detectMemoryLeak() ? 'increasing ⚠️' : 'stable ✅',
      thresholdMB: this.thresholdMB
    };
  }

  /**
   * 手動觸發 GC（僅用於測試）
   *
   * 注意：需要 node --expose-gc 啟動
   */
  forceGC() {
    if (global.gc) {
      console.log('💾 Forcing garbage collection...');
      global.gc();
      console.log('💾 GC completed');
    } else {
      console.warn('💾 GC not available. Start with: node --expose-gc');
    }
  }
}

module.exports = MemoryMonitor;
