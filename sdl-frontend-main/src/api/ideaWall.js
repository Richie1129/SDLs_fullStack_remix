import axios from "axios";

axios.defaults.withCredentials = true; 
const ideaWallApi = axios.create({
    baseURL: "http://localhost/api/ideaWall",
    headers:{
        "Content-Type": "application/json"
    },
})

// 添加請求攔截器來自動添加 accessToken
ideaWallApi.interceptors.request.use(
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

export const getIdeaWall = async (projectId,stage) => {
    const response = await ideaWallApi.get(`/${projectId}/${stage}`)
    return response.data
}

export const getAllIdeaWall = async (config) => {
    const response = await ideaWallApi.get("/", config)
    return response.data
}

export const createIdeaWall = async (data) => {
    const response = await ideaWallApi.post("/", data)
    return response.data
}