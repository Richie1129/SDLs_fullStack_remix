import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getProjectUser } from '../api/users';

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

      // 1) 初步檢查：URL 或 localStorage 是否請求觀摩模式
      const modeParam = searchParams.get('mode');
      const wantsObservation = modeParam === 'observation'
        || localStorage.getItem(`observationMode_${projectId}`) === 'true'
        || localStorage.getItem('isObservationMode') === 'true';

      // 2) 若使用者是專案成員，強制關閉觀摩模式（即使 URL 夾帶 observation）
      let isMember = false;
      try {
        if (projectId) {
          const members = await getProjectUser(projectId);
          const meId = localStorage.getItem('id');
          if (Array.isArray(members)) {
            isMember = members.some(m => String(m?.id ?? '') === String(meId ?? ''));
          }
        }
      } catch (e) {
        // 取不到成員資料時，不影響後續判斷，只是無法做成員排除
        console.warn('取得專案成員失敗，暫以非成員處理觀摩模式判斷');
      }

      if (isMember) {
        // 清掉任何觀摩模式標記，避免後續頁面殘留
        setIsObservationMode(false);
        localStorage.removeItem('isObservationMode');
        localStorage.removeItem(`observationMode_${projectId}`);
        setIsLoading(false);
        return;
      }

      // 3) 非成員：才依照 wantsObservation 決定是否觀摩
      setIsObservationMode(!!wantsObservation);
      if (wantsObservation) {
        localStorage.setItem(`observationMode_${projectId}`, 'true');
      }
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
