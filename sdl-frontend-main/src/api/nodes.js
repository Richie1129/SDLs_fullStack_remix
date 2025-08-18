import axios from "axios";

axios.defaults.withCredentials = true; 
const nodeApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/node",
    headers:{
        "Content-Type": "application/json"
    },
})

// 添加請求攔截器來自動添加 accessToken
nodeApi.interceptors.request.use(
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

//node
export const getNodes = async (ideaWallId) => {
    const response = await nodeApi.get(`/${ideaWallId}`)
    return response.data
}

// 新增：獲取專案所有階段的節點
export const getProjectNodes = async (projectId) => {
    const response = await nodeApi.get(`/project/${projectId}`)
    return response.data
}

// export const createNode = async (data) => {
//     const response = await nodeApi.post("/", data)
//     return response.data
// }

export const getNodeRelation = async (ideaWallId) => {
    const response = await nodeApi.get(`/node_relation/${ideaWallId}`)
    return response.data
}

// 新增：獲取專案所有階段的節點關係
export const getProjectNodeRelation = async (projectId) => {
    const response = await nodeApi.get(`/project_relation/${projectId}`)
    return response.data
}

// export const createNodeRelation = async (data) => {
//     const response = await nodeApi.post("/node_relation", data)
//     return response.data
// }