/**
 * autoCapture.js - Data-Attribute 自動捕獲機制
 * 
 * Phase 4: 自動捕獲帶有 data-track 屬性的元素互動事件
 * 
 * 使用方式:
 * 1. 在 JSX 元素上加入 data-track 屬性
 * 2. 可選：data-track-action, data-track-type, data-track-id, data-track-meta-*
 * 
 * @example
 * <button data-track data-track-action="KANBAN_COLUMN_CREATE" data-track-type="column">
 *   新增列表
 * </button>
 * 
 * <div data-track data-track-action="KANBAN_TASK_CLICK" data-track-type="task" data-track-id={taskId}>
 *   ...
 * </div>
 * 
 * 元數據:
 * <button data-track data-track-action="KANBAN_FILTER" data-track-meta-keyword="搜尋詞">
 *   搜尋
 * </button>
 * 
 * 設計原則:
 * - 全局事件委派 (Event Delegation)，單一 listener 處理所有帶 data-track 屬性的元素
 * - 低侵入性：只需在 JSX 加屬性，不需修改邏輯
 * - 自動提取 metadata：所有 data-track-meta-* 屬性自動轉為 metadata 物件
 * - 去抖機制：300ms 內同一元素同一動作只記錄一次
 */

// 去抖快取
const _debounceMap = new Map();
const DEBOUNCE_MS = 300;

/**
 * 從元素中提取追蹤資訊
 * @param {HTMLElement} el - 目標元素
 * @returns {Object|null} 追蹤資訊或 null
 */
function extractTrackData(el) {
  // 向上尋找最近的帶有 data-track 的元素 (最多 5 層)
  let target = el;
  let depth = 0;
  while (target && depth < 5) {
    if (target.hasAttribute && target.hasAttribute('data-track')) {
      break;
    }
    target = target.parentElement;
    depth++;
  }

  if (!target || !target.hasAttribute || !target.hasAttribute('data-track')) {
    return null;
  }

  const action = target.getAttribute('data-track-action');
  if (!action) {
    // data-track 存在但沒有 action，跳過
    return null;
  }

  const targetType = target.getAttribute('data-track-type') || 'ui';
  const targetId = target.getAttribute('data-track-id') || null;

  // 提取所有 data-track-meta-* 屬性
  const metadata = {};
  if (target.attributes) {
    for (const attr of target.attributes) {
      if (attr.name.startsWith('data-track-meta-')) {
        const key = attr.name
          .replace('data-track-meta-', '')
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // kebab-case → camelCase
        metadata[key] = attr.value;
      }
    }
  }

  // 自動注入元素文字內容 (截斷到 50 字)
  const textContent = (target.textContent || '').trim().slice(0, 50);
  if (textContent && !metadata.label) {
    metadata.label = textContent;
  }

  return { action, targetType, targetId, metadata };
}

/**
 * 初始化自動捕獲機制
 * @param {Object} batcher - EventBatcher 實例，需有 push() 方法
 * @param {Object} options - 配置選項
 * @param {number} options.debounceMs - 去抖間隔 (毫秒)，預設 300
 * @returns {Function} cleanup 函式，用於移除 listener
 */
export function initAutoCapture(batcher, options = {}) {
  const debounceMs = options.debounceMs || DEBOUNCE_MS;

  if (!batcher || typeof batcher.push !== 'function') {
    console.warn('⚠️ [autoCapture] 需要一個具有 push() 方法的 batcher');
    return () => {};
  }

  const handleClick = (e) => {
    const trackData = extractTrackData(e.target);
    if (!trackData) return;

    // 去抖: 同一 action + targetId 在 debounceMs 內只處理一次
    const key = `${trackData.action}:${trackData.targetId || 'none'}`;
    const now = Date.now();
    const lastTime = _debounceMap.get(key);

    if (lastTime && now - lastTime < debounceMs) {
      return; // 去抖
    }
    _debounceMap.set(key, now);

    // 定期清理去抖快取 (防止記憶體洩漏)
    if (_debounceMap.size > 500) {
      const threshold = now - debounceMs * 2;
      for (const [k, v] of _debounceMap) {
        if (v < threshold) _debounceMap.delete(k);
      }
    }

    // 推送事件到 batcher
    batcher.push({
      action: trackData.action,
      targetType: trackData.targetType,
      targetId: trackData.targetId,
      metadata: {
        ...trackData.metadata,
        source: 'autoCapture',
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
      },
      userId: null, // TrackingProvider 會注入
    });
  };

  // 使用 capture 階段確保最早捕獲
  document.addEventListener('click', handleClick, { capture: true });

  console.log('✅ [autoCapture] 自動捕獲機制已初始化');

  // 返回 cleanup 函式
  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
    _debounceMap.clear();
    console.log('🧹 [autoCapture] 自動捕獲機制已清理');
  };
}

/**
 * 透過 TrackingProvider 的 track 函式進行自動捕獲
 * 此版本直接使用 track() 而非 batcher.push()，更適合與 TrackingProvider 整合
 * 
 * @param {Function} trackFn - TrackingProvider 的 track 函式
 * @param {Object} options - 配置選項
 * @returns {Function} cleanup 函式
 */
export function initAutoCaptureWithTrack(trackFn, options = {}) {
  const debounceMs = options.debounceMs || DEBOUNCE_MS;

  if (!trackFn || typeof trackFn !== 'function') {
    console.warn('⚠️ [autoCapture] 需要一個有效的 track 函式');
    return () => {};
  }

  const handleClick = (e) => {
    const trackData = extractTrackData(e.target);
    if (!trackData) return;

    // 去抖
    const key = `${trackData.action}:${trackData.targetId || 'none'}`;
    const now = Date.now();
    const lastTime = _debounceMap.get(key);

    if (lastTime && now - lastTime < debounceMs) {
      return;
    }
    _debounceMap.set(key, now);

    // 清理快取
    if (_debounceMap.size > 500) {
      const threshold = now - debounceMs * 2;
      for (const [k, v] of _debounceMap) {
        if (v < threshold) _debounceMap.delete(k);
      }
    }

    // 使用 track 函式
    trackFn(
      trackData.action,
      trackData.targetType,
      trackData.targetId,
      { ...trackData.metadata, source: 'autoCapture' }
    );
  };

  document.addEventListener('click', handleClick, { capture: true });

  console.log('✅ [autoCapture] 自動捕獲機制已初始化 (track 模式)');

  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
    _debounceMap.clear();
    console.log('🧹 [autoCapture] 自動捕獲機制已清理');
  };
}

export default { initAutoCapture, initAutoCaptureWithTrack };
