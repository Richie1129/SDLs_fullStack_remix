// front-end API for project
import axios from "axios";

const projectApi = axios.create({
    baseURL: "http://localhost/api/projects",
    headers:{
        "Content-Type":" application/json",
    },
})

export const getProject = async (projectId) => {
    const response = await projectApi.get(`/${projectId}`)
    return response.data
}

export const getAllProject = async (config) => {
    const response = await projectApi.get("/",config)
    return response.data
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
