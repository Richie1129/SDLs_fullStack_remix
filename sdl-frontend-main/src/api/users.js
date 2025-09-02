import apiClient from './client';

export const userLogin = async (userdata) => {
    const response = await apiClient.post(`/users/login`, userdata)
    return response;
}

export const userRegister = async (userdata) => {
    const response = await apiClient.post(`/users/register`, userdata)
    return response;
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
        const token = localStorage.getItem('authToken');
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
