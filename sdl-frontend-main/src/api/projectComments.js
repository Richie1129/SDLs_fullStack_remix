import axios from 'axios';

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: 'http://localhost/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['accessToken'] = token;
  return config;
});

export const fetchProjectComments = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/comments`);
  return res.data.items;
};

export const createProjectComment = async ({ projectId, content, parentId = null }) => {
  const res = await api.post(`/projects/${projectId}/comments`, { content, parentId });
  return res.data.item;
};

export const updateProjectComment = async ({ commentId, content }) => {
  const res = await api.put(`/project-comments/${commentId}`, { content });
  return res.data.item;
};

export const deleteProjectComment = async ({ commentId }) => {
  const res = await api.delete(`/project-comments/${commentId}`);
  return res.data;
};

export const toggleProjectCommentLike = async ({ commentId }) => {
  const res = await api.post(`/project-comments/${commentId}/like`);
  return res.data;
};

export const uploadProjectCommentAttachments = async ({ commentId, files }) => {
  const form = new FormData();
  (files || []).forEach((f) => form.append('files', f));
  const res = await api.post(`/project-comments/${commentId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.item;
};

export const deleteProjectCommentAttachment = async ({ attachmentId }) => {
  const res = await api.delete(`/project-comments/attachments/${attachmentId}`);
  return res.data;
};
