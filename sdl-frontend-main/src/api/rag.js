// frontend api for rag.js
import axios from "axios";

const ragApi = axios.create({
    baseURL: "http://localhost/api/rag_message",
    headers: {
        "Content-Type": "application/json"
    },
})

// 測試 API 連接
export const testConnection = async (userId) => {
    const response = await ragApi.get(`/test/${userId}`);
    return response.data;
}

// 取得使用者所有 RAG 訊息歷史
export const getRAGHistory = async (userId) => {
    const response = await ragApi.get(`/history/${userId}`);
    return response.data;
}

// 取得使用者所有 RAG 訊息歷史（別名，保持向後相容）
export const getRagMessageHistory = async (userId) => {
    const response = await ragApi.get(`/history/${userId}`);
    return response.data;
}

// 根據 userId 和 sessionId 取得特定會話的訊息歷史
export const getRagMessageBySession = async (userId, sessionId) => {
    const response = await ragApi.get(`/session/${userId}/${sessionId}`);
    return response.data;
}

// 根據 userId 和 sessionId 取得 RAGFlow session ID
export const getRagflowSessionId = async (userId, sessionId) => {
    const response = await ragApi.get(`/ragflow-session/${userId}/${sessionId}`);
    return response.data;
}

// 根據 userId 取得所有會話列表
export const getUserSessions = async (userId) => {
    const response = await ragApi.get(`/sessions/${userId}`);
    return response.data;
}

// 新增：刪除對話會話
export const deleteSession = async (sessionId) => {
    const API_URL = "/proxy/api/v1/chats/a159fe08e2d411efb3910242ac120004";
    const API_KEY = "ragflow-U0ZTc4MzdlZTJjYjExZWZiMzcyMDI0Mm";
    
    // 調用 RAGFlow API 刪除會話 - 將 sessionId 包含在 URL 路徑中
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
        },
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`RAGFlow 刪除會話 API 回應：${response.status} - ${errorText}`);
        throw new Error(`刪除會話失敗: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("RAGFlow 刪除會話成功:", result);
    return result;
}

// 新增：從後端資料庫刪除會話相關的訊息記錄
export const deleteSessionMessages = async (userId, sessionId) => {
    const response = await ragApi.delete(`/session/${userId}/${sessionId}`);
    return response.data;
}

// 新增：創建新會話並保存開場白到資料庫
export const createNewSessionInDB = async (userId, sessionId, userName, projectId = null) => {
    const response = await ragApi.post('/create-session', {
        userId,
        sessionId,
        userName,
        projectId
    });
    return response.data;
}
