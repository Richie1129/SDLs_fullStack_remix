//api/reflection.js
import apiClient from './client';

// 取得所有個人日報
export const getAllPersonalDaily = async (config) => {
    const response = await apiClient.get(`/daily`, {
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
    const isFormData = data instanceof FormData;
    const projectId = isFormData ? data.get('projectId') : data?.projectId;
    const response = await apiClient.post(`/daily`, data, {
        // 將 projectId 也放到 query 中，避免在 multipart 尚未解析前被後端中介層拒絕
        params: projectId ? { projectId } : undefined
    });
    return response.data;
}

// 修改個人日報
export const updatePersonalDaily = async (id, data) => {
    console.log(`發送請求: PUT /daily/personal/${id}`, data);
    
    // 檢查 data 是否為 FormData（有檔案上傳）
    const isFormData = data instanceof FormData;
    
    const response = await apiClient.put(`/daily/personal/${id}`, data, {
        headers: isFormData 
            ? { "Content-Type": "multipart/form-data" } 
            : { "Content-Type": "application/json" }
    });
    return response.data;
};


// 取得所有團隊日報
export const getAllTeamDaily = async (config) => {
    const response = await apiClient.get(`/daily/team`, config);
    return response.data;
}

// 建立團隊日報
export const createTeamDaily = async (data) => {
    const isFormData = data instanceof FormData;
    const projectId = isFormData ? data.get('projectId') : data?.projectId;
    const response = await apiClient.post(`/daily/team`, data, {
        params: projectId ? { projectId } : undefined
    });
    return response.data;
}

// 修改團隊日報
export const updateTeamDaily = async (id, data) => {
    console.log(`發送請求: PUT /daily/team/${id}`, data);
    
    // 檢查 data 是否為 FormData（有檔案上傳）
    const isFormData = data instanceof FormData;

    const response = await apiClient.put(`/daily/team/${id}`, data, {
        headers: isFormData 
            ? { "Content-Type": "multipart/form-data" } 
            : { "Content-Type": "application/json" }
    });
    return response.data;
};

// 單獨刪除附件（個人）
export const removePersonalDailyAttachment = async (id) => {
  const response = await apiClient.delete(`/daily/personal/${id}/attachment`);
  return response.data;
};

// 單獨刪除附件（小組）
export const removeTeamDailyAttachment = async (id) => {
  const response = await apiClient.delete(`/daily/team/${id}/attachment`);
  return response.data;
};

// 刪除個人日誌
export const deletePersonalDaily = async (id) => {
  const response = await apiClient.delete(`/daily/personal/${id}`);
  return response.data;
};

// 刪除小組日誌
export const deleteTeamDaily = async (id) => {
  const response = await apiClient.delete(`/daily/team/${id}`);
  return response.data;
};
