import apiClient from './client';

export const fetchComments = async (taskId) => {
  const res = await apiClient.get(`/tasks/${taskId}/comments`);
  return res.data.items;
};

export const createComment = async ({ taskId, content, files }) => {
  const formData = new FormData();
  formData.append('content', content);
  if (files && Array.isArray(files)) {
    files.forEach((f) => formData.append('files', f));
  }
  const res = await apiClient.post(`/tasks/${taskId}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.item;
};

export const updateComment = async ({ commentId, content }) => {
  const res = await apiClient.put(`/comments/${commentId}`, { content });
  return res.data.item;
};

export const deleteComment = async ({ commentId }) => {
  const res = await apiClient.delete(`/comments/${commentId}`);
  return res.data;
};

export const toggleCommentLike = async ({ commentId }) => {
  const res = await apiClient.post(`/comments/${commentId}/like`);
  return res.data;
};
