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
