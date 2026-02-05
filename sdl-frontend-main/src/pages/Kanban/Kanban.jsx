import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { DragDropContext } from 'react-beautiful-dnd';
import { StrictModeDroppable as Droppable } from '../../utils/StrictModeDroppable';
import Swal from 'sweetalert2';
import { useQueryClient, useQuery } from 'react-query';
import { getProject } from '../../api/project';
import { getProjectUser } from '../../api/users';
import { socket } from '../../utils/socket';
import DraggableImage from "./components/DraggableImage";
import useObservationMode from '../../hooks/useObservationMode';
import { useStageIndex, useSubStageIndex } from '../../hooks/useStageIndex';
import KanbanErrorBoundary from '../../components/ErrorBoundary/KanbanErrorBoundary';
import { useKanbanData } from './hooks/useKanbanData';
import { useKanbanView } from './hooks/useKanbanView';
import KanbanColumn from './components/KanbanColumn';
import { PHASE_TEMPLATES, PHASES } from '../../config/kanbanTemplates';
import { setStageInfo } from '../../utils/authUtils';

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
    filter: { keyword: '', assignee: [], label: '' }, // assignee 改為陣列支援多選
    groupBy: 'status', // 'status' | 'assignee'
    sortBy: null
  });

  const renderedData = useKanbanView(kanbanData, viewConfig);

  // --- Local UI State ---
  const [showAddGroupInput, setShowAddGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [selectedTemplatePhase, setSelectedTemplatePhase] = useState(null);
  const [selectedTemplateColumns, setSelectedTemplateColumns] = useState([]);
  const [showMemberFilter, setShowMemberFilter] = useState(false); // 控制成員篩選下拉選單
  
  // --- Stage Management ---
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
  const currentStage = currentStageIndex;
  const currentSubStage = currentSubStageIndex;

  const { isObservationMode } = useObservationMode();
  const kanbanContainerRef = useRef(null);

  // --- Fetch Project Members ---
  const { data: projectMembers = [], isLoading: membersLoading } = useQuery(
    ['projectMembers', projectId],
    () => getProjectUser(projectId),
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => {
        console.log('🔍 專案成員列表:', data);
      },
      onError: (error) => {
        console.error('❌ 獲取專案成員失敗:', error);
      }
    }
  );

  // --- Derived State ---
  const allAssignees = React.useMemo(() => {
    // 優先使用專案成員列表
    if (projectMembers && projectMembers.length > 0) {
      return projectMembers;
    }
    
    // 回退：從任務 assignees 中提取（向下兼容）
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
  }, [projectMembers, kanbanData]);

  // --- Effects (Stage Sync) ---
  useEffect(() => {
    const onTaskSubmitted = async (_payload) => {
      try {
        const proj = await getProject(projectId);
        if (proj?.currentStage && proj?.currentSubStage) {
          setStageInfo(proj.currentStage, proj.currentSubStage);
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
          setStageInfo(proj.currentStage, proj.currentSubStage);
          setCurrentStageIndex(proj.currentStage);
          setCurrentSubStageIndex(proj.currentSubStage);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [projectId, setCurrentStageIndex, setCurrentSubStageIndex]);

  // --- Handlers ---

  const handleAddTemplate = (phaseKey) => {
    if (isObservationMode) return;
    const template = PHASE_TEMPLATES[phaseKey];
    if (!template) return;

    // Open Selection Modal
    setSelectedTemplatePhase(phaseKey);
    // Default select all columns
    setSelectedTemplateColumns(template.columns.map((_, idx) => idx));
    setShowTemplateMenu(false);
  };

  const handleConfirmTemplate = () => {
    if (!selectedTemplatePhase) return;
    const template = PHASE_TEMPLATES[selectedTemplatePhase];
    
    // Filter columns based on selection
    const columnsToAdd = template.columns.filter((_, idx) => selectedTemplateColumns.includes(idx));
    
    if (columnsToAdd.length > 0) {
      if (actions.addPhaseTemplate) {
        actions.addPhaseTemplate(columnsToAdd);
      } else {
        // Fallback
        columnsToAdd.forEach(col => actions.addColumn(col.title));
      }
    }
    
    // Reset
    setSelectedTemplatePhase(null);
    setSelectedTemplateColumns([]);
  };

  const toggleTemplateColumnSelection = (index) => {
    setSelectedTemplateColumns(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const toggleMemberSelection = (username) => {
    setViewConfig(prev => {
      const currentAssignees = prev.filter?.assignee || [];
      const isSelected = currentAssignees.includes(username);
      
      return {
        ...prev,
        filter: {
          ...prev.filter,
          assignee: isSelected
            ? currentAssignees.filter(u => u !== username)
            : [...currentAssignees, username]
        }
      };
    });
  };

  const clearMemberFilter = () => {
    setViewConfig(prev => ({
      ...prev,
      filter: { ...prev.filter, assignee: [] }
    }));
  };

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
      
      {/* Template Selection Modal */}
      {selectedTemplatePhase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-body-lg font-medium text-gray-900">
                選擇要新增的列表 ({PHASE_TEMPLATES[selectedTemplatePhase].label})
              </h3>
              <button 
                onClick={() => setSelectedTemplatePhase(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <RxCross2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <p className="text-body-sm text-gray-500 mb-4">
                勾選您想要加入看板的列表。包含範例卡片的列表將會一併匯入卡片。
              </p>
              <div className="space-y-3">
                {PHASE_TEMPLATES[selectedTemplatePhase].columns.map((col, idx) => (
                  <label key={idx} className="flex items-start space-x-3 p-component-sm border rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-[#5BA491] focus:ring-[#5BA491] border-gray-300 rounded mt-1"
                      checked={selectedTemplateColumns.includes(idx)}
                      onChange={() => toggleTemplateColumnSelection(idx)}
                    />
                    <div className="flex-1">
                      <span className="block text-body-sm font-medium text-gray-900">
                        {col.title}
                      </span>
                      {col.defaultCards && col.defaultCards.length > 0 && (
                        <span className="block text-caption text-gray-500 mt-1">
                          包含 {col.defaultCards.length} 張範例卡片
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTemplatePhase(null)}
                className="px-4 py-2 text-body-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5BA491]"
              >
                取消
              </button>
              <button
                onClick={handleConfirmTemplate}
                disabled={selectedTemplateColumns.length === 0}
                className={`px-4 py-2 text-body-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5BA491] ${
                  selectedTemplateColumns.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#5BA491] hover:bg-[#5BA491]/90'
                }`}
              >
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {!isObservationMode && (
        <DraggableImage 
          containerRef={kanbanContainerRef}
          projectId={projectId}
          currentStage={currentStage}
          currentSubStage={currentSubStage}
        />
      )}
      
      {isObservationMode && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-component-base m-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-body-sm text-blue-700">
                <strong>觀摩模式</strong> - 您正在瀏覽其他班級的專案，無法進行編輯操作
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 min-h-0 p-component-base sm:p-component-md-lg lg:p-component-lg overflow-visible md:overflow-hidden flex flex-col">
        
        {/* View Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-stack-sm mb-4 p-component-sm bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-stack-xs">
            <span className="text-body-sm font-medium text-gray-600">搜尋:</span>
            <input
              type="text"
              placeholder="輸入標題關鍵字..."
              className="px-3 py-1.5 border border-gray-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
              value={viewConfig.filter?.keyword || ''}
              onChange={(e) => setViewConfig(prev => ({
                ...prev,
                filter: { ...prev.filter, keyword: e.target.value }
              }))}
            />
          </div>

          <div className="flex items-center gap-stack-xs">
            <span className="text-body-sm font-medium text-gray-600">分組:</span>
            <select
              className="px-3 py-1.5 border border-gray-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
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

          <div className="flex items-center gap-stack-xs relative">
            <span className="text-body-sm font-medium text-gray-600">成員:</span>
            <div className="relative">
              <button
                className="px-3 py-1.5 border border-gray-300 rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-[#5BA491] bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[120px] justify-between"
                onClick={() => setShowMemberFilter(!showMemberFilter)}
              >
                <span>
                  {viewConfig.filter?.assignee?.length > 0
                    ? `${viewConfig.filter.assignee.length} 位成員`
                    : '所有成員'}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showMemberFilter && (
                <>
                  {/* 點擊外部關閉 */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMemberFilter(false)}
                  />
                  
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border border-gray-200 py-2 max-h-80 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-body-sm font-semibold text-gray-700">
                        選擇成員 ({viewConfig.filter?.assignee?.length || 0}/{allAssignees.length})
                      </span>
                      {viewConfig.filter?.assignee?.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMemberFilter();
                          }}
                          className="text-caption text-[#5BA491] hover:text-[#5BA491]/80"
                        >
                          清除
                        </button>
                      )}
                    </div>
                    
                    {allAssignees.length === 0 ? (
                      <div className="px-3 py-4 text-center text-body-sm text-gray-500">
                        暫無成員資料
                      </div>
                    ) : (
                      <div className="py-1">
                        {allAssignees.map(member => (
                          <label
                            key={member.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-[#5BA491] focus:ring-[#5BA491] border-gray-300 rounded"
                              checked={viewConfig.filter?.assignee?.includes(member.username) || false}
                              onChange={() => toggleMemberSelection(member.username)}
                            />
                            <span className="ml-3 text-body-sm text-gray-700">
                              {member.username}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
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
                <div className="flex flex-row flex-wrap items-start gap-stack-sm h-auto md:inline-flex md:flex-nowrap md:space-x-stack-sm md:gap-0 md:h-full ">
                
                {/* Add Column & Add Template Buttons */}
                {viewConfig.groupBy === 'status' && !showAddGroupInput && !isObservationMode && (
                  <div className="flex flex-col gap-stack-sm w-full md:w-60 shrink-0">
                    <button 
                      className="bg-[#5BA491] hover:bg-[#5BA491]/90 w-full h-20 md:h-24 flex flex-row items-center justify-center rounded-lg border-none p-component-base md:p-7" 
                      onClick={toggleAddGroupInput}
                    >
                      <FaPlus className="text-white mr-2 md:m-3" />
                      <b className="text-body-sm md:text-body text-white">
                        新增列表
                      </b>
                    </button>

                    <div className="relative w-full h-20 md:h-24">
                      <button 
                        className="w-full h-full bg-white border-2 border-dashed border-gray-300 hover:border-[#5BA491] hover:text-[#5BA491] text-gray-500 flex flex-col items-center justify-center rounded-lg p-component-base transition-colors"
                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                      >
                        <span className="text-h2 mb-1">+</span>
                        <b className="text-body-sm md:text-body">
                          從範例新增
                        </b>
                      </button>
                      
                      {showTemplateMenu && (
                        <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-md shadow-lg z-50 border border-gray-200 py-1">
                          <div className="px-4 py-2 text-caption font-semibold text-gray-400 uppercase tracking-wider">
                            選擇階段範例
                          </div>
                          {PHASES.map(phaseKey => (
                            <button
                              key={phaseKey}
                              onClick={() => handleAddTemplate(phaseKey)}
                              className="block w-full text-left px-4 py-2 text-body-sm text-gray-700 hover:bg-gray-100 hover:text-[#5BA491]"
                            >
                              {PHASE_TEMPLATES[phaseKey].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {viewConfig.groupBy === 'status' && showAddGroupInput && !isObservationMode && (
                  <form onSubmit={handleAddGroup} className="group-container w-full md:w-60">
                    <div className="flex flex-col store-container w-full md:w-60 h-auto md:h-24 bg-slate-100 px-4 py-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="輸入列表標題..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="text-body-sm border border-gray-300 p-component-xs w-full md:w-52 rounded-md mb-2"
                      />
                      <div className='flex justify-start items-center'>
                        <button
                          type="submit"
                          className="bg-[#5BA491] hover:bg-[#5BA491]/80 p-component-xs text-body-sm text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300"
                        >
                          新增列表
                        </button>
                        <button
                          onClick={toggleAddGroupInput}
                          className="flex-center p-component-xs py-1"
                        >
                          <RxCross2 />
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                
                {
                  kanbanIsLoading ? <Loader /> :
                    kanbansIsError ? <p className=' font-bold text-h2'>{kanbansIsError.message}</p> :
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
