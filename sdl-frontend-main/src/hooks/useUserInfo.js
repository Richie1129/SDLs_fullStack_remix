import { useState, useEffect } from 'react';

// 自定義Hook用於管理用戶資訊並監聽更新
export const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState({
    username: localStorage.getItem('username') || '',
    account: localStorage.getItem('account') || '',
    role: localStorage.getItem('role') || '',
    class: localStorage.getItem('class') || '',
    id: localStorage.getItem('id') || ''
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
        localStorage.setItem('class', userClass);
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
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

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