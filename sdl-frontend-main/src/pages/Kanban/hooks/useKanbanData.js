import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { getKanbanColumns } from '../../../api/kanban';
import { socket } from '../../../utils/socket';
import { getCurrentUsername } from '../../../utils/userUtils';
import { getCurrentUserId } from '../../../utils/authUtils';
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
    socket.on("columnCreateError", handleCreationError);
    socket.on("columnDeleteError", handleColumnDeleteError);
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
      socket.off("columnCreateError", handleCreationError);
      socket.off("columnDeleteError", handleColumnDeleteError);
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
    const userId = getCurrentUserId();
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

    // H11: 使用 functional updater 避免 stale closure
    setKanbanData(prev => {
      const updated = prev.map((column, index) => {
        if (index === columnIndex) {
          return { ...column, task: [...(column.task || []), optimisticTask] };
        }
        return column;
      });
      queryClient.setQueryData(['kanbanDatas', projectId], updated);

      socket.emit("taskItemCreated", {
        eventType: 'taskItemCreated',
        selectedcolumn: columnIndex,
        item: {
          title: title.trim(),
          content: "",
          labels: [],
          assignees: []
        },
        kanbanData: prev,
        projectId,
        user: {
          username: username,
          id: userId || null
        }
      });

      return updated;
    });
  }, [projectId, queryClient]);

  const addPhaseTemplate = useCallback(async (columnsToAdd) => {
    console.log(`🚀 Creating ${columnsToAdd.length} columns from template`);
    
    const username = getCurrentUsername();
    const userId = getCurrentUserId();
    
    // 1. 樂觀更新本地狀態（顯示載入中的列表）
    let currentKanbanData = [...kanbanData];
    const optimisticColumns = columnsToAdd.map((colTemplate, idx) => ({
      id: `temp-col-${Date.now()}-${idx}`,
      name: colTemplate.title,
      task: [],
      order: currentKanbanData.length + idx,
      isLoading: true // 標記為載入中
    }));

    const updatedKanbanData = [...currentKanbanData, ...optimisticColumns];
    setKanbanData(updatedKanbanData);
    queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);

    // 2. 依序創建列表並等待真實 ID
    const createdColumns = [];
    
    for (let idx = 0; idx < columnsToAdd.length; idx++) {
      const colTemplate = columnsToAdd[idx];
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // A. 創建列表並等待回傳
        const realColumnId = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off('ColumnCreatedSuccess', successHandler);
            reject(new Error('Column creation timeout'));
          }, 10000);
          
          // 監聽列表創建成功事件
          const successHandler = (data) => {
            // 檢查是否為本次請求的回應（比對列表名稱）
            if (data?.newColumn?.name === colTemplate.title) {
              clearTimeout(timeout);
              socket.off('ColumnCreatedSuccess', successHandler);
              resolve(data.newColumn.id);
            }
          };
          
          socket.on('ColumnCreatedSuccess', successHandler);
          
          // 發送創建列表事件
          socket.emit("ColumnCreated", {
            eventType: 'columnCreate',
            projectId,
            newGroupName: colTemplate.title,
            requestId,
            user: { username, id: userId }
          });
        });

        console.log(`✅ Column created: ${colTemplate.title} (ID: ${realColumnId})`);
        createdColumns.push({ id: realColumnId, template: colTemplate });

      } catch (error) {
        console.error(`❌ Failed to create column: ${colTemplate.title}`, error);
        // 即使單個列表失敗，繼續創建其他列表
      }
    }

    console.log(`✅ Template creation completed. ${createdColumns.length}/${columnsToAdd.length} columns created.`);

    // 等待資料同步完成，確保 queryClient 中有真實 column ID
    await queryClient.refetchQueries(['kanbanDatas', projectId]);

    return createdColumns;

  }, [kanbanData, projectId, queryClient]);

  /**
   * 批次新增卡片到指定欄位，用於載入範例任務。
   * @param {Array} tasksPerColumn - [{columnId, columnName, tasks: [{title, content}]}]
   */
  const bulkAddCards = useCallback(async (tasksPerColumn) => {
    const username = getCurrentUsername();
    const userId = getCurrentUserId();

    // 從 query cache 取得最新資料（包含剛建立的真實 column ID）
    const currentData = queryClient.getQueryData(['kanbanDatas', projectId]) || kanbanData;

    // 1. 樂觀更新：一次把所有任務加入本地狀態
    let updatedData = currentData.map(col => ({ ...col, task: [...(col.task || [])] }));

    for (const { columnId, tasks } of tasksPerColumn) {
      const colIdx = updatedData.findIndex(col => col.id === columnId);
      if (colIdx === -1) continue;

      const optimisticTasks = tasks.map((task, i) => ({
        id: `temp-bulk-${Date.now()}-${colIdx}-${i}`,
        title: task.title,
        content: task.content || '',
        labels: [],
        assignees: [],
        createdAt: new Date().toISOString(),
        createdBy: username
      }));

      updatedData[colIdx] = {
        ...updatedData[colIdx],
        task: [...updatedData[colIdx].task, ...optimisticTasks]
      };
    }

    setKanbanData(updatedData);
    queryClient.setQueryData(['kanbanDatas', projectId], updatedData);

    // 2. 依序發送 socket 事件，避免伺服器過載
    for (const { columnId, tasks } of tasksPerColumn) {
      const columnIndex = currentData.findIndex(col => col.id === columnId);
      if (columnIndex === -1) continue;

      for (const task of tasks) {
        socket.emit('taskItemCreated', {
          eventType: 'taskItemCreated',
          selectedcolumn: columnIndex,
          item: {
            title: task.title,
            content: task.content || '',
            labels: [],
            assignees: []
          },
          kanbanData: currentData,
          projectId,
          user: { username, id: userId || null }
        });
        // 短暫延遲，避免伺服器端競態
        await new Promise(resolve => setTimeout(resolve, 80));
      }
    }
  }, [kanbanData, projectId, queryClient]);

  const addColumn = useCallback((name) => {
    console.log(`🚀 Optimistically creating new column: ${name}`);

    // H11: functional updater 避免 stale closure
    setKanbanData(prev => {
      const optimisticColumn = {
        id: `temp-${Date.now()}`,
        name: name.trim(),
        task: [],
        order: prev.length
      };
      const updated = [...prev, optimisticColumn];
      queryClient.setQueryData(['kanbanDatas', projectId], updated);
      return updated;
    });

    socket.emit("ColumnCreated", {
      eventType: 'columnCreate',
      projectId,
      newGroupName: name.trim(),
      user: {
        username: getCurrentUsername(),
        id: getCurrentUserId() || null
      }
    });
  }, [projectId, queryClient]);

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
    
    // H11: functional updater 避免 stale closure
    setKanbanData(prev => {
      const updated = prev.filter(column => column.id !== columnData.id);
      queryClient.setQueryData(['kanbanDatas', projectId], updated);
      return updated;
    });

    socket.emit("ColumnDelete", {
      eventType: 'columnDelete',
      columnData: completeColumnData,
      kanbanId: projectId,
      user: {
        username: getCurrentUsername(),
        id: getCurrentUserId() || null
      }
    });
  }, [projectId, queryClient]);

  const reorderColumn = useCallback((sourceIndex, destinationIndex) => {
    // H11: functional updater 避免 stale closure
    setKanbanData(prev => {
      const newData = Array.from(prev);
      const [reorderedColumn] = newData.splice(sourceIndex, 1);
      newData.splice(destinationIndex, 0, reorderedColumn);
      queryClient.setQueryData(['kanbanDatas', projectId], newData);

      const columnOrder = newData.map(col => col.id.toString());
      socket.emit('columnOrderChanged', {
        projectId,
        columnOrder,
        user: {
          username: getCurrentUsername(),
          id: getCurrentUserId() || null,
        },
      });

      return newData;
    });
  }, [projectId, queryClient]);

  const moveCard = useCallback((source, destination) => {
    const sourceColumnId = parseInt(source.droppableId);
    const destColumnId = parseInt(destination.droppableId);

    // H11: functional updater 避免 stale closure
    setKanbanData(prev => {
      const sourceColumnIndex = prev.findIndex(col => col.id === sourceColumnId);
      const destColumnIndex = prev.findIndex(col => col.id === destColumnId);

      if (sourceColumnIndex === -1 || destColumnIndex === -1) {
        console.error('❌ 找不到對應的列表:', { sourceColumnId, destColumnId });
        return prev;
      }

      const newData = Array.from(prev);
      const sourceColumn = { ...newData[sourceColumnIndex] };
      const destColumn = sourceColumnIndex === destColumnIndex
        ? sourceColumn
        : { ...newData[destColumnIndex] };

      const sourceTasks = Array.from(sourceColumn.task || []);
      const [movedTask] = sourceTasks.splice(source.index, 1);

      if (!movedTask) return prev;

      sourceColumn.task = sourceTasks;

      const destTasks = Array.from(destColumn.task || []);
      destTasks.splice(destination.index, 0, movedTask);
      destColumn.task = destTasks;

      newData[sourceColumnIndex] = sourceColumn;
      if (sourceColumnIndex !== destColumnIndex) {
        newData[destColumnIndex] = destColumn;
      }

      queryClient.setQueryData(['kanbanDatas', projectId], newData);

      socket.emit('cardItemDragged', {
        eventType: 'taskDrag',
        projectId,
        taskId: movedTask.id,
        source: { columnId: sourceColumnId, index: source.index },
        destination: { columnId: destColumnId, index: destination.index },
        user: {
          username: getCurrentUsername(),
          id: getCurrentUserId() || null,
        },
      });

      return newData;
    });
  }, [projectId, queryClient]);

  return {
    kanbanData,
    isLoading,
    isError,
    error,
    actions: {
      addCard,
      addColumn,
      addPhaseTemplate,
      bulkAddCards,
      deleteColumn,
      reorderColumn,
      moveCard
    }
  };
};
