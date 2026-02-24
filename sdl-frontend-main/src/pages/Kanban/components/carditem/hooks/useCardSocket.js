import { useEffect } from 'react';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { socket } from '../../../../../utils/socket';

/**
 * useCardSocket - Socket 實時通信邏輯
 *
 * 職責：
 * - 監聽任務更新事件
 * - 監聽任務刪除事件
 * - 處理錯誤事件
 * - 自動刷新緩存
 *
 * Linus: "完美 - Socket 邏輯完全獨立，主組件不需要知道細節"
 *
 * @param {string} cardId - 卡片 ID
 * @param {string} projectId - 專案 ID
 * @param {Object} queryClient - React Query client
 */
export function useCardSocket(cardId, projectId, queryClient) {
  useEffect(() => {
    if (!cardId) return;

    /**
     * 處理任務更新事件
     */
    const handleTaskUpdate = (updateData) => {
      if (updateData && (updateData.taskId === cardId || updateData.id === cardId)) {
        queryClient.invalidateQueries(['taskChangeLogs', cardId]);
        queryClient.invalidateQueries(['kanbanDatas', projectId]);
      }
    };

    /**
     * 處理任務刪除成功
     */
    const handleTaskDeleted = (payload) => {
      if (!payload) return;

      const sameTask = Number(payload.taskId) === Number(cardId);
      if (sameTask) {
        try {
          Swal.fire({
            title: '已刪除！',
            text: '卡片已刪除。',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
        } catch (_) {
          // Swal 失敗不阻塞流程
        }
        queryClient.invalidateQueries(['kanbanDatas', projectId]);
      }
    };

    /**
     * 處理刪除錯誤
     * Linus: "錯誤處理必須到位 - 用戶不應該看到不一致的狀態"
     */
    const handleDeleteError = (err) => {
      const msg = err?.message || '刪除失敗';
      toast.error(msg);
      // 回滾：以伺服器資料為準
      queryClient.invalidateQueries(['kanbanDatas', projectId]);
    };

    // 註冊事件監聽器
    socket.on('taskItem', handleTaskUpdate);
    socket.on('activityUpdate', handleTaskUpdate);
    socket.on('cardUpdated', handleTaskUpdate);
    socket.on('taskDeleted', handleTaskDeleted);
    socket.on('taskDeleteError', handleDeleteError);

    // 清理函數：防止內存洩漏
    return () => {
      socket.off('taskItem', handleTaskUpdate);
      socket.off('activityUpdate', handleTaskUpdate);
      socket.off('cardUpdated', handleTaskUpdate);
      socket.off('taskDeleted', handleTaskDeleted);
      socket.off('taskDeleteError', handleDeleteError);
    };
  }, [cardId, projectId, queryClient]);
}
