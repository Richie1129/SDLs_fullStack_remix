import apiClient from './client';

// GET /api/admin/users
export const listUsers = async ({ keyword = '', role = 'all', page = 1, pageSize = 20 } = {}) => {
    const response = await apiClient.get('/admin/users', {
        params: { keyword, role, page, pageSize }
    });
    return response.data;
};

// PUT /api/admin/users/:userId/reset-password
export const resetUserPassword = async (userId) => {
    const response = await apiClient.put(`/admin/users/${userId}/reset-password`);
    return response.data;
};

// PATCH /api/admin/users/:userId/ai-access
export const toggleAiAccess = async (userId, aiEnabled) => {
    const response = await apiClient.patch(`/admin/users/${userId}/ai-access`, { aiEnabled });
    return response.data;
};
