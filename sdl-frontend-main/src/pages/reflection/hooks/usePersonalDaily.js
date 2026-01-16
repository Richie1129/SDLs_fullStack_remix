import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import {
  getAllPersonalDaily,
  createPersonalDaily,
  updatePersonalDaily,
  deletePersonalDaily,
  removePersonalDailyAttachment,
} from "../../../api/reflection";
import { extractErrorMessage } from '@/constants/dailyErrorCodes.js';
import { getCurrentUsername } from '../../../utils/userUtils';
import { getCurrentUserId, getCurrentUserRole } from '../../../utils/authUtils';

/**
 * Hook for managing personal daily logs
 * Handles CRUD operations, file attachments, and cache management
 */
export function usePersonalDaily(projectId) {
  const queryClient = useQueryClient();
  const userRole = getCurrentUserRole();
  const userId = getCurrentUserId();

  // State
  const [personalDaily, setPersonalDaily] = useState([]);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);

  // Query key for cache consistency
  const QUERY_KEY = ["personalDaily", { projectId, isTeacher: userRole === "teacher" }];

  // Fetch personal daily logs
  const { isLoading, isError, error } = useQuery(
    QUERY_KEY,
    () =>
      getAllPersonalDaily({
        projectId: projectId,
        userId: userId,
        isTeacher: userRole === "teacher",
      }),
    {
      onSuccess: setPersonalDaily,
      enabled: !!projectId,
    }
  );

  // Empty state control
  useEffect(() => {
    const timer = setTimeout(() => {
      if (personalDaily.length === 0 && !isLoading && !isError) {
        setShowEmptyMessage(true);
      } else {
        setShowEmptyMessage(false);
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [personalDaily.length, isLoading, isError]);

  // Create mutation
  const createMutation = useMutation(createPersonalDaily, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success(res.message);
    },
    onError: (error) => {
      console.log('❌ 創建個人日誌失敗:', error);
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
        return updatePersonalDaily(id, data);
      }
      // Object format (backward compatible)
      const { id, ...restData } = data;
      return updatePersonalDaily(id, restData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QUERY_KEY);
        toast.success("更新成功");
      },
      onError: (error) => {
        console.log('❌ 更新個人日誌失敗:', error);
        const errorMessage = extractErrorMessage(error);
        toast.error(errorMessage);
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(deletePersonalDaily, {
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success("個人日誌已刪除");
    },
    onError: (error) => {
      console.error('❌ 刪除個人日誌失敗:', error);
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  // Remove attachment mutation
  const removeAttachmentMutation = useMutation(removePersonalDailyAttachment, {
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success("附件已刪除");
    },
    onError: (error) => {
      console.error('❌ 刪除個人附件失敗:', error);
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
    const confirm = window.confirm(`確定要刪除「${item.title || '未命名'}」嗎？此動作無法復原。`);
    if (!confirm) return;
    deleteMutation.mutate(item.id);
  };

  const handleRemoveAttachment = async (id) => {
    if (!id) return;
    removeAttachmentMutation.mutate(id);
  };

  return {
    // Data
    personalDaily,
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
