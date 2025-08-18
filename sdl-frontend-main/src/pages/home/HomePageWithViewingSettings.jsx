import React, { useState, useEffect, useRef } from 'react'
import TopBar from '../../components/TopBar';
import SideBar from '../../components/SideBar';
import Modal from '../../components/Modal';
import ProjectViewingSettings from '../../components/ProjectViewingSettings'; // 新增
import toast, { Toaster } from 'react-hot-toast';
import { GrFormClose } from "react-icons/gr";
import { FaSortDown, FaCog, FaEye } from "react-icons/fa"; // 新增圖標
import { BsBoxArrowInRight } from "react-icons/bs";
// ... 其他 imports

export default function HomePage() {
  // ... 現有的 state
  const [selectedProjectForViewing, setSelectedProjectForViewing] = useState(null); // 新增

  // ... 現有的邏輯

  return (
    <div className='min-w-full min-h-screen bg-gray-100 overflow-auto scrollbar-hidden'>
      <TopBar />
      <div className='flex flex-col my-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 2xl:px-40 py-10 w-full items-center'>
        <div className='flex flex-col w-full'>
          <Accordion
            index={0}
            title="進行中活動"
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
          >
            {/* ... 現有的按鈕 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 place-items-center'>
              {ongoingProjects.map((projectItem, index) => (
                <div key={index} className='bg-white w-full rounded-lg shadow-lg hover:shadow-lg p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                  
                  {/* 專案標題區域 - 加入觀摩狀態指示 */}
                  <div className="flex items-center justify-between">
                    <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                    {projectItem.is_open_for_viewing && (
                      <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        <FaEye className="text-xs" />
                        <span>開放觀摩</span>
                      </div>
                    )}
                  </div>

                  {/* ... 現有的專案資訊 */}
                  
                  {/* 操作按鈕區域 - 修改為四個按鈕 */}
                  <div className='grid grid-cols-2 gap-2 mt-2'>
                    <button 
                      onClick={() => handleEditProject(projectItem)} 
                      className="bg-customgreen text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold text-sm">
                      編輯活動
                    </button>
                    
                    <button 
                      className='bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold text-sm' 
                      onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>
                      查看活動
                    </button>
                    
                    {/* 新增：觀摩設定按鈕 */}
                    <button 
                      onClick={() => setSelectedProjectForViewing(projectItem)}
                      className="flex items-center justify-center bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition duration-200 ease-in-out font-semibold text-sm">
                      <FaCog className="mr-1 text-xs" />
                      觀摩設定
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteProject(projectItem.id)} 
                      className="bg-[#FF0000]/80 text-white rounded-lg px-4 py-2 transition duration-200 ease-in-out font-semibold text-sm">
                      刪除活動
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          {/* 其他 Accordion... */}
        </div>
      </div>

      {/* 觀摩權限設定模態框 */}
      {selectedProjectForViewing && (
        <ProjectViewingSettings
          project={selectedProjectForViewing}
          onClose={() => setSelectedProjectForViewing(null)}
        />
      )}

      {/* 其他現有的模態框... */}
    </div>
  );
}
