import apiClient from './client';

export const getProjectGraph = async (projectId, params = {}) => {
  const response = await apiClient.get(`/knowledge-graph/projects/${projectId}`, { params });
  return response.data;
};
