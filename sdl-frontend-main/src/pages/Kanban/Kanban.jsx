import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { getSubStage } from '../../api/stage';
import { socket } from '../../utils/socket';
import DraggableImage from "./components/DraggableImage"; // 確保路徑正確



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
  const [stageInfo, setStageInfo] = useState({ name: "", description: "" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddGroupInput, setShowAddGroupInput] = useState(false); // 新增狀態
  const [newGroupName, setNewGroupName] = useState('');
  const [currentStage, setCurrentStage] = useState(() => localStorage.getItem("currentStage"));
  const [currentSubStage, setCurrentSubStage] = useState(() => localStorage.getItem("currentSubStage"));

  // Helper function to determine if scrolling should be enabled for card lists
  const getCardListStyle = (isDraggingOver, hasOverflow = false) => {
    const baseClasses = "flex flex-col px-4 pb-1";
    const heightClasses = "max-h-96 sm:max-h-[28rem] lg:max-h-[32rem]";
    const backgroundClasses = isDraggingOver ? 'bg-customgreen/10' : 'bg-slate-50';
    const scrollClasses = hasOverflow ? 'overflow-y-auto scrollbar-thin' : '';
    
    return `${baseClasses} ${heightClasses} ${backgroundClasses} ${scrollClasses}`.trim();
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
        console.log("Drag event data:", data);
        setKanbanData(data);
        // Update React Query cache immediately to prevent stale data
        queryClient.setQueryData(['kanbanDatas', projectId], data);
        
        // 印出拖拽後的列表資料
        console.log('=== 拖拽後的 Kanban 列表資料 ===');
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
    socket.on("dragtaskItem", kanbanDragEvent);
    socket.on("columnOrderUpdated", kanbanDragEvent);
    socket.on("ColumnCreatedSuccess", handleColumnCreated); // Use specific handler
    socket.on("columnDeleted", KanbanUpdateEvent);
    
    // Error handling listeners for rollback scenarios
    socket.on("ColumnCreatedError", handleCreationError);
    socket.on("taskItemCreatedError", handleCreationError);
    socket.on("error", handleCreationError);

    // Enhanced cleanup function
    return () => {
      socket.off('taskItems', KanbanUpdateEvent);
      socket.off('taskItem', KanbanUpdateEvent);
      socket.off("taskItemCreated", handleTaskItemCreated);
      socket.off("dragtaskItem", kanbanDragEvent);
      socket.off("columnOrderUpdated", kanbanDragEvent);
      socket.off('ColumnCreatedSuccess', handleColumnCreated);
      socket.off('columnDeleted', KanbanUpdateEvent);
      socket.off("ColumnCreatedError", handleCreationError);
      socket.off("taskItemCreatedError", handleCreationError);
      socket.off("error", handleCreationError);
      console.log("Socket listeners cleaned up");
    };
  }, [socket, projectId, queryClient]);

  // useEffect(() => {
  //   if (!currentStage || !currentSubStage) {
  //     navigate(0);
  //   }
  // }, [currentStage, currentSubStage, navigate])


  const onDragEnd = useCallback((result) => {
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

      setKanbanData(newKanbanData);
      socket.emit('columnOrderChanged', {
        kanbanData: newKanbanData,
        kanbanId: projectId,
      });

    } else if (type === 'CARD') {
      socket.emit('cardItemDragged', {
        destination,
        source,
        kanbanData,
        projectId,
        user: { username: localStorage.getItem("username") }
      })

    }
  }, [kanbanData]);

  const handleChange = (e) => {
    setNewCard(e.target.value);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newCard.length === 0) {
      setShowForm(false);
      return;
    }

    const username = localStorage.getItem("username");
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
      selectedcolumn,
      item: {
        title: newCard.trim(),
        content: "",
        labels: [],
        assignees: []
      },
      kanbanData: updatedKanbanData, // Send updated data
      projectId,
      user: { username }
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
      socket.emit("ColumnCreated", {
        projectId,
        newGroupName: newGroupName.trim()
      });

      // 5. Clear form immediately
      setNewGroupName('');
      setShowAddGroupInput(false);
      
      console.log("✅ Column added optimistically, server sync in progress...");
    }
  };
  const handleDeleteColumn = (columnData) => {
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
        console.log(columnData)
        socket.emit("ColumnDelete", {
          columnData,
          kanbanId: projectId
        });
        Swal.fire(
          '已刪除！',
          '看板列表已被刪除。',
          'success'
      );
      }
    });
  }

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <DraggableImage/>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <DragDropContext onDragEnd={onDragEnd}>
          
          <Droppable droppableId="all-droppables" type='COLUMN' direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 h-full overflow-y-auto md:overflow-y-hidden md:overflow-x-auto scrollbar-none"
              >
                {!showAddGroupInput && (
                  <button className="bg-[#5BA491] hover:bg-[#5BA491]/90 w-full md:w-60 h-20 md:h-24 flex flex-row items-center justify-center rounded-lg border-none p-4 md:p-7 mb-4 md:mb-0" onClick={toggleAddGroupInput}>
                    <FaPlus className="text-white mr-2 md:m-3" />
                    <b className="text-sm md:text-base text-white">
                      新增列表
                    </b>
                  </button>


                )}
                {showAddGroupInput && (
                  <form onSubmit={handleAddGroup} className="group-container w-full md:w-60 mb-4 md:mb-0">
                    <div className="flex flex-col store-container w-full md:w-60 h-auto md:h-24 bg-slate-100 px-4 py-3 rounded-lg mb-2">
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
                          key={column.id.toString()}>
                          {(provided) => (
                            <div
                              {...provided.draggableProps}
                              ref={provided.innerRef}
                              className="group-container w-60 h-fit bg-slate-50 rounded-lg shadow-lg"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="store-container p-3 rounded-lg cursor-move flex justify-between items-center"
                              >
                                <h3 style={{ color: "#5BA491" }} className="text-lg font-semibold">
                                  {column.name}
                                </h3>
                                <button
                                  onClick={() => handleDeleteColumn(column)}
                                  className="text-[#494b4a] hover:text-[#494b4a]/60"
                                  title="删除列"
                                >
                                  <RxCross2 size={20} />
                                </button>
                              </div>
                              {
                                <Droppable droppableId={columnIndex.toString()} type='CARD'>
                                  {(provided,snapshot) => {
                                    const taskCount = column.task?.length || 0;
                                    const needsScrolling = taskCount > 5; // Enable scrolling if more than 5 tasks
                                    
                                    return (
                                      <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className={getCardListStyle(snapshot.isDraggingOver, needsScrolling)}
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
                                showForm && selectedcolumn === columnIndex ? (
                                  <form onSubmit={handleSubmit} className='flex flex-col store-container rounded-lg mb-2 px-4 pt-1'>
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
                                  <div className="flex justify-start px-4 pt-1">
                                    <button
                                      onClick={() => { setSelectedcolumn(columnIndex); setShowForm(true); }}
                                      className="bg-[#5BA491] hover:bg-[#5BA491]/80 text-sm p-2 mb-2 text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300"
                                    >
                                      新增卡片
                                    </button>
                                  </div>

                                )
                              }

                            </div>
                          )}
                        </Draggable>
                      ))}
                {provided.placeholder}
              </div>
            )
            }
          </Droppable>
        </DragDropContext >
      </div>
    </div >
  )
}

