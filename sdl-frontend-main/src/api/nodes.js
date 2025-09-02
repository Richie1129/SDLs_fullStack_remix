import apiClient from './client';

//node
export const getNodes = async (ideaWallId) => {
    const response = await apiClient.get(`/node/${ideaWallId}`)
    return response.data
}

// 新增：獲取專案所有階段的節點
export const getProjectNodes = async (projectId) => {
    const response = await apiClient.get(`/node/project/${projectId}`)
    return response.data
}

// export const createNode = async (data) => {
//     const response = await nodeApi.post("/", data)
//     return response.data
// }

export const getNodeRelation = async (ideaWallId) => {
    const response = await apiClient.get(`/node/node_relation/${ideaWallId}`)
    return response.data
}

// 新增：獲取專案所有階段的節點關係
export const getProjectNodeRelation = async (projectId) => {
    const response = await apiClient.get(`/node/project_relation/${projectId}`)
    return response.data
}

// export const createNodeRelation = async (data) => {
//     const response = await nodeApi.post("/node_relation", data)
//     return response.data
// }
