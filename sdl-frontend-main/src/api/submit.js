import axios from "axios";

axios.defaults.withCredentials = true; 
const submitApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/submit",
    headers:{
        "Content-Type":" multipart/form-data"
    },
})

const getsubmitApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/submit",
    headers:{
        "Content-Type":" application/json"
    },
})

// 添加請求攔截器以自動添加 token
const addTokenInterceptor = (apiInstance) => {
    apiInstance.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers['accessToken'] = token;
                try {
                    // Debug: 確認送出時是否有帶 token
                    console.log('[submitApi] attaching accessToken header:', !!token);
                } catch {}
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
};

addTokenInterceptor(submitApi);
addTokenInterceptor(getsubmitApi);

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
    const response = await submitApi.post("/", data, {
        params: projectId ? { projectId } : undefined
    })
    return response.data
}

export const getSubmitAttachment = async (submitId, config) => {
    const response = await getsubmitApi.get(`/${submitId}`,config)
    return response.data
}

export const getAllSubmit = async (config) => {
    const response = await submitApi.get("/",config)
    return response.data
}

export const updateSubmitTask = async (submitId, data) => {
    const response = await getsubmitApi.put(`/${submitId}`, data);
    return response.data;
};

// 上傳檔案用 multipart/form-data
export const updateSubmitAttachment = async (submitId, formData) => {
    const response = await submitApi.put(`/${submitId}`, formData);
    return response.data;
};

// 取得提交變更記錄
export const getSubmitChangeLogs = async (submitId) => {
    const response = await getsubmitApi.get(`/${submitId}/changes`);
    return response.data;
};

// export const getProfolioSubmit = async (submitId,config) => {
//     const response = await getsubmitApi.get(`/${submitId}/profolio`,config)
//     return response.data
// }
