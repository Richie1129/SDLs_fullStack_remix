/**
 * 輕量 In-Memory API Cache
 *
 * 設計原則：
 * - 零外部依賴，純 Map 實作
 * - TTL 自動過期，不需手動清理
 * - 超過 2000 筆時自動 GC（防記憶體洩漏）
 * - Cache key 須包含用戶 ID，確保資料隔離
 *
 * 適用場景：
 * - 高頻、資料變動不頻繁的 GET 端點
 * - /api/users/me (TTL: 60s)
 * - /api/projects (TTL: 30s)
 *
 * 失效時機（呼叫 del() 或 delByPrefix()）：
 * - 用戶更新個人資料時 → del(`me:${userId}`)
 * - 用戶加入/離開專案時 → delByPrefix(`projects:${userId}`)
 */

const store = new Map();

const MAX_ENTRIES = 2000;
const GC_THRESHOLD = Math.floor(MAX_ENTRIES * 0.9); // 達到 90% 時觸發 GC

/**
 * 取得快取值，若過期或不存在回傳 null
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * 寫入快取
 * @param {string} key
 * @param {*} value
 * @param {number} ttlSeconds - 過期秒數（預設 30s）
 */
function set(key, value, ttlSeconds = 30) {
  if (store.size >= GC_THRESHOLD) {
    _gc();
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * 刪除單一 key
 */
function del(key) {
  store.delete(key);
}

/**
 * 刪除所有符合前綴的 key（例如：刪除某用戶的所有快取）
 * @param {string} prefix
 */
function delByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * 清除全部快取（測試或需要強制刷新時使用）
 */
function clear() {
  store.clear();
}

/**
 * 回傳目前快取狀態（供 /api/metrics 使用）
 */
function stats() {
  const now = Date.now();
  let activeCount = 0;
  for (const entry of store.values()) {
    if (now <= entry.expiresAt) activeCount++;
  }
  return {
    total: store.size,
    active: activeCount,
    expired: store.size - activeCount,
  };
}

/**
 * 內部 GC：清除所有已過期的 entry
 */
function _gc() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}

module.exports = { get, set, del, delByPrefix, clear, stats };
