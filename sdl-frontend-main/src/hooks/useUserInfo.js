import { useState, useEffect } from 'react';
import { getCurrentUser, getCurrentUserId, getCurrentUserRole } from '../utils/authUtils';
import { userStorage } from '../services/storageService';

// 自定義Hook用於管理用戶資訊並監聽更新
export const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState({
    username: userStorage.get('username', ''),
    account: userStorage.get('account', ''),
    role: getCurrentUserRole(),
    class: userStorage.get('class', ''),
    id: getCurrentUserId().toString()
  });

  useEffect(() => {
    const handleUserProfileUpdated = (event) => {
      const { username, class: userClass, seatNumber } = event.detail;

      // 更新狀態
      setUserInfo(prev => ({
        ...prev,
        username,
        class: userClass
      }));

      // 同步更新localStorage（如果需要）
      if (userClass !== undefined) {
        userStorage.set('class', userClass);
      }
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdated);

    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdated);
    };
  }, []);

  return userInfo;
};

// 便捷的Hook，只返回username
export const useUsername = () => {
  const [username, setUsername] = useState(userStorage.get('username', ''));

  useEffect(() => {
    const handleUserProfileUpdated = (event) => {
      setUsername(event.detail.username);
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdated);

    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdated);
    };
  }, []);

  return username;
};