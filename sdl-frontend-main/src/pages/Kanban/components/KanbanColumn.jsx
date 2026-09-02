import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { StrictModeDroppable as Droppable } from '../../../utils/StrictModeDroppable';
import { RxCross2 } from "react-icons/rx";
import Carditem from './carditem';

const getCardListStyle = (isDraggingOver) => {
  const base = 'flex flex-col px-4 pb-1 overflow-visible md:flex-1 md:min-h-0 md:overflow-y-auto scrollbar-thin';
  const bg = isDraggingOver ? 'bg-customgreen/10' : 'bg-slate-50';
  return `${base} ${bg}`.trim();
};

const KanbanColumn = ({ 
  column, 
  index, 
  isObservationMode, 
  onDelete, 
  onAddCard 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isObservationMode) return;
    
    if (newCardTitle.trim().length === 0) {
      setShowForm(false);
      return;
    }

    onAddCard(newCardTitle, index);
    setNewCardTitle("");
    setShowForm(false);
  };

  return (
    <Draggable 
      draggableId={`column-${column.id.toString()}`}
      index={index}
      key={column.id.toString()}
      isDragDisabled={isObservationMode}
    >
      {(provided) => (
        <div
          {...provided.draggableProps}
          ref={provided.innerRef}
          className="group-container w-full md:w-60 h-auto md:shrink-0 md:max-h-full md:min-h-0 flex flex-col bg-slate-50 rounded-lg shadow-lg"
        >
          <div
            {...(!isObservationMode ? provided.dragHandleProps : {})}
            className={`store-container p-component-sm rounded-lg ${!isObservationMode ? 'cursor-move' : 'cursor-default'} flex justify-between items-center`}
          >
            <h3 style={{ color: "#5BA491" }} className="text-body-lg font-semibold">
              {column.name}
            </h3>
            {!isObservationMode && (
              <button                data-track
                data-track-action="KANBAN_COLUMN_DELETE"
                data-track-type="column"
                data-track-id={column.id}                onClick={() => onDelete(column)}
                className="text-[#494b4a] hover:text-[#494b4a]/60"
                title="删除列"
              >
                <RxCross2 size={20} />
              </button>
            )}
          </div>
          
          <Droppable droppableId={column.id.toString()} type='CARD'>
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className={getCardListStyle(snapshot.isDraggingOver)}
              >
                <div className="items-container">
                  {Array.isArray(column.task) && column.task.length > 0 &&
                    column.task
                      .filter(item => item && item.id)
                      .map((item, index) => (
                        <Carditem
                          key={item.id.toString()}
                          index={index}
                          // 直接傳原物件：每次 render 建新物件會讓 Carditem 的 React.memo 失效（F6）；
                          // 樂觀卡片可由 id 前綴 temp- 判斷，不再另外包一層
                          data={item}
                          columnIndex={column.id}
                        />
                      ))
                  }
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

          {showForm && !isObservationMode ? (
            <form onSubmit={handleSubmit} className='flex flex-col store-container rounded-lg px-4 pt-1 pb-2'>
              <input
                className='text-body-sm border border-gray-300 p-component-xs w-52 rounded-md mb-2'
                placeholder="輸入卡片標題..."
                onChange={(e) => setNewCardTitle(e.target.value)}
                value={newCardTitle}
                autoFocus
              />
              <div className='flex justify-start items-center'>
                <button
                  data-track
                  data-track-action="KANBAN_CARD_CREATE"
                  data-track-type="task"
                  data-track-meta-column={column.name}
                  type="submit"
                  style={{ backgroundColor: "#5BA491" }}
                  className='p-component-xs text-body-sm text-white font-bold py-1 px-4 rounded transition ease-in-out duration-normal'
                >
                  新增
                </button>
                <button
                  type="button"
                  className="flex-center p-component-xs py-1"
                  onClick={() => { setShowForm(false); setNewCardTitle(""); }}
                >
                  <RxCross2 />
                </button>
              </div>
            </form>
          ) : (
            !isObservationMode && (
              <div className="flex justify-start px-4 pt-1 pb-2">
                <button
                  data-track
                  data-track-action="KANBAN_CARD_CREATE_OPEN"
                  data-track-type="column"
                  data-track-id={column.id}
                  onClick={() => setShowForm(true)}
                  className="bg-[#5BA491] hover:bg-[#5BA491]/80 text-body-sm p-component-xs mb-2 text-white font-bold py-1 px-4 rounded transition ease-in-out duration-normal"
                >
                  新增卡片
                </button>
              </div>
            )
          )}
        </div>
      )}
    </Draggable>
  );
};

export default KanbanColumn;
