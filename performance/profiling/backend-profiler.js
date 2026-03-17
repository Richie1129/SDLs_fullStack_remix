/**
 * SDL 平台 - Node.js 後端效能分析工具
 *
 * 用途：分析 CPU 熱點、記憶體使用、非同步瓶頸
 *
 * 使用方式：
 *   # 方法 1: Node.js 內建 profiler（不需安裝任何套件）
 *   node --prof sdl-backend-main/index.js
 *   node --prof-process isolate-*.log > profile.txt
 *
 *   # 方法 2: 使用此腳本的 --inspect flag
 *   node --inspect sdl-backend-main/index.js
 *   # 然後在 Chrome 開啟 chrome://inspect
 *
 *   # 方法 3: 0x（火焰圖）
 *   npx 0x sdl-backend-main/index.js
 *
 * 此檔案：在 Docker 容器中收集 heap snapshot 的工具函式
 * 使用：在需要分析記憶體的控制器中引入
 */

const v8 = require('v8');
const fs = require('fs');
const path = require('path');

/**
 * 記憶體快照工具
 *
 * 使用範例（在懷疑有記憶體洩漏的 route 中）：
 *   const { takeHeapSnapshot, getMemoryReport } = require('../performance/profiling/backend-profiler');
 *
 *   app.get('/debug/memory', (req, res) => {
 *     res.json(getMemoryReport());
 *   });
 */

/**
 * 取得當前記憶體使用報告
 * @returns {Object} 格式化的記憶體使用資訊
 */
function getMemoryReport() {
  const mem = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  return {
    timestamp: new Date().toISOString(),
    process: {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsedPct: `${((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)}%`,
      external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(mem.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
    },
    v8: {
      heapSizeLimit: `${(heapStats.heap_size_limit / 1024 / 1024).toFixed(0)} MB`,
      mallocedMemory: `${(heapStats.malloced_memory / 1024 / 1024).toFixed(2)} MB`,
    },
    warnings: generateMemoryWarnings(mem, heapStats),
  };
}

function generateMemoryWarnings(mem, heapStats) {
  const warnings = [];
  const heapPct = (mem.heapUsed / mem.heapTotal) * 100;

  if (heapPct > 85) {
    warnings.push({
      level: 'critical',
      message: `Heap 使用率 ${heapPct.toFixed(1)}% 超過 85% — 即將 OOM`,
      action: '立即調查記憶體洩漏，考慮增加 --max-old-space-size',
    });
  } else if (heapPct > 70) {
    warnings.push({
      level: 'warning',
      message: `Heap 使用率 ${heapPct.toFixed(1)}% 超過 70%`,
      action: '監控趨勢，檢查是否有未釋放的快取',
    });
  }

  const rssMB = mem.rss / 1024 / 1024;
  if (rssMB > 512) {
    warnings.push({
      level: 'warning',
      message: `RSS ${rssMB.toFixed(0)} MB 超過 512 MB`,
      action: '檢查 Buffer、Stream 或 Socket 是否正確釋放',
    });
  }

  return warnings;
}

/**
 * 寫入 Heap Snapshot（用於 Chrome DevTools 分析）
 * 注意：此操作會短暫暫停 Node.js（Stop-the-world GC）
 *
 * @param {string} outputDir - 輸出目錄
 * @returns {string} snapshot 檔案路徑
 */
function takeHeapSnapshot(outputDir = '/tmp') {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = path.join(outputDir, `heap-${timestamp}.heapsnapshot`);

  console.warn('[Profiler] 開始拍攝 Heap Snapshot（服務將短暫停頓）...');
  const snapshotStream = v8.writeHeapSnapshot(filename);
  console.warn(`[Profiler] Heap Snapshot 已儲存: ${snapshotStream}`);

  return snapshotStream;
}

/**
 * 非同步操作計時裝飾器
 * 用於找出哪個 async 函式最慢
 *
 * 使用範例：
 *   const { timeAsync } = require('./backend-profiler');
 *
 *   async function mySlowFunction() {
 *     return await timeAsync('mySlowFunction', async () => {
 *       // 你的業務邏輯
 *     });
 *   }
 */
async function timeAsync(label, fn) {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    if (durationMs > 100) {
      console.warn(`[Profiler] SLOW: ${label} 耗時 ${durationMs.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    console.error(`[Profiler] ERROR: ${label} 失敗，耗時 ${durationMs.toFixed(2)}ms`);
    throw error;
  }
}

/**
 * N+1 查詢偵測工具
 * 透過 monkey-patch Sequelize 的 query 方法追蹤重複查詢
 *
 * 使用方式（開發環境 server.js 中）：
 *   if (process.env.NODE_ENV === 'development') {
 *     require('./performance/profiling/backend-profiler').detectNPlusOne(sequelize);
 *   }
 */
function detectNPlusOne(sequelize) {
  const queryLog = new Map();
  const WINDOW_MS = 1000;  // 1 秒內的重複查詢視為 N+1

  const originalQuery = sequelize.query.bind(sequelize);

  sequelize.query = function (sql, options) {
    // 標準化 SQL（移除動態參數）
    const normalizedSql = typeof sql === 'string'
      ? sql.replace(/\d+/g, '?').replace(/'.+?'/g, '?').trim()
      : String(sql);

    const now = Date.now();
    const entry = queryLog.get(normalizedSql);

    if (entry) {
      entry.count++;
      entry.lastSeen = now;

      if (entry.count === 5 && now - entry.firstSeen < WINDOW_MS) {
        console.warn(`[N+1 偵測] ⚠️ 可能的 N+1 查詢！`);
        console.warn(`  SQL: ${normalizedSql.substring(0, 100)}...`);
        console.warn(`  ${WINDOW_MS}ms 內執行了 ${entry.count} 次`);
        console.warn(`  建議：使用 Sequelize include 預先載入關聯資料`);
      }
    } else {
      queryLog.set(normalizedSql, { count: 1, firstSeen: now, lastSeen: now });

      // 超過 10 秒未見到此查詢就清除（防止 Map 無限增長）
      setTimeout(() => queryLog.delete(normalizedSql), 10000);
    }

    return originalQuery(sql, options);
  };

  console.log('[Profiler] N+1 查詢偵測已啟動');
}

module.exports = {
  getMemoryReport,
  takeHeapSnapshot,
  timeAsync,
  detectNPlusOne,
};
