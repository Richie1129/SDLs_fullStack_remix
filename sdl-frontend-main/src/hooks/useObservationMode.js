import { useCallback, useContext, useMemo } from 'react';
import { ObservationContext } from '../providers/ObservationProvider';

/**
 * 觀摩模式 Hook
 *
 * 只讀 ObservationProvider 的 context，回傳簽名與舊版完全相同：
 * { isObservationMode, isLoading, enableObservationMode, disableObservationMode, checkObservationMode }
 *
 * 資料取得與判斷邏輯全部在 providers/ObservationProvider.jsx（掛在 ProjectLayout），
 * 每個專案頁面只發一次 getProjectUser / getProject 請求。
 *
 * 沒有 Provider 的地方（專案路由之外）回傳安全預設值，不會 crash，並在 console 提示一次。
 */

let warnedOutsideProvider = false;

export const useObservationMode = () => {
  const context = useContext(ObservationContext);

  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  const fallback = useMemo(() => ({
    isObservationMode: false,
    isLoading: false,
    enableObservationMode: noop,
    disableObservationMode: noop,
    checkObservationMode: noopAsync,
  }), [noop, noopAsync]);

  if (context) return context;

  if (!warnedOutsideProvider && typeof console !== 'undefined') {
    warnedOutsideProvider = true;
    console.warn('useObservationMode 在 ObservationProvider 之外被呼叫，回傳預設值（非觀摩模式）');
  }
  return fallback;
};

export default useObservationMode;
