import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaChevronUp, FaEye } from 'react-icons/fa';
import { MdAddchart } from "react-icons/md";
import ProjectCard from './ProjectCard';

const ProjectSection = ({
  index,
  title,
  projects = [],
  type = 'normal', // 'normal', 'completed', 'done', 'viewable'
  activeIndex,
  setActiveIndex,
  members = [],
  onEdit,
  onDelete,
  calculateProgress,
  calculateProgressPercentage,
  role,
  // 控制項
  showCreateButton = false,
  showJoinButton = false,
  onCreateProject,
  onJoinProject,
  // 篩選組件
  filterComponent,
  // 空狀態配置
  emptyStateConfig
}) => {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const isActive = index === activeIndex;

  // 計算手風琴高度
  useEffect(() => {
    if (isActive && contentRef.current) {
      const timer = setTimeout(() => {
        setHeight(contentRef.current.scrollHeight);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setHeight(0);
    }
  }, [isActive, projects]);

  const handleToggle = () => {
    setActiveIndex(isActive ? null : index);
    if (!isActive && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  };

  // 預設空狀態配置
  const defaultEmptyStateConfig = {
    icon: type === 'viewable' ? <FaEye className="mx-auto h-12 w-12 text-gray-400" /> : (
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: type === 'viewable' ? "目前沒有可觀摩的專案" : `還沒有${title}`,
    description: type === 'viewable' ? "請等待老師開放專案供觀摩" : "開始您的學習旅程，點擊下方按鈕加入活動吧！",
    showButton: type === 'normal' && showJoinButton,
    buttonText: "加入活動",
    onButtonClick: onJoinProject
  };

  const finalEmptyStateConfig = { ...defaultEmptyStateConfig, ...emptyStateConfig };

  // 渲染空狀態
  const renderEmptyState = () => (
    <div className="col-span-full">
      <div className="text-center py-12">
        {finalEmptyStateConfig.icon}
        <h3 className="mt-2 text-sm font-medium text-gray-900">{finalEmptyStateConfig.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{finalEmptyStateConfig.description}</p>
        {finalEmptyStateConfig.showButton && (
          <div className="mt-6">
            <button
              onClick={finalEmptyStateConfig.onButtonClick}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#5BA491] hover:bg-[#5BA491]/80"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {finalEmptyStateConfig.buttonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染控制按鈕
  const renderControlButtons = () => {
    if (!showCreateButton && !showJoinButton && !filterComponent) return null;

    return (
      <div className='flex justify-start items-center gap-3 mb-4 mt-2 pl-4'>
        {showCreateButton && (
          <button
            onClick={onCreateProject}
            className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105"
            data-tour={role === "teacher" ? "create-project" : undefined}
          >
            <MdAddchart className="mr-2" /> 建立活動
          </button>
        )}
        {showJoinButton && (
          <button
            onClick={onJoinProject}
            className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105"
          >
            <MdAddchart className="mr-2" /> 加入活動
          </button>
        )}
        {filterComponent}
      </div>
    );
  };

  // 根據類型決定網格佈局
  const getGridClasses = () => {
    if (role === "teacher" && type === 'normal') {
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 place-items-center';
    }
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-4 place-items-center';
  };

  return (
    <div className="">
      {/* Accordion Header */}
      <button
        className="flex justify-between items-center w-full py-2 px-4 bg-gray-200 rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-gray-300 transition duration-300"
        onClick={handleToggle}
      >
        <span className="font-semibold">{title}</span>
        {isActive ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
      </button>

      {/* Accordion Content */}
      <div
        ref={contentRef}
        style={{ height: isActive ? `${height}px` : "0px", overflow: 'hidden' }}
        className="transition-height bg-customgreen/5 duration-500 ease-in-out my-1"
      >
        <div className="text-left px-2 py-2">
          {/* 控制按鈕和篩選 */}
          {renderControlButtons()}

          {/* 專案網格 */}
          <div className={getGridClasses()}>
            {projects.length > 0 ? (
              projects
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((project, projectIndex) => (
                  <ProjectCard
                    key={projectIndex}
                    project={project}
                    type={type}
                    members={members}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    calculateProgress={calculateProgress}
                    calculateProgressPercentage={calculateProgressPercentage}
                    role={role}
                  />
                ))
            ) : (
              renderEmptyState()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSection;