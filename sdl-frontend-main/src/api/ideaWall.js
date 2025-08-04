import axios from "axios";

axios.defaults.withCredentials = true; 
const ideaWallApi = axios.create({
    baseURL: "http://localhost/api/ideaWall",
    headers:{
        "Content-Type":" application/json"
    },
})

export const getIdeaWall = async (projectId,stage) => {
    const response = await ideaWallApi.get(`/${projectId}/${stage}`)
    return response.data
}

export const getAllIdeaWall = async (config) => {
    const response = await ideaWallApi.get("/", config)
    return response.data
}

export const createIdeaWall = async (data) => {
    const response = await ideaWallApi.post("/", data)
    return response.data
}