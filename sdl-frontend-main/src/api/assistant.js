import apiClient from './client';

export const getProjectContent = async (projectId) => {
  const res = await apiClient.get(`/projects/${projectId}/content`);
  return res.data;
};

export const getGuidance = async ({ projectId, currentStage, currentSubStage, userMessage, useLLM, provider, history }) => {
  const res = await apiClient.post('/assistant/guidance', {
    projectId,
    currentStage,
    currentSubStage,
    userMessage,
    useLLM,
    provider,
    history,
  });
  return res.data;
};

// Create a chat turn with user and/or assistant content
export const createChatTurn = async ({ projectId, body }) => {
  const res = await apiClient.post(`/projects/${projectId}/chat`, body);
  return res.data;
};

// Complete/update a chat turn with assistant content
export const completeChatTurn = async ({ projectId, id, assistantContent, assistantUsername = 'AI 導師' }) => {
  const res = await apiClient.put(`/projects/${projectId}/chat/${id}`, { assistantContent, assistantUsername });
  return res.data;
};

// Load chat history turns
export const getChatHistory = async ({ projectId }) => {
  const res = await apiClient.get(`/projects/${projectId}/chat`);
  return res.data;
};

export default { getProjectContent, getGuidance, createChatTurn, completeChatTurn, getChatHistory };
