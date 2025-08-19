import { useEffect, useRef } from 'react';
import { startUsageSession, sendHeartbeat, stopUsageSession, getUsageSummary } from '../../../../api/usage';
import { HEARTBEAT_INTERVAL_MS } from '../../../../config/usage';

export function useUsageSession(projectId, userId) {
  const sessionRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!projectId || !userId) return;
    let mounted = true;

    const start = async () => {
      try {
        const data = await startUsageSession({ userId, projectId });
        if (!mounted) return;
        sessionRef.current = data?.sessionId;

        // start heartbeat
        intervalRef.current = setInterval(async () => {
          try {
            if (!sessionRef.current) return;
            await sendHeartbeat({ sessionId: sessionRef.current, userId, projectId });
          } catch {}
        }, HEARTBEAT_INTERVAL_MS);
      } catch (e) {
        // ignore
      }
    };

    start();

    const stop = async () => {
      try {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (sessionRef.current) {
          await stopUsageSession({ sessionId: sessionRef.current, userId, projectId });
        }
      } catch {}
    };

    return () => {
      mounted = false;
      stop();
    };
  }, [projectId, userId]);

  return { getUsageSummary };
}
