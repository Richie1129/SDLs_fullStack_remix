import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../../components/Modal';
import AssignMember from './AssignMember';
import { getProjectUser } from '../../../api/users';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import Swal from 'sweetalert2';
import { GrFormClose } from "react-icons/gr";
import { FiEdit } from "react-icons/fi";
import { BsFillPersonFill } from "react-icons/bs";
import { Draggable } from 'react-beautiful-dnd';
import { socket } from '../../../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import { fetchComments, createComment, toggleCommentLike, updateComment as updateCommentApi, deleteComment as deleteCommentApi } from '../../../api/comments';
import axios from 'axios';
import { CircleArrowLeft, CircleArrowRight } from "lucide-react"
import FileDownload from 'js-file-download';
import { AiOutlineCloudDownload, AiOutlinePaperClip, AiOutlineLike, AiFillLike } from "react-icons/ai";
import { formatTime } from '../../../utils/timeUtils';
import { getTaskChangeLogs } from '../../../api/kanban';
import { FiClock, FiUser, FiEdit3 } from 'react-icons/fi';
import useObservationMode from '../../../hooks/useObservationMode'; // 引入觀摩模式 hook
import { recordObservationEvent } from '../../../api/usage';
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../../utils/userUtils'; // 引入用戶資訊 hook
import { CommentErrorBoundary } from '../../../components/ErrorBoundary';
import { formatUserDisplay } from '../../../utils/userDisplayUtils';

// 子元件：卡片圖片顯示
const CardImage = ({ image, onClick, additionalCount }) => (
  <div className="relative w-full h-40 group">
    <img
      src={image}
      alt="Card Background"
      className="w-full h-full object-contain rounded-t-lg cursor-pointer bg-gray-50"
      onClick={onClick}
    />
    {additionalCount > 0 && (
      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
        +{additionalCount}
      </div>
    )}
  </div>
);

// 子元件：檔案管理模態框
const FileManagementModal = ({ 
  cardData, 
  handleFileUpload, 
  handleFileDownload, 
  removeFile, 
  removeImage, 
  openImageModal,
  fileInputRef,
  isObservationMode = false
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  return (
    <div className='flex flex-col w-full mt-6'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center space-x-2'>
          <h3 className='text-lg font-semibold text-gray-800'>檔案管理</h3>
          <span className='text-sm text-gray-500'>
            ({cardData.images?.length || 0} 圖片, {cardData.files?.length || 0} 檔案)
          </span>
        </div>
        {!isObservationMode && (
          <label className='flex items-center space-x-2 px-4 py-2 bg-white border border-customgreen text-customgreen rounded-lg hover:bg-customgreen/5 transition-all duration-200 cursor-pointer'>
            <AiOutlineCloudDownload size={18} />
            <span className='font-medium'>上傳檔案</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              ref={fileInputRef}
              className='hidden'
            />
          </label>
        )}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Images Section */}
        <div className='bg-white rounded-xl border border-gray-100 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-base font-medium text-gray-700'>圖片</h4>
            {cardData.images?.length > 0 && (
              <span className='text-sm text-gray-500'>{cardData.images.length} 張</span>
            )}
          </div>
          {cardData.images && cardData.images.length > 0 ? (
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              {cardData.images.map((image, index) => (
                <div key={index} className='relative aspect-square group'>
                  <img 
                    src={image} 
                    alt={`Uploaded ${index + 1}`} 
                    className='w-full h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity duration-200 bg-gray-50'
                    onClick={() => openImageModal(index)}
                  />
                  {!isObservationMode && (
                    <button
                      onClick={() => removeImage(index)}
                      className='absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:bg-white'
                    >
                      <GrFormClose size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className='flex items-center justify-center h-32 bg-gray-50 rounded-lg'>
              <p className='text-sm text-gray-400'>尚未上傳圖片</p>
            </div>
          )}
        </div>

        {/* Files Section */}
        <div className='bg-white rounded-xl border border-gray-100 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-base font-medium text-gray-700'>檔案</h4>
            {cardData.files?.length > 0 && (
              <span className='text-sm text-gray-500'>{cardData.files.length} 個</span>
            )}
          </div>
          {cardData.files && cardData.files.length > 0 ? (
            <div className='space-y-2 max-h-[300px] overflow-y-auto'>
              {cardData.files.map((file, index) => (
                <div 
                  key={index} 
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200'
                >
                  <div className='flex items-center space-x-3 min-w-0'>
                    <div className='p-2 bg-white rounded-lg shadow-sm flex-shrink-0'>
                      <AiOutlineCloudDownload size={20} className="text-gray-400" />
                    </div>
                    <div className='flex flex-col min-w-0'>
                      <span className='text-sm font-medium text-gray-700 truncate'>
                        {file.originalName}
                      </span>
                      <span className='text-xs text-gray-400'>
                        {file.mimeType}
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2 flex-shrink-0'>
                    <button
                      onClick={() => handleFileDownload(file)}
                      className='px-3 py-1.5 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200 text-sm font-medium'
                    >
                      下載
                    </button>
                    {!isObservationMode && (
                      <button
                        onClick={() => removeFile(index)}
                        className='p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-gray-200'
                      >
                        <GrFormClose size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex items-center justify-center h-32 bg-gray-50 rounded-lg'>
              <p className='text-sm text-gray-400'>尚未上傳檔案</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const personImg = [
  '/person/man1.png', '/person/man2.png', '/person/man3.png',
  '/person/man4.png', '/person/man5.png', '/person/man6.png',
  '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
];

const Tooltip = ({ children, content }) => {
  return (
    <div className='relative group'>
      {children}
      <div className='absolute  hidden group-hover:block'>
        <div className='bg-gray-700 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap'>
          {content}
        </div>
      </div>
    </div>
  );
};

// 子元件：評論操作（編輯、刪除）
const CommentActions = ({ comment, onAfterChange }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');
  const queryClient = useQueryClient();

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
          className='w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-customgreen'
          rows={3}
        />
        <div className='mt-2 flex gap-2'>
          <button
            onClick={() => saveMutation.mutate({ commentId: comment.id, content: editText })}
            className='px-3 py-1.5 bg-customgreen text-white rounded text-xs hover:bg-customgreen/90'
          >
            儲存
          </button>
          <button
            onClick={() => { setEditing(false); setEditText(comment.content || ''); }}
            className='px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300'
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <button
        onClick={() => setEditing(true)}
        className='text-xs text-gray-600 hover:underline'
      >
        編輯
      </button>
      <button
        onClick={() => {
          if (window.confirm('確定要刪除這則評論嗎？')) {
            delMutation.mutate({ commentId: comment.id });
          }
        }}
        className='text-xs text-red-600 hover:underline'
      >
        刪除
      </button>
    </div>
  );
};

// 子元件：成員指派區塊
const MemberAssignment = ({ 
  cardData, 
  setAssignMemberModalOpen,
  owner,
  personImg,
  Tooltip,
  isObservationMode = false
}) => (
  <div className='bg-white rounded-xl border border-gray-100 p-4 mb-4'>
    <div className='flex items-center justify-between mb-3'>
      <h4 className='text-base font-medium text-gray-700'>成員</h4>
      {!isObservationMode && (
        <button
          onClick={() => setAssignMemberModalOpen(true)}
          className='flex items-center space-x-2 px-3 py-1.5 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200'
        >
          <BsFillPersonFill size={16} />
          <span className='text-sm font-medium'>指派成員</span>
        </button>
      )}
    </div>

    {owner && (
      <div className='flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-lg'>
        <span className='text-sm font-medium text-gray-600'>建立者:</span>
        <span className='text-sm text-gray-500'>{owner}</span>
      </div>
    )}

    {cardData.assignees?.length > 0 ? (
      <div className='flex flex-wrap gap-2'>
        {cardData.assignees.map((assignee, index) => {
          const imgIndex = parseInt(assignee.id) % personImg.length;
          const userImg = personImg[imgIndex];
          return (
            <Tooltip key={index} content={assignee.username}>
              <div className='flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200'>
                <img
                  src={userImg}
                  alt={assignee.username}
                  className='w-6 h-6 rounded-full shadow-sm object-cover'
                />
                <span className='text-sm text-gray-600'>{assignee.username}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    ) : (
      <div className='flex items-center justify-center h-20 bg-gray-50 rounded-lg'>
        <p className='text-sm text-gray-400'>尚未指派成員</p>
      </div>
    )}
  </div>
);

function Carditem({ data, index, columnIndex }) {
  const [open, setOpen] = useState(false);
  const [assignMemberModalopen, setAssignMemberModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [changeLogs, setChangeLogs] = useState([]);
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // 使用觀摩模式 hook
  const { isObservationMode } = useObservationMode();

  // 使用最新的用戶名稱
  // 使用全域工具函數取得用戶資訊
  const currentUsername = getCurrentUsername();
  const currentUserId = parseInt(localStorage.getItem('id')) || 0;

  // 計算卡片建立者顯示名稱（如果是當前用戶，顯示最新名稱；否則顯示資料庫中的名稱）
  const getDisplayOwnerName = (owner) => {
    // 如果卡片建立者就是當前用戶，使用最新的username
    if (isCurrentUser(owner) ||
        owner === currentUsername) {
      return currentUsername;
    }
    return owner; // 其他用戶顯示資料庫中的名稱
  };
  
  const [cardData, setCardData] = useState({
    id: "",
    title: "",
    content: "",
    labels: [],
    owner:"",
    assignees: [],
    columnId: "",
    images: [],
    files: [],
  });
  const fileInputRef = useRef(null);
  const commentFileInputRef = useRef(null);

  const openImageModal = (index) => {
    setSelectedImageIndex(index);
  };
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

  // 評論圖片放大檢視狀態
  const [commentImageList, setCommentImageList] = useState([]);
  const [selectedCommentImageIndex, setSelectedCommentImageIndex] = useState(null);
  const openCommentImageModal = (imageAttachments, index) => {
    const urls = (imageAttachments || []).map(att => `http://localhost/api/file/image/${att.fileName}`);
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

  const [menberData, setMenberData] = useState([]);

  // 評論區狀態與 API 連接
  const [newComment, setNewComment] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);

  const { data: comments = [], refetch: refetchComments } = useQuery(
    ['comments', cardData.id],
    () => fetchComments(cardData.id),
    { enabled: open && !!cardData.id }
  );

  const addCommentMutation = useMutation(createComment, {
    onSuccess: () => {
      setNewComment("");
      setFilesToUpload([]);
      queryClient.invalidateQueries(['comments', cardData.id]);
      toast.success('已發表評論');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || '發表評論失敗');
    }
  });

  const likeMutation = useMutation(toggleCommentLike, {
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', cardData.id]);
    }
  });

  // 取得評論附件下載 URL 並觸發下載
  const handleCommentAttachmentDownload = async (attachment) => {
    try {
      const fileName = attachment.fileName;
      const resp = await axios.get(`http://localhost/api/file/download/${fileName}`);
      const url = resp.data?.downloadUrl || `http://localhost/api/file/direct/${fileName}`;
      // 直接打開下載 URL
      window.open(url, '_blank');
    } catch (err) {
      console.error('下載附件失敗:', err);
      toast.error('下載附件失敗');
    }
  };

  const handleAddComment = () => {
    const content = newComment.trim();
    if (!content) return;
    addCommentMutation.mutate({ taskId: cardData.id, content, files: filesToUpload });
  };

  const handleSelectCommentFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setFilesToUpload((prev) => [...prev, ...files]);
    // reset input to allow reselect same files later
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  const removePendingFile = (index) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  useQuery("getProjectUser", () => getProjectUser(projectId), {
    onSuccess: setMenberData,
    enabled: !!projectId
  });

  // 取得變更記錄
  const { data: changeLogsData } = useQuery(
    ['taskChangeLogs', cardData.id],
    () => getTaskChangeLogs(cardData.id),
    {
      enabled: !!cardData.id && showChangeHistory,
      onSuccess: setChangeLogs
    }
  );

  useEffect(() => {
    // 處理現有圖片 URL，轉換 MinIO URL 為代理 API
    const processedImages = (data.images || []).map(imageUrl => {
      if (imageUrl.includes('sdls-files/')) {
        const fileName = imageUrl.split('/').pop();
        return `http://localhost/api/file/image/${fileName}`;
      }
      return imageUrl;
    });

    setCardData({
      ...data,
      images: processedImages, // 使用處理過的圖片 URL
      files: data.files || [], // 確保 files 為陣列
      owner: data.owner || "",  // 確保 owner 存在
    });
  }, [data]);

  // 監聽任務更新事件，刷新變更記錄與看板資料
  useEffect(() => {
    const handleTaskUpdate = (updateData) => {
      // 如果更新的是當前任務，刷新變更記錄
      if (updateData && cardData.id && 
          (updateData.taskId === cardData.id || updateData.id === cardData.id)) {
        console.log('任務更新，刷新變更記錄:', cardData.id);
        queryClient.invalidateQueries(['taskChangeLogs', cardData.id]);
        // 同步失效看板快取，確保列表中的卡片內容立即更新
        queryClient.invalidateQueries(['kanbanDatas', projectId]);
      }
    };

    socket.on('taskItem', handleTaskUpdate);
    socket.on('activityUpdate', handleTaskUpdate);
    // 有些後端會在更新後廣播 cardUpdated，這裡一併處理
    socket.on('cardUpdated', handleTaskUpdate);
    // 伺服器確認刪除成功
    const handleTaskDeleted = (payload) => {
      if (!payload) return;
      const sameTask = Number(payload.taskId) === Number(cardData.id);
      if (sameTask) {
        console.log(`🗑️ 卡片刪除成功: ${cardData.title} (${cardData.id})`);
        try {
          Swal.fire({
            title: '已刪除！',
            text: '卡片已刪除。',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
        } catch (_) {}
        // 以防不同步，強制刷新看板資料
        queryClient.invalidateQueries(['kanbanDatas', projectId]);
      }
    };
    socket.on('taskDeleted', handleTaskDeleted);
    // 處理刪除失敗的情況：回滾為伺服器狀態
    const handleDeleteError = (err) => {
      const msg = err?.message || '刪除失敗';
      toast.error(msg);
      // 回滾：以伺服器資料為準重新整理
      queryClient.invalidateQueries(['kanbanDatas', projectId]);
    };
    socket.on('taskDeleteError', handleDeleteError);

    return () => {
      socket.off('taskItem', handleTaskUpdate);
      socket.off('activityUpdate', handleTaskUpdate);
      socket.off('cardUpdated', handleTaskUpdate);
      socket.off('taskDeleted', handleTaskDeleted);
      socket.off('taskDeleteError', handleDeleteError);
    };
  }, [cardData.id, queryClient]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 處理 MinIO 回傳的完整 URL 或本地相對路徑
      const uploadedFiles = response.data.files
        .filter((file) => !file.mimeType.startsWith("image/"))
        .map((file) => ({
          // 如果是完整 URL (MinIO)，直接使用；否則拼接本地路徑
          url: file.url.startsWith('http') ? file.url : `http://localhost/api${file.url}`,
          originalName: file.originalName,
          mimeType: file.mimeType,
          fileName: file.fileName // 保存 MinIO 檔名
        }));
      
      const uploadedImages = response.data.files
        .filter((file) => file.mimeType.startsWith("image/"))
        .map((file) => {
          // 如果是 MinIO URL，提取檔名並使用代理 API
          if (file.url.includes('sdls-files/')) {
            const fileName = file.fileName || file.url.split('/').pop();
            return `http://localhost/api/file/image/${fileName}`;
          }
          // 本地檔案使用原來的邏輯
          return file.url.startsWith('http') ? file.url : `http://localhost/api${file.url}`;
        });

      setCardData((prev) => ({
        ...prev,
        files: Array.isArray(prev.files)
          ? [...prev.files, ...uploadedFiles]
          : [...uploadedFiles],
        images: Array.isArray(prev.images)
          ? [...prev.images, ...uploadedImages]
          : uploadedImages,
      }));

      toast.success('檔案上傳成功');
    } catch (err) {
      console.error('檔案上傳失敗:', err);
      toast.error('檔案上傳失敗');
    }
  };

  const handleFileDownload = async (file) => {
    try {
      // 檢查是否為 MinIO URL (完整 URL)
      const downloadUrl = file.url.startsWith('http') 
        ? file.url  // MinIO 完整 URL
        : `http://localhost/api${file.url}`; // 本地相對路徑
      
      console.log('下載檔案 URL:', downloadUrl);
      
      const response = await axios.get(downloadUrl, {
        responseType: 'blob'
      });
      FileDownload(response.data, file.originalName);
      toast.success(`下載成功: ${file.originalName}`);
    } catch (err) {
      console.error('檔案下載失敗:', err);
      toast.error('檔案下載失敗');
    }
  };

  const removeFile = async (index) => {
    const fileToRemove = cardData.files[index];
    if (!fileToRemove) return;

    try {
      // 提取 MinIO 檔案名稱
      let fileName = null;
      if (fileToRemove.fileName) {
        fileName = fileToRemove.fileName;
      } else if (fileToRemove.url && fileToRemove.url.includes('sdl-files/')) {
        fileName = fileToRemove.url.split('/').pop();
      }

      // 如果有 MinIO 檔案名稱，先從 MinIO 刪除
      if (fileName) {
        await axios.delete(`http://localhost/api/file/${fileName}`);
        console.log(`✅ MinIO 檔案刪除成功: ${fileName}`);
      }

      // 從前端狀態移除
      setCardData((prev) => {
        const newFiles = [...prev.files];
        newFiles.splice(index, 1);
        return { ...prev, files: newFiles };
      });

      toast.success(`檔案移除成功: ${fileToRemove.originalName || fileName}`);
    } catch (error) {
      console.error('檔案刪除失敗:', error);
      if (error.response?.status === 404) {
        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newFiles = [...prev.files];
          newFiles.splice(index, 1);
          return { ...prev, files: newFiles };
        });
        toast.success('檔案已移除');
      } else {
        toast.error('檔案刪除失敗');
      }
    }
  };

  const removeImage = async (index) => {
    const imageToRemove = cardData.images[index];
    if (!imageToRemove) return;

    try {
      // 提取 MinIO 檔案名稱
      let fileName = null;
      if (imageToRemove.includes('api/file/image/')) {
        // 從代理 API URL 中提取檔案名
        fileName = imageToRemove.split('/').pop();
      } else if (imageToRemove.includes('sdl-files/')) {
        // 從直接 MinIO URL 中提取檔案名
        fileName = imageToRemove.split('/').pop();
      }

      // 如果有 MinIO 檔案名稱，先從 MinIO 刪除
      if (fileName) {
        await axios.delete(`http://localhost/api/file/${fileName}`);
        console.log(`✅ MinIO 圖片刪除成功: ${fileName}`);
      }

      // 從前端狀態移除
      setCardData((prev) => {
        const newImages = [...prev.images];
        newImages.splice(index, 1);
        return { ...prev, images: newImages };
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success('圖片移除成功');
    } catch (error) {
      console.error('圖片刪除失敗:', error);
      if (error.response?.status === 404) {
        // 檔案在 MinIO 中不存在，只從前端移除
        setCardData((prev) => {
          const newImages = [...prev.images];
          newImages.splice(index, 1);
          return { ...prev, images: newImages };
        });
        toast.success('圖片已移除');
      } else {
        toast.error('圖片刪除失敗');
      }
    }
  };

  const cardHandleSubmit = () => {
    if (cardData.title.trim() !== "") {
      // 確保 files 和 images 是陣列
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
      
      // 失效變更記錄的緩存，強制重新獲取
      queryClient.invalidateQueries(['taskChangeLogs', cardData.id]);
      // 同步失效看板資料，讓列表立即反映更新
      queryClient.invalidateQueries(['kanbanDatas', projectId]);
      
      setOpen(false);
    } else {
      toast.error("請填寫卡片標題!");
    }
  };

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
        // 1) Optimistically remove from cache so UI updates immediately
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

        // 2) Emit delete to server; server will broadcast and we will re-sync via invalidate
        socket.emit("cardDelete", { 
          eventType: 'taskDelete',
          cardData, 
          columnIndex, 
          index, 
          projectId,
          user: getUserForSocket()
        });
        // 3) Revalidate in the background to confirm state with server
        try { queryClient.invalidateQueries(['kanbanDatas', projectId]); } catch (_) {}
        setOpen(false);
      }
    });
  };
  
  return (
    <>
      <Draggable draggableId={data.id.toString()} index={index} isDragDisabled={isObservationMode}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...(!isObservationMode ? provided.dragHandleProps : {})}
            className={`item-container rounded-lg mb-3 w-full transition-all duration-200 ${
              snapshot.isDragging 
                ? "shadow-xl bg-customgreen/90 text-white" 
                : "bg-white shadow-md hover:shadow-lg"
            } ${isObservationMode ? 'cursor-default' : 'cursor-move'}`}
          >
            {cardData.images && cardData.images.length > 0 && (
              <CardImage 
                image={cardData.images[0]}
                onClick={() => openImageModal(0)}
                additionalCount={cardData.images.length - 1}
              />
            )}

            <div className="p-3">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-semibold text-gray-800 line-clamp-2 pr-2">
                  {cardData.title}
                </h3>
                <button
                  onClick={() => {
                    // Record observation click without blocking UI
                    if (isObservationMode) {
                      try {
                        recordObservationEvent({
                          targetType: 'KANBAN_TASK',
                          targetId: data?.id,
                          targetName: data?.title,
                          projectId,
                        });
                      } catch (_) { /* noop */ }
                    }
                    setOpen(true);
                  }}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <FiEdit size={16} />
                </button>
              </div>

              {cardData.content && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {cardData.content}
                </p>
              )}

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

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
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
                  <div className="text-xs text-gray-400">
                    {formatTime(cardData.createdAt, 'relative')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {/* 模態框顯示圖片大圖 */}
      {selectedImageIndex !== null && (
        <Modal 
          open={true} 
          onClose={() => setSelectedImageIndex(null)}
          position="justify-center items-center z-[70]"
        >
          <button onClick={() => setSelectedImageIndex(null)} className='absolute top-2 right-2 p-1 rounded-lg bg-white hover:bg-slate-200 z-10'>
            <GrFormClose className="w-6 h-6" />
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <CircleArrowLeft size={24}/>
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <CircleArrowRight size={24}/>
                </button>
                
                
                <div className="flex justify-center gap-2 mt-4">
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

      {/* 評論圖片放大檢視 */}
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <CircleArrowLeft size={24}/>
                </button>
                <button
                  onClick={nextCommentImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <CircleArrowRight size={24}/>
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      <Modal open={open} onClose={() => setOpen(false)} opacity={true} position={"justify-center items-center"} custom={"w-11/12 sm:w-5/6 lg:w-3/4 xl:w-2/3 p-0"}>
        <div className='flex flex-col lg:flex-row w-full lg:h-[80vh]'>
          {/* 左側：卡片編輯區 */}
          <div className='w-full lg:w-2/3 p-4 sm:p-6 lg:p-8 lg:min-h-0 lg:overflow-y-auto'>
            {/* 標籤頁導航 */}
            <div className='flex border-b border-gray-200 mb-4'>
              <button
                onClick={() => setShowChangeHistory(false)}
                className={`px-4 py-2 font-medium text-sm ${
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
                  // 強制刷新變更記錄
                  queryClient.invalidateQueries(['taskChangeLogs', cardData.id]);
                }}
                className={`px-4 py-2 font-medium text-sm ${
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
                    className={`rounded outline-none ring-2 p-2 ring-customgreen w-full ${isObservationMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    type="text"
                    placeholder="標題"
                    value={cardData.title}
                    onChange={isObservationMode ? undefined : (e) => setCardData({ ...cardData, title: e.target.value })}
                    readOnly={isObservationMode}
                  />
                </div>
                <textarea
                  className={`rounded outline-none ring-2 ring-customgreen w-full p-2 mb-4 ${isObservationMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  rows={3}
                  placeholder="內容"
                  value={cardData.content}
                  onChange={isObservationMode ? undefined : (e) => setCardData({ ...cardData, content: e.target.value })}
                  readOnly={isObservationMode}
                />

                {/* 時間資訊 */}
                {(cardData.createdAt || cardData.updatedAt) && (
                  <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>時間資訊</h4>
                    <div className='space-y-1 text-sm text-gray-600'>
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
                  personImg={personImg}
                  Tooltip={Tooltip}
                  isObservationMode={isObservationMode}
                />
                
                <FileManagementModal
                  cardData={cardData}
                  handleFileUpload={handleFileUpload}
                  handleFileDownload={handleFileDownload}
                  removeFile={removeFile}
                  removeImage={removeImage}
                  openImageModal={openImageModal}
                  fileInputRef={fileInputRef}
                  isObservationMode={isObservationMode}
                />

                <div className='flex justify-end mt-4 space-x-2'>
                  {!isObservationMode && (
                    <button
                      onClick={cardHandleDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                    >
                      刪除
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    {isObservationMode ? '關閉' : '取消'}
                  </button>
                  {!isObservationMode && (
                    <button
                      onClick={cardHandleSubmit}
                      className="px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200"
                    >
                      儲存
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 變更歷史 */}
            {showChangeHistory && (
              <div className='max-h-96 overflow-y-auto'>
                <div className='flex items-center mb-4'>
                  <FiClock className='mr-2 text-gray-500' />
                  <h4 className='text-lg font-medium text-gray-700'>變更歷史</h4>
                </div>
                
                {changeLogs.length === 0 ? (
                  <div className='text-center py-8 text-gray-500'>
                    <FiEdit3 className='mx-auto mb-2 text-2xl' />
                    <p>尚無變更記錄</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {changeLogs.map((log, index) => (
                      <div 
                        key={log.id || index} 
                        className='bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400'
                      >
                        <div className='flex items-center justify-between mb-2'>
                          <div className='flex items-center'>
                            <FiUser className='mr-1 text-gray-500' size={14} />
                            <span className='text-sm font-medium text-gray-700'>
                              {log.changedBy}
                            </span>
                          </div>
                          <span className='text-xs text-gray-500'>
                            {formatTime(log.createdAt, 'full')}
                          </span>
                        </div>
                        
                        <p className='text-sm text-gray-600 mb-2'>
                          {log.description}
                        </p>
                        
                        {log.fieldName && (
                          <div className='text-xs text-gray-500'>
                            <span className='font-medium'>欄位：</span>
                            {log.fieldName}
                            {log.oldValue && log.newValue && (
                              <div className='mt-1'>
                                <span className='text-red-600'>舊值：{log.oldValue}</span>
                                <br />
                                <span className='text-green-600'>新值：{log.newValue}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className='flex items-center mt-2'>
                          <span className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${log.changeType === 'create' ? 'bg-green-100 text-green-700' : ''}
                            ${log.changeType === 'update' ? 'bg-blue-100 text-blue-700' : ''}
                            ${log.changeType === 'move' ? 'bg-purple-100 text-purple-700' : ''}
                            ${log.changeType === 'delete' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                            {log.changeType === 'create' && '創建'}
                            {log.changeType === 'update' && '更新'}
                            {log.changeType === 'move' && '移動'}
                            {log.changeType === 'delete' && '刪除'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className='flex justify-end mt-4'>
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    關閉
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右側：評論區 */}
          <div className='w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-200 p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto'>
            <h3 className='text-xl font-semibold mb-3'>討論區</h3>
            <CommentErrorBoundary context="kanban_task_comments">
            {/* 評論列表 */}
            <div className='space-y-4 mb-4'>
              {comments.length === 0 && (
                <div className='text-sm text-gray-400 text-center py-6'>
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
                        <span className='text-sm font-medium text-gray-800'>{formatUserDisplay(c.user)}</span>
                        <span className='text-xs text-gray-400'>{formatTime(c.createdAt, 'relative')}</span>
                      </div>
                      <p className='text-sm text-gray-700 whitespace-pre-wrap mt-1'>
                        {c.content}
                      </p>
                      {/* 附件顯示 */}
                      {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                        <div className='mt-2 space-y-2'>
                          {c.attachments.map((a, i) => {
                            const isImage = (a.mimeType || '').startsWith('image/');
                            if (isImage) {
                              const imgUrl = `http://localhost/api/file/image/${a.fileName}`;
                              return (
                                <div key={i}>
                                  <img
                                    src={imgUrl}
                                    alt={a.originalName}
                                    className='max-h-40 rounded border cursor-pointer'
                                    onClick={() => openCommentImageModal(c.attachments.filter(x => (x.mimeType||'').startsWith('image/')), i)}
                                  />
                                </div>
                              );
                            }
                            const dlUrl = `http://localhost/api/file/direct/${a.fileName}`;
                            return (
                              <div key={i} className='text-xs flex items-center gap-2'>
                                <a href={dlUrl} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline'>
                                  {a.originalName}
                                </a>
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
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${c.likedByCurrentUser ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          title={c.likedByCurrentUser ? '已按讚' : '按讚'}
                        >
                          {c.likedByCurrentUser ? <AiFillLike size={14}/> : <AiOutlineLike size={14}/>} {c.likeCount || 0}
                        </button>
                        {/* 編輯/刪除 */}
                        {(() => {
                          const loggedInId = parseInt(localStorage.getItem('id')) || 0;
                          const isOwner = c.user?.id === loggedInId || c.userId === loggedInId;
                          return isOwner ? (
                            <CommentActions 
                              comment={c} 
                              onAfterChange={() => queryClient.invalidateQueries(['comments', cardData.id])} 
                            />
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 新增評論輸入框 */}
            <div className='flex items-start space-x-3'>
              <img src={(personImg[Math.abs(parseInt(localStorage.getItem('id')) || 0) % personImg.length])} alt='me' className='w-9 h-9 rounded-full object-cover' />
              <div className='flex-1'>
                <textarea
                  className='w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-customgreen'
                  rows={3}
                  placeholder='新增評論…'
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                {/* 選擇的附件列表 */}
                {filesToUpload.length > 0 && (
                  <div className='mt-2 space-y-1'>
                    {filesToUpload.map((f, idx) => (
                      <div key={idx} className='flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded'>
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
                      className={`inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800`}
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
                    className={`px-4 py-1.5 rounded-md text-sm bg-customgreen text-white hover:bg-customgreen/90`}
                  >
                    送出
                  </button>
                </div>
              </div>
            </div>
            </CommentErrorBoundary>
          </div>
        </div>
      </Modal>

      {!isObservationMode && (
        <Modal open={assignMemberModalopen} onClose={() => setAssignMemberModalOpen(false)} opacity={false} position={"justify-end items-center m-3"}>
          <button onClick={() => setAssignMemberModalOpen(false)} className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
            <GrFormClose className='w-6 h-6' />
          </button>
          <AssignMember menberData={menberData} setMenberData={setMenberData} setCardData={setCardData} cardHandleSubmit={cardHandleSubmit} />
        </Modal>
      )}

      <Toaster />
    </>
  );
}

export default React.memo(Carditem);
