import apiClient from './client';

export const submitTask = async (data) => {
    const isFormData = data instanceof FormData;
    const projectId = isFormData ? data.get('projectId') : data?.projectId;
    // Debug: 前端送出前的資料快照
    try {
        console.log('=== submitTask Debug ===');
        const token = localStorage.getItem('accessToken');
        console.log('Has accessToken:', !!token);
        console.log('projectId:', projectId);
        if (isFormData) {
            const entries = [];
            for (const [k, v] of data.entries()) {
                entries.push([k, typeof v === 'string' ? v : (v?.name || '[File]')]);
            }
            console.log('FormData entries:', entries);
            console.log('FormData.userId (if any):', data.get('userId'));
        } else {
            console.log('JSON payload:', data);
        }
    } catch {}
    const response = await apiClient.post(`/submit`, data, {
        params: projectId ? { projectId } : undefined
    })
    return response.data
}

export const getSubmitAttachment = async (submitId, config) => {
    const response = await apiClient.get(`/submit/${submitId}`,config)
    return response.data
}

export const getAllSubmit = async (config) => {
    const response = await apiClient.get(`/submit`,config)
    return response.data
}

export const updateSubmitTask = async (submitId, data) => {
    const response = await apiClient.put(`/submit/${submitId}`, data);
    return response.data;
};

// 上傳檔案用 multipart/form-data
export const updateSubmitAttachment = async (submitId, formData) => {
    const response = await apiClient.put(`/submit/${submitId}`, formData);
    return response.data;
};

// 取得提交變更記錄
export const getSubmitChangeLogs = async (submitId) => {
    const response = await apiClient.get(`/submit/${submitId}/changes`);
    return response.data;
};

// export const getProfolioSubmit = async (submitId,config) => {
//     const response = await getsubmitApi.get(`/${submitId}/profolio`,config)
//     return response.data
// }
