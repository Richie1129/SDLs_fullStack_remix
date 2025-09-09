import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus } from "react-icons/fi";
import { v4 as uuidv4 } from 'uuid';
import Carditem from './components/Carditem';
import TaskHint from './components/TaskHint';
import Loader from '../../components/Loader';
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { DragDropContext, Draggable } from 'react-beautiful-dnd';
import { StrictModeDroppable as Droppable } from '../../utils/StrictModeDroppable';
import SubStageComponent from '../../components/SubStageBar';
import Swal from 'sweetalert2';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getKanbanColumns, getKanbanTasks, addCardItem } from '../../api/kanban';
import { getProject } from '../../api/project';
import { getSubStage } from '../../api/stage';
import { socket } from '../../utils/socket';
import DraggableImage from "./components/DraggableImage"; // 確保路徑正確
import useObservationMode from '../../hooks/useObservationMode'; // 引入觀摩模式 hook
import { useStageIndex, useSubStageIndex } from '../../hooks/useStageIndex';
// AI 導師已整合到科學助手(DraggableImage)內部的可切換分頁中



/**
 * Kanban Component with Optimistic Updates
 * 
 * This component implements optimistic updates to solve the race condition issue
 * that occurs when users interact with the board before socket room subscription is complete.
 * 
 * How it works:
 * 1. User actions (add column/card) immediately update the local UI state
 * 2. Socket events are emitted to the server for persistence and real-time sync
 * 3. Server responses replace temporary IDs with real IDs and ensure data consistency
 * 4. Error scenarios trigger rollback by refreshing data from server
 * 
 * This ensures immediate UI feedback regardless of socket connection timing.
 */
export default function Kanban() {
  const [kanbanData, setKanbanData] = useState([]);
  const [newCard, setNewCard] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedcolumn, setSelectedcolumn] = useState(0);
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const [stageInfo, setStageInfo] = useState({ name: "", description: "" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddGroupInput, setShowAddGroupInput] = useState(false); // 新增狀態
  const [newGroupName, setNewGroupName] = useState('');
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
  const currentStage = currentStageIndex;
  const currentSubStage = currentSubStageIndex;
  
  // 使用觀摩模式 hook
  const { isObservationMode } = useObservationMode();

  // Helper: on small screens, lists expand naturally (page scroll);
  // on md+, lists fill remaining height and scroll internally.
  const getCardListStyle = (isDraggingOver) => {
    const base = 'flex flex-col px-4 pb-1 overflow-visible md:flex-1 md:min-h-0 md:overflow-y-auto scrollbar-thin';
    const bg = isDraggingOver ? 'bg-customgreen/10' : 'bg-slate-50';
    return `${base} ${bg}`.trim();
  };


  const {
    isLoading: kanbanIsLoading,
    isError: kanbansIsError,
    error: KanbansError,
    data: KanbansData,
  } = useQuery(
    ['kanbanDatas', projectId],
    () => getKanbanColumns(projectId),
    {
      enabled: !!projectId, // Only run query if projectId exists
      staleTime: 0, // Consider data stale immediately to ensure fresh data
      cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true, // Always refetch on mount
      retry: 3, // Retry failed requests 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      onSuccess: (data) => {
        console.log('✅ Kanban data loaded successfully:', data.length, 'columns');
        setKanbanData(data);
        
        // 印出列表名稱和其擁有的卡片
        console.log('=== Kanban 列表資料 ===');
        data.forEach((column, index) => {
          console.log(`列表 ${index + 1}: ${column.name}`);
          console.log(`列表 ID: ${column.id}`);
          if (Array.isArray(column.task) && column.task.length > 0) {
            console.log(`卡片數量: ${column.task.length}`);
            column.task.forEach((task, taskIndex) => {
              // 檢查 task 是否存在且不為 null
              if (task && task.id) {
                console.log(`  卡片 ${taskIndex + 1}:`);
                console.log(`    ID: ${task.id}`);
                console.log(`    標題: ${task.title}`);
                console.log(`    內容: ${task.content || '無內容'}`);
                console.log(`    標籤: ${task.labels ? JSON.stringify(task.labels) : '無標籤'}`);
                console.log(`    指派人員: ${task.assignees ? JSON.stringify(task.assignees) : '無指派人員'}`);
              } else {
                console.log(`  卡片 ${taskIndex + 1}: 無效的任務資料`);
              }
            });
          } else {
            console.log('  此列表沒有卡片');
          }
          console.log('---');
        });
        console.log('=== 結束 ===');
      },
      onError: (error) => {
        console.error('❌ Failed to load Kanban data:', error);
      }
    }
  );
  // 在Kanban组件中
  useEffect(() => {
    socket.on('refreshKanban', (data) => {
      console.log('Refreshing Kanban board for project:', data.projectId);
      // 使用react-query的invalidateQueries方法刷新数据
      queryClient.invalidateQueries(['kanbanDatas', data.projectId]);
    });

    return () => {
      // socket.off('refreshKanban');
    };
  }, [socket, queryClient]);

  // 初次載入 Kanban 時，同步一次專案進度到 Context/localStorage，確保導師階段正確
  useEffect(() => {
    (async () => {
      try {
        const proj = await getProject(projectId);
        if (proj?.currentStage && proj?.currentSubStage) {
          localStorage.setItem('currentStage', proj.currentStage);
          localStorage.setItem('currentSubStage', proj.currentSubStage);
          setCurrentStageIndex(proj.currentStage);
          setCurrentSubStageIndex(proj.currentSubStage);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [projectId, setCurrentStageIndex, setCurrentSubStageIndex]);


  useEffect(() => {
    function KanbanUpdateEvent(data) {
      if (data) {
        console.log("KanbanUpdateEvent:", data);
        // Force immediate data refresh with error handling
        queryClient.invalidateQueries(['kanbanDatas', projectId]).catch(error => {
          console.error("Failed to invalidate kanban queries:", error);
        });
      }
    }
    
    function kanbanDragEvent(data) {
      if (data) {
        console.log("Drag event data received from server:", data);
        
        // 重要：只在服務器返回的數據與本地狀態有顯著差異時才更新
        // 這可以避免服務器回應覆蓋本地的即時更新
        const currentDataString = JSON.stringify(kanbanData);
        const serverDataString = JSON.stringify(data);
        
        if (currentDataString !== serverDataString) {
          console.log("服務器數據與本地數據不同，更新本地狀態");
          
          // 使用較短的延遲，確保不會覆蓋正在進行的操作
          setTimeout(() => {
            setKanbanData(data);
            // Update React Query cache immediately to prevent stale data
            queryClient.setQueryData(['kanbanDatas', projectId], data);
          }, 50);
        } else {
          console.log("服務器數據與本地數據相同，跳過更新");
        }
        
        // 印出拖拽後的列表資料
        console.log('=== 服務器確認的拖拽後列表資料 ===');
        data.forEach((column, index) => {
          console.log(`列表 ${index + 1}: ${column.name}`);
          console.log(`列表 ID: ${column.id}`);
          if (Array.isArray(column.task) && column.task.length > 0) {
            console.log(`卡片數量: ${column.task.length}`);
            column.task.forEach((task, taskIndex) => {
              // 檢查 task 是否存在且不為 null
              if (task && task.id) {
                console.log(`  卡片 ${taskIndex + 1}:`);
                console.log(`    ID: ${task.id}`);
                console.log(`    標題: ${task.title}`);
                console.log(`    內容: ${task.content || '無內容'}`);
              } else {
                console.log(`  卡片 ${taskIndex + 1}: 無效的任務資料`);
              }
            });
          } else {
            console.log('  此列表沒有卡片');
          }
          console.log('---');
        });
        console.log('=== 結束 ===');
      }
    }

    // Enhanced socket event handler for column creation
    function handleColumnCreated(serverData) {
      console.log("🔄 Server confirmed column creation:", serverData);
      
      // The optimistic update has already been applied
      // Server response will sync the real ID and ensure consistency across users
      // Only refresh if we detect inconsistency or need to replace temp IDs
      queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
        console.log("✅ Column creation confirmed by server, data synchronized");
      }).catch(error => {
        console.error("❌ Failed to sync column creation:", error);
        // If sync fails, the optimistic update will remain until next refresh
      });
    }

    // Enhanced socket event handler for task creation
    function handleTaskItemCreated(serverData) {
      console.log("🔄 Server confirmed task creation:", serverData);
      
      // The optimistic update has already been applied
      // Server response ensures consistency and provides real IDs
      queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
        console.log("✅ Task creation confirmed by server, data synchronized");
      }).catch(error => {
        console.error("❌ Failed to sync task creation:", error);
        // If sync fails, the optimistic update will remain until next refresh
      });
    }

    // Handler for creation failures (rollback optimistic updates)
    function handleCreationError(errorData) {
      console.error("❌ Server creation failed:", errorData);
      
      // Rollback by refreshing data from server
      queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
        console.log("🔄 Rolled back optimistic update due to server error");
      }).catch(error => {
        console.error("❌ Failed to rollback optimistic update:", error);
      });
    }

    // Handler for successful column deletion
    function handleColumnDeleted(serverData) {
      console.log("🗑️ Server confirmed column deletion:", serverData);
      
      // 不再在這裡派發活動事件，因為已經在樂觀更新時派發了
      
      // Show success message only after server confirmation
      Swal.fire({
        title: '已刪除！',
        text: '看板列表已被刪除。',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Ensure data consistency
      queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
        console.log("✅ Column deletion confirmed by server, data synchronized");
      }).catch(error => {
        console.error("❌ Failed to sync column deletion:", error);
      });
    }

    // Handler for column deletion failures
    function handleColumnDeleteError(errorData) {
      console.error("❌ Server column deletion failed:", errorData);
      
      // Show error message
      Swal.fire({
        title: '刪除失敗',
        text: errorData.message || '刪除列表時發生錯誤，請重試。',
        icon: 'error',
        confirmButtonColor: '#5BA491'
      });
      
      // Rollback by refreshing data from server
      queryClient.invalidateQueries(['kanbanDatas', projectId]).then(() => {
        console.log("🔄 Rolled back column deletion due to server error");
      }).catch(error => {
        console.error("❌ Failed to rollback column deletion:", error);
      });
    }

    // Ensure socket is connected before setting up listeners
    if (!socket.connected) {
      socket.connect();
    }
    
    // Join project room
    socket.emit("join_project", projectId);
    console.log(`Joined project room: ${projectId}`);

    // Set up socket event listeners with specific handlers
    socket.on("taskItems", KanbanUpdateEvent);
    socket.on("taskItem", KanbanUpdateEvent);
    socket.on("taskItemCreated", handleTaskItemCreated); // Use specific handler
    // Also react to task deletions broadcast by server
    function handleTaskDeleted(data) {
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
    }
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("dragtaskItem", kanbanDragEvent);
    socket.on("columnOrderUpdated", kanbanDragEvent);
    socket.on("ColumnCreatedSuccess", handleColumnCreated); // Use specific handler
    socket.on("columnDeleted", handleColumnDeleted); // Use specific handler for deletion
    // 一些後端可能直接廣播 cardUpdated，為安全起見一併監聽
    socket.on("cardUpdated", KanbanUpdateEvent);
    
    // Error handling listeners for rollback scenarios
    socket.on("ColumnCreatedError", handleCreationError);
    // Also handle backend's actual error event name
    socket.on("columnCreateError", handleCreationError);
    socket.on("columnDeleteError", handleColumnDeleteError); // Add deletion error handler
    socket.on("ColumnDeleteError", handleColumnDeleteError); // Handle backend variations
    socket.on("taskItemCreatedError", handleCreationError);
    socket.on("error", handleCreationError);

    // Enhanced cleanup function
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
      console.log("Socket listeners cleaned up");
    };
  }, [socket, projectId, queryClient]);

  // 當收到提交事件時，重新抓取專案進度並更新 Context 與 localStorage，讓導師自動切換子階段
  useEffect(() => {
    const onTaskSubmitted = async (_payload) => {
      try {
        const proj = await getProject(projectId);
        if (proj?.currentStage && proj?.currentSubStage) {
          localStorage.setItem('currentStage', proj.currentStage);
          localStorage.setItem('currentSubStage', proj.currentSubStage);
          setCurrentStageIndex(proj.currentStage);
          setCurrentSubStageIndex(proj.currentSubStage);
        }
      } catch (e) {
        // ignore
      }
    };
    socket.on('taskSubmitted', onTaskSubmitted);
    return () => socket.off('taskSubmitted', onTaskSubmitted);
  }, [socket, projectId, setCurrentStageIndex, setCurrentSubStageIndex]);

  // useEffect(() => {
  //   if (!currentStage || !currentSubStage) {
  //     navigate(0);
  //   }
  // }, [currentStage, currentSubStage, navigate])


  const onDragEnd = useCallback((result) => {
    // 觀摩模式下禁止任何拖拽操作
    if (isObservationMode) {
      console.warn('觀摩模式下禁止拖拽操作');
      return;
    }
    
    const { destination, source, type } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    if (type === 'COLUMN') {
      const newKanbanData = Array.from(kanbanData);
      const [reorderedColumn] = newKanbanData.splice(source.index, 1);
      newKanbanData.splice(destination.index, 0, reorderedColumn);

      // Optimistic UI update
      setKanbanData(newKanbanData);
      queryClient.setQueryData(['kanbanDatas', projectId], newKanbanData);

      // Emit minimal payload: projectId + columnOrder
      const columnOrder = newKanbanData.map(col => col.id.toString());
      socket.emit('columnOrderChanged', {
        projectId,
        columnOrder,
        user: {
          username: localStorage.getItem('username'),
          id: parseInt(localStorage.getItem('id')) || null,
        },
      });

        } else if (type === 'CARD') {
      console.log('🔄 開始處理卡片拖拉:', { source, destination });
      
      // 使用 column ID 而不是索引來找到對應的列表
      const sourceColumnId = parseInt(source.droppableId);
      const destColumnId = parseInt(destination.droppableId);
      
      console.log('拖拉列表ID:', { sourceColumnId, destColumnId });
      
      // 找到對應的列表索引
      const sourceColumnIndex = kanbanData.findIndex(col => col.id === sourceColumnId);
      const destColumnIndex = kanbanData.findIndex(col => col.id === destColumnId);
      
      if (sourceColumnIndex === -1 || destColumnIndex === -1) {
        console.error('❌ 找不到對應的列表:', { sourceColumnId, destColumnId, sourceColumnIndex, destColumnIndex });
        return;
      }
      
      console.log('對應的列表索引:', { sourceColumnIndex, destColumnIndex });
      
      const newKanbanData = Array.from(kanbanData);
      const sourceColumn = { ...newKanbanData[sourceColumnIndex] };
      const destColumn = sourceColumnIndex === destColumnIndex 
        ? sourceColumn 
        : { ...newKanbanData[destColumnIndex] };
      
      // 從源列表移除卡片
      const sourceTasks = Array.from(sourceColumn.task || []);
      const [movedTask] = sourceTasks.splice(source.index, 1);
      
      if (!movedTask) {
        console.error('❌ 找不到要移動的卡片:', { sourceColumnIndex, sourceIndex: source.index });
        return;
      }
      
      console.log('移動的卡片:', movedTask.title, '從', sourceColumn.name, '到', destColumn.name);
      
      sourceColumn.task = sourceTasks;
      
      // 添加卡片到目標列表
      const destTasks = Array.from(destColumn.task || []);
      destTasks.splice(destination.index, 0, movedTask);
      destColumn.task = destTasks;
      
      // 更新 kanbanData
      newKanbanData[sourceColumnIndex] = sourceColumn;
      if (sourceColumnIndex !== destColumnIndex) {
        newKanbanData[destColumnIndex] = destColumn;
      }
      
      // 立即更新本地狀態
      setKanbanData(newKanbanData);
      
      // 更新 React Query 緩存
      queryClient.setQueryData(['kanbanDatas', projectId], newKanbanData);
      
      console.log('✅ 本地狀態已更新，準備發送到服務器');
      
      // Emit minimal payload for card move
      socket.emit('cardItemDragged', {
        eventType: 'taskDrag',
        projectId,
        taskId: movedTask.id,
        source: { columnId: sourceColumnId, index: source.index },
        destination: { columnId: destColumnId, index: destination.index },
        user: {
          username: localStorage.getItem('username'),
          id: parseInt(localStorage.getItem('id')) || null,
        },
      });
      
      console.log('📡 已發送拖拉事件到服務器');
    }
  }, [kanbanData]);

  const handleChange = (e) => {
    setNewCard(e.target.value);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 觀摩模式下禁止新增卡片
    if (isObservationMode) {
      console.warn('觀摩模式下禁止新增卡片');
      return;
    }
    
    if (newCard.length === 0) {
      setShowForm(false);
      return;
    }

    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("id"); // 獲取用戶ID，注意是 "id" 不是 "userId"
    console.log("🚀 Optimistically creating new task:", newCard, "in column:", selectedcolumn);

    // 1. Create optimistic task data
    const optimisticTask = {
      id: `temp-${Date.now()}`, // Temporary ID until server responds
      title: newCard.trim(),
      content: "",
      labels: [],
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: username
    };

    // 2. Optimistically update UI immediately
    const updatedKanbanData = kanbanData.map((column, index) => {
      if (index === selectedcolumn) {
        return {
          ...column,
          task: [...(column.task || []), optimisticTask]
        };
      }
      return column;
    });

    // 3. Update local state
    setKanbanData(updatedKanbanData);
    
    // 4. Update React Query cache optimistically
    queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);

    // 5. Send to server (will broadcast to other users)
    socket.emit("taskItemCreated", {
      eventType: 'taskItemCreated',
      selectedcolumn,
      item: {
        title: newCard.trim(),
        content: "",
        labels: [],
        assignees: []
      },
      kanbanData: kanbanData, // Send original data
      projectId,
      user: { 
        username: username,
        id: parseInt(userId) || null
      }
    });

    // 6. Clear form immediately
    setShowForm(false);
    setNewCard("");
    
    console.log("✅ Task added optimistically, server sync in progress...");
  }

  const toggleAddGroupInput = () => {
    setShowAddGroupInput(!showAddGroupInput); // 切換輸入框的顯示狀態
  };

  // 新增列表 - With Optimistic Updates
  const handleAddGroup = (e) => {
    e.preventDefault();
    
    // 防止觀摩模式下的操作
    if (isObservationMode) {
      console.log("🚫 Add group blocked: Observation mode");
      return;
    }
    
    if (newGroupName.trim() !== '') {
      console.log(`🚀 Optimistically creating new column: ${newGroupName}`);
      
      // 1. Create optimistic column data
      const optimisticColumn = {
        id: `temp-${Date.now()}`, // Temporary ID until server responds
        name: newGroupName.trim(),
        task: [], // Empty task array for new column
        order: kanbanData.length // Place at the end
      };

      // 2. Optimistically update UI immediately
      const updatedKanbanData = [...kanbanData, optimisticColumn];
      setKanbanData(updatedKanbanData);
      
      // 3. Update React Query cache optimistically
      queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);

      // 4. Send to server (will broadcast to other users)
      // Include user info for backend permission checks
      socket.emit("ColumnCreated", {
        eventType: 'columnCreate',
        projectId,
        newGroupName: newGroupName.trim(),
        user: {
          username: localStorage.getItem("username"),
          id: parseInt(localStorage.getItem("id")) || null
        }
      });

      // 5. Clear form immediately
      setNewGroupName('');
      setShowAddGroupInput(false);
      
      console.log("✅ Column added optimistically, server sync in progress...");
    }
  };
  const handleDeleteColumn = (columnData) => {
    // 防止觀摩模式下的操作
    if (isObservationMode) {
      console.log("🚫 Delete column blocked: Observation mode");
      return;
    }
    
    Swal.fire({
      title: "刪除",
      text: "列表中的卡片將一併刪除，確定要刪除嗎?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5BA491",
      cancelButtonColor: "#d33",
      confirmButtonText: "確定",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        console.log(`🗑️ Optimistically deleting column: ${columnData.name}`);
        
        // 保存完整的列表資料，包括任務數量等詳細資訊
        const completeColumnData = {
          ...columnData,
          taskCount: columnData.task ? columnData.task.length : 0
        };
        
        // 立即觸發活動流更新 - 在樂觀更新時就顯示
        const activityData = {
          type: 'delete',
          source: 'column',
          columnId: columnData.id,
          columnName: columnData.name,
          columnData: completeColumnData,
          user: localStorage.getItem('username') || 'Unknown',
          timestamp: new Date().toISOString(),
          projectId: projectId
        };
        
        console.log("📡 Dispatching immediate column deletion activity:", activityData);
        
        // 立即派發活動事件，不等服務器確認
        const event = new CustomEvent('columnDeleted', { 
          detail: activityData 
        });
        window.dispatchEvent(event);
        
        // 1. 樂觀更新：立即從本地狀態移除列表
        const updatedKanbanData = kanbanData.filter(column => column.id !== columnData.id);
        setKanbanData(updatedKanbanData);
        
        // 2. 更新 React Query 緩存
        queryClient.setQueryData(['kanbanDatas', projectId], updatedKanbanData);
        
        // 3. 發送到服務器
        socket.emit("ColumnDelete", {
          eventType: 'columnDelete',
          columnData: completeColumnData,
          kanbanId: projectId,
          user: {
            username: localStorage.getItem('username'),
            id: parseInt(localStorage.getItem('id')) || null
          }
        });
        
        console.log("✅ Column deleted optimistically, server sync in progress...");
      }
    });
  }

  const kanbanContainerRef = useRef(null);

  return (
    <div ref={kanbanContainerRef} className="h-full min-h-0 w-full bg-white flex flex-col">
      {/* AI 導師聊天已內嵌於科學助手中 */}
      {/* 觀摩模式隱藏科學助手 */}
      {!isObservationMode && (
        <DraggableImage 
          containerRef={kanbanContainerRef}
          projectId={projectId}
          currentStage={currentStage}
          currentSubStage={currentSubStage}
        />
      )}
      
      {/* 觀摩模式提示 */}
      {isObservationMode && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 m-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>觀摩模式</strong> - 您正在瀏覽其他班級的專案，無法進行編輯操作
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-visible md:overflow-hidden ">
        <DragDropContext onDragEnd={isObservationMode ? () => {} : onDragEnd}>
          
          <Droppable droppableId="all-droppables" type='COLUMN' direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="w-full h-full overflow-x-hidden md:overflow-x-auto overflow-y-visible md:overflow-y-hidden"
              >
                {/* Small screens: wrap and stack vertically; md+: single row with horizontal scroll */}
                <div className="flex flex-row flex-wrap items-start gap-4 h-auto md:inline-flex md:flex-nowrap md:space-x-4 md:gap-0 md:h-full ">
                {!showAddGroupInput && !isObservationMode && (
                  <button className="bg-[#5BA491] hover:bg-[#5BA491]/90 w-full md:w-60 h-20 md:h-24 flex flex-row items-center justify-center rounded-lg border-none p-4 md:p-7" onClick={toggleAddGroupInput}>
                    <FaPlus className="text-white mr-2 md:m-3" />
                    <b className="text-sm md:text-base text-white">
                      新增列表
                    </b>
                  </button>


                )}
                {showAddGroupInput && !isObservationMode && (
                  <form onSubmit={handleAddGroup} className="group-container w-full md:w-60">
                    <div className="flex flex-col store-container w-full md:w-60 h-auto md:h-24 bg-slate-100 px-4 py-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="輸入列表標題..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="text-sm border border-gray-300 p-2 w-full md:w-52 rounded-md mb-2"
                      />
                      <div className='flex justify-start items-center'>
                        <button
                          type="submit"
                          className="bg-[#5BA491] hover:bg-[#5BA491]/80 p-2 text-sm text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300"
                        >
                          新增列表
                        </button>
                        <button

                          onClick={toggleAddGroupInput}
                          className="flex-center p-2 py-1"
                        >
                          <RxCross2 />
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {
                  kanbanIsLoading ? <Loader /> :
                    kanbansIsError ? <p className=' font-bold text-2xl'>{kanbansIsError.message}</p> :
                      kanbanData.map((column, columnIndex) => (
                        <Draggable draggableId={`column-${column.id.toString()}`}
                          index={columnIndex}
                          key={column.id.toString()}
                          isDragDisabled={isObservationMode}>
                          {(provided) => (
                            <div
                              {...provided.draggableProps}
                              ref={provided.innerRef}
                              className="group-container w-full md:w-60 h-auto md:shrink-0 md:max-h-full md:min-h-0 flex flex-col bg-slate-50 rounded-lg shadow-lg"
                            >
                              <div
                                {...(!isObservationMode ? provided.dragHandleProps : {})}
                                className={`store-container p-3 rounded-lg ${!isObservationMode ? 'cursor-move' : 'cursor-default'} flex justify-between items-center`}
                              >
                                <h3 style={{ color: "#5BA491" }} className="text-lg font-semibold">
                                  {column.name}
                                </h3>
                                {!isObservationMode && (
                                  <button
                                    onClick={() => handleDeleteColumn(column)}
                                    className="text-[#494b4a] hover:text-[#494b4a]/60"
                                    title="删除列"
                                  >
                                    <RxCross2 size={20} />
                                  </button>
                                )}
                              </div>
                              {
                                <Droppable droppableId={column.id.toString()} type='CARD'>
                                  {(provided,snapshot) => {
                                    return (
                                      <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className={getCardListStyle(snapshot.isDraggingOver)}
                                      >
                                        <div className="items-container">
                                        {Array.isArray(column.task) && column.task.length > 0 &&
                                          column.task
                                            .filter(item => item && item.id) // 過濾掉 null 或 undefined
                                            .map((item, index) => (
                                              <Carditem
                                                key={item.id.toString()} // Ensure key is string for both temp and real IDs
                                                index={index}
                                                data={{
                                                  ...item,
                                                  // Add indicator for optimistic updates
                                                  isOptimistic: item.id.toString().startsWith('temp-')
                                                }}
                                                columnIndex={column.id}
                                              />
                                            ))
                                        }
                                          {provided.placeholder}
                                        </div>
                                      </div>
                                    );
                                  }}
                                </Droppable>

                              }
                              {
                                showForm && selectedcolumn === columnIndex && !isObservationMode ? (
                                  <form onSubmit={handleSubmit} className='flex flex-col store-container rounded-lg px-4 pt-1 pb-2'>
                                    <input
                                      className='text-sm border border-gray-300 p-2 w-52 rounded-md mb-2'
                                      rows={3}
                                      placeholder="輸入卡片標題..."
                                      onChange={handleChange}
                                      value={newCard}
                                    />
                                    <div className='flex justify-start items-center'>
                                      <button
                                        type="submit"
                                        style={{ backgroundColor: "#5BA491" }}
                                        className='p-2 text-sm text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300'
                                      >
                                        新增
                                      </button>
                                      <button
                                        type="button"
                                        className="flex-center p-2 py-1"
                                        onClick={() => { setShowForm(false); }}
                                      >
                                        <RxCross2 />
                                      </button>
                                    </div>
                                  </form>

                                ) : (
                                  !isObservationMode && (
                                    <div className="flex justify-start px-4 pt-1 pb-2">
                                      <button
                                        onClick={() => { setSelectedcolumn(columnIndex); setShowForm(true); }}
                                        className="bg-[#5BA491] hover:bg-[#5BA491]/80 text-sm p-2 mb-2 text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300"
                                      >
                                        新增卡片
                                      </button>
                                    </div>
                                  )

                                )
                              }

                            </div>
                          )}
                        </Draggable>
                      ))}
                {provided.placeholder}
                </div>
              </div>
            )
            }
          </Droppable>
        </DragDropContext >
      </div>
    </div >
  )
}
