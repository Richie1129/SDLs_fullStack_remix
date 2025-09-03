import apiClient from './client';

export const startUsageSession = async ({ userId, projectId }) => {
  const res = await apiClient.post('/usage/start', { userId, projectId });
  return res.data;
};

export const sendHeartbeat = async ({ sessionId, userId, projectId }) => {
  const res = await apiClient.post('/usage/heartbeat', { sessionId, userId, projectId });
  return res.data;
};

export const stopUsageSession = async ({ sessionId, userId, projectId }) => {
  const res = await apiClient.post('/usage/stop', { sessionId, userId, projectId });
  return res.data;
};

export const getUsageSummary = async ({ userId, projectId }) => {
  const res = await apiClient.get('/usage/summary', { params: { userId, projectId } });
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
