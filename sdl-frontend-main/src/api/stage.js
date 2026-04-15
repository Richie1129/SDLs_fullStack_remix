import apiClient from './client';

export const getSubStage = async (currentStage) => {
    const response = await apiClient.post(`/stage`, currentStage)
    return response.data
}

export const getAllSubStageTemplates = async (projectId) => {
    const response = await apiClient.get(`/stage/templates/${projectId}`)
    return response.data
}
