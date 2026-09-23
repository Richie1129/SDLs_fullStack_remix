import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import {
  getAllTeamDaily,
  createTeamDaily,
  updateTeamDaily,
  deleteTeamDaily,
  removeTeamDailyAttachment,
} from "../../../api/reflection";
import { extractErrorMessage } from '@/constants/dailyErrorCodes.js';
import { confirmDialog } from '../../../utils/dialogs';

// 固定參考，避免資料未到時每次 render 產生新陣列
const EMPTY_LIST = [];

/**
 * Hook for managing team daily logs
 * Handles CRUD operations, file attachments, and cache management
 */
export function useTeamDaily(projectId) {
  const queryClient = useQueryClient();

  // Query key for cache consistency
  const QUERY_KEY = ["teamDaily", projectId];

  // Fetch team daily logs
  // 列表直接從 query data 推導：全域 staleTime 下重新進頁命中快取時不會觸發 onSuccess
  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getAllTeamDaily({ params: { projectId: projectId } }),
    enabled: !!projectId,
  });

  const teamDaily = Array.isArray(data) ? data : EMPTY_LIST;
  const showEmptyMessage = teamDaily.length === 0 && !isLoading && !isError;

  // Create mutation
  const createMutation = useMutation(createTeamDaily, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success(res.message);
    },
    onError: (error) => {
      console.log('❌ 創建小組日誌失敗:', error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  // Update mutation
  const updateMutation = useMutation(
    (data) => {
      // FormData: extract id
      if (data instanceof FormData) {
        const id = data.get("id");
        data.delete("id");
        return updateTeamDaily(id, data);
      }
      // Object format (backward compatible)
      const { id, ...restData } = data;
      return updateTeamDaily(id, restData);
    },
    {
      onSuccess: (res) => {
        console.log("更新成功:", res);
        queryClient.invalidateQueries(QUERY_KEY);
        toast.success("小組日誌更新成功");
      },
      onError: (error) => {
        console.log("❌ 更新小組日誌失敗:", error);
        const errorMessage = extractErrorMessage(error);
        toast.error(errorMessage);
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(deleteTeamDaily, {
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success("小組日誌已刪除");
    },
    onError: (error) => {
      console.error('❌ 刪除小組日誌失敗:', error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  // Remove attachment mutation
  const removeAttachmentMutation = useMutation(removeTeamDailyAttachment, {
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success("附件已刪除");
    },
    onError: (error) => {
      console.error('❌ 刪除小組附件失敗:', error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  // Helper functions
  const handleCreate = (formData) => {
    createMutation.mutate(formData);
  };

  const handleUpdate = (formData, callbacks = {}) => {
    updateMutation.mutate(formData, callbacks);
  };

  const handleDelete = async (item) => {
    if (!item?.id) return;
    const ok = await confirmDialog({ title: '刪除日誌', text: `確定要刪除小組日誌「${item.title || '未命名'}」嗎？此動作無法復原。`, confirmText: '刪除', danger: true });
    if (!ok) return;
    deleteMutation.mutate(item.id);
  };

  const handleRemoveAttachment = async (id) => {
    if (!id) return;
    removeAttachmentMutation.mutate(id);
  };

  return {
    // Data
    teamDaily,
    isLoading,
    isError,
    error,
    showEmptyMessage,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleRemoveAttachment,

    // Raw mutations (for advanced usage)
    createMutation,
    updateMutation,
    deleteMutation,
    removeAttachmentMutation,

    // Query key (for manual cache operations)
    QUERY_KEY,
  };
}
