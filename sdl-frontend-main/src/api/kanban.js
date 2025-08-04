import axios from "axios";

axios.defaults.withCredentials = true; 
const kanbanApi = axios.create({
    baseURL: "http://localhost/api/kanbans",
    headers:{
        "Content-Type":" application/json"
    },
})

export const getKanbanColumns = async (projectId) => {
    const response = await kanbanApi.get(`/${projectId}`)
    return response.data
}

export const getKanbanTasks = async (columnId) => {
    const response = await kanbanApi.get(`/columns/${columnId}`)
    return response.data
}

export const getTaskChangeLogs = async (taskId) => {
    const response = await kanbanApi.get(`/tasks/${taskId}/changes`)
    return response.data
}

// 取得節點變更記錄
export const getNodeChangeLogs = async (nodeId) => {
    const response = await axios.get(`http://localhost/api/node/changes/${nodeId}`);
    return response.data;
};

export const getProjectActivity = async (projectId, params = {}) => {
    const response = await kanbanApi.get(`/projects/${projectId}/activity`, { params })
    return response.data
}

export const addCardItem = async (cardItem) => {
    const response = await kanbanApi.post("/", cardItem)
}

export const updateCardItem = async (cardItem) => {
    const response = await kanbanApi.put("/", cardItem)
    return response.data
}

export const deleteCardItem = async (config) => {
    const response = await kanbanApi.delete("/",config)
}
