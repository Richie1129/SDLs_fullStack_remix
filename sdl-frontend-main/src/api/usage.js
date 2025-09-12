import apiClient from './client';

export const startUsageSession = async ({ projectId }) => {
  const res = await apiClient.post('/usage/start', { projectId });
  return res.data;
};

export const sendHeartbeat = async ({ sessionId, projectId }) => {
  const res = await apiClient.post('/usage/heartbeat', { sessionId, projectId });
  return res.data;
};

export const stopUsageSession = async ({ sessionId, projectId }) => {
  const res = await apiClient.post('/usage/stop', { sessionId, projectId });
  return res.data;
};

export const getUsageSummary = async ({ projectId }) => {
  const res = await apiClient.get('/usage/summary', { params: { projectId } });
  return res.data;
};

// Record a single observation click event
export const recordObservationEvent = async ({ targetType, targetId, targetName, projectId }) => {
  // Fire-and-forget style; do not throw to callers by default
  try {
    const res = await apiClient.post('/usage/record-observation', {
      targetType,
      targetId,
      targetName,
      projectId,
    });
    return res.data;
  } catch (err) {
    // Swallow errors to avoid impacting UI interactions during observation mode
    return { ok: false };
  }
};
