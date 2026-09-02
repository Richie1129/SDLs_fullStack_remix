import { useState, useEffect } from "react";
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
import { getCurrentUsername } from '../../../utils/userUtils';

/**
 * Hook for managing team daily logs
 * Handles CRUD operations, file attachments, and cache management
 */
export function useTeamDaily(projectId) {
  const queryClient = useQueryClient();

  // State
  const [teamDaily, setTeamDaily] = useState([]);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);

  // Query key for cache consistency
  const QUERY_KEY = ["teamDaily", projectId];

  // Fetch team daily logs
  const { isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getAllTeamDaily({ params: { projectId: projectId } }),
    onSuccess: setTeamDaily,
    enabled: !!projectId,
  });

  // Empty state control
  useEffect(() => {
    const timer = setTimeout(() => {
      if (teamDaily.length === 0 && !isLoading && !isError) {
        setShowEmptyMessage(true);
      } else {
        setShowEmptyMessage(false);
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [teamDaily.length, isLoading, isError]);

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
    const confirm = window.confirm(`確定要刪除小組日誌「${item.title || '未命名'}」嗎？此動作無法復原。`);
    if (!confirm) return;
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
