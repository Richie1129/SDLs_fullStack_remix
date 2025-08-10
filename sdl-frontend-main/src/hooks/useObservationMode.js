import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

/**
 * 觀摩模式 Hook
 * 統一管理觀摩模式狀態，確保在所有頁面間保持一致
 */
export const useObservationMode = () => {
  const [isObservationMode, setIsObservationMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();

  // 檢查觀摩模式
  const checkObservationMode = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. 檢查 URL 參數
      const modeParam = searchParams.get('mode');
      if (modeParam === 'observation') {
        setIsObservationMode(true);
        localStorage.setItem(`observationMode_${projectId}`, 'true');
        setIsLoading(false);
        return;
      }

      // 2. 檢查 localStorage 中的項目特定狀態
      const projectObservationMode = localStorage.getItem(`observationMode_${projectId}`);
      if (projectObservationMode === 'true') {
        setIsObservationMode(true);
        setIsLoading(false);
        return;
      }

      // 3. 檢查全域觀摩模式標記
      const globalObservationMode = localStorage.getItem('isObservationMode');
      if (globalObservationMode === 'true') {
        setIsObservationMode(true);
        localStorage.setItem(`observationMode_${projectId}`, 'true');
        setIsLoading(false);
        return;
      }

      // 4. 如果都沒有，則不是觀摩模式
      setIsObservationMode(false);
      setIsLoading(false);
    } catch (error) {
      console.error('檢查觀摩模式失敗:', error);
      setIsObservationMode(false);
      setIsLoading(false);
    }
  }, [projectId, searchParams]);

  // 啟用觀摩模式
  const enableObservationMode = useCallback(() => {
    setIsObservationMode(true);
    localStorage.setItem('isObservationMode', 'true');
    if (projectId) {
      localStorage.setItem(`observationMode_${projectId}`, 'true');
    }
  }, [projectId]);

  // 禁用觀摩模式
  const disableObservationMode = useCallback(() => {
    setIsObservationMode(false);
    localStorage.removeItem('isObservationMode');
    if (projectId) {
      localStorage.removeItem(`observationMode_${projectId}`);
    }
    // 清除已顯示過觀摩模式提示的標記
    localStorage.removeItem('observationModeShown');
  }, [projectId]);

  // 監聽項目ID和URL參數變化
  useEffect(() => {
    if (projectId) {
      checkObservationMode();
    }
  }, [projectId, checkObservationMode]);

  // 監聽來自後端的權限錯誤，自動啟用觀摩模式
  useEffect(() => {
    const handlePermissionError = (event) => {
      const { detail } = event;
      if (detail && detail.code === 'READ_ONLY_MODE') {
        enableObservationMode();
        
        // 顯示觀摩模式提示（只顯示一次）
        const hasShownNotification = localStorage.getItem(`observationModeNotificationShown_${projectId}`);
        if (!hasShownNotification) {
          // 這裡可以觸發通知
          localStorage.setItem(`observationModeNotificationShown_${projectId}`, 'true');
          
          // 派發自定義事件通知其他組件
          window.dispatchEvent(new CustomEvent('observationModeActivated', {
            detail: { projectId, message: '您正在觀摩模式下瀏覽此專案，無法進行編輯操作。' }
          }));
        }
      }
    };

    // 監聽自定義權限錯誤事件
    window.addEventListener('permissionError', handlePermissionError);

    return () => {
      window.removeEventListener('permissionError', handlePermissionError);
    };
  }, [projectId, enableObservationMode]);

  return {
    isObservationMode,
    isLoading,
    enableObservationMode,
    disableObservationMode,
    checkObservationMode
  };
};

export default useObservationMode;
