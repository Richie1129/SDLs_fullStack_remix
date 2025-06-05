import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../../components/Modal';
import AssignMember from './AssignMember';
import { getProjectUser } from '../../../api/users';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import Swal from 'sweetalert2';
import { GrFormClose } from "react-icons/gr";
import { FiEdit } from "react-icons/fi";
import { BsFillPersonFill } from "react-icons/bs";
import { Draggable } from 'react-beautiful-dnd';
import { socket } from '../../../utils/socket';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { CircleArrowLeft, CircleArrowRight } from "lucide-react"
import FileDownload from 'js-file-download';
import { AiOutlineCloudDownload } from "react-icons/ai";
import { formatTime } from '../../../utils/timeUtils';
import { getTaskChangeLogs } from '../../../api/kanban';
import { FiClock, FiUser, FiEdit3 } from 'react-icons/fi';

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
  fileInputRef 
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
                  <button
                    onClick={() => removeImage(index)}
                    className='absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:bg-white'
                  >
                    <GrFormClose size={14} />
                  </button>
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
                    <button
                      onClick={() => removeFile(index)}
                      className='p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-gray-200'
                    >
                      <GrFormClose size={16} />
                    </button>
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

// 子元件：成員指派區塊
const MemberAssignment = ({ 
  cardData, 
  setAssignMemberModalOpen,
  owner,
  personImg,
  Tooltip
}) => (
  <div className='bg-white rounded-xl border border-gray-100 p-4 mb-4'>
    <div className='flex items-center justify-between mb-3'>
      <h4 className='text-base font-medium text-gray-700'>成員</h4>
      <button
        onClick={() => setAssignMemberModalOpen(true)}
        className='flex items-center space-x-2 px-3 py-1.5 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200'
      >
        <BsFillPersonFill size={16} />
        <span className='text-sm font-medium'>指派成員</span>
      </button>
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

  const [menberData, setMenberData] = useState([]);

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
    setCardData({
      ...data,
      images: data.images || [], // 確保 images 為陣列
      files: data.files || [], // 確保 files 為陣列
      owner: data.owner || "",  // 確保 owner 存在
    });
  }, [data]);

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

      // For non-image files, keep the complete file objects with full URL
      const uploadedFiles = response.data.files
        .filter((file) => !file.mimeType.startsWith("image/"))
        .map((file) => ({
          url: `http://localhost/api${file.url}`,
          originalName: file.originalName,
          mimeType: file.mimeType
        }));
      
      const uploadedImages = response.data.files
        .filter((file) => file.mimeType.startsWith("image/"))
        .map((file) => `http://localhost/api${file.url}`);

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
      const response = await axios.get(`http://localhost/api${file.url}`, {
        responseType: 'blob'
      });
      FileDownload(response.data, file.originalName);
    } catch (err) {
      console.error('檔案下載失敗:', err);
      toast.error('檔案下載失敗');
    }
  };

  const removeFile = (index) => {
    setCardData((prev) => {
      const newFiles = [...prev.files];
      newFiles.splice(index, 1);
      return { ...prev, files: newFiles };
    });
  };

  const removeImage = (index) => {
    setCardData((prev) => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        cardData: updatedCardData, 
        columnIndex, 
        index, 
        projectId,
        user: { username: localStorage.getItem("username") }
      });
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
        socket.emit("cardDelete", { 
          cardData, 
          columnIndex, 
          index, 
          projectId,
          user: { username: localStorage.getItem("username") }
        });
        setOpen(false);
      }
    });
  };
  
  return (
    <>
      <Draggable draggableId={data.id.toString()} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`item-container rounded-lg mb-3 w-full transition-all duration-200 ${
              snapshot.isDragging 
                ? "shadow-xl bg-customgreen/90 text-white" 
                : "bg-white shadow-md hover:shadow-lg"
            }`}
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
                  {data.title}
                </h3>
                <button
                  onClick={() => setOpen(true)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <FiEdit size={16} />
                </button>
              </div>

              {data.content && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {data.content}
                </p>
              )}

              {data.assignees?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {data.assignees.map((assignee, index) => {
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
                
                {data.createdAt && (
                  <div className="text-xs text-gray-400">
                    {formatTime(data.createdAt, 'relative')}
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
          position="justify-center items-center"
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

      {open && (
        <Modal open={open} onClose={() => setOpen(false)} opacity={true} position={"justify-center items-center"}>
          <div className='flex flex-col w-full'>
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
                onClick={() => setShowChangeHistory(true)}
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
                    className="rounded outline-none ring-2 p-2 ring-customgreen w-full"
                    type="text"
                    placeholder="標題"
                    value={cardData.title}
                    onChange={(e) => setCardData({ ...cardData, title: e.target.value })}
                  />
                </div>
                <textarea
                  className="rounded outline-none ring-2 ring-customgreen w-full p-2 mb-4"
                  rows={3}
                  placeholder="內容"
                  value={cardData.content}
                  onChange={(e) => setCardData({ ...cardData, content: e.target.value })}
                />

                {/* 時間資訊 */}
                {(data.createdAt || data.updatedAt) && (
                  <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>時間資訊</h4>
                    <div className='space-y-1 text-sm text-gray-600'>
                      {data.createdAt && (
                        <div className='flex justify-between'>
                          <span>建立時間：</span>
                          <span title={formatTime(data.createdAt, 'full')}>
                            {formatTime(data.createdAt, 'full')}
                          </span>
                        </div>
                      )}
                      {data.updatedAt && data.updatedAt !== data.createdAt && (
                        <div className='flex justify-between'>
                          <span>更新時間：</span>
                          <span title={formatTime(data.updatedAt, 'full')}>
                            {formatTime(data.updatedAt, 'relative')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <MemberAssignment
                  cardData={cardData}
                  setAssignMemberModalOpen={setAssignMemberModalOpen}
                  owner={data.owner}
                  personImg={personImg}
                  Tooltip={Tooltip}
                />
                
                <FileManagementModal
                  cardData={cardData}
                  handleFileUpload={handleFileUpload}
                  handleFileDownload={handleFileDownload}
                  removeFile={removeFile}
                  removeImage={removeImage}
                  openImageModal={openImageModal}
                  fileInputRef={fileInputRef}
                />

                <div className='flex justify-end mt-4 space-x-2'>
                  <button
                    onClick={cardHandleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    刪除
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={cardHandleSubmit}
                    className="px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-200"
                  >
                    儲存
                  </button>
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
        </Modal> 
      )}

      <Modal open={assignMemberModalopen} onClose={() => setAssignMemberModalOpen(false)} opacity={false} position={"justify-end items-center m-3"}>
        <button onClick={() => setAssignMemberModalOpen(false)} className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
          <GrFormClose className='w-6 h-6' />
        </button>
        <AssignMember menberData={menberData} setMenberData={setMenberData} setCardData={setCardData} cardHandleSubmit={cardHandleSubmit} />
      </Modal>

      <Toaster />
    </>
  );
}

export default React.memo(Carditem);
