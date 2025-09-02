import apiClient from './client';

export const fetchProjectComments = async (projectId) => {
  const res = await apiClient.get(`/projects/${projectId}/comments`);
  return res.data.items;
};

export const createProjectComment = async ({ projectId, content, parentId = null }) => {
  const res = await apiClient.post(`/projects/${projectId}/comments`, { content, parentId });
  return res.data.item;
};

export const updateProjectComment = async ({ commentId, content }) => {
  const res = await apiClient.put(`/project-comments/${commentId}`, { content });
  return res.data.item;
};

export const deleteProjectComment = async ({ commentId }) => {
  const res = await apiClient.delete(`/project-comments/${commentId}`);
  return res.data;
};

export const toggleProjectCommentLike = async ({ commentId }) => {
  const res = await apiClient.post(`/project-comments/${commentId}/like`);
  return res.data;
};

export const uploadProjectCommentAttachments = async ({ commentId, files }) => {
  const form = new FormData();
  (files || []).forEach((f) => form.append('files', f));
  const res = await apiClient.post(`/project-comments/${commentId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.item;
};

export const deleteProjectCommentAttachment = async ({ attachmentId }) => {
  const res = await apiClient.delete(`/project-comments/attachments/${attachmentId}`);
  return res.data;
};
