import { useEffect, useRef, useCallback } from 'react';
import { startUsageSession, sendHeartbeat, stopUsageSession, getUsageSummary } from '../../../api/usage';
import { HEARTBEAT_INTERVAL_MS } from '../../../config/usage';

export function useUsageSession(projectId, userId) {
  const sessionRef = useRef(null);
  const intervalRef = useRef(null);
  const isStoppingRef = useRef(false);

  // 可靠的停止會話函數
  const stopReliably = useCallback(async (useBeacon = false) => {
    if (isStoppingRef.current) return; // 防止重複調用
    isStoppingRef.current = true;

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (sessionRef.current && projectId) {
        const payload = { sessionId: sessionRef.current, projectId };
        
        if (useBeacon && navigator.sendBeacon) {
          // 頁面卸載時使用 sendBeacon 確保請求能夠發送
          // 注意：sendBeacon 不能設置 Authorization header，但後端會優雅處理
          try {
            const formData = new FormData();
            formData.append('sessionId', sessionRef.current);
            formData.append('projectId', projectId.toString());
            navigator.sendBeacon('/api/usage/stop', formData);
          } catch (beaconError) {
            // sendBeacon 失敗，嘗試同步 fetch（可能會被瀏覽器取消）
            try {
              await stopUsageSession(payload);
            } catch {}
          }
        } else {
          // 正常情況下使用普通的 fetch
          await stopUsageSession(payload);
        }
        sessionRef.current = null;
      }
    } catch (error) {
      console.warn('Error stopping usage session:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !userId) return;
    let mounted = true;

    const start = async () => {
      try {
        const data = await startUsageSession({ projectId });
        if (!mounted) return;
        sessionRef.current = data?.sessionId;

        // start heartbeat
        intervalRef.current = setInterval(async () => {
          try {
            if (!sessionRef.current) return;
            const response = await sendHeartbeat({ sessionId: sessionRef.current, projectId });
            
            // 如果後端返回 session 已結束，停止心跳
            if (response.ended) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              sessionRef.current = null;
            }
          } catch (error) {
            console.warn('Heartbeat error:', error);
          }
        }, HEARTBEAT_INTERVAL_MS);
      } catch (error) {
        console.warn('Error starting usage session:', error);
      }
    };

    start();

    // 頁面可見性變化處理
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 頁面隱藏時發送心跳，確保 lastActiveAt 更新
        if (sessionRef.current) {
          sendHeartbeat({ sessionId: sessionRef.current, projectId }).catch(() => {});
        }
      }
    };

    // 頁面卸載前的處理
    const handleBeforeUnload = () => {
      stopReliably(true); // 使用 sendBeacon
    };

    // 註冊事件監聽器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      mounted = false;
      
      // 移除事件監聽器
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // 正常停止會話
      stopReliably(false);
    };
  }, [projectId, userId, stopReliably]);

  return { getUsageSummary };
}
