import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getProjectUser } from '../api/users';
import { getProject } from '../api/project';
import { getCurrentUsername } from '../utils/userUtils';
import { getCurrentUserId } from '../utils/authUtils';
import { projectStorage } from '../services/storageService';

/**
 * ObservationProvider - 觀摩模式狀態的唯一來源
 *
 * 背景（F3）：原本 useObservationMode 在每個呼叫端各自用 axios 打 getProjectUser 與 getProject，
 * 看板每張卡片都呼叫一次，20 張卡片就是 46 次相同請求。
 * 改成在 ProjectLayout 掛一個 Provider，內部用 React Query（與 TopBar / SubStageBar 共用同一組 key），
 * 各頁面與卡片只讀 context。
 *
 * query key 與其他元件一致：['getProjectUser', projectId]、['getProject', projectId]
 */

const PROJECT_INFO_STALE_MS = 5 * 60 * 1000;

export const ObservationContext = createContext(null);

const readWantsObservation = (searchParams, projectId) => {
  const modeParam = searchParams.get('mode');
  return modeParam === 'observation'
    || projectStorage.getBoolean(`observationMode_${projectId}`)
    || projectStorage.getBoolean('isObservationMode');
};

export function ObservationProvider({ children }) {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const [isObservationMode, setIsObservationMode] = useState(false);

  const membersQuery = useQuery(
    ['getProjectUser', projectId],
    () => getProjectUser(projectId),
    { enabled: !!projectId, staleTime: PROJECT_INFO_STALE_MS }
  );
  const projectQuery = useQuery(
    ['getProject', projectId],
    () => getProject(projectId),
    { enabled: !!projectId, staleTime: PROJECT_INFO_STALE_MS }
  );

  // 兩支 query 都離開 loading（成功或失敗）才算判斷完成；取不到資料時視為非成員，與原本行為相同
  const isLoading = !!projectId && (membersQuery.isLoading || projectQuery.isLoading);

  const isMemberOrMentor = useMemo(() => {
    if (!projectId) return false;
    const members = membersQuery.data;
    const project = projectQuery.data;
    const meId = getCurrentUserId();
    const currentUser = getCurrentUsername();

    if (Array.isArray(members) && members.some(m => String(m?.id ?? '') === String(meId ?? ''))) {
      return true;
    }
    return !!(project && project.mentor === currentUser);
  }, [projectId, membersQuery.data, projectQuery.data]);

  /**
   * 重新評估觀摩模式（與原本 checkObservationMode 的判斷順序相同）：
   * 1. URL 或 localStorage 是否要求觀摩
   * 2. 成員或指導老師一律關閉觀摩並清掉標記
   * 3. 非成員才依 wantsObservation 決定
   */
  const evaluate = useCallback(() => {
    if (!projectId) return;
    const wantsObservation = readWantsObservation(searchParams, projectId);

    if (isMemberOrMentor) {
      setIsObservationMode(false);
      projectStorage.remove('isObservationMode');
      projectStorage.remove(`observationMode_${projectId}`);
      return;
    }

    setIsObservationMode(!!wantsObservation);
    if (wantsObservation) {
      projectStorage.set(`observationMode_${projectId}`, 'true');
    }
  }, [projectId, searchParams, isMemberOrMentor]);

  useEffect(() => {
    if (isLoading) return;
    evaluate();
  }, [isLoading, evaluate]);

  const checkObservationMode = useCallback(async () => {
    await Promise.all([membersQuery.refetch(), projectQuery.refetch()]);
    // refetch 完成後 isMemberOrMentor 會更新並觸發上方 effect 重新評估
  }, [membersQuery, projectQuery]);

  const enableObservationMode = useCallback(() => {
    setIsObservationMode(true);
    projectStorage.set('isObservationMode', 'true');
    if (projectId) {
      projectStorage.set(`observationMode_${projectId}`, 'true');
    }
  }, [projectId]);

  const disableObservationMode = useCallback(() => {
    setIsObservationMode(false);
    projectStorage.remove('isObservationMode');
    if (projectId) {
      projectStorage.remove(`observationMode_${projectId}`);
    }
    // 清除已顯示過觀摩模式提示的標記
    projectStorage.remove('observationModeShown');
  }, [projectId]);

  // 監聽來自後端的權限錯誤，自動啟用觀摩模式（原本每個呼叫端各掛一個 listener，現在只掛一次）
  useEffect(() => {
    const handlePermissionError = (event) => {
      const { detail } = event;
      if (detail && detail.code === 'READ_ONLY_MODE') {
        enableObservationMode();

        const hasShownNotification = projectStorage.getBoolean(`observationModeNotificationShown_${projectId}`);
        if (!hasShownNotification) {
          projectStorage.set(`observationModeNotificationShown_${projectId}`, 'true');
          window.dispatchEvent(new CustomEvent('observationModeActivated', {
            detail: { projectId, message: '您正在觀摩模式下瀏覽此專案，無法進行編輯操作。' }
          }));
        }
      }
    };

    window.addEventListener('permissionError', handlePermissionError);
    return () => {
      window.removeEventListener('permissionError', handlePermissionError);
    };
  }, [projectId, enableObservationMode]);

  const value = useMemo(() => ({
    isObservationMode,
    isLoading,
    enableObservationMode,
    disableObservationMode,
    checkObservationMode,
  }), [isObservationMode, isLoading, enableObservationMode, disableObservationMode, checkObservationMode]);

  return (
    <ObservationContext.Provider value={value}>
      {children}
    </ObservationContext.Provider>
  );
}

export const useObservationContext = () => useContext(ObservationContext);

export default ObservationProvider;
