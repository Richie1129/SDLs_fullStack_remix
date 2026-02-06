import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AiOutlineCloudDownload, AiOutlineRobot } from 'react-icons/ai';
import { FiTrash2, FiFlag, FiFileText } from 'react-icons/fi';
import { formatTime } from '../../utils/timeUtils';
import { is5RsFormat, parse5RsContent, extract5RsText } from '@/utils/5RsUtils.js';
import FileDownload from 'js-file-download';
import { getAuditEvents } from '@/api/audit.js';
import { formatAuditAction, extractAuditDiffLines } from '@/utils/auditUtils.js';
import { buildFileDownloadUrl } from '@/utils/fileUrlBuilder.js';
import { getCurrentUserId, getCurrentUserRole, isTeacher as checkIsTeacher } from '../../utils/authUtils';
import { STAGE_NAMES } from '@/pages/submit/config/guidedQuestionsConfig';

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
  const currentUserId = getCurrentUserId();
  const isTeacher = checkIsTeacher();
  const isCreator = item.userId === currentUserId || item.user?.id === currentUserId;
  const isTeamLog = inferredTargetType === 'daily_team';

  // 權限邏輯：
  // - 教師：永遠不能編輯
  // - 小組日誌：所有學生都可以編輯（不檢查創建者）
  // - 個人日誌：只有創建者可以編輯
  const canEdit = !isTeacher && (isTeamLog || isCreator);
  
  const handleDownload = () => {
    if (item.fileName) {
      // 使用後端 API 代理下載（支援 MinIO）
      window.open(buildFileDownloadUrl(item.fileName), "_blank");
    } else if (item.fileData && item.fileData.data) {
      // 向後相容：處理舊的 BLOB 資料
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
        <div className="space-y-stack-xs">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-body-sm mb-2">
              5Rs 結構化反思內容
            </p>
            {hasAIFeedback ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-caption font-medium rounded-full flex items-center">
                <AiOutlineRobot className="w-3 h-3 mr-1" />
                已分析
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-caption font-medium rounded-full">
                未分析
              </span>
            )}
          </div>
          <div className="text-gray-700 line-clamp-6">
            {extract5RsText(item.content)}
          </div>
          <button
            onClick={() => onView5Rs(item)}
            className="text-teal-600 hover:text-teal-800 text-body-sm font-medium"
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

  // 根據反思類型決定視覺樣式（方案 5：列表視覺區隔）
  const getCardStyles = () => {
    if (is5Rs) {
      return {
        borderClass: 'border-l-4 border-purple-400',
        bgClass: 'bg-gradient-to-br from-purple-50/50 to-pink-50/50',
        titleClass: 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent',
        badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        buttonClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
      };
    }
    return {
      borderClass: 'border-l-4 border-[#5BA491]',
      bgClass: 'bg-white',
      titleClass: 'text-[#5BA491]',
      badgeClass: 'bg-[#5BA491]/10 text-[#5BA491]',
      buttonClass: 'bg-[#5BA491] hover:bg-[#5BA491]/90 text-white',
    };
  };

  const cardStyles = getCardStyles();

  // 格式化階段名稱 - 使用專案統一的階段名稱（包含階段編號）
  const formatStageName = (stage) => {
    if (!stage) return null;
    const stageName = STAGE_NAMES[stage] || '未知階段';
    return `${stage} ${stageName}`;
  };

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
      <div className={`${cardStyles.bgClass} ${cardStyles.borderClass} rounded-lg shadow-lg p-component-sm sm:p-component-md lg:p-component-lg m-1 sm:m-2 w-full h-full flex flex-col min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h5 className={`text-body-lg sm:text-h3 font-bold ${cardStyles.titleClass} py-2`}>
            {item.title}
          </h5>
          <div className="flex items-center gap-stack-xs flex-wrap">
            {/* 階段標籤 */}
            {item.stage ? (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-caption font-medium rounded-full flex items-center">
                <FiFlag className="w-3.5 h-3.5 mr-1" />
                {formatStageName(item.stage)}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-caption font-medium rounded-full flex items-center">
                <FiFileText className="w-3.5 h-3.5 mr-1" />
                通用反思
              </span>
            )}
            
            {/* 日誌類型標籤 */}
            {is5Rs && (
              <span className={`px-2.5 py-1 ${cardStyles.badgeClass} text-caption font-bold rounded-full flex items-center shadow-sm`}>
                <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                5Rs 反思
              </span>
            )}
            {!is5Rs && (
              <span className={`px-2.5 py-1 ${cardStyles.badgeClass} text-caption font-medium rounded-full`}>
                傳統日誌
              </span>
            )}
            
            {/* 刪除按鈕 */}
            {typeof onDelete === 'function' && canEdit && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                title="刪除這筆日誌"
                aria-label="刪除日誌"
                className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors duration-fast"
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
              <span className="text-body text-gray-500">
                附加檔案: {item.originalName || item.filename || item.fileName}
              </span>
              <button
                className="flex items-center justify-center px-3 py-1 bg-customgreen text-white rounded-md hover:bg-customgreen/80 transition-colors duration-fast ease-in-out"
                onClick={handleDownload}
              >
                <AiOutlineCloudDownload size={32} className="mr-2" />
                下載
              </button>
            </div>
          )}

        {/* Dates */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-stack-xs mb-3">
          <p
            className="text-body-sm sm:text-body text-customgreen font-bold"
            title={formatTime(item.createdAt, "full")}
          >
            建立日期: {formatTime(item.createdAt, "date")}
          </p>
          {showCreator && (
            <p className="text-caption sm:text-body-sm text-gray-500">
              建立者: {item.user?.username || item.creator || '未知'}
            </p>
          )}
          {item.updatedAt && item.updatedAt !== item.createdAt && (
            <p
              className="text-caption sm:text-body-sm text-gray-500"
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
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 px-4 rounded transition-all duration-fast text-body-sm sm:text-body mb-2 flex items-center justify-center shadow-sm hover:shadow-md"
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
              className={`w-full ${cardStyles.buttonClass} py-2 px-4 rounded transition-all duration-fast text-body-sm sm:text-body shadow-sm hover:shadow-md`}
              onClick={() => onEdit(item)}
            >
              編輯 {is5Rs ? "5Rs 反思" : "傳統日誌"}
            </button>
          ) : (
            <button
              className={`w-full ${cardStyles.buttonClass} py-2 px-4 rounded transition-all duration-fast text-body-sm sm:text-body shadow-sm hover:shadow-md`}
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
