import axios from "axios";

axios.defaults.withCredentials = true; 
const submitApi = axios.create({
    baseURL: "http://localhost/api/submit",
    headers:{
        "Content-Type":" multipart/form-data"
    },
})

const getsubmitApi = axios.create({
    baseURL: "http://localhost/api/submit",
    headers:{
        "Content-Type":" application/json"
    },
})

export const submitTask = async (data) => {
    const response = await submitApi.post("/", data)
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
