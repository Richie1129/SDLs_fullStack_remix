// front-end API for project
import apiClient from './client';
import { authStorage } from '../services/storageService';

export const getProject = async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`)
    return response.data
}

export const getAllProject = async (config) => {
    // 如果 config 包含 headers，合併認證 token
    const token = authStorage.get('accessToken');

    // 構建完整的配置對象
    const fullConfig = {
        ...config,
        headers: {
            'Content-Type': 'application/json',
            ...config?.headers,
            ...(token && { 'accessToken': token })
        }
    };

    const response = await apiClient.get(`/projects`, fullConfig);
    return response.data;
}

export const getProjectsByMentor = async (mentorName, semester) => {
    const params = {};
    if (semester) params.semester = semester;
    const response = await apiClient.get(`/projects/mentor/${mentorName}`, { params });
    return response.data;
};

/**
 * 取得教師所有專案的可用學期列表
 * @param {string} mentorName - 教師名稱
 */
export const getAvailableSemesters = async (mentorName) => {
    const response = await apiClient.get(`/projects/mentor/${mentorName}/semesters`);
    return response.data;
};

export const createProject = async (data) => {
    const response = await apiClient.post(`/projects`, data)
    return response.data
}

export const inviteForProject = async (data) => {
    const response = await apiClient.post(`/projects/referral`, data)
    return response.data
}

export const updateProject = async (projectId, data) => {
    const response = await apiClient.put(`/projects/${projectId}`, data);
    return response.data;
};

export const deleteProject = async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
};

// ======================== 觀摩權限相關 API ========================

/**
 * 設定專案觀摩權限（教師專用）
 * @param {number} projectId - 專案ID
 * @param {Object} data - 權限設定資料
 * @param {boolean} data.is_open_for_viewing - 是否開放觀摩
 * @param {string[]} data.allowed_classes - 可觀摩的班級列表
 */
export const updateViewingSettings = async (projectId, data) => {
    const token = authStorage.get('accessToken');
    const response = await apiClient.patch(`/projects/${projectId}/viewing-settings`, data, {
        headers: {
            'accessToken': token,
            'Content-Type': 'application/json',
        },
    });
    return response.data;
};

/**
 * 檢查用戶對專案的觀摩權限
 * @param {number} projectId - 專案ID
 */
export const checkViewingPermission = async (projectId) => {
    const token = authStorage.get('accessToken');
    const response = await apiClient.get(`/projects/${projectId}/viewable`, {
        headers: {
            'accessToken': token,
        },
    });
    return response.data;
};

/**
 * 取得所有可用的班級列表
 */
export const getAllClasses = async () => {
    const token = authStorage.get('accessToken');

    const response = await apiClient.get('/projects/classes/list', {
        headers: {
            'accessToken': token,
        },
    });
    return response.data;
};

/**
 * 根據班級名稱獲取該班級的用戶和他們的專案
 * @param {string} className - 班級名稱
 */
// 獲取班級的用戶和專案資料
export const getClassUsersAndProjects = async (className) => {
    const token = authStorage.get('accessToken');

    const response = await apiClient.get(`/projects/classes/${className}/users-projects`, {
        headers: {
            'accessToken': token
        }
    });

    return response.data;
};

/**
 * 取得指定班級可觀摩的專案列表
 * @param {string} className - 班級名稱
 */
export const getViewableProjects = async (className) => {
    const token = authStorage.get('accessToken');
    const response = await apiClient.get('/projects', {
        params: { viewable_by: className },
        headers: {
            'accessToken': token,
        },
    });
    return response.data;
};

/**
 * 批量設定觀摩權限 - 讓目標班級能觀摩來源班級的所有專案
 * @param {Object} data - 批量設定資料
 * @param {string} data.sourceClass - 來源班級
 * @param {string[]} data.targetClasses - 目標班級列表
 * @param {string} data.mentorName - 指導老師名稱
 */
export const batchUpdateViewingSettings = async (data) => {
    const token = authStorage.get('accessToken');
    const response = await apiClient.post('/projects/batch-viewing-settings', data, {
        headers: {
            'accessToken': token,
            'Content-Type': 'application/json',
        },
    });
    return response.data;
};
