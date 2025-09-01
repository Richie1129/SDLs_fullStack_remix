import apiClient from './client';

export const getChatroomHistory = async (projectId) => {
    const response = await apiClient.get(`/chatroom/history/${projectId}`);
    return response.data;
}
