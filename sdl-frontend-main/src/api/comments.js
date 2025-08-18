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

export const fetchComments = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/comments`);
  return res.data.items;
};

export const createComment = async ({ taskId, content, files }) => {
  const formData = new FormData();
  formData.append('content', content);
  if (files && Array.isArray(files)) {
    files.forEach((f) => formData.append('files', f));
  }
  const res = await api.post(`/tasks/${taskId}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.item;
};

export const updateComment = async ({ commentId, content }) => {
  const res = await api.put(`/comments/${commentId}`, { content });
  return res.data.item;
};

export const deleteComment = async ({ commentId }) => {
  const res = await api.delete(`/comments/${commentId}`);
  return res.data;
};

export const toggleCommentLike = async ({ commentId }) => {
  const res = await api.post(`/comments/${commentId}/like`);
  return res.data;
};

