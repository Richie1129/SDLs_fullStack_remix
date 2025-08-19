import axios from "axios";

const usageApi = axios.create({
  baseURL: "https://science.sdlswuret.com/api/usage",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token if present
usageApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers['accessToken'] = token;
    return config;
  },
  (error) => Promise.reject(error)
);

export const startUsageSession = async ({ userId, projectId }) => {
  const res = await usageApi.post('/start', { userId, projectId });
  return res.data;
};

export const sendHeartbeat = async ({ sessionId, userId, projectId }) => {
  const res = await usageApi.post('/heartbeat', { sessionId, userId, projectId });
  return res.data;
};

export const stopUsageSession = async ({ sessionId, userId, projectId }) => {
  const res = await usageApi.post('/stop', { sessionId, userId, projectId });
  return res.data;
};

export const getUsageSummary = async ({ userId, projectId }) => {
  const res = await usageApi.get('/summary', { params: { userId, projectId } });
  return res.data;
};

