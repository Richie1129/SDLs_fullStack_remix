import { useEffect, useState } from 'react';

/**
 * useDebouncedValue - 回傳延遲 delay 毫秒後才更新的值
 *
 * 用於搜尋框：輸入框本身立即更新，篩選條件延遲套用，避免每敲一鍵就重算整張看板（F6）。
 * @template T
 * @param {T} value
 * @param {number} delay 毫秒
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
