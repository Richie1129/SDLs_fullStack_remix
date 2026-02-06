import React, { useState, useRef } from 'react';
import { useQueryClient } from 'react-query';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import Modal from '../../../../../components/Modal';
import AssignMember from '../../AssignMember';
import { GrFormClose } from "react-icons/gr";
import { AiOutlineCloudDownload } from "react-icons/ai";
import { CircleArrowLeft, CircleArrowRight } from "lucide-react";
import { socket } from '../../../../../utils/socket';
import { getUserForSocket, isCurrentUser, getCurrentUsername } from '../../../../../utils/userUtils';
import { formatTime } from '../../../../../utils/timeUtils';
import { FileManager } from './FileManager';
import { CommentSection } from './CommentSection';
import { ChangeHistory } from './ChangeHistory';
import { MemberAssignment } from './SharedComponents';
import { buildFileImageUrl } from '@/utils/fileUrlBuilder.js';

/**
 * CardDetailModal - 卡片詳情模態框
 *
 * 職責：
 * - 整合所有子組件（編輯器、文件、評論、歷史）
 * - 處理卡片的儲存和刪除
 * - 管理標籤頁切換
 * - 管理圖片查看器
 *
 * Linus: "容器組件只負責協調子組件，不處理業務邏輯"
 *
 * @param {boolean} open - 是否打開模態框
 * @param {Function} onClose - 關閉回調
 * @param {Object} cardData - 卡片數據
 * @param {Function} setCardData - 更新卡片數據
 * @param {Object} fileOperations - 文件操作函數集合
 * @param {Object} permissions - 權限控制
 * @param {string} projectId - 專案 ID
 * @param {number} columnIndex - 列索引
 * @param {number} index - 卡片索引
 * @param {Array} menberData - 成員數據
 */
export function CardDetailModal({
  open,
  onClose,
  cardData,
  setCardData,
  fileOperations,
  permissions,
  projectId,
  columnIndex,
  index,
  menberData
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [assignMemberModalopen, setAssignMemberModalOpen] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);

  // 圖片查看器狀態
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [commentImageList, setCommentImageList] = useState([]);
  const [selectedCommentImageIndex, setSelectedCommentImageIndex] = useState(null);

  // 計算卡片建立者顯示名稱
  const currentUsername = getCurrentUsername();
  const getDisplayOwnerName = (owner) => {
    if (isCurrentUser(owner) || owner === currentUsername) {
      return currentUsername;
    }
    return owner;
  };

  // 卡片圖片查看器
  const openImageModal = (index) => setSelectedImageIndex(index);
  const closeImageModal = () => setSelectedImageIndex(null);
  const nextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === cardData.images.length - 1 ? 0 : prev + 1
    );
  };
  const prevImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? cardData.images.length - 1 : prev - 1
    );
  };

  // 評論圖片查看器
  const openCommentImageModal = (imageAttachments, index) => {
    const urls = (imageAttachments || []).map(att => buildFileImageUrl(att.fileName));
    setCommentImageList(urls);
    setSelectedCommentImageIndex(index || 0);
  };
  const closeCommentImageModal = () => {
    setCommentImageList([]);
    setSelectedCommentImageIndex(null);
  };
  const nextCommentImage = () => {
    setSelectedCommentImageIndex((prev) => {
      if (commentImageList.length === 0) return null;
      return prev === commentImageList.length - 1 ? 0 : prev + 1;
    });
  };
  const prevCommentImage = () => {
    setSelectedCommentImageIndex((prev) => {
      if (commentImageList.length === 0) return null;
      return prev === 0 ? commentImageList.length - 1 : prev - 1;
    });
  };

  /**
   * 儲存卡片
   */
  const cardHandleSubmit = () => {
    if (cardData.title.trim() !== "") {
      const updatedCardData = {
        ...cardData,
        files: Array.isArray(cardData.files) ? cardData.files : [],
        images: Array.isArray(cardData.images) ? cardData.images : []
      };

      socket.emit("cardUpdated", {
        eventType: 'taskUpdate',
        cardData: updatedCardData,
        columnIndex,
        index,
        projectId,
        user: getUserForSocket()
      });

      queryClient.invalidateQueries(['taskChangeLogs', cardData.id]);
      queryClient.invalidateQueries(['kanbanDatas', projectId]);

      onClose();
    } else {
      toast.error("請填寫卡片標題!");
    }
  };

  /**
   * 刪除卡片
   * Linus: "樂觀更新 + 伺服器確認 - 這是正確的做法"
   */
  const cardHandleDelete = () => {
    Swal.fire({
      title: "刪除",
      text: "確定要刪除卡片嗎?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5BA491",
      cancelButtonColor: "#d33",
      confirmButtonText: "確定",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        // 樂觀更新：立即從緩存中移除
        try {
          queryClient.setQueryData(['kanbanDatas', projectId], (prev) => {
            if (!Array.isArray(prev)) return prev;
            const next = prev.map(col => {
              if (Number(col.id) !== Number(columnIndex)) return col;
              const filtered = Array.isArray(col.task) ? col.task.filter(t => t && t.id !== cardData.id) : [];
              return { ...col, task: filtered };
            });
            return next;
          });
        } catch (_) {}

        // 發送刪除事件到伺服器
        socket.emit("cardDelete", {
          eventType: 'taskDelete',
          cardData,
          columnIndex,
          index,
          projectId,
          user: getUserForSocket()
        });

        // 背景重新驗證
        try { queryClient.invalidateQueries(['kanbanDatas', projectId]); } catch (_) {}
        onClose();
      }
    });
  };

  return (
    <>
      <Modal open={open} onClose={onClose} opacity={true} position={"justify-center items-center"} custom={"w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:w-3/5 max-w-6xl p-0"}>
        <div className='flex flex-col lg:flex-row w-full lg:max-h-[85vh] relative'>
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 z-50 p-1 rounded-lg bg-gray-100 hover:bg-gray-200 shadow-sm transition-colors duration-fast"
          >
            <GrFormClose className="w-6 h-6" />
          </button>
          {/* 左側：卡片編輯區 */}
          <div className='w-full lg:w-2/3 p-component-base sm:p-component-md-lg lg:p-component-lg lg:max-h-[85vh] lg:overflow-y-auto'>
            {/* 標籤頁導航 */}
            <div className='flex border-b border-gray-200 mb-4'>
              <button
                onClick={() => setShowChangeHistory(false)}
                className={`px-4 py-2 font-medium text-body-sm ${
                  !showChangeHistory
                    ? 'text-customgreen border-b-2 border-customgreen'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                編輯任務
              </button>
              <button
                onClick={() => {
                  setShowChangeHistory(true);
                  queryClient.invalidateQueries(['taskChangeLogs', cardData.id]);
                }}
                className={`px-4 py-2 font-medium text-body-sm ${
                  showChangeHistory
                    ? 'text-customgreen border-b-2 border-customgreen'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                變更歷史
              </button>
            </div>

            {/* 編輯任務內容 */}
            {!showChangeHistory && (
              <>
                <div className='flex justify-between mb-4'>
                  <input
                    className={`rounded outline-none ring-2 p-component-xs ring-customgreen w-full ${!permissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    type="text"
                    placeholder="標題"
                    value={cardData.title}
                    onChange={permissions.canEdit ? (e) => setCardData({ ...cardData, title: e.target.value }) : undefined}
                    readOnly={!permissions.canEdit}
                  />
                </div>
                <textarea
                  className={`rounded outline-none ring-2 ring-customgreen w-full p-component-xs mb-4 ${!permissions.canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  rows={3}
                  placeholder="內容"
                  value={cardData.content}
                  onChange={permissions.canEdit ? (e) => setCardData({ ...cardData, content: e.target.value }) : undefined}
                  readOnly={!permissions.canEdit}
                />

                {/* 時間資訊 */}
                {(cardData.createdAt || cardData.updatedAt) && (
                  <div className='bg-gray-50 rounded-lg p-component-sm mb-4'>
                    <h4 className='text-body-sm font-medium text-gray-700 mb-2'>時間資訊</h4>
                    <div className='space-y-1 text-body-sm text-gray-600'>
                      {cardData.createdAt && (
                        <div className='flex justify-between'>
                          <span>建立時間：</span>
                          <span title={formatTime(cardData.createdAt, 'full')}>
                            {formatTime(cardData.createdAt, 'full')}
                          </span>
                        </div>
                      )}
                      {cardData.updatedAt && cardData.updatedAt !== cardData.createdAt && (
                        <div className='flex justify-between'>
                          <span>更新時間：</span>
                          <span title={formatTime(cardData.updatedAt, 'full')}>
                            {formatTime(cardData.updatedAt, 'relative')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <MemberAssignment
                  cardData={cardData}
                  setAssignMemberModalOpen={setAssignMemberModalOpen}
                  owner={getDisplayOwnerName(cardData.owner)}
                  isObservationMode={!permissions.canEdit}
                />

                <FileManager
                  cardData={cardData}
                  handleFileUpload={fileOperations.handleFileUpload}
                  handleFileDownload={fileOperations.handleFileDownload}
                  handleImageDownload={fileOperations.handleImageDownload}
                  removeFile={fileOperations.removeFile}
                  removeImage={fileOperations.removeImage}
                  openImageModal={openImageModal}
                  fileInputRef={fileInputRef}
                  isObservationMode={!permissions.canEdit}
                />

                {/* 底部按鈕區域 */}
                <div className='flex justify-end gap-stack-xs pt-stack-md mt-stack-md border-t border-gray-200'>
                  {permissions.canDelete && (
                    <button
                      onClick={cardHandleDelete}
                      className="px-btn-x py-btn-y bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-fast font-medium"
                    >
                      刪除
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-btn-x py-btn-y bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-fast font-medium"
                  >
                    {permissions.canEdit ? '取消' : '關閉'}
                  </button>
                  {permissions.canEdit && (
                    <button
                      onClick={cardHandleSubmit}
                      className="px-btn-x py-btn-y bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-fast font-medium"
                    >
                      儲存
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 變更歷史 */}
            {showChangeHistory && (
              <>
                <ChangeHistory taskId={cardData.id} />
                <div className='flex justify-end mt-4'>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    關閉
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 右側：評論區 */}
          <div className='w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-200 p-component-base sm:p-component-md-lg lg:max-h-[80vh] lg:overflow-y-auto'>
            <CommentSection
              taskId={cardData.id}
              isObservationMode={!permissions.canEdit}
              openCommentImageModal={openCommentImageModal}
            />
          </div>
        </div>
      </Modal>

      {/* 卡片圖片查看器 */}
      {selectedImageIndex !== null && (
        <Modal
          open={true}
          onClose={closeImageModal}
          position="justify-center items-center z-[70]"
        >
          <button onClick={closeImageModal} className='absolute top-2 right-2 p-1 rounded-lg bg-white hover:bg-slate-200 z-10'>
            <GrFormClose className="w-6 h-6" />
          </button>
          <button 
            onClick={() => fileOperations.handleImageDownload(cardData.images[selectedImageIndex])}
            className='absolute top-2 right-12 p-1 rounded-lg bg-white hover:bg-slate-200 z-10'
            title="下載圖片"
          >
            <AiOutlineCloudDownload className="w-6 h-6 text-gray-700" />
          </button>
          <div className="relative max-w-4xl w-full">
            <img
              src={cardData.images[selectedImageIndex]}
              alt="Selected"
              className="w-full h-auto"
            />
            {cardData.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-component-xs rounded-full"
                >
                  <CircleArrowLeft size={24}/>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-component-xs rounded-full"
                >
                  <CircleArrowRight size={24}/>
                </button>
                <div className="flex justify-center gap-stack-xs mt-4">
                  {cardData.images.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-16 h-16 cursor-pointer ${
                        index === selectedImageIndex ? 'ring-2 ring-customgreen' : ''
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* 評論圖片查看器 */}
      {selectedCommentImageIndex !== null && (
        <Modal
          open={true}
          onClose={closeCommentImageModal}
          position="justify-center items-center z-[80]"
        >
          <button onClick={closeCommentImageModal} className='absolute top-2 right-2 p-1 rounded-lg bg-white hover:bg-slate-200 z-10'>
            <GrFormClose className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl w-full">
            <img
              src={commentImageList[selectedCommentImageIndex]}
              alt="Comment Attachment"
              className="w-full h-auto"
            />
            {commentImageList.length > 1 && (
              <>
                <button
                  onClick={prevCommentImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-component-xs rounded-full"
                >
                  <CircleArrowLeft size={24}/>
                </button>
                <button
                  onClick={nextCommentImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-component-xs rounded-full"
                >
                  <CircleArrowRight size={24}/>
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* 成員指派模態框 */}
      {permissions.canEdit && (
        <Modal open={assignMemberModalopen} onClose={() => setAssignMemberModalOpen(false)} opacity={false} position={"justify-end items-center m-3"}>
          <button onClick={() => setAssignMemberModalOpen(false)} className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
            <GrFormClose className='w-6 h-6' />
          </button>
          <AssignMember
            menberData={menberData}
            setMenberData={() => {}} // 由父組件管理
            setCardData={setCardData}
            cardHandleSubmit={cardHandleSubmit}
          />
        </Modal>
      )}
    </>
  );
}
