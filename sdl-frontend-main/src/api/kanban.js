import axios from "axios";

axios.defaults.withCredentials = true; 
const kanbanApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/kanbans",
    headers:{
        "Content-Type":" application/json"
    },
})

// 添加請求攔截器以自動添加 token
kanbanApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['accessToken'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

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
    const response = await axios.get(`https://science.sdlswuret.com/api/node/changes/${nodeId}`);
    return response.data;
};

export const getProjectActivity = async (projectId, params = {}) => {
    const response = await kanbanApi.get(`/projects/${projectId}/activity`, { params })
    return response.data
}

export const addCardItem = async (cardItem) => {
    // 注意：任務創建現在只通過 Socket 處理，此函數保留作為兼容性
    // 實際的任務創建應該通過 socket.emit("taskItemCreated", ...) 完成
    console.warn('addCardItem: 任務創建應該使用 Socket，不是 HTTP API');
    return Promise.resolve();
}

export const updateCardItem = async (cardItem) => {
    const response = await kanbanApi.put("/", cardItem)
    return response.data
}

export const deleteCardItem = async (config) => {
    const response = await kanbanApi.delete("/",config)
}
