import axios from "axios";

axios.defaults.withCredentials = true; 
//login & register
const usersApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/users",
    headers:{
        "Content-Type":" application/json"
    },
})

// 添加請求攔截器來自動添加 accessToken
usersApi.interceptors.request.use(
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

export const userLogin = async (userdata) => {
    const response = await usersApi.post("/login", userdata)
    return response;
}

export const userRegister = async (userdata) => {
    const response = await usersApi.post("/register", userdata)
    return response;
}

export const  getProjectUser = async (projectId) => {
    const response = await usersApi.get(`/project/${projectId}`)
    return response.data
}

// get all teachers
export const getAllTeachers = async () => {
    try {
        const response = await usersApi.get('/teachers');
        return response.data; // 返回的數據會包含所有角色為 'teacher' 的用戶
    } catch (error) {
        console.error('Failed to fetch teachers:', error);
        throw error; // 可以根據需要進一步處理錯誤或傳播
    }
}

// get current user
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await usersApi.get('/me', {
            headers: {
                'accessToken': token,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch current user:', error);
        throw error;
    }
}