/**
 * 專案權限關係的 in-memory TTL 快取
 *
 * 目的：PermissionGuard 每個受保護的 socket 事件都會查 User 與 Project（含成員 JOIN），
 * 這裡把「使用者 userId 與專案 projectId 的關係」快取起來，只存最小資訊（布林旗標），
 * 不快取任何 Sequelize instance。
 *
 * key 格式：`${userId}:${projectId}`
 * value 格式：{ status: 'OK' | 'NO_USER' | 'NO_PROJECT', isMember, isMentor, canView }
 *
 * 成員異動（加入、批次分配、mentor 變更、觀摩設定變更、專案刪除）時，
 * 呼叫端必須呼叫 invalidateProject / invalidateUser / invalidatePair 讓快取失效。
 */

// TTL 上限：30 秒（成員異動處已有 invalidate，這裡只是兜底）
const PERMISSION_CACHE_TTL_MS = 30 * 1000;
// 筆數上限：超過時淘汰最舊的一筆（Map 依插入順序迭代）
const PERMISSION_CACHE_MAX_ENTRIES = 5000;

const cache = new Map();

function buildKey(userId, projectId) {
    return `${String(userId)}:${String(projectId)}`;
}

/**
 * 取得快取值；不存在或已過期回傳 undefined
 */
function get(userId, projectId) {
    const key = buildKey(userId, projectId);
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return entry.value;
}

/**
 * 寫入快取；重複 key 會先刪再插，讓它移到最新位置
 */
function set(userId, projectId, value) {
    const key = buildKey(userId, projectId);
    if (cache.has(key)) {
        cache.delete(key);
    } else if (cache.size >= PERMISSION_CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(key, { value, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS });
}

/**
 * 讓單一 (userId, projectId) 失效
 */
function invalidatePair(userId, projectId) {
    if (userId == null || projectId == null) return;
    cache.delete(buildKey(userId, projectId));
}

/**
 * 讓某專案的所有快取失效（成員變動、mentor 變更、觀摩設定變更、專案刪除）
 */
function invalidateProject(projectId) {
    if (projectId == null) return;
    const suffix = `:${String(projectId)}`;
    for (const key of cache.keys()) {
        if (key.endsWith(suffix)) cache.delete(key);
    }
}

/**
 * 讓某使用者的所有快取失效（使用者刪除、班級或學校變更）
 */
function invalidateUser(userId) {
    if (userId == null) return;
    const prefix = `${String(userId)}:`;
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
}

function clear() {
    cache.clear();
}

function size() {
    return cache.size;
}

module.exports = {
    PERMISSION_CACHE_TTL_MS,
    PERMISSION_CACHE_MAX_ENTRIES,
    get,
    set,
    invalidatePair,
    invalidateProject,
    invalidateUser,
    clear,
    size,
};
