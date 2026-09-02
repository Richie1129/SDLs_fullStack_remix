import { useState, useEffect } from 'react';
import apiClient from '@/api/client';
import { isFileMissingError } from '@/utils/fileUrlBuilder';

/**
 * AuthImage - 需要登入驗證的圖片元件
 *
 * 針對 /api/file/image/* 端點，透過 apiClient（附帶 accessToken）
 * 以 fetch 取得圖片 blob，轉為 Object URL 後渲染。
 * 非 API 圖片（頭像等）直接以 <img> 渲染，不做額外處理。
 *
 * 模組層快取：同一路徑共用一個 in-flight promise 與 Object URL，
 * 縮圖與詳情 Modal 快速切換時不會重抓；引用計數歸零後延遲釋放，
 * 超過上限時以 LRU 淘汰目前沒有元件使用的項目；抓取失敗會移出快取讓下次可重試。
 */

const CACHE_LIMIT = 200;          // 最多快取的圖片數
const REVOKE_DELAY_MS = 30_000;   // refCount 歸零後延遲多久才 revoke Object URL

/**
 * @typedef {object} CacheEntry
 * @property {Promise<string>} promise - 取得 Object URL 的 promise（in-flight 共用）
 * @property {string|null} url - 已建立的 Object URL；尚未載入完成時為 null
 * @property {number} refCount - 目前掛載中、使用此圖片的元件數
 * @property {ReturnType<typeof setTimeout>|null} revokeTimer - 延遲釋放計時器
 */

/** @type {Map<string, CacheEntry>} 以插入順序當 LRU：越後面越新 */
const blobCache = new Map();

const revokeEntry = (entry) => {
  if (entry.revokeTimer) {
    clearTimeout(entry.revokeTimer);
    entry.revokeTimer = null;
  }
  if (entry.url) {
    URL.revokeObjectURL(entry.url);
    entry.url = null;
  }
};

// refCount 歸零後延遲釋放：短時間內重新掛載可直接命中，不必重抓
const scheduleRevoke = (path, entry) => {
  if (entry.revokeTimer) clearTimeout(entry.revokeTimer);
  entry.revokeTimer = setTimeout(() => {
    entry.revokeTimer = null;
    if (entry.refCount > 0) return;
    if (blobCache.get(path) === entry) blobCache.delete(path);
    revokeEntry(entry);
  }, REVOKE_DELAY_MS);
};

// 超過上限時，從最舊的開始淘汰目前沒有元件使用的項目（使用中的不動）
const evictIfNeeded = () => {
  if (blobCache.size <= CACHE_LIMIT) return;
  for (const [path, entry] of blobCache) {
    if (entry.refCount > 0) continue;
    blobCache.delete(path);
    revokeEntry(entry);
    if (blobCache.size <= CACHE_LIMIT) break;
  }
};

const acquireImage = (path) => {
  const existing = blobCache.get(path);
  if (existing) {
    // LRU：重新插入讓它變成最新
    blobCache.delete(path);
    blobCache.set(path, existing);
    existing.refCount += 1;
    if (existing.revokeTimer) {
      clearTimeout(existing.revokeTimer);
      existing.revokeTimer = null;
    }
    return existing;
  }

  /** @type {CacheEntry} */
  const entry = { promise: null, url: null, refCount: 1, revokeTimer: null };
  entry.promise = apiClient
    .get(path, { responseType: 'blob' })
    .then((res) => {
      const url = URL.createObjectURL(res.data);
      entry.url = url;
      // 載入完成前所有使用者都已卸載（或已被 LRU 淘汰）：排程釋放，避免 Object URL 洩漏
      if (entry.refCount === 0) scheduleRevoke(path, entry);
      return url;
    })
    .catch((err) => {
      // 失敗就移出快取，下次掛載可重試
      if (blobCache.get(path) === entry) blobCache.delete(path);
      throw err;
    });

  blobCache.set(path, entry);
  evictIfNeeded();
  return entry;
};

const releaseImage = (path, entry) => {
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount === 0 && entry.url) scheduleRevoke(path, entry);
};

// 從 src 中取出 apiClient 用的相對路徑（去除 baseURL 前綴）
// 例：/api/file/image/xxx → /file/image/xxx
const toApiPath = (src) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  let path = src;

  // 完整網址（例如 https://science.../api/file/image/...）轉成 pathname
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      path = src;
    }
  }

  if (path.startsWith(apiBaseUrl)) {
    return path.slice(apiBaseUrl.length);
  }
  if (path.startsWith('/api/')) {
    return path.slice(4); // 移除 '/api' 前綴
  }
  return path;
};

const AuthImage = ({ src, alt = '', className = '', style, onClick, fallback = null }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  // null | 'missing'（檔案已不存在，404）| 'failed'（其他錯誤）
  const [error, setError] = useState(null);

  const normalizedSrc = typeof src === 'string'
    ? src.trim().replace(/^\{?"/, '').replace(/"\}?$/, '')
    : src;

  const isApiImage = normalizedSrc && (
    normalizedSrc.includes('/api/file/image/') ||
    normalizedSrc.includes('/file/image/')
  );

  useEffect(() => {
    if (!isApiImage) return undefined;

    let cancelled = false;
    setError(null);

    const path = toApiPath(normalizedSrc);
    const entry = acquireImage(path);

    if (entry.url) {
      // 快取命中：直接使用既有 Object URL，不重抓也不閃空白
      setBlobUrl(entry.url);
    } else {
      setBlobUrl(null);
      entry.promise
        .then((url) => {
          if (!cancelled) setBlobUrl(url);
        })
        .catch((err) => {
          if (!cancelled) setError(isFileMissingError(err) ? 'missing' : 'failed');
        });
    }

    return () => {
      cancelled = true;
      releaseImage(path, entry);
    };
  }, [normalizedSrc, isApiImage]);

  // 非 API 圖片：直接渲染
  if (!isApiImage) {
    return (
      <img
        src={normalizedSrc}
        alt={alt}
        className={className}
        style={style}
        onClick={onClick}
      />
    );
  }

  // 載入失敗
  if (error) {
    return fallback ? (
      fallback
    ) : (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className}`}
        style={style}
        onClick={onClick}
      >
        {error === 'missing' ? '檔案已遺失' : '圖片載入失敗'}
      </div>
    );
  }

  // 載入中或已取得 blob
  return (
    <img
      src={blobUrl || undefined}
      alt={alt}
      className={`${className} ${!blobUrl ? 'opacity-0' : 'opacity-100'} transition-opacity duration-fast`}
      style={style}
      onClick={onClick}
    />
  );
};

export default AuthImage;
