import apiClient from './client';

export const submitTask = async (data, extraConfig = {}) => {
    const isFormData = data instanceof FormData;
    const projectId = isFormData ? data.get('projectId') : data?.projectId;

    const response = await apiClient.post(`/submit`, data, {
        params: projectId ? { projectId } : undefined,
        ...extraConfig
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

// 刪除提交記錄
export const deleteSubmit = async (submitId) => {
    const response = await apiClient.delete(`/submit/${submitId}`);
    return response.data;
};

// export const getProfolioSubmit = async (submitId,config) => {
//     const response = await getsubmitApi.get(`/${submitId}/profolio`,config)
//     return response.data
// }
