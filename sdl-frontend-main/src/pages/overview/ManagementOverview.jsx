import React, { useState, useEffect, useRef } from 'react'
import TopBar from '../../components/TopBar';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery, useQueryClient } from 'react-query';
import { getAllProject, getProjectsByMentor } from '../../api/project';
import { getAllTeachers, getProjectUser } from '../../api/users';
import { useNavigate } from 'react-router-dom';
import dateFormat from 'dateformat';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';  // 引入Font Awesome圖標
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';

export default function ManagementOverview() {
  const [projectData, setProjectData] = useState([]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [doneProjects, setDoneProjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [member, setMembers] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);  // 用於記錄當前打開的Accordion索引
  const [classFilter, setClassFilter] = useState('all'); // 班級篩選
  const [completedSearch, setCompletedSearch] = useState(''); // 已結束活動搜尋
  const [doneSearch, setDoneSearch] = useState(''); // 已完成歷程搜尋
  const role = localStorage.getItem("role");
  const userName = getCurrentUsername();
  const {
    isLoading,
    isError,
    error,
    data
  } = useQuery("projectDatas", () => getAllProject(
    { params: { userId: localStorage.getItem("id") } }),
    { onSuccess: setProjectData }
  );

  useEffect(() => {
    getAllTeachers().then(data => {
      console.log(data)
      setTeachers(data.user); // 根據你的API響應調整
    }).catch(error => {
      console.log('Error fetching teachers:', error);
    });
  }, []);

  useEffect(() => {
    async function fetchMembers() {
        try {
            const mentorName = getCurrentUsername();
            console.log("當前老師名稱:", mentorName);

            if (!mentorName) {
                console.error("未找到老師名稱，無法獲取專案用戶資訊");
                return;
            }

            const mentorProjects = await getProjectsByMentor(mentorName);
            console.log("老師指導的專案:", mentorProjects);

            if (!mentorProjects || mentorProjects.length === 0) {
                console.warn("該老師沒有指導任何專案");
                return;
            }

            const projectIds = mentorProjects.map(project => project.id);
            console.log("老師的專案 ID 列表:", projectIds);

            const projectUsersPromises = projectIds.map(async (projectId) => {
                try {
                    console.log(`正在獲取專案 ID ${projectId} 的用戶`);
                    const users = await getProjectUser(projectId);
                    console.log(`專案 ID ${projectId} 的用戶:`, users);
                    return users.map(user => ({ ...user, projectId }));  // 這裡加入 projectId
                } catch (err) {
                    console.error(`獲取專案 ID ${projectId} 的用戶失敗`, err);
                    return [];
                }
            });

            const projectUsers = await Promise.all(projectUsersPromises);
            const flatUsers = projectUsers.flat();

            console.log("所有專案的用戶資訊 (展開後):", flatUsers);

            // 這行很重要，確保 React 重新渲染
            setMembers(projectUsers.flat());  // 確保資料更新

        } catch (error) {
            console.error("獲取老師所指導專案的用戶資訊失敗:", error);
        }
    }

    fetchMembers();
}, []);
  
  function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = (now - new Date(date)) / 1000;
    if (diffInSeconds < 60) return '剛剛';
    else if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分鐘前`;
    else if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小時前`;
    else return `${Math.floor(diffInSeconds / 86400)}天前`;
  }

  const calculateProgress = (currentStage, currentSubStage) => {
    if (currentStage === 5) {
      return (12 + currentSubStage) / 17 * 100;
    } else {
      return ((currentStage - 1) * 3 + currentSubStage) / 17 * 100;
    }
  }
  const calculateProgressPercentage = (currentStage, currentSubStage) => {
    let percentage;
    if (currentStage === 5) {
      percentage = (12 + currentSubStage) / 17 * 100;
    } else {
      percentage = ((currentStage - 1) * 3 + currentSubStage) / 17 * 100;
    }
    return percentage.toFixed(2);
  }

  const Tooltip = ({ children, content }) => {
    return (
      <div className='relative group'>
        {children}
        <div className='absolute top-full mb-2 hidden group-hover:block'>
          <div className='bg-gray-700 text-white text-caption rounded-lg py-1 px-2  whitespace-normal overflow-wrap: break-word'>
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
  useEffect(() => {
    if (projectData) {
      const ongoing = projectData.filter(project => calculateProgress(project.currentStage, project.currentSubStage) < 75);
      const completed = projectData.filter(project => calculateProgress(project.currentStage, project.currentSubStage) > 75 && project.ProjectEnd === false);
      const done = projectData.filter(project => project.ProjectEnd === true);

      setDoneProjects(done);
      setOngoingProjects(ongoing);
      setCompletedProjects(completed);
    }
  }, [projectData]);

   if (role == "teacher") {
    const {
      isLoading,
      isError,
      error,
      data
    } = useQuery("TeacherProjectDatas", () => getProjectsByMentor(userName), {
      onSuccess: setProjectData,
    });

    console.log("專案成員：", projectData);

    return (
      <div className='min-w-full min-h-screen bg-gray-100 overflow-auto scrollbar-hidden'>
        <TopBar />
        <div className='flex flex-col my-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 2xl:px-40 py-10 w-full items-center'>
          <div className='flex flex-col w-full '>
            <Accordion
              index={0}
              title="進行中活動"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-stack-sm place-items-center'>
                {ongoingProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow-lg hover:shadow-lg  p-component-base flex flex-col space-y-stack-sm hover:shadow-xl transition-shadow duration-fast ease-out'>
                    <h3 className='text-h3 font-bold text-[#5BA491]'>{projectItem.name}</h3>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-body-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-body-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-body-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-body-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-body-sm text-gray-500'>
                      <span className='flex items-center text-gray-500'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 12a9 9 0 110 18 9 9 0 010-18zm9 9a9 9 0 100-18 9 9 0 000 18z" />
                        </svg>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center text-gray-500'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M3 12a9 9 0 110 18 9 9 0 010-18zm9 9a9 9 0 100-18 9 9 0 000 18z" />
                        </svg>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-normal ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition-colors duration-fast ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>查看活動</button>
                  </div>
                ))}
              </div>
            </Accordion>
            <Accordion
              index={1}
              title="已結束活動"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              <div className='flex flex-wrap items-center gap-3 mb-4 mt-2 pl-4'>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white border text-body-sm focus:border-[#5BA491] focus:outline-none"
                  title="班級篩選"
                >
                  <option value="all">所有班級</option>
                  {Array.from(new Set(member.map(m => m.class).filter(Boolean))).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  placeholder="搜尋名稱或描述..."
                  className="px-3 py-2 rounded-lg bg-white border text-body-sm flex-1 min-w-[220px] focus:border-[#5BA491] focus:outline-none"
                />
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-sm place-items-center'>
                {completedProjects
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .filter(p => {
                    if (classFilter === 'all') return true;
                    const classes = Array.from(new Set(
                      member.filter(m => m.projectId === p.id).map(m => m.class).filter(Boolean)
                    ));
                    return classes.includes(classFilter);
                  })
                  .filter(p => {
                    const q = completedSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (p.name || '').toLowerCase().includes(q) ||
                      (p.describe || '').toLowerCase().includes(q)
                    );
                  })
                  .map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow hover:shadow-lg  p-component-base flex flex-col space-y-stack-sm hover:shadow-xl transition-shadow duration-fast ease-out'>
                    <div className='flex items-center'>
                      <h3 className='text-h3 font-bold text-[#5BA491]'>{projectItem.name}</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-body-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-body-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-body-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-body-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-body-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-normal ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition-colors duration-fast ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>製作學習歷程</button>
                  </div>
                ))}
              </div>
            </Accordion>
            <Accordion
              index={2}
              title="已完成歷程"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              <div className='flex flex-wrap items-center gap-3 mb-4 mt-2 pl-4'>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white border text-body-sm focus:border-[#5BA491] focus:outline-none"
                  title="班級篩選"
                >
                  <option value="all">所有班級</option>
                  {Array.from(new Set(member.map(m => m.class).filter(Boolean))).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={doneSearch}
                  onChange={(e) => setDoneSearch(e.target.value)}
                  placeholder="搜尋名稱或描述..."
                  className="px-3 py-2 rounded-lg bg-white border text-body-sm flex-1 min-w-[220px] focus:border-[#5BA491] focus:outline-none"
                />
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-sm place-items-center'>
                {doneProjects
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .filter(p => {
                    if (classFilter === 'all') return true;
                    const classes = Array.from(new Set(
                      member.filter(m => m.projectId === p.id).map(m => m.class).filter(Boolean)
                    ));
                    return classes.includes(classFilter);
                  })
                  .filter(p => {
                    const q = doneSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (p.name || '').toLowerCase().includes(q) ||
                      (p.describe || '').toLowerCase().includes(q)
                    );
                  })
                  .map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow hover:shadow-lg  p-component-base flex flex-col space-y-stack-sm hover:shadow-xl transition-shadow duration-fast ease-out'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center'>
                        <h3 className='text-h3 font-bold text-[#5BA491]'>{projectItem.name}</h3>
                        <span className='ml-2 text-caption px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200'>已完成</span>
                      </div>
                      <button className='ml-2 bg-[#5BA491] text-white px-3 font-bold py-1 rounded hover:bg-[#5BA491]/80 transition-colors duration-fast ease-in-out'>
                        匯出
                      </button>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-body-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-body-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-body-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-body-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-body-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-normal ease-in-out' style={{ width: '100%' }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition-colors duration-fast ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>查看學習歷程</button>
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        </div>
        <Toaster />
      </div>
    )
  }
}

const Accordion = ({ index, title, children, activeIndex, setActiveIndex }) => {
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);
  const isActive = index === activeIndex;

  // 在組件渲染後和isActive變化時執行
  useEffect(() => {
    if (isActive && contentRef.current) {
      // 確保在DOM元素完全載入後設置高度
      const timer = setTimeout(() => {
        setHeight(contentRef.current.scrollHeight);
      }, 50);  // 延遲50毫秒以確保所有內容已經渲染
      return () => clearTimeout(timer);
    } else {
      setHeight(0);
    }
  }, [isActive, children]);  // 依賴children有變化時也重新計算高度

  const handleToggle = () => {
    setActiveIndex(isActive ? null : index);
    // 切換時立即更新高度
    if (!isActive && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  };

  return (
    <div className="">
      <button
        className="flex justify-between items-center w-full py-2 px-4 bg-gray-200 rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-gray-300 transition-colors duration-normal"
        onClick={handleToggle}
      >
        <span className="font-semibold">{title}</span>
        {isActive ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
      </button>
      <div
        ref={contentRef}
        style={{ height: isActive ? `${height}px` : "0px", overflow: 'hidden' }}
        className="transition-height bg-customgreen/5 duration-slow ease-in-out my-1  "
      >
        <div className="text-left px-2 py-2">
          {children}
        </div>
      </div>
    </div>
  );
};
