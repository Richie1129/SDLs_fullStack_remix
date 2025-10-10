import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiImage, FiPaperclip, FiSend, FiDownload, FiFile, FiFileText, FiTrash } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Swal from 'sweetalert2';
import { 
  fetchProjectComments, 
  createProjectComment,
  updateProjectComment,
  deleteProjectComment,
  toggleProjectCommentLike,
  uploadProjectCommentAttachments,
} from '../api/projectComments';
import { deleteProjectCommentAttachment } from '../api/projectComments';
import Modal from './Modal';
import { formatUserDisplay } from '../utils/userDisplayUtils';

const ProjectCommentDrawer = ({ projectId, isOpen, onClose }) => {
  if (!isOpen) return null;

  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]); // files selected for new comment
  const fileInputRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Shared reply target state (flat mention-style)
  const [replyTarget, setReplyTarget] = useState(null); // { id, username } | null

  const meId = useMemo(() => {
    return parseInt(localStorage.getItem('id') || localStorage.getItem('userId') || '0');
  }, []);

  const { data: comments = [], isLoading } = useQuery(
    ['project-comments', projectId],
    () => fetchProjectComments(projectId),
    { enabled: !!projectId && isOpen }
  );

  const createMut = useMutation(createProjectComment, {
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });

  const updateMut = useMutation(updateProjectComment, {
    onSuccess: () => {
      setEditingId(null);
      setEditingContent('');
      queryClient.invalidateQueries(['project-comments', projectId]);
      Swal.fire({
        title: '儲存成功！',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  });

  const deleteMut = useMutation(deleteProjectComment, {
    onSuccess: () => {
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });

  const likeMut = useMutation(toggleProjectCommentLike, {
    onSuccess: () => {
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });

  const uploadMut = useMutation(uploadProjectCommentAttachments, {
    onSuccess: () => {
      setPendingFiles([]);
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });

  const deleteAttachmentMut = useMutation(deleteProjectCommentAttachment, {
    onSuccess: () => {
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });

  // Keyboard: Enter to submit, Shift+Enter for newline
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (content.trim() && !createMut.isLoading) {
        handleSubmit();
      }
    }
  };

  const personImg = [
    '/person/man1.png', '/person/man2.png', '/person/man3.png',
    '/person/man4.png', '/person/man5.png', '/person/man6.png',
    '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
  ];

  const avatarFor = (uid) => {
    const n = parseInt(uid || 0);
    const idx = ((n % 9) + 9) % 9;
    return personImg[idx];
  };

  const formatRelativeTime = (iso) => {
    try {
      const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
      const diff = Date.now() - d.getTime();
      const sec = Math.max(0, Math.floor(diff / 1000));
      if (sec < 10) return '剛剛';
      if (sec < 60) return `${sec} 秒前`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min} 分鐘前`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr} 小時前`;
      const day = Math.floor(hr / 24);
      return `${day} 天前`;
    } catch {
      return '';
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    createMut.mutate(
      { projectId, content: content.trim(), parentId: replyTarget?.id || null },
      {
        onSuccess: (item) => {
          if (pendingFiles.length > 0 && item?.id) {
            uploadMut.mutate({ commentId: item.id, files: pendingFiles });
          }
          // Clear reply target after successful submit
          setReplyTarget(null);
        }
      }
    );
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditingContent(c.content);
  };

  const onPickFilesForNew = () => fileInputRef.current?.click();
  const onFilesChosenForNew = (e) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(files);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const saveEdit = (c) => {
    if (!editingContent.trim()) return;
    updateMut.mutate({ commentId: c.id, content: editingContent.trim() });
  };

  // Image lightbox (aligned with Carditem.jsx logic)
  // Image lightbox (aligned with Carditem.jsx logic)
  const [commentImageList, setCommentImageList] = useState([]);
  const [selectedCommentImageIndex, setSelectedCommentImageIndex] = useState(null);
  const openCommentImageModal = (imageAttachments, index) => {
    const urls = (imageAttachments || []).map(att => `https://science.lazyinwork.com/api/file/image/${att.fileName}`);
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

  // Download (aligned with Carditem.jsx logic)
  const handleAttachmentDownload = async (attachment) => {
    try {
      const fileName = attachment.fileName;
      const resp = await fetch(`https://science.lazyinwork.com/api/file/download/${fileName}`);
      const data = await resp.json().catch(() => ({}));
      const url = data?.downloadUrl || `https://science.lazyinwork.com/api/file/direct/${fileName}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('下載附件失敗:', err);
    }
  };
  // Flat list: backend already returns chronological order

  const isImage = (mime = '') => mime.startsWith('image/');
  const pickFileIcon = (mime = '') => {
    if (isImage(mime)) return <FiImage className="text-teal-600" />;
    if (mime.includes('pdf')) return <FiFileText className="text-rose-600" />;
    return <FiFile className="text-gray-600" />;
  };

  const handleDeleteAttachment = (attachmentId) => {
    if (!attachmentId) return;
    Swal.fire({
      title: '確定要刪除這個附件嗎？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '是的，刪除！',
      cancelButtonText: '取消',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteAttachmentMut.mutate({ attachmentId });
      }
    });
  };

  const handleDeleteComment = (commentId) => {
    Swal.fire({
      title: '確定要刪除這則評論嗎？',
      text: '這個操作將無法復原！',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '是的，刪除！',
      cancelButtonText: '取消',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMut.mutate({ commentId });
      }
    });
  };

  const renderAttachments = (c) => {
    if (!Array.isArray(c.attachments) || c.attachments.length === 0) return null;
    const imgs = c.attachments.filter(a => isImage(a.mimeType));
    const files = c.attachments.filter(a => !isImage(a.mimeType));

    return (
      <div className="mt-2 space-y-2">
        {imgs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {imgs.map(a => (
              <div key={a.id} className="relative group">
                <img
                  src={`https://science.lazyinwork.com/api/file/image/${a.fileName}`}
                  alt={a.originalName}
                  className="w-full h-24 object-cover rounded border cursor-pointer"
                  onClick={() => openCommentImageModal(imgs, imgs.indexOf(a))}
                />
                {editingId === c.id && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="刪除附件"
                    onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(a.id); }}
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map(a => (
              <div key={a.id} className="flex items-center px-3 py-2 border rounded-md text-sm hover:shadow-sm hover:border-gray-300">
                <span className="mr-2">
                  {pickFileIcon(a.mimeType)}
                </span>
                <a
                  href={`https://science.lazyinwork.com/api/file/direct/${a.fileName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-blue-600 hover:underline"
                  title={a.originalName}
                >
                  {a.originalName}
                </a>
                {a.size && (
                  <span className="ml-2 text-xs text-gray-500">({Math.round(a.size/1024)} KB)</span>
                )}
                {editingId === c.id ? (
                  <button
                    type="button"
                    className="ml-auto text-red-500 hover:text-red-700"
                    title="刪除附件"
                    onClick={() => handleDeleteAttachment(a.id)}
                  >
                    <FiTrash />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ml-auto text-gray-500 hover:text-gray-700"
                    onClick={() => handleAttachmentDownload(a)}
                    title="下載"
                  >
                    <FiDownload />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderComment = (c) => {
    return (
      <div key={c.id} className="p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
        <div className="flex items-start">
          <img
            src={avatarFor(c.userId)}
            alt={c.user?.username || 'User'}
            className="w-9 h-9 rounded-full object-cover mr-3"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{formatUserDisplay(c.user)}</p>

            {editingId === c.id ? (
              <div className="mt-2">
                <textarea
                  className="w-full h-20 resize-none rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent p-2 text-sm"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    className="px-3 py-1 bg-customgreen text-white rounded-md text-xs"
                    onClick={() => saveEdit(c)}
                    disabled={updateMut.isLoading || !editingContent.trim()}
                  >
                    儲存
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-xs"
                    onClick={cancelEdit}
                  >
                    取消
                  </button>
                </div>
                <div className="mt-2">
                  <CommentAttachmentPicker label="重新上傳附件" onPick={(files) => uploadMut.mutate({ commentId: c.id, files })} />
                </div>
              </div>
            ) : (
              <div className="mt-2">
                {/* 引言區塊：當同時存在 reply_to_username 與 reply_to_content 時顯示 */}
                {c.reply_to_username && c.reply_to_content && (
                  <div className="mb-2 p-2 border-l-4 border-[#5BA491] bg-[#5BA491]/25 rounded-r-md">
                    <p className="text-xs font-semibold text-gray-600">{c.reply_to_username}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line line-clamp-2">{c.reply_to_content}</p>
                  </div>
                )}

                {/* 主要內容：若沒有引言區塊，保留原本的 @提及；有引言則移除以避免重複 */}
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {!c.reply_to_username && c.replyToUser?.username && (
                    <span className="font-semibold text-blue-500 mr-1">@{c.replyToUser.username}</span>
                  )}
                  {c.content}
                </p>
              </div>
            )}

            {renderAttachments(c)}

            <div className="mt-3 flex items-center flex-wrap gap-x-2 text-xs text-gray-600">
              <button
                type="button"
                className={`hover:underline ${c.likedByCurrentUser ? 'text-teal-700' : ''}`}
                onClick={() => likeMut.mutate({ commentId: c.id })}
              >
                讚{(c.likeCount ?? 0) > 0 ? ` (${c.likeCount})` : ''}
              </button>
              <span>·</span>
              <button
                type="button"
                className="hover:underline"
                onClick={() => {
                  setReplyTarget({ id: c.id, username: formatUserDisplay(c.user) });
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                回覆
              </button>
              {parseInt(c.userId) === meId && editingId !== c.id && (
                <>
                  <span>·</span>
                  <button type="button" className="hover:underline" onClick={() => startEdit(c)}>編輯</button>
                  <span>·</span>
                  <button type="button" className="hover:underline" onClick={() => handleDeleteComment(c.id)}>刪除</button>
                </>
              )}
              <span>·</span>
              <span className="text-gray-400">{formatRelativeTime(c.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-16 h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-10rem)] w-72 sm:w-80 lg:w-96 bg-white shadow-xl border-l border-gray-200 z-[120] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">專案評論</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors text-lg sm:text-xl"
          aria-label="關閉"
        >
          <FiX />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Comment list (flat, scrolls independently) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="text-center text-gray-500 text-sm">載入中…</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">尚無評論</div>
          ) : (
            comments.map((c) => renderComment(c))
          )}
        </div>
        {/* Input area (fixed at drawer bottom) */}
        <div className="p-3 sm:p-6 border-t bg-gray-50">
          {replyTarget && (
            <div className="mb-2 flex items-center justify-between text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200">
              <span>正在回覆 {replyTarget.username}…</span>
              <button className="ml-2 text-blue-600 hover:underline" onClick={() => setReplyTarget(null)}>取消</button>
            </div>
          )}
          <label className="sr-only" htmlFor="project-comment-textarea">新增評論</label>
          <div className="flex items-end gap-2">
            <textarea
              id="project-comment-textarea"
              className="flex-1 h-20 resize-none rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent p-2 text-sm"
              placeholder="輸入你的評論…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
            <button
              type="button"
              className="px-3 py-2 bg-[#5BA491] text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="送出評論"
              onClick={handleSubmit}
              disabled={createMut.isLoading || !content.trim()}
            >
              <FiSend />
              送出
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
                onChange={onFilesChosenForNew}
              />
              <button
                type="button"
                className="p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                title="選擇圖片或檔案"
                onClick={onPickFilesForNew}
              >
                <FiImage size={18} />
              </button>
              <button
                type="button"
                className="p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                title="選擇檔案"
                onClick={onPickFilesForNew}
              >
                <FiPaperclip size={18} />
              </button>
              {pendingFiles.length > 0 && (
                <span className="text-xs text-gray-500">已選 {pendingFiles.length} 個檔案</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              💡 支援圖片、文件、影片、音訊、壓縮檔等格式 | 單檔最大 100MB | 最多 10 個檔案
            </p>
          </div>
        </div>
      </div>
        {selectedCommentImageIndex !== null && (
          <Modal open={true} onClose={closeCommentImageModal} position="justify-center items-center z-[80]">
            <button onClick={closeCommentImageModal} className='absolute top-2 right-2 p-1 rounded-lg bg-white hover:bg-slate-200 z-10'>
              <FiX className="w-6 h-6" />
            </button>
            <div className="relative max-w-4xl w-full">
              <img src={commentImageList[selectedCommentImageIndex]} alt="Comment Attachment" className="w-full h-auto" />
              {commentImageList.length > 1 && (
                <>
                  <button onClick={prevCommentImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">‹</button>
                  <button onClick={nextCommentImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">›</button>
                </>
              )}
            </div>
          </Modal>
        )}
    </motion.div>
  );
};

// Small helper component to trigger file selection for a given comment
function CommentAttachmentPicker({ onPick, label = '附件' }) {
  const ref = useRef(null);
  const onChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onPick(files);
    e.target.value = '';
  };
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
        onChange={onChange}
      />
      <button type="button" className="text-xs text-gray-600 hover:underline" title="上傳附件" onClick={() => ref.current?.click()}>
        {label}
      </button>
      <p className="text-xs text-gray-400">
        💡 單檔最大 100MB | 最多 10 個檔案
      </p>
    </div>
  );
}

export default ProjectCommentDrawer;
