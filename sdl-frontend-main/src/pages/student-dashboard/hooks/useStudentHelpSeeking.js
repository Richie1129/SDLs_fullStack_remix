import { useState, useEffect } from 'react';
import { getHelpSeekingStats } from '../../../api/aiTaskAssistant';

/**
 * 取得當前學生在指定專案的求助行為統計
 */
export function useStudentHelpSeeking(userId, projectId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const result = await getHelpSeekingStats(userId, { timeRange: '30d', projectId });
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [userId, projectId]);

  return { data, loading, error };
}
