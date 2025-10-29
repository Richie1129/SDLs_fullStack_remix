import React from "react";
import { buildFileDownloadUrl } from '@/utils/fileUrlBuilder.js';

/**
 * Shared form fields component for daily logs
 * Used by both PersonalDailyModal and TeamDailyModal
 */
export function DailyFormFields({
  title,
  content,
  onChange,
  onFileChange,
  disabled = false,
  currentRecord = null,
  editingId = null,
  onRemoveAttachment,
  userRole,
}) {
  const isTeacher = userRole === "teacher";

  return (
    <>
      <input
        className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
        type="text"
        placeholder="日誌名稱..."
        name="title"
        value={title}
        onChange={onChange}
        required
        disabled={disabled || isTeacher}
      />
      <textarea
        className="rounded outline-none ring-2 ring-[#5BA491] w-full mb-3 p-1 resize-none overflow-auto"
        rows={10}
        placeholder="撰寫您的日誌..."
        name="content"
        value={content}
        onChange={onChange}
        disabled={disabled || isTeacher}
      />
      <input
        className="rounded outline-none ring-2 p-1 ring-[#5BA491] w-full mb-3"
        type="file"
        name="filename"
        onChange={onFileChange}
        multiple
        disabled={disabled || isTeacher}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
      />
      <p className="text-xs text-gray-500 mb-3">
        💡 支援圖片、文件、影片、音訊、壓縮檔等格式 | 單檔最大 100MB | 最多 10 個檔案
      </p>

      {/* Existing attachment (when editing) */}
      {editingId && currentRecord && (currentRecord.fileName || currentRecord.fileData) && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-700 break-all">
            附件：{currentRecord.originalName || currentRecord.filename || currentRecord.fileName}
          </div>
          <div className="flex gap-2">
            <a
              href={currentRecord.fileName ? buildFileDownloadUrl(currentRecord.fileName) : undefined}
              onClick={(e) => {
                if (!currentRecord.fileName && currentRecord.fileData) {
                  e.preventDefault();
                  const buffer = new Uint8Array(currentRecord.fileData.data);
                  const blob = new Blob([buffer], { type: "application/octet-stream" });
                  import('js-file-download').then(({ default: FileDownload }) => {
                    FileDownload(blob, currentRecord.filename || currentRecord.originalName || 'downloaded-file');
                  });
                }
              }}
              className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm text-center"
            >
              下載附件
            </a>
            {!isTeacher && (
              <button
                onClick={() => onRemoveAttachment && onRemoveAttachment()}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                刪除附件
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
