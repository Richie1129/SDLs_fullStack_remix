import axios from "axios";

const chatroomApi = axios.create({
    baseURL: "https://science.sdlswuret.com/api/chatroom",
    headers: {
        "Content-Type": "application/json"
    },
})

export const getChatroomHistory = async (projectId) => {
    const response = await chatroomApi.get(`/history/${projectId}`);
    return response.data;
}