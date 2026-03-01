import apiClient from './client';
import { authStorage } from '../services/storageService';

export const userLogin = async (userdata) => {
    const response = await apiClient.post(`/users/login`, userdata)
    return response;
}

export const userRegister = async (userdata) => {
    const response = await apiClient.post(`/users/register`, userdata)
    return response;
}

export const getSchools = async () => {
    const response = await apiClient.get('/schools');
    return response.data.schools;
}

export const  getProjectUser = async (projectId) => {
    const response = await apiClient.get(`/users/project/${projectId}`)
    return response.data
}

// get all teachers
export const getAllTeachers = async () => {
    try {
        const response = await apiClient.get('/users/teachers');
        return response.data; // 返回的數據會包含所有角色為 'teacher' 的用戶
    } catch (error) {
        console.error('Failed to fetch teachers:', error);
        throw error; // 可以根據需要進一步處理錯誤或傳播
    }
}

// get current user
export const getCurrentUser = async () => {
    try {
        const token = authStorage.get('accessToken');
        const response = await apiClient.get('/users/me', {
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

// update user profile
export const updateUserProfile = async (userData) => {
    try {
        const response = await apiClient.put('/users/profile', userData);
        return response.data;
    } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
    }
}

// update user password
export const updateUserPassword = async (passwordData) => {
    try {
        const response = await apiClient.put('/users/password', passwordData);
        return response.data;
    } catch (error) {
        console.error('Failed to update user password:', error);
        throw error;
    }
}

// 批次獲取多個專案的用戶
export const batchGetProjectUsers = async (projectIds) => {
    try {
        const response = await apiClient.post('/users/batch-project-users', {
            projectIds
        });
        return response.data; // { projectId1: [users...], projectId2: [users...] }
    } catch (error) {
        console.error('Failed to batch fetch project users:', error);
        throw error;
    }
}
