import apiClient from './client';

export const getIdeaWall = async (projectId) => {
    // stage 參數已廢棄，每個專案只有一個想法牆
    const response = await apiClient.get(`/ideaWall/${projectId}`)
    return response.data
}

export const getAllIdeaWall = async (config) => {
    const response = await apiClient.get(`/ideaWall`, config)
    return response.data
}

export const createIdeaWall = async (data) => {
    const response = await apiClient.post(`/ideaWall`, data)
    return response.data
}
