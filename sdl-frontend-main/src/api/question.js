import axios from "axios";

const questionApi = axios.create({
    baseURL: "http://localhost/api/question",
    headers: {
        "Content-Type": " application/json",
    },
})

export const getAllChatrooms = async (projectId) => {
    const response = await questionApi.get(`/${projectId}`)
    return response.data
}

export const getUserChatrooms = async (projectId, userId) => {
    const response = await questionApi.get(`/${projectId}/${userId}`)
    return response.data
}

export const getMessages = async (questionId) => {
    const response = await questionApi.get(`/messages/${questionId}`);
    return response.data;
};

export const createChatroom = async (data) => {
    const response = await questionApi.post("/createChatroom", data)//title, userId, projectId
    return response.data
}

export const createMessage = async (data) => {
    const response = await questionApi.post("/createMessage", data)//message, author, chatroomId
    return response.data
}

export const deleteChatroom = async (questionId) => {
    const response = await questionApi.delete(`/chatrooms/${questionId}`);
    return response.data;
};
