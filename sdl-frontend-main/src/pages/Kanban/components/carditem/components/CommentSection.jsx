import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { AiOutlinePaperClip, AiOutlineLike, AiFillLike } from "react-icons/ai";
import { fetchComments, createComment, toggleCommentLike, updateComment as updateCommentApi, deleteComment as deleteCommentApi } from '../../../../../api/comments';
import { formatTime } from '../../../../../utils/timeUtils';
import { formatUserDisplay } from '../../../../../utils/userDisplayUtils';
import { buildFileImageUrl, buildFileDownloadUrl, downloadFileWithAuth } from '@/utils/fileUrlBuilder.js';
import AuthImage from '@/components/AuthImage';
import { CommentErrorBoundary } from '../../../../../components/ErrorBoundary';
import { validateFileSize } from '@/utils/fileValidation';
import { getCurrentUserId } from '../../../../../utils/authUtils';

const personImg = [
  '/person/man1.png', '/person/man2.png', '/person/man3.png',
  '/person/man4.png', '/person/man5.png', '/person/man6.png',
  '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
];

/**
 * CommentActions - 評論操作組件（編輯、刪除）
 */
const CommentActions = ({ comment, onAfterChange }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');

  const saveMutation = useMutation(updateCommentApi, {
    onSuccess: () => {
      setEditing(false);
      if (onAfterChange) onAfterChange();
      toast.success('已更新評論');
    },
    onError: (err) => toast.error(err?.response?.data?.message || '更新失敗')
  });

  const delMutation = useMutation(deleteCommentApi, {
    onSuccess: () => {
      if (onAfterChange) onAfterChange();
      toast.success('已刪除評論');
    },
    onError: (err) => toast.error(err?.response?.data?.message || '刪除失敗')
  });

  if (editing) {
    return (
      <div className='w-full mt-2'>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className='w-full border border-gray-300 rounded-md p-component-xs text-body-sm focus:outline-none focus:ring-2 focus:ring-customgreen'
          rows={3}
        />
        <div className='mt-2 flex gap-stack-xs'>
          <button
            onClick={() => saveMutation.mutate({ commentId: comment.id, content: editText })}
            className='px-3 py-1.5 bg-customgreen text-white rounded text-caption hover:bg-customgreen/90'
          >
            儲存
          </button>
          <button
            onClick={() => { setEditing(false); setEditText(comment.content || ''); }}
            className='px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-caption hover:bg-gray-300'
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-stack-xs'>
      <button
        onClick={() => setEditing(true)}
        className='text-caption text-gray-600 hover:underline'
      >
        編輯
      </button>
      <button
        onClick={() => {
          if (window.confirm('確定要刪除這則評論嗎？')) {
            delMutation.mutate({ commentId: comment.id });
          }
        }}
        className='text-caption text-red-600 hover:underline'
      >
        刪除
      </button>
    </div>
  );
};

/**
 * CommentSection - 評論系統組件
 *
 * 職責：
 * - 顯示評論列表
 * - 處理評論的增刪改
 * - 處理評論附件
 * - 按讚功能
 *
 * Linus: "完美 - 評論系統只需要 taskId，完全獨立"
 *
 * @param {string} taskId - 任務 ID
 * @param {boolean} isObservationMode - 是否為觀摩模式
 * @param {Function} openCommentImageModal - 打開圖片查看器的回調
 */
export function CommentSection({ taskId, isObservationMode = false, openCommentImageModal }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const commentFileInputRef = useRef(null);

  // 獲取評論列表
  const { data: comments = [] } = useQuery(
    ['comments', taskId],
    () => fetchComments(taskId),
    { 
      // Linus: Don't fetch comments for temp IDs. It's a waste of bandwidth and causes errors.
      enabled: !!taskId && !taskId.toString().startsWith('temp-') 
    }
  );

  // 新增評論
  const addCommentMutation = useMutation(createComment, {
    onSuccess: () => {
      setNewComment("");
      setFilesToUpload([]);
      queryClient.invalidateQueries(['comments', taskId]);
      toast.success('已發表評論');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || '發表評論失敗');
    }
  });

  // 按讚/取消按讚
  const likeMutation = useMutation(toggleCommentLike, {
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', taskId]);
    }
  });

  const handleAddComment = () => {
    const content = newComment.trim();
    if (!content) return;
    addCommentMutation.mutate({ taskId, content, files: filesToUpload });
  };

  const handleSelectCommentFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!validateFileSize(files)) {
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
      return;
    }
    setFilesToUpload((prev) => [...prev, ...files]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  const removePendingFile = (index) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  // downloadFileWithAuth 內部已處理錯誤與提示，不會拋出
  const handleCommentAttachmentDownload = (attachment) =>
    downloadFileWithAuth(attachment.fileName, attachment.originalName);

  return (
    <div className='space-y-stack-sm'>
      <h3 className='text-h3 font-semibold mb-3'>討論區</h3>
      <CommentErrorBoundary context="kanban_task_comments">
        {/* 評論列表 */}
        <div className='space-y-stack-sm mb-4'>
          {comments.length === 0 && (
            <div className='text-body-sm text-gray-400 text-center py-6'>
              尚無評論，來發表第一則留言吧！
            </div>
          )}
          {comments.map((c) => {
            const imgIndex = parseInt(c.user?.id || 0) % personImg.length;
            const userImg = personImg[imgIndex];
            return (
              <div key={c.id} className='flex items-start space-x-3'>
                <img src={userImg} alt={c.user?.username} className='w-9 h-9 rounded-full object-cover' />
                <div className='flex-1'>
                  <div className='flex items-center justify-between'>
                    <span className='text-body-sm font-medium text-gray-800'>{formatUserDisplay(c.user)}</span>
                    <span className='text-caption text-gray-400'>{formatTime(c.createdAt, 'relative')}</span>
                  </div>
                  <p className='text-body-sm text-gray-700 whitespace-pre-wrap mt-1'>
                    {c.content}
                  </p>
                  {/* 附件顯示 */}
                  {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                    <div className='mt-2 space-y-stack-xs'>
                      {c.attachments.map((a, i) => {
                        const isImage = (a.mimeType || '').startsWith('image/');
                        if (isImage) {
                          const imgUrl = buildFileImageUrl(a.fileName);
                          return (
                            <div key={i}>
                              <AuthImage
                                src={imgUrl}
                                alt={a.originalName}
                                className='max-h-40 rounded border cursor-pointer'
                                onClick={() => openCommentImageModal && openCommentImageModal(c.attachments.filter(x => (x.mimeType||'').startsWith('image/')), i)}
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={i} className='text-caption flex items-center gap-stack-xs'>
                            <span className='text-blue-600 truncate'>{a.originalName}</span>
                            <span className='text-gray-400'>{a.mimeType}</span>
                            <button
                              onClick={() => handleCommentAttachmentDownload(a)}
                              className='ml-2 px-2 py-0.5 bg-customgreen text-white rounded hover:bg-customgreen/90'
                            >
                              下載
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className='mt-2 flex items-center gap-3'>
                    <button
                      onClick={() => likeMutation.mutate({ commentId: c.id })}
                      className={`flex items-center gap-1 text-caption px-2 py-1 rounded transition-colors ${c.likedByCurrentUser ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      title={c.likedByCurrentUser ? '已按讚' : '按讚'}
                    >
                      {c.likedByCurrentUser ? <AiFillLike size={14}/> : <AiOutlineLike size={14}/>} {c.likeCount || 0}
                    </button>
                    {/* 編輯/刪除 */}
                    {(() => {
                      const loggedInId = getCurrentUserId();
                      const isOwner = c.user?.id === loggedInId || c.userId === loggedInId;
                      return isOwner && !isObservationMode ? (
                        <CommentActions
                          comment={c}
                          onAfterChange={() => queryClient.invalidateQueries(['comments', taskId])}
                        />
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 新增評論輸入框（觀摩模式也允許評論） */}
        <div className='flex items-start space-x-3'>
            <img src={(personImg[Math.abs(getCurrentUserId()) % personImg.length])} alt='me' className='w-9 h-9 rounded-full object-cover' />
            <div className='flex-1'>
              <textarea
                className='w-full border border-gray-300 rounded-md p-component-xs text-body-sm focus:outline-none focus:ring-2 focus:ring-customgreen'
                rows={3}
                placeholder='新增評論…'
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              {/* 選擇的附件列表 */}
              {filesToUpload.length > 0 && (
                <div className='mt-2 space-y-1'>
                  {filesToUpload.map((f, idx) => (
                    <div key={idx} className='flex items-center justify-between text-caption bg-gray-50 px-2 py-1 rounded'>
                      <span className='truncate'>{f.name}</span>
                      <button className='text-red-500 hover:underline ml-2' onClick={() => removePendingFile(idx)}>移除</button>
                    </div>
                  ))}
                </div>
              )}
              <div className='flex justify-between items-center mt-2'>
                <div>
                  <button
                    type='button'
                    onClick={() => commentFileInputRef.current && commentFileInputRef.current.click()}
                    className={`inline-flex items-center gap-1 text-body-sm text-gray-600 hover:text-gray-800`}
                  >
                    <AiOutlinePaperClip />
                    附加檔案
                  </button>
                  <input
                    ref={commentFileInputRef}
                    type='file'
                    className='hidden'
                    multiple
                    onChange={handleSelectCommentFiles}
                  />
                </div>
                <button
                  onClick={handleAddComment}
                  className={`px-4 py-1.5 rounded-md text-body-sm bg-customgreen text-white hover:bg-customgreen/90`}
                >
                  送出
                </button>
              </div>
            </div>
          </div>
      </CommentErrorBoundary>
    </div>
  );
}
