import apiClient from './client';

// export const getProjectContent = async (projectId) => {
//   const res = await apiClient.get(`/projects/${projectId}/content`);
//   return res.data;
// };

export const getGuidance = async ({ projectId, currentStage, currentSubStage, userMessage, useLLM, provider, history, tasksMode, tasksCount }) => {
  const res = await apiClient.post('/assistant/guidance', {
    projectId,
    currentStage,
    currentSubStage,
    userMessage,
    useLLM,
    provider,
    history,
    tasksMode,
    tasksCount,
  }, {
    timeout: 60000, // AI 響應可能較慢，給 60 秒超時
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
export const getChatHistory = async ({ projectId, sessionId = 'default' }) => {
  const res = await apiClient.get(`/projects/${projectId}/chat?sessionId=${sessionId}`);
  return res.data;
};

// Get all chat sessions for a project
export const getChatSessions = async ({ projectId }) => {
  const res = await apiClient.get(`/projects/${projectId}/chat/sessions`);
  return res.data;
};

// Delete a chat session
export const deleteChatSession = async ({ projectId, sessionId }) => {
  const res = await apiClient.delete(`/projects/${projectId}/chat/sessions/${sessionId}`);
  return res.data;
};

export default { getGuidance, createChatTurn, completeChatTurn, getChatHistory, getChatSessions, deleteChatSession };
