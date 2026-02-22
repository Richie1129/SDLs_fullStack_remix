// frontend api for rag.js
import apiClient from './client';

// 測試 API 連接
export const testConnection = async (userId) => {
    const response = await apiClient.get(`/rag_message/test/${userId}`);
    return response.data;
}

// 取得使用者所有 RAG 訊息歷史
export const getRAGHistory = async (userId) => {
    const response = await apiClient.get(`/rag_message/history/${userId}`);
    return response.data;
}

// 取得使用者所有 RAG 訊息歷史（別名，保持向後相容）
export const getRagMessageHistory = async (userId) => {
    const response = await apiClient.get(`/rag_message/history/${userId}`);
    return response.data;
}

// 根據 userId 和 sessionId 取得特定會話的訊息歷史
// ✅ v2.0: 支援 projectId 參數（可選，0破壞性）
export const getRagMessageBySession = async (userId, sessionId, projectId = null) => {
    let url = `/rag_message/session/${userId}/${sessionId}`;

    // ✅ 如果有 projectId，加入 query parameter
    if (projectId) {
        url += `?projectId=${projectId}`;
    }

    const response = await apiClient.get(url);
    return response.data;
}

// 根據 userId 和 sessionId 取得 RAGFlow session ID
export const getRagflowSessionId = async (userId, sessionId) => {
    const response = await apiClient.get(`/rag_message/ragflow-session/${userId}/${sessionId}`);
    return response.data;
}

// 根據 userId 取得所有會話列表
// ✅ v2.0: 支援 projectId 參數（可選，0破壞性）
export const getUserSessions = async (userId, projectId = null) => {
    let url = `/rag_message/sessions/${userId}`;

    // ✅ 如果有 projectId，加入 query parameter
    if (projectId) {
        url += `?projectId=${projectId}`;
    }

    const response = await apiClient.get(url);
    return response.data;
}

// 新增：刪除對話會話（通過後端代理）
export const deleteSession = async (sessionId) => {
    const response = await apiClient.delete(`/proxy/a159fe08e2d411efb3910242ac120004/sessions/${sessionId}`);
    return response.data;
}

// 新增：從後端資料庫刪除會話相關的訊息記錄
// ✅ v2.0: 支援 projectId 參數（可選，0破壞性）
export const deleteSessionMessages = async (userId, sessionId, projectId = null) => {
    let url = `/rag_message/session/${userId}/${sessionId}`;

    // ✅ 如果有 projectId，加入 query parameter
    if (projectId) {
        url += `?projectId=${projectId}`;
    }

    const response = await apiClient.delete(url);
    return response.data;
}

// 新增：創建新會話並保存開場白到資料庫
export const createNewSessionInDB = async (userId, sessionId, userName, projectId = null) => {
    const response = await apiClient.post('/rag_message/create-session', {
        userId,
        sessionId,
        userName,
        projectId
    });
    return response.data;
}

// 新增：使用 Gemini 生成對話摘要標題
export const generateSessionTitle = async (sessionId, userId, firstMessage, projectId = null) => {
    const response = await apiClient.post(`/rag_message/generate-title/${sessionId}`, {
        userId,
        firstMessage,
        projectId
    });
    return response.data;
}
