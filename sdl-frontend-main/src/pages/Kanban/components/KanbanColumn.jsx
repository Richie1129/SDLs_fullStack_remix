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
            className={`store-container p-3 rounded-lg ${!isObservationMode ? 'cursor-move' : 'cursor-default'} flex justify-between items-center`}
          >
            <h3 style={{ color: "#5BA491" }} className="text-lg font-semibold">
              {column.name}
            </h3>
            {!isObservationMode && (
              <button
                onClick={() => onDelete(column)}
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
                          data={{
                            ...item,
                            isOptimistic: item.id.toString().startsWith('temp-')
                          }}
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
                className='text-sm border border-gray-300 p-2 w-52 rounded-md mb-2'
                placeholder="輸入卡片標題..."
                onChange={(e) => setNewCardTitle(e.target.value)}
                value={newCardTitle}
                autoFocus
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
                  onClick={() => setShowForm(true)}
                  className="bg-[#5BA491] hover:bg-[#5BA491]/80 text-sm p-2 mb-2 text-white font-bold py-1 px-4 rounded transition ease-in-out duration-300"
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
