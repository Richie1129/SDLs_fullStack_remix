// front-end API for project
import axios from "axios";

const projectApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/projects",
    headers:{
        "Content-Type":" application/json",
    },
})

// 添加請求攔截器來自動添加 accessToken
projectApi.interceptors.request.use(
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

export const getProject = async (projectId) => {
    const response = await projectApi.get(`/${projectId}`)
    return response.data
}

export const getAllProject = async (config) => {
    // 如果 config 包含 headers，合併認證 token
    const token = localStorage.getItem('accessToken');
    
    // 構建完整的配置對象
    const fullConfig = {
        ...config,
        headers: {
            'Content-Type': 'application/json',
            ...config?.headers,
            ...(token && { 'accessToken': token })
        }
    };
    
    console.log('getAllProject API 調用:');
    console.log('- token:', token);
    console.log('- config:', config);
    console.log('- fullConfig:', fullConfig);
    
    const response = await projectApi.get("/", fullConfig);
    console.log('getAllProject API 回應:', response.data);
    return response.data;
}

export const getProjectsByMentor = async (mentorName) => {
    const response = await projectApi.get(`/mentor/${mentorName}`);
    return response.data;
};

export const createProject = async (data) => {
    const response = await projectApi.post("/", data)
    return response.data
}

export const inviteForProject = async (data) => {
    const response = await projectApi.post("/referral", data)
    return response.data
}

export const updateProject = async (projectId, data) => {
    const response = await projectApi.put(`/${projectId}`, data);
    return response.data;
};

export const deleteProject = async (projectId) => {
    const response = await projectApi.delete(`/${projectId}`);
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
    const token = localStorage.getItem('accessToken'); // 修正：使用正確的令牌名稱
    const response = await projectApi.patch(`/${projectId}/viewing-settings`, data, {
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
    const token = localStorage.getItem('accessToken'); // 修正：使用正確的令牌名稱
    const response = await projectApi.get(`/${projectId}/viewable`, {
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
    console.log('=== getAllClasses API 被調用 ===');
    const token = localStorage.getItem('accessToken'); // 修正：使用正確的令牌名稱
    console.log('從 localStorage 取得的 token:', token);
    console.log('準備發送請求到:', 'http://localhost/api/projects/classes/list');
    
    try {
        const response = await projectApi.get('/classes/list', {
            headers: {
                'accessToken': token,
            },
        });
        console.log('getAllClasses API 成功響應:', response.data);
        return response.data;
    } catch (error) {
        console.error('getAllClasses API 錯誤:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        throw error;
    }
};

/**
 * 根據班級名稱獲取該班級的用戶和他們的專案
 * @param {string} className - 班級名稱
 */
// 獲取班級的用戶和專案資料
export const getClassUsersAndProjects = async (className) => {
    console.log('API: 開始查詢班級資料:', className);
    try {
        const token = localStorage.getItem('accessToken');
        console.log('API: 發送 token:', token);
        
        const response = await projectApi.get(`/classes/${className}/users-projects`, {
            headers: {
                'accessToken': token
            }
        });
        
        console.log('API: 班級資料查詢成功:', response.data);
        return response.data;
    } catch (error) {
        console.error('API: 班級資料查詢失敗:', error);
        console.error('API: 錯誤詳情:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        throw error;
    }
};

/**
 * 取得指定班級可觀摩的專案列表
 * @param {string} className - 班級名稱
 */
export const getViewableProjects = async (className) => {
    const token = localStorage.getItem('accessToken'); // 修正：使用正確的令牌名稱
    const response = await projectApi.get('/', {
        params: { viewable_by: className },
        headers: {
            'accessToken': token,
        },
    });
    return response.data;
};
