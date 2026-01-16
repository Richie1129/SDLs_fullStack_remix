//frontend api for announcement.js
import apiClient from './client';
import { getCurrentUserId } from '../utils/authUtils';

// 獲取公告列表
export const getAnnouncements = async (projectId) => {
    try {
        const userId = getCurrentUserId();
        let query = '';

        if (projectId) {
            query = `/?projectId=${projectId}`;
            if (userId) {
                query += `&userId=${userId}`;
            }
        } else if (userId) {
            query = `/?userId=${userId}`;
        }

        const response = await apiClient.get(`/announcements${query}`);
        return response.data.announcements;
    } catch (error) {
        console.error("Failed to get announcements | 無法獲取公告列表:", error);
        throw error;
    }
};

// 發佈公告
export const createAnnouncement = async (announcementData) => {
    try {
        const response = await apiClient.post(`/announcements/create`, announcementData);
        return response.data.announcement;
    } catch (error) {
        console.error("Failed to create announcement | 無法發佈公告:", error);
        throw error;
    }
};
