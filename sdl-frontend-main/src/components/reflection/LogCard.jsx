import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AiOutlineCloudDownload, AiOutlineRobot } from 'react-icons/ai';
import { FiTrash2 } from 'react-icons/fi';
import { formatTime } from '../../utils/timeUtils';
import { is5RsFormat, parse5RsContent, extract5RsText } from '@/utils/5RsUtils.js';
import FileDownload from 'js-file-download';
import { getAuditEvents } from '@/api/audit.js';
import { formatAuditAction, extractAuditDiffLines } from '@/utils/auditUtils.js';

const LogCard = ({
  item,
  index,
  isActive = false,
  onEdit,
  onDelete,
  onView5Rs,
  onRequestAIAnalysis,
  showAIAnalysis = true,
  showCreator = false,
  SPRING_OPTIONS
}) => {
  const is5Rs = is5RsFormat(item.content);
  const inferredTargetType = useMemo(() => (item && Object.prototype.hasOwnProperty.call(item, 'creator')) ? 'daily_team' : 'daily_personal', [item]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  // 權限檢查：判斷當前用戶是否可以編輯此日誌
  const currentUserId = parseInt(localStorage.getItem("id"));
  const currentUserRole = localStorage.getItem("role");
  const isTeacher = currentUserRole === "teacher";
  const isCreator = item.userId === currentUserId || item.user?.id === currentUserId;
  const isTeamLog = inferredTargetType === 'daily_team';

  // 權限邏輯：
  // - 教師：永遠不能編輯
  // - 小組日誌：所有學生都可以編輯（不檢查創建者）
  // - 個人日誌：只有創建者可以編輯
  const canEdit = !isTeacher && (isTeamLog || isCreator);
  
  const handleDownload = () => {
    if (item.fileName && item.fileUrl) {
      window.open(
        `https://science.lazyinwork.com/api/file/direct/${item.fileName}`,
        "_blank"
      );
    } else if (item.fileData && item.fileData.data) {
      const buffer = new Uint8Array(item.fileData.data);
      const blob = new Blob([buffer], {
        type: "application/octet-stream",
      });
      FileDownload(
        blob,
        item.filename || item.originalName || "downloaded-file"
      );
    }
  };

  const renderContent = () => {
    if (is5Rs) {
      const parsed = parse5RsContent(item.content);
      const hasAIFeedback = parsed?.feedback && (
        parsed.feedback.overall || 
        parsed.feedback.suggestions?.length > 0
      );
      
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm mb-2">
              5Rs 結構化反思內容
            </p>
            {hasAIFeedback ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                <AiOutlineRobot className="w-3 h-3 mr-1" />
                已分析
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                未分析
              </span>
            )}
          </div>
          <div className="text-gray-700 line-clamp-6">
            {extract5RsText(item.content)}
          </div>
          <button
            onClick={() => onView5Rs(item)}
            className="text-teal-600 hover:text-teal-800 text-sm font-medium"
          >
            查看完整 5Rs 反思 →
          </button>
        </div>
      );
    }
    
    return (
      <p className="text-gray-700 break-words">
        {item.content}
      </p>
    );
  };

  const toggleHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && historyItems.length === 0) {
      try {
        setHistoryLoading(true);
        // Fetch both create and update events, newest first (server default)
        const events = await getAuditEvents({ targetType: inferredTargetType, targetId: item.id, limit: 50 });
        setHistoryItems(events || []);
      } catch (_) {
        setHistoryItems([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const renderDiff = (ev) => extractAuditDiffLines(ev);

  return (
    <motion.div
      key={index}
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      animate={{ scale: isActive ? 1 : 0.9 }}
      transition={SPRING_OPTIONS}
      className="aspect-video w-full shrink-0 rounded-xl object-cover"
    >
      <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 m-1 sm:m-2 w-full h-full flex flex-col min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-lg sm:text-xl font-bold text-customgreen py-2">
            {item.title}
          </h5>
          <div className="flex items-center gap-2">
            {is5Rs && (
              <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                5Rs 反思
              </span>
            )}
            {typeof onDelete === 'function' && canEdit && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                title="刪除這筆日誌"
                aria-label="刪除日誌"
                className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-auto mb-4">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="mt-auto">
          {/* File attachment */}
          {(item.fileName || item.fileData) && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-base text-gray-500">
                附加檔案: {item.originalName || item.filename || item.fileName}
              </span>
              <button
                className="flex items-center justify-center px-3 py-1 bg-customgreen text-white rounded-md hover:bg-customgreen/80 transition-colors duration-300 ease-in-out"
                onClick={handleDownload}
              >
                <AiOutlineCloudDownload size={32} className="mr-2" />
                下載
              </button>
            </div>
          )}

        {/* Dates */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
          <p
            className="text-sm sm:text-base text-customgreen font-bold"
            title={formatTime(item.createdAt, "full")}
          >
            建立日期: {formatTime(item.createdAt, "date")}
          </p>
          {showCreator && (
            <p className="text-xs sm:text-sm text-gray-500">
              建立者: {item.user?.username || item.creator || '未知'}
            </p>
          )}
          {item.updatedAt && item.updatedAt !== item.createdAt && (
            <p
              className="text-xs sm:text-sm text-gray-500"
              title={formatTime(item.updatedAt, "full")}
            >
              更新: {formatTime(item.updatedAt, "relative")}
            </p>
          )}
        </div>

          {/* AI Analysis Button for 5Rs */}
          {showAIAnalysis && is5Rs && (() => {
            const parsed = parse5RsContent(item.content);
            const hasAIFeedback = parsed?.feedback && (
              parsed.feedback.overall || 
              parsed.feedback.suggestions?.length > 0
            );
            
            if (!hasAIFeedback) {
              return (
                <div className="mb-2">
                  <button
                    onClick={() => onRequestAIAnalysis(item)}
                    className="w-full bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600 transition-colors duration-300 text-sm sm:text-base mb-2 flex items-center justify-center"
                  >
                    <AiOutlineRobot className="w-4 h-4 mr-2" />
                    請求 AI 分析
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Edit/View Button */}
          {canEdit ? (
            <button
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-300 text-sm sm:text-base"
              onClick={() => onEdit(item)}
            >
              編輯 {is5Rs ? "5Rs 反思" : "傳統日誌"}
            </button>
          ) : (
            <button
              className="w-full bg-[#5BA491] text-white py-2 px-4 rounded hover:bg-[#5BA491]/80 transition-colors duration-300 text-sm sm:text-base"
              onClick={() => onEdit(item)}
            >
              查看 {is5Rs ? "5Rs 反思" : "日誌"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LogCard;
