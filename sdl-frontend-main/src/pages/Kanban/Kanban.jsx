import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { DragDropContext } from 'react-beautiful-dnd';
import { StrictModeDroppable as Droppable } from '../../utils/StrictModeDroppable';
import Swal from 'sweetalert2';
import { useQueryClient } from 'react-query';
import { getProject } from '../../api/project';
import { socket } from '../../utils/socket';
import DraggableImage from "./components/DraggableImage";
import useObservationMode from '../../hooks/useObservationMode';
import { useStageIndex, useSubStageIndex } from '../../hooks/useStageIndex';
import KanbanErrorBoundary from '../../components/ErrorBoundary/KanbanErrorBoundary';
import { useKanbanData } from './hooks/useKanbanData';
import { useKanbanView } from './hooks/useKanbanView';
import KanbanColumn from './components/KanbanColumn';

/**
 * Kanban Component (Refactored)
 * 
 * Uses useKanbanData for data management and useKanbanView for presentation logic.
 * Decoupled from direct socket/api calls.
 */
export default function Kanban() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // --- Hooks ---
  const { 
    kanbanData, 
    isLoading: kanbanIsLoading, 
    isError: kanbansIsError, 
    actions 
  } = useKanbanData(projectId);

  const [viewConfig, setViewConfig] = useState({
    filter: { keyword: '', assignee: '', label: '' },
    groupBy: 'status', // 'status' | 'assignee'
    sortBy: null
  });

  const renderedData = useKanbanView(kanbanData, viewConfig);

  // --- Local UI State ---
  const [showAddGroupInput, setShowAddGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // --- Stage Management ---
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
  const currentStage = currentStageIndex;
  const currentSubStage = currentSubStageIndex;
  
  const { isObservationMode } = useObservationMode();
  const kanbanContainerRef = useRef(null);

  // --- Derived State ---
  const allAssignees = React.useMemo(() => {
    if (!kanbanData) return [];
    const assignees = new Map();
    kanbanData.forEach(col => {
      col.task?.forEach(task => {
        task.assignees?.forEach(a => {
          if (a.username && !assignees.has(a.username)) {
            assignees.set(a.username, a);
          }
        });
      });
    });
    return Array.from(assignees.values());
  }, [kanbanData]);

  // --- Effects (Stage Sync) ---
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

  // --- Handlers ---

  const onDragEnd = useCallback((result) => {
    if (isObservationMode) {
      console.warn('觀摩模式下禁止拖拽操作');
      return;
    }
    
    // Disable DnD for non-status views
    if (viewConfig.groupBy !== 'status') {
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
      actions.reorderColumn(source.index, destination.index);
    } else if (type === 'CARD') {
      actions.moveCard(source, destination);
    }
  }, [isObservationMode, actions, viewConfig.groupBy]);

  const toggleAddGroupInput = () => {
    setShowAddGroupInput(!showAddGroupInput);
  };

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (isObservationMode) return;
    
    if (newGroupName.trim() !== '') {
      actions.addColumn(newGroupName);
      setNewGroupName('');
      setShowAddGroupInput(false);
    }
  };

  const handleDeleteColumn = (columnData) => {
    if (isObservationMode) return;
    
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
        actions.deleteColumn(columnData);
      }
    });
  }

  const handleKanbanError = (error, errorInfo, errorId) => {
    console.error('Kanban 錯誤處理:', { error, errorInfo, errorId });
  };

  const handleNetworkError = () => {
    console.log('嘗試重新連接 Socket...');
    socket.disconnect();
    socket.connect();
  };

  const handleDataReload = () => {
    console.log('重新載入 Kanban 數據...');
    queryClient.invalidateQueries(['kanbanDatas', projectId]);
  };

  return (
    <KanbanErrorBoundary
      onError={handleKanbanError}
      onNetworkError={handleNetworkError}
      onDataReload={handleDataReload}
    >
      <div ref={kanbanContainerRef} className="h-full min-h-0 w-full bg-white flex flex-col">
      {!isObservationMode && (
        <DraggableImage 
          containerRef={kanbanContainerRef}
          projectId={projectId}
          currentStage={currentStage}
          currentSubStage={currentSubStage}
        />
      )}
      
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
      
      <div className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-visible md:overflow-hidden flex flex-col">
        
        {/* View Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">搜尋:</span>
            <input
              type="text"
              placeholder="輸入標題關鍵字..."
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
              value={viewConfig.filter?.keyword || ''}
              onChange={(e) => setViewConfig(prev => ({
                ...prev,
                filter: { ...prev.filter, keyword: e.target.value }
              }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">分組:</span>
            <select
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
              value={viewConfig.groupBy}
              onChange={(e) => setViewConfig(prev => ({
                ...prev,
                groupBy: e.target.value
              }))}
            >
              <option value="status">狀態 (預設)</option>
              <option value="assignee">負責人</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">成員:</span>
            <select
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
              value={viewConfig.filter?.assignee || ''}
              onChange={(e) => setViewConfig(prev => ({
                ...prev,
                filter: { ...prev.filter, assignee: e.target.value || null }
              }))}
            >
              <option value="">所有成員</option>
              {allAssignees.map(a => (
                <option key={a.id} value={a.username}>{a.username}</option>
              ))}
            </select>
          </div>
        </div>

        <DragDropContext onDragEnd={isObservationMode ? () => {} : onDragEnd}>
          
          <Droppable 
            droppableId="all-droppables" 
            type='COLUMN' 
            direction="horizontal"
            isDropDisabled={viewConfig.groupBy !== 'status'}
          >
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="w-full h-full overflow-x-hidden md:overflow-x-auto overflow-y-visible md:overflow-y-hidden"
              >
                <div className="flex flex-row flex-wrap items-start gap-4 h-auto md:inline-flex md:flex-nowrap md:space-x-4 md:gap-0 md:h-full ">
                
                {/* Only show Add Column in Status View */}
                {viewConfig.groupBy === 'status' && !showAddGroupInput && !isObservationMode && (
                  <button className="bg-[#5BA491] hover:bg-[#5BA491]/90 w-full md:w-60 h-20 md:h-24 flex flex-row items-center justify-center rounded-lg border-none p-4 md:p-7" onClick={toggleAddGroupInput}>
                    <FaPlus className="text-white mr-2 md:m-3" />
                    <b className="text-sm md:text-base text-white">
                      新增列表
                    </b>
                  </button>
                )}
                
                {viewConfig.groupBy === 'status' && showAddGroupInput && !isObservationMode && (
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
                      renderedData.map((column, columnIndex) => (
                        <KanbanColumn
                          key={column.id.toString()}
                          column={column}
                          index={columnIndex}
                          isObservationMode={isObservationMode || viewConfig.groupBy !== 'status'}
                          onDelete={handleDeleteColumn}
                          onAddCard={actions.addCard}
                        />
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
    </KanbanErrorBoundary>
  )
}
