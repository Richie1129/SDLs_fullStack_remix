import apiClient from './client';

/**
 * 登出並撤銷 Refresh Token
 */
export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.error('Logout API failed', err);
    }
  }

  localStorage.clear();
  window.location.assign('/login');
};
