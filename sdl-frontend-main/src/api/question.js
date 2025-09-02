import apiClient from './client';

export const getAllChatrooms = async (projectId) => {
    const response = await apiClient.get(`/question/${projectId}`)
    return response.data
}

export const getUserChatrooms = async (projectId, userId) => {
    const response = await apiClient.get(`/question/${projectId}/${userId}`)
    return response.data
}

export const getMessages = async (questionId) => {
    const response = await apiClient.get(`/question/messages/${questionId}`);
    return response.data;
};

export const createChatroom = async (data) => {
    const response = await apiClient.post(`/question/createChatroom`, data)//title, userId, projectId
    return response.data
}

export const createMessage = async (data) => {
    const response = await apiClient.post(`/question/createMessage`, data)//message, author, chatroomId
    return response.data
}

export const deleteChatroom = async (questionId) => {
    const response = await apiClient.delete(`/question/chatrooms/${questionId}`);
    return response.data;
};
