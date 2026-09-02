import apiClient from './client';

/**
 * 取得聊天室歷史訊息（舊到新）
 * 後端預設只回最新 200 筆；傳 before（訊息 id）可往前翻頁取得更早的訊息
 * @param {string|number} projectId
 * @param {{ limit?: number, before?: number }} [options]
 */
export const getChatroomHistory = async (projectId, options = {}) => {
    const params = {};
    if (options.limit) params.limit = options.limit;
    if (options.before) params.before = options.before;
    const response = await apiClient.get(`/chatroom/history/${projectId}`, { params });
    return response.data;
}
