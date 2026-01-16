import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import dateFormat from 'dateformat';

const Tooltip = ({ children, content }) => {
  return (
    <div className='relative group'>
      {children}
      <div className='absolute top-full mb-2 hidden group-hover:block'>
        <div className='bg-gray-700 text-white text-caption rounded-lg py-1 px-2 whitespace-normal overflow-wrap: break-word'>
          {content}
        </div>
      </div>
    </div>
  );
};

const ProgressTooltip = ({ children, content }) => {
  return (
    <div className='relative group'>
      {children}
      <div className='absolute bottom-full mb-2 hidden group-hover:block'>
        <div className='bg-gray-700 text-white text-caption rounded-lg py-1 px-2 whitespace-nowrap'>
          {content}
        </div>
      </div>
    </div>
  );
};

// 格式化相對時間
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = (now - new Date(date)) / 1000;
  if (diffInSeconds < 60) return '剛剛';
  else if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分鐘前`;
  else if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小時前`;
  else return `${Math.floor(diffInSeconds / 86400)}天前`;
};

export default function ProjectCard({
  project,
  type = 'normal', // 'normal', 'completed', 'done', 'viewable'
  members = [],
  onEdit,
  onDelete,
  calculateProgress,
  calculateProgressPercentage,
  role
}) {
  const navigate = useNavigate();

  // 獲取專案成員
  const getProjectMembers = () => {
    return members
      .filter(member => member.projectId === project.id)
      .map(member => member.username)
      .join("、") || "無成員";
  };

  // 獲取班級資訊
  const getProjectClasses = () => {
    const classes = Array.from(new Set(
      members
        .filter(m => m.projectId === project.id)
        .map(m => m.class)
        .filter(Boolean)
    ));
    return classes.join('、') || '無班級資訊';
  };

  // 獲取觀摩專案成員（直接從專案數據）
  const getViewableProjectMembers = () => {
    return project.members?.map(member => member.username).join("、") || "無成員資訊";
  };

  // 獲取觀摩專案班級（直接從專案數據）
  const getViewableProjectClasses = () => {
    const classes = Array.from(new Set(
      (project.members || [])
        .map(m => m.class)
        .filter(Boolean)
    ));
    return classes.join('、') || '無班級資訊';
  };

  // 根據類型設定樣式
  const getCardStyle = () => {
    switch (type) {
      case 'viewable':
        return 'bg-blue-50 border-l-4 border-blue-400';
      case 'done':
        return 'bg-white';
      default:
        return 'bg-white';
    }
  };

  // 根據類型設定標題顏色
  const getTitleColor = () => {
    switch (type) {
      case 'viewable':
        return 'text-blue-600';
      default:
        return 'text-[#5BA491]';
    }
  };

  // 根據類型設定按鈕
  const renderActionButtons = () => {
    if (type === 'viewable') {
      return (
        <button
          className='mt-2 bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition duration-fast ease-in-out font-semibold flex items-center justify-center'
          onClick={() => navigate(`/project/${project.id}/kanban?mode=observation`)}
        >
          <Eye className='mr-2 h-4 w-4' />
          觀摩專案
        </button>
      );
    }

    if (type === 'done') {
      return (
        <div className='flex justify-between items-center'>
          <button className='flex-1 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold mr-2'
                  onClick={() => navigate(`/project/${project.id}/kanban`)}>
            查看學習歷程
          </button>
          <button className='bg-[#5BA491] text-white px-3 font-bold py-1 rounded hover:bg-[#5BA491]/80 transition duration-fast ease-in-out'>
            匯出
          </button>
        </div>
      );
    }

    if (type === 'completed') {
      return (
        <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold'
                onClick={() => navigate(`/project/${project.id}/kanban`)}>
          製作學習歷程
        </button>
      );
    }

    // 預設（進行中專案）
    if (role === "teacher") {
      return (
        <div className='flex justify-between gap-stack-xs mt-2'>
          <button
            onClick={() => onEdit(project)}
            className="flex-1 bg-customgreen text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold">
            編輯活動
          </button>
          <button
            className='flex-1 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold'
            onClick={() => navigate(`/project/${project.id}/kanban`)}>
            查看活動
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="flex-1 bg-[#FF0000]/80 text-white rounded-lg px-4 py-2 transition duration-fast ease-in-out font-semibold">
            刪除活動
          </button>
        </div>
      );
    } else {
      return (
        <div className='flex justify-between gap-stack-xs mt-2'>
          <button
            onClick={() => onEdit(project)}
            className="flex-1 bg-customgreen text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold">
            編輯活動
          </button>
          <button
            className='flex-1 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-fast ease-in-out font-semibold'
            onClick={() => navigate(`/project/${project.id}/kanban`)}>
            查看活動
          </button>
        </div>
      );
    }
  };

  // 根據類型設定進度條寬度
  const getProgressWidth = () => {
    if (type === 'done') {
      return '100%';
    }
    return `${calculateProgress(project.currentStage, project.currentSubStage)}%`;
  };

  return (
    <div className={`${getCardStyle()} w-full rounded-lg shadow-lg hover:shadow-xl p-component-sm flex flex-col space-y-3 transition-shadow duration-fast ease-out`}>
      {/* 標題區域 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center flex-1'>
          {type === 'viewable' && <Eye className='text-blue-600 mr-2 h-4 w-4' />}
          <h3 className={`text-h3 font-bold ${getTitleColor()}`}>{project.name}</h3>
          {type === 'completed' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {type === 'done' && (
            <span className='ml-2 text-caption px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200'>已完成</span>
          )}
        </div>
      </div>

      {/* 專案描述 */}
      <Tooltip children={type === 'viewable' ? "專案描述" : "活動描述"} content={`${project.describe}`}>
        <p className='text-gray-600 font-semibold truncate overflow-hidden h-6'>{project.describe}</p>
      </Tooltip>

      {/* 專案資訊 */}
      <div className='text-body-sm text-gray-500 font-bold'>
        目前階段：{project.currentStage}-{project.currentSubStage}
      </div>

      <div className='text-body-sm text-gray-500'>指導老師：{project.mentor}</div>

      {type !== 'viewable' && (
        <div className='text-body-sm text-gray-500'>邀請碼：{project.referral_code}</div>
      )}

      <div className='text-body-sm text-gray-500'>
        成員：{type === 'viewable' ? getViewableProjectMembers() : getProjectMembers()}
      </div>

      <div className='text-body-sm text-gray-500'>
        所屬班級：{type === 'viewable' ? getViewableProjectClasses() : getProjectClasses()}
      </div>

      {/* 觀摩權限資訊 - 僅教師可見且非觀摩模式 */}
      {role === "teacher" && type !== 'viewable' && (
        <div className='text-body-sm text-gray-500'>
          {project.is_open_for_viewing ? (
            <span className='flex items-center'>
              <span className='text-green-600 mr-1'>✓</span>
              可觀摩班級：{project.allowed_classes?.length > 0 ? project.allowed_classes.join('、') : '無'}
            </span>
          ) : (
            <span className='flex items-center'>
              <span className='text-gray-400 mr-1'>✗</span>
              未開放觀摩
            </span>
          )}
        </div>
      )}

      {/* 時間資訊 */}
      <div className='flex justify-between text-body-sm text-gray-500'>
        <span className='flex items-center'>
          {type !== 'viewable' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 12a9 9 0 110 18 9 9 0 010-18zm9 9a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          )}
          創建於 {dateFormat(project.createdAt, "yyyy/mm/dd")}
        </span>
        {type !== 'viewable' && (
          <span className='flex items-center'>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 12a9 9 0 110 18 9 9 0 010-18zm9 9a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
            更新於 {formatRelativeTime(project.updatedAt)}
          </span>
        )}
      </div>

      {/* 進度條 */}
      <ProgressTooltip children={type === 'viewable' ? "專案進度" : "活動進度"} content={`已完成${calculateProgressPercentage(project.currentStage, project.currentSubStage)}%`}>
        <div className='w-full bg-gray-200 rounded-full h-2.5'>
          <div
            className={`${type === 'viewable' ? 'bg-blue-500' : 'bg-[#5BA491]'} h-2.5 rounded-full transition-all duration-normal ease-in-out`}
            style={{ width: getProgressWidth() }}
          ></div>
        </div>
      </ProgressTooltip>

      {/* 操作按鈕 */}
      {renderActionButtons()}
    </div>
  );
}
