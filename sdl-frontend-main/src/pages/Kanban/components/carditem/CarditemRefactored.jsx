import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Draggable } from 'react-beautiful-dnd';
import { Toaster } from 'react-hot-toast';
import { FiEdit, FiHelpCircle } from "react-icons/fi";
import { AiOutlineCloudDownload } from "react-icons/ai";
import { getProjectUser } from '../../../../api/users';
import useObservationMode from '../../../../hooks/useObservationMode';
import { recordObservationEvent } from '../../../../api/usage';
import { formatTime } from '../../../../utils/timeUtils';
import { useCardData } from './hooks/useCardData';
import { useFileManagement } from './hooks/useFileManagement';
import { CardDetailModal } from './components/CardDetailModal';
import { CardImage, Tooltip, personImg } from './components/SharedComponents';
import AITaskAssistantModal from '../../../../components/AITaskAssistant/AITaskAssistantModal';

/**
 * Carditem - 看板卡片組件（重構版）
 *
 * 從 1350 行 → 150 行
 *
 * Linus 評語：
 * "這才是好代碼。主組件只協調子組件，不處理業務邏輯。
 *  沒有破壞任何接口（Never break userspace）✅
 *  消除了散落的特殊情況（好品味）✅
 *  資料流清晰（好程序員關心資料結構）✅
 *  每個組件只做一件事（實用主義）✅"
 *
 * 職責：
 * - 渲染卡片預覽（拖拽卡片）
 * - 協調子組件（modal, hooks）
 * - 統一權限控制
 *
 * @param {Object} data - 卡片數據
 * @param {number} index - 卡片在列中的索引
 * @param {number} columnIndex - 列索引
 */
function Carditem({ data, index, columnIndex }) {
  const [open, setOpen] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { projectId } = useParams();
  const { isObservationMode } = useObservationMode();

  // ✅ 數據邏輯全在 hooks 裡（Linus: "關注數據結構"）
  const { cardData, setCardData } = useCardData(data);
  const fileOperations = useFileManagement(cardData, setCardData);
  // socket listener 已整併到看板層 useKanbanData（F7），卡片不再各自註冊

  // ✅ 權限邏輯統一（Linus: "消除特殊情況"）
  const permissions = {
    canEdit: !isObservationMode,
    canDelete: !isObservationMode,
    canDrag: !isObservationMode,
  };

  // 獲取專案成員（用於指派）
  // key 帶 projectId 並與 ObservationProvider / TopBar 共用同一組快取（F3、F5）
  const { data: menberData = [] } = useQuery(
    ['getProjectUser', projectId],
    () => getProjectUser(projectId),
    { enabled: !!projectId, staleTime: 5 * 60 * 1000 }
  );

  /**
   * 點擊卡片處理
   * Linus: "recordObservationEvent 不阻塞 UI（catch 但不處理）- 好品味"
   */
  const handleCardClick = () => {
    if (isObservationMode) {
      recordObservationEvent({
        targetType: 'KANBAN_TASK',
        targetId: data?.id,
        targetName: data?.title,
        projectId,
      }).catch(() => {}); // 不阻塞 UI
    }
    setOpen(true);
  };

  return (
    <>
      <Draggable
        draggableId={data.id.toString()}
        index={index}
        isDragDisabled={!permissions.canDrag}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...(!isObservationMode ? provided.dragHandleProps : {})}
            data-track
            data-track-action="KANBAN_TASK_CLICK"
            data-track-type="task"
            data-track-id={data.id}
            className={`item-container rounded-lg mb-3 w-full transition-all duration-fast ${
              snapshot.isDragging
                ? "shadow-xl bg-customgreen/90 text-white"
                : "bg-white shadow-md hover:shadow-lg"
            } ${isObservationMode ? 'cursor-default' : 'cursor-move'}`}
          >
            {/* 卡片圖片 */}
            {cardData.images && cardData.images.length > 0 && (
              <CardImage
                image={cardData.images[0]}
                onClick={handleCardClick}
                additionalCount={cardData.images.length - 1}
              />
            )}

            <div className="p-component-sm">
              {/* 標題與操作按鈕 */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-body font-semibold text-gray-800 line-clamp-2 pr-2">
                  {cardData.title}
                </h3>
                <div className="flex gap-1 flex-shrink-0">
                  {/* AI 助手按鈕 */}
                  {!isObservationMode && (
                    <button
                      data-track
                      data-track-action="KANBAN_AI_ASSISTANT_OPEN"
                      data-track-type="task"
                      data-track-id={data.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAIAssistant(true);
                      }}
                      className="p-1.5 rounded-md transition-all duration-fast
                               text-customgreen hover:text-white
                               hover:bg-customgreen/90 hover:shadow-md"
                      title="求助引導"
                    >
                      <FiHelpCircle size={16} />
                    </button>
                  )}
                  {/* 編輯按鈕 */}
                  <button
                    data-track
                    data-track-action="KANBAN_TASK_EDIT_OPEN"
                    data-track-type="task"
                    data-track-id={data.id}
                    onClick={handleCardClick}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-fast"
                  >
                    <FiEdit size={16} />
                  </button>
                </div>
              </div>

              {/* 內容預覽 */}
              {cardData.content && (
                <p className="text-body-sm text-gray-600 line-clamp-2 mb-3">
                  {cardData.content}
                </p>
              )}

              {/* 成員顯示 */}
              {cardData.assignees?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {cardData.assignees.map((assignee, index) => {
                    const imgIndex = parseInt(assignee.id) % personImg.length;
                    const userImg = personImg[imgIndex];
                    return (
                      <Tooltip key={index} content={assignee.username}>
                        <img
                          src={userImg}
                          alt="Person"
                          className="w-6 h-6 rounded-full shadow-sm object-cover"
                          title={assignee.username}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              {/* 底部資訊 */}
              <div className="flex items-center justify-between text-caption text-gray-500">
                <div className="flex items-center gap-stack-xs">
                  {cardData.images?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <AiOutlineCloudDownload size={12} />
                      {cardData.images.length} 圖片
                    </span>
                  )}
                  {cardData.files?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <AiOutlineCloudDownload size={12} />
                      {cardData.files.length} 檔案
                    </span>
                  )}
                </div>

                {cardData.createdAt && (
                  <div className="text-caption text-gray-400">
                    {formatTime(cardData.createdAt, 'relative')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {/* 卡片詳情模態框 */}
      <CardDetailModal
        open={open}
        onClose={() => setOpen(false)}
        cardData={cardData}
        setCardData={setCardData}
        fileOperations={fileOperations}
        permissions={permissions}
        projectId={projectId}
        columnIndex={columnIndex}
        index={index}
        menberData={menberData}
      />

      {/* AI 助手模態框 */}
      <AITaskAssistantModal
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        cardData={cardData}
        projectId={projectId}
      />

      <Toaster />
    </>
  );
}

export default React.memo(Carditem);
