import apiClient from './client';

export const getProjectContent = async (projectId) => {
  const res = await apiClient.get(`/projects/${projectId}/content`);
  return res.data;
};

export const getGuidance = async ({ projectId, currentStage, currentSubStage, userMessage, useLLM, provider }) => {
  const res = await apiClient.post('/assistant/guidance', {
    projectId,
    currentStage,
    currentSubStage,
    userMessage,
    useLLM,
    provider,
  });
  return res.data;
};

export default { getProjectContent, getGuidance };
