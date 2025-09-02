import apiClient from './client';

export const getKanbanColumns = async (projectId) => {
    const response = await apiClient.get(`/kanbans/${projectId}`)
    return response.data
}

export const getKanbanTasks = async (columnId) => {
    const response = await apiClient.get(`/kanbans/columns/${columnId}`)
    return response.data
}

export const getTaskChangeLogs = async (taskId) => {
    const response = await apiClient.get(`/kanbans/tasks/${taskId}/changes`)
    return response.data
}

// 取得節點變更記錄
export const getNodeChangeLogs = async (nodeId) => {
    const response = await apiClient.get(`/node/changes/${nodeId}`);
    return response.data;
};

export const getProjectActivity = async (projectId, params = {}) => {
    const response = await apiClient.get(`/kanbans/projects/${projectId}/activity`, { params })
    return response.data
}

export const addCardItem = async (cardItem) => {
    // 注意：任務創建現在只通過 Socket 處理，此函數保留作為兼容性
    // 實際的任務創建應該通過 socket.emit("taskItemCreated", ...) 完成
    console.warn('addCardItem: 任務創建應該使用 Socket，不是 HTTP API');
    return Promise.resolve();
}

export const updateCardItem = async (cardItem) => {
    const response = await apiClient.put(`/kanbans`, cardItem)
    return response.data
}

export const deleteCardItem = async (config) => {
    const response = await apiClient.delete(`/kanbans`,config)
}
