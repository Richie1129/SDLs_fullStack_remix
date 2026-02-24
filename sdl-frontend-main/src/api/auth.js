import apiClient from './client';
import storageService, { authStorage } from '../services/storageService';

/**
 * 登出並撤銷 Refresh Token
 */
export const logout = async () => {
  const refreshToken = authStorage.get('refreshToken');

  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.error('Logout API failed', err);
    }
  }

  storageService.clear();
  window.location.assign('/login');
};
