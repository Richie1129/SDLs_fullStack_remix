//frontend api for announcement.js
import axios from "axios";

const announcementApi = axios.create({
    baseURL: "http://localhost/api/announcements", // 確保路徑正確
    headers: {
        "Content-Type": "application/json",
    },
});

// 獲取公告列表
export const getAnnouncements = async (projectId) => {
    try {
        const userId = localStorage.getItem('id'); // 獲取當前用戶ID
        let query = '';
        
        if (projectId) {
            query = `/?projectId=${projectId}`;
            if (userId) {
                query += `&userId=${userId}`;
            }
        } else if (userId) {
            query = `/?userId=${userId}`;
        }
        
        console.log(`正在請求公告列表，projectId: ${projectId || 'all'}, userId: ${userId}`);
        const response = await announcementApi.get(query);
        console.log("公告列表獲取成功:", response.data);
        return response.data.announcements;
    } catch (error) {
        console.error("無法獲取公告列表:", error);
        throw error;
    }
};

// 發佈公告
export const createAnnouncement = async (announcementData) => {
    try {
        console.log("即將發送的公告數據:", announcementData);
        const response = await announcementApi.post("/create", announcementData);
        console.log("公告發佈成功:", response.data);
        return response.data.announcement;
    } catch (error) {
        console.error("無法發佈公告:", error);
        if (error.response) {
            console.log("API 回應內容:", error.response.data);
        } else {
            console.log("未收到 API 回應:", error.message);
        }
        throw error;
    }
};

