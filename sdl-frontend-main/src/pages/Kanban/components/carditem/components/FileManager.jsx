import React from 'react';
import { GrFormClose } from "react-icons/gr";
import { AiOutlineCloudDownload } from "react-icons/ai";
import { FiInfo } from 'react-icons/fi';

/**
 * FileManager - 文件管理組件
 *
 * 職責：
 * - 顯示圖片列表（可點擊放大）
 * - 顯示文件列表（可下載）
 * - 上傳新文件
 * - 刪除文件/圖片
 *
 * Linus: "UI 組件只負責渲染，業務邏輯在 hook 裡"
 *
 * @param {Object} cardData - 卡片數據
 * @param {Function} handleFileUpload - 上傳文件處理函數
 * @param {Function} handleFileDownload - 下載文件處理函數
 * @param {Function} removeFile - 刪除文件處理函數
 * @param {Function} removeImage - 刪除圖片處理函數
 * @param {Function} openImageModal - 打開圖片查看器
 * @param {Object} fileInputRef - 文件輸入 ref
 * @param {boolean} isObservationMode - 是否為觀摩模式
 */
export function FileManager({
  cardData,
  handleFileUpload,
  handleFileDownload,
  handleImageDownload,
  removeFile,
  removeImage,
  openImageModal,
  fileInputRef,
  isObservationMode = false
}) {
  return (
    <div className='flex flex-col w-full mt-6 mb-stack-md'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center space-x-stack-xs'>
          <h3 className='text-body-lg font-semibold text-gray-800'>檔案管理</h3>
          <span className='text-body-sm text-gray-500'>
            ({cardData.images?.length || 0} 圖片, {cardData.files?.length || 0} 檔案)
          </span>
        </div>
        {!isObservationMode && (
          <label className='flex items-center space-x-stack-xs px-4 py-2 bg-white border border-customgreen text-customgreen rounded-lg hover:bg-customgreen/5 transition-all duration-fast cursor-pointer'>
            <AiOutlineCloudDownload size={18} />
            <span className='font-medium'>上傳檔案</span>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className='hidden'
            />
          </label>
        )}
      </div>

      {/* 檔案上傳提示 */}
      <p className='text-caption text-gray-500 mb-4'>
        <FiInfo className="w-3.5 h-3.5 inline mr-1" /> 支援圖片、文件、影片、音訊、壓縮檔等格式 | 單檔最大 100MB | 最多 10 個檔案
      </p>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-stack-sm'>
        {/* Images Section */}
        <div className='bg-gray-50 rounded-lg border border-gray-200 p-component-sm'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-ui font-semibold text-gray-800'>圖片</h4>
            {cardData.images?.length > 0 && (
              <span className='text-caption text-gray-500'>{cardData.images.length} 張</span>
            )}
          </div>
          {cardData.images && cardData.images.length > 0 ? (
            <div className='grid grid-cols-2 gap-stack-xs'>
              {cardData.images.map((image, index) => (
                <div key={index} className='relative aspect-square group'>
                  <img
                    src={image}
                    alt={`Uploaded ${index + 1}`}
                    className='w-full h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity duration-fast bg-gray-50'
                    onClick={() => openImageModal(index)}
                  />
                  
                  {/* 下載按鈕 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageDownload(image);
                    }}
                    className={`absolute top-2 ${!isObservationMode ? 'right-10' : 'right-2'} p-1.5 bg-white/90 text-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-fast shadow-sm hover:bg-white`}
                    title="下載圖片"
                  >
                    <AiOutlineCloudDownload size={14} />
                  </button>

                  {!isObservationMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className='absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-fast shadow-sm hover:bg-white'
                      title="刪除圖片"
                    >
                      <GrFormClose size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className='flex items-center justify-center h-32 bg-gray-50 rounded-lg'>
              <p className='text-body-sm text-gray-400'>尚未上傳圖片</p>
            </div>
          )}
        </div>

        {/* Files Section */}
        <div className='bg-gray-50 rounded-lg border border-gray-200 p-component-sm'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-ui font-semibold text-gray-800'>檔案</h4>
            {cardData.files?.length > 0 && (
              <span className='text-caption text-gray-500'>{cardData.files.length} 個</span>
            )}
          </div>
          {cardData.files && cardData.files.length > 0 ? (
            <div className='space-y-stack-xs max-h-[280px] overflow-y-auto scrollbar-thin'>
              {cardData.files.map((file, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-component-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-fast'
                >
                  <div className='flex items-center space-x-3 min-w-0'>
                    <div className='p-component-xs bg-white rounded-lg shadow-sm flex-shrink-0'>
                      <AiOutlineCloudDownload size={20} className="text-gray-400" />
                    </div>
                    <div className='flex flex-col min-w-0'>
                      <span className='text-body-sm font-medium text-gray-700 truncate'>
                        {file.originalName}
                      </span>
                      <span className='text-caption text-gray-400'>
                        {file.mimeType}
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center space-x-stack-xs flex-shrink-0'>
                    <button
                      onClick={() => handleFileDownload(file)}
                      className='px-3 py-1.5 bg-customgreen text-white rounded-lg hover:bg-customgreen/90 transition-colors duration-fast text-body-sm font-medium'
                    >
                      下載
                    </button>
                    {!isObservationMode && (
                      <button
                        onClick={() => removeFile(index)}
                        className='p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-fast rounded-lg hover:bg-gray-200'
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
              <p className='text-body-sm text-gray-400'>尚未上傳檔案</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
