import axios from "axios";

const stageApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/stage",
    headers:{
        "Content-Type":" application/json"
    },
})

// 添加請求攔截器來自動添加 accessToken
stageApi.interceptors.request.use(
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

export const getSubStage = async (currentStage) => {
    const response = await stageApi.post("/",currentStage )
    return response.data
}