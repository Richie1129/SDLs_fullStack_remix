//api/reflection.js
import axios from "axios";

axios.defaults.withCredentials = true; 
const dailyApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/daily",
    headers:{
        "Content-Type": "multipart/form-data"
    },
})

// 取得所有個人日報
export const getAllPersonalDaily = async (config) => {
    const response = await dailyApi.get("/", {
        params: { 
            projectId: config.projectId, 
            userId: config.userId, 
            isTeacher: config.isTeacher // 傳入教師身份
        }
    });
    return response.data;
};

// 建立個人日報
export const createPersonalDaily = async (data) => {
    const response = await dailyApi.post("/", data);
    return response.data;
}

// 修改個人日報
export const updatePersonalDaily = async (id, data) => {
    console.log(`發送請求: PUT https://science.sdlswuret.com/api/daily/personal/${id}`, data);
    
    // 檢查 data 是否為 FormData（有檔案上傳）
    const isFormData = data instanceof FormData;
    
    const response = await dailyApi.put(`/personal/${id}`, data, {
        headers: isFormData 
            ? { "Content-Type": "multipart/form-data" } 
            : { "Content-Type": "application/json" }
    });
    return response.data;
};


// 取得所有團隊日報
export const getAllTeamDaily = async (config) => {
    const response = await dailyApi.get("/team", config);
    return response.data;
}

// 建立團隊日報
export const createTeamDaily = async (config) => {
    const response = await dailyApi.post("/team", config);
    return response.data;
}

// 修改團隊日報
export const updateTeamDaily = async (id, data) => {
    const response = await dailyApi.put(`/team/${id}`, data, {
        headers: { "Content-Type": "application/json" },
    });
    return response.data;
};