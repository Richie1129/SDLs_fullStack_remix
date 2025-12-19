import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { getKanbanColumns } from '../../../api/kanban';
import { socket } from '../../../utils/socket';
import { getCurrentUsername } from '../../../utils/userUtils';
import Swal from 'sweetalert2';

/**
 * Custom hook to manage Kanban data and socket interactions.
 * Decouples data fetching and synchronization logic from the UI component.
 * 
 * @param {string} projectId - The ID of the project.
 * @returns {Object} - { kanbanData, isLoading, isError, error, actions }
 */
export const useKanbanData = (projectId) => {
  const [kanbanData, setKanbanData] = useState([]);
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const {
    isLoading,
    isError,
    error,
    data: serverData,
  } = useQuery(
    ['kanbanDatas', projectId],
    () => getKanbanColumns(projectId),
    {
      enabled: !!projectId,
      staleTime: 0,
      cacheTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      onSuccess: (data) => {
        console.log('✅ Kanban data loaded successfully:', data.length, 'columns');
        setKanbanData(data);
      },
      onError: (err) => {
        console.error('❌ Failed to load Kanban data:', err);
      }
    }
  );

  // --- Socket Event Handlers ---

  const KanbanUpdateEvent = useCallback((data) => {
    if (data) {
      console.log("KanbanUpdateEvent:", data);
      queryClient.invalidateQueries(['kanbanDatas', projectId]).catch(error => {
        console.error("Failed to invalidate kanban queries:", error);
      });
    }
  }, [projectId, queryClient]);

  const kanbanDragEvent = useCallback((data) => {
    if (data) {
      console.log("Drag event data received from server:", data);
      setKanbanData(currentData => {
        const currentDataString = JSON.stringify(currentData);
        const serverDataString = JSON.stringify(data);

        if (currentDataString !== serverDataString) {
          console.log("服務器數據與本地數據不同，更新本地狀態");
          setTimeout(() => {
            queryClient.setQueryData(['kanbanDatas', projectId], data);
          }, 50);
          return data;
        } else {
          console.log("服務器數據與本地數據相同，跳過更新");
          return currentData;
        }
      });
    }
  }, [projectId, queryClient]);

  const handleColumnCreated = useCallback((serverData) => {
    console.log("🔄 Server confirmed column creation:", serverData);
    queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
      console.log("✅ Column creation confirmed by server, data synchronized");
    }).catch(error => {
      console.error("❌ Failed to sync column creation:", error);
    });
  }, [projectId, queryClient]);

  const handleTaskItemCreated = useCallback((serverData) => {
    console.log("🔄 Server confirmed task creation:", serverData);
    queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
      console.log("✅ Task creation confirmed by server, data synchronized");
    }).catch(error => {
      console.error("❌ Failed to sync task creation:", error);
    });
  }, [projectId, queryClient]);

  const handleCreationError = useCallback((errorData) => {
    console.error("❌ Server creation failed:", errorData);
    queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
      console.log("🔄 Rolled back optimistic update due to server error");
    }).catch(error => {
      console.error("❌ Failed to rollback optimistic update:", error);
    });
  }, [projectId, queryClient]);

  const handleColumnDeleted = useCallback((serverData) => {
    console.log("🗑️ Server confirmed column deletion:", serverData);
    Swal.fire({
      title: '已刪除！',
      text: '看板列表已被刪除。',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
      console.log("✅ Column deletion confirmed by server, data synchronized");
    }).catch(error => {
      console.error("❌ Failed to sync column deletion:", error);
    });
  }, [projectId, queryClient]);

  const handleColumnDeleteError = useCallback((errorData) => {
    console.error("❌ Server column deletion failed:", errorData);
    Swal.fire({
      title: '刪除失敗',
      text: errorData.message || '刪除列表時發生錯誤，請重試。',
      icon: 'error',
      confirmButtonColor: '#5BA491'
    });
    queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
      console.log("🔄 Rolled back column deletion due to server error");
    }).catch(error => {
      console.error("❌ Failed to rollback column deletion:", error);
    });
  }, [projectId, queryClient]);

  const handleTaskDeleted = useCallback((data) => {
    try {
      console.log('🗑️ 成功刪除卡片，ID:', data?.taskId);
      Swal.fire({
        title: '已刪除！',
        text: '卡片已刪除。',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (_) {}
    queryClient.invalidateQueries(['kanbanDatas', projectId]).catch(() => {});
  }, [projectId, queryClient]);

  // --- Socket Subscription ---
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_project", projectId);
    console.log(`Joined project room: ${projectId}`);

    socket.on("taskItems", KanbanUpdateEvent);
    socket.on("taskItem", KanbanUpdateEvent);
    socket.on("taskItemCreated", handleTaskItemCreated);
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("dragtaskItem", kanbanDragEvent);
    socket.on("columnOrderUpdated", kanbanDragEvent);
    socket.on("ColumnCreatedSuccess", handleColumnCreated);
    socket.on("columnDeleted", handleColumnDeleted);
    socket.on("cardUpdated", KanbanUpdateEvent);
    socket.on("ColumnCreatedError", handleCreationError);
    socket.on("columnCreateError", handleCreationError);
    socket.on("columnDeleteError", handleColumnDeleteError);
    socket.on("ColumnDeleteError", handleColumnDeleteError);
    socket.on("taskItemCreatedError", handleCreationError);
    socket.on("error", handleCreationError);
    
    socket.on('refreshKanban', (data) => {
      console.log('Refreshing Kanban board for project:', data.projectId);
      queryClient.invalidateQueries(['kanbanDatas', data.projectId]);
    });

    return () => {
      socket.off('taskItems', KanbanUpdateEvent);
      socket.off('taskItem', KanbanUpdateEvent);
      socket.off("taskItemCreated", handleTaskItemCreated);
      socket.off("dragtaskItem", kanbanDragEvent);
      socket.off("taskDeleted", handleTaskDeleted);
      socket.off("columnOrderUpdated", kanbanDragEvent);
      socket.off('ColumnCreatedSuccess', handleColumnCreated);
      socket.off('columnDeleted', handleColumnDeleted);
      socket.off('cardUpdated', KanbanUpdateEvent);
      socket.off("ColumnCreatedError", handleCreationError);
      socket.off("columnCreateError", handleCreationError);
      socket.off("columnDeleteError", handleColumnDeleteError);
      socket.off("ColumnDeleteError", handleColumnDeleteError);
      socket.off("taskItemCreatedError", handleCreationError);
      socket.off("error", handleCreationError);
      socket.off('refreshKanban');
      console.log("Socket listeners cleaned up");
    };
  }, [
    socket, projectId, KanbanUpdateEvent, kanbanDragEvent, handleColumnCreated,
    handleTaskItemCreated, handleCreationError, handleColumnDeleted,
    handleColumnDeleteError, handleTaskDeleted, queryClient
  ]);

  // --- Actions (Optimistic Updates) ---

  const addCard = useCallback((title, columnIndex) => {
    const username = getCurrentUsername();
    const userId = localStorage.getItem("id");
    console.log("🚀 Optimistically creating new task:", title, "in column:", columnIndex);

    const optimisticTask = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      content: "",
      labels: [],
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: username
    };

    const updatedKanbanData = kanbanData.map((column, index) => {
      if (index === columnIndex) {
        return {
          ...column,
          task: [...(column.task || []), optimisticTask]
        };
      }
      return column;
    });

    setKanbanData(updatedKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);

    socket.emit("taskItemCreated", {
      eventType: 'taskItemCreated',
      selectedcolumn: columnIndex,
      item: {
        title: title.trim(),
        content: "",
        labels: [],
        assignees: []
      },
      kanbanData: kanbanData,
      projectId,
      user: { 
        username: username,
        id: parseInt(userId) || null
      }
    });
  }, [kanbanData, projectId, queryClient]);

  const addColumn = useCallback((name) => {
    console.log(`🚀 Optimistically creating new column: ${name}`);
    
    const optimisticColumn = {
      id: `temp-${Date.now()}`,
      name: name.trim(),
      task: [],
      order: kanbanData.length
    };

    const updatedKanbanData = [...kanbanData, optimisticColumn];
    setKanbanData(updatedKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);

    socket.emit("ColumnCreated", {
      eventType: 'columnCreate',
      projectId,
      newGroupName: name.trim(),
      user: {
        username: getCurrentUsername(),
        id: parseInt(localStorage.getItem("id")) || null
      }
    });
  }, [kanbanData, projectId, queryClient]);

  const deleteColumn = useCallback((columnData) => {
    console.log(`🗑️ Optimistically deleting column: ${columnData.name}`);
    
    const completeColumnData = {
      ...columnData,
      taskCount: columnData.task ? columnData.task.length : 0
    };
    
    // Dispatch event for activity stream
    const activityData = {
      type: 'delete',
      source: 'column',
      columnId: columnData.id,
      columnName: columnData.name,
      columnData: completeColumnData,
      user: getCurrentUsername() || 'Unknown',
      timestamp: new Date().toISOString(),
      projectId: projectId
    };
    
    const event = new CustomEvent('columnDeleted', { detail: activityData });
    window.dispatchEvent(event);
    
    const updatedKanbanData = kanbanData.filter(column => column.id !== columnData.id);
    setKanbanData(updatedKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);
    
    socket.emit("ColumnDelete", {
      eventType: 'columnDelete',
      columnData: completeColumnData,
      kanbanId: projectId,
      user: {
        username: getCurrentUsername(),
        id: parseInt(localStorage.getItem('id')) || null
      }
    });
  }, [kanbanData, projectId, queryClient]);

  const reorderColumn = useCallback((sourceIndex, destinationIndex) => {
    const newKanbanData = Array.from(kanbanData);
    const [reorderedColumn] = newKanbanData.splice(sourceIndex, 1);
    newKanbanData.splice(destinationIndex, 0, reorderedColumn);

    setKanbanData(newKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], newKanbanData);

    const columnOrder = newKanbanData.map(col => col.id.toString());
    socket.emit('columnOrderChanged', {
      projectId,
      columnOrder,
      user: {
        username: getCurrentUsername(),
        id: parseInt(localStorage.getItem('id')) || null,
      },
    });
  }, [kanbanData, projectId, queryClient]);

  const moveCard = useCallback((source, destination) => {
    const sourceColumnId = parseInt(source.droppableId);
    const destColumnId = parseInt(destination.droppableId);
    
    const sourceColumnIndex = kanbanData.findIndex(col => col.id === sourceColumnId);
    const destColumnIndex = kanbanData.findIndex(col => col.id === destColumnId);
    
    if (sourceColumnIndex === -1 || destColumnIndex === -1) {
      console.error('❌ 找不到對應的列表:', { sourceColumnId, destColumnId });
      return;
    }

    const newKanbanData = Array.from(kanbanData);
    const sourceColumn = { ...newKanbanData[sourceColumnIndex] };
    const destColumn = sourceColumnIndex === destColumnIndex 
      ? sourceColumn 
      : { ...newKanbanData[destColumnIndex] };
    
    const sourceTasks = Array.from(sourceColumn.task || []);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    if (!movedTask) return;
    
    sourceColumn.task = sourceTasks;
    
    const destTasks = Array.from(destColumn.task || []);
    destTasks.splice(destination.index, 0, movedTask);
    destColumn.task = destTasks;
    
    newKanbanData[sourceColumnIndex] = sourceColumn;
    if (sourceColumnIndex !== destColumnIndex) {
      newKanbanData[destColumnIndex] = destColumn;
    }
    
    setKanbanData(newKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], newKanbanData);
    
    socket.emit('cardItemDragged', {
      eventType: 'taskDrag',
      projectId,
      taskId: movedTask.id,
      source: { columnId: sourceColumnId, index: source.index },
      destination: { columnId: destColumnId, index: destination.index },
      user: {
        username: getCurrentUsername(),
        id: parseInt(localStorage.getItem('id')) || null,
      },
    });
  }, [kanbanData, projectId, queryClient]);

  return {
    kanbanData,
    isLoading,
    isError,
    error,
    actions: {
      addCard,
      addColumn,
      deleteColumn,
      reorderColumn,
      moveCard
    }
  };
};
