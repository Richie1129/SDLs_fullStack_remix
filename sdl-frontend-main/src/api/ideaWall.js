import apiClient from './client';

export const getIdeaWall = async (projectId,stage) => {
    const response = await apiClient.get(`/ideaWall/${projectId}/${stage}`)
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
