import apiClient from './client';

export const getSubStage = async (currentStage) => {
    const response = await apiClient.post(`/stage`, currentStage)
    return response.data
}
