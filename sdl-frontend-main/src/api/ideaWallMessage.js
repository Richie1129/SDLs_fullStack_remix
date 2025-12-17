import apiClient from './client';

export const getIdeaWallMessages = async (wallId, nodeId = null) => {
    const params = {};
    if (nodeId) {
        params.nodeId = nodeId;
    }
    const response = await apiClient.get(`/ideaWall/${wallId}/messages`, { params });
    return response.data;
}

export const createIdeaWallMessage = async (wallId, data) => {
    // data: { content, relatedNodeId }
    const response = await apiClient.post(`/ideaWall/${wallId}/messages`, data);
    return response.data;
}
