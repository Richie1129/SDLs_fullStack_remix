import React, { useState, useEffect } from 'react';
import { Activity, ChevronDown, Eye, LogOut, MessageSquare, PlusCircle, X } from 'lucide-react';
import { getProjectUser } from '../api/users';
import { getProject, getProjectsByMentor } from '../api/project';
import { logout } from '../api/auth';  // 引入 logout API
import { useQuery } from 'react-query';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Modal from './Modal';
import Swal from 'sweetalert2';
import { socket } from '../utils/socket';
import { useStageIndex, useSubStageIndex } from '../hooks/useStageIndex';
import Announcement from './Announcement'; // 引入新的 Announcement 元件
import useObservationMode from '../hooks/useObservationMode'; // 引入觀摩模式 hook
import { getCurrentUsername, addUserUpdateListener } from '../utils/userUtils'; // 引入用戶資訊工具
import { getCurrentUserRole, setStageInfo, clearStageInfo } from '../utils/authUtils';

export default function TopBar({ showActivityStream, setShowActivityStream, showProjectCommentDrawer, setShowProjectCommentDrawer }) {
  const [projectUsers, setProjectUsers] = useState([{ id: "", username: "" }]);
  const [projectInfo, setProjectInfo] = useState({});
  const [referralCodeModalOpen, setReferralCodeModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { projectId } = useParams();

  // 點擊外部關閉下拉選單和鍵盤支持
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.relative')) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && userDropdownOpen) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  // useUsername hook 已經處理用戶資料更新事件
  const navigate = useNavigate();
  const location = useLocation();
  
  // 檢查是否為overview頁面
  const isOverviewPage = location.pathname === '/student-overview' || location.pathname === '/teacher-overview';
  const [projectList, setProjectList] = useState([]);
  // 使用全域用戶工具並監聽更新事件
  const [userName, setUserName] = useState(getCurrentUsername());

  useEffect(() => {
    // 監聽用戶資料更新
    const cleanup = addUserUpdateListener((userInfo) => {
      setUserName(userInfo.username);
    });

    return cleanup;
  }, []);
  const personImg = [
    '/person/man1.png', '/person/man2.png', '/person/man3.png',
    '/person/man4.png', '/person/man5.png', '/person/man6.png',
    '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
  ];

  const role = getCurrentUserRole(); // 使用統一的認證工具
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();

  // 使用觀摩模式 hook
  const { isObservationMode, isLoading: isObservationLoading } = useObservationMode();

  const getProjectUserQuery = useQuery("getProjectUser", () => getProjectUser(projectId), {
    onSuccess: setProjectUsers,
    enabled: !!projectId,
  });

  // 監聽觀摩模式激活事件
  useEffect(() => {
    const handleObservationModeActivated = (event) => {
      const { detail } = event;
      if (detail && detail.message) {
        Swal.fire({
          title: '觀摩模式',
          text: detail.message,
          icon: 'info',
          confirmButtonColor: "#5BA491",
          confirmButtonText: "了解"
        });
      }
    };

    window.addEventListener('observationModeActivated', handleObservationModeActivated);

    return () => {
      window.removeEventListener('observationModeActivated', handleObservationModeActivated);
    };
  }, []);

  // useEffect(() => {
  //   async function fetchData() {
  //     try {
  //       let projectData = null;
  
  //       // 獲取單個專案資訊
  //       if (projectId) {
  //         projectData = await getProject(projectId);
  //         setProjectInfo(projectData);
  //       }
  
  //       // 獲取指導老師的所有專案
  //       const mentorProjects = await getProjectsByMentor(userName);
  
  //       // 合併專案列表並過濾重複專案
  //       const allProjects = projectData ? [projectData, ...mentorProjects] : mentorProjects;
  //       const uniqueProjects = Array.from(
  //         new Map(allProjects.map((project) => [project.id, project])).values()
  //       );
  //       setProjectList(uniqueProjects);
  //     } catch (error) {
  //       console.error("Error fetching projects:", error);
  //     }
  //   }
  
  //   fetchData();
  // }, [projectId, userName]);
  
    useEffect(() => {
    async function fetchData() {
        try {
            let projectData = null;
            if (!projectId) { return null }

            console.log("正在以 projectId 獲取資料:", projectId);

            // 獲取單個專案資訊
            if (projectId) {
                projectData = await getProject(projectId);
                console.log("已獲取單一專案資料:", projectData);

                // 確認 mentor 資訊
                if (projectData.mentor) {
                    console.log("此專案的指導老師是:", projectData.mentor);
                } else {
                    console.warn("此專案未提供指導老師資訊");
                }

                setProjectInfo(projectData); // 保存當前專案資訊
                setStageInfo(projectData.currentStage, projectData.currentSubStage);
                setCurrentStageIndex(projectData.currentStage);
                setCurrentSubStageIndex(projectData.currentSubStage);
            }

            // 獲取特定指導老師的所有專案
            const mentorName = projectData ? projectData.mentor : "未知指導老師";
            console.log("正在以指導老師名稱獲取專案:", mentorName);

            const mentorProjects = await getProjectsByMentor(mentorName);
            console.log("已獲取指導老師的專案:", mentorProjects);

            // 合併專案列表
            const allProjects = projectData ? [projectData, ...mentorProjects] : mentorProjects;
            console.log("合併所有專案列表:", allProjects);

            // 過濾唯一專案
            const uniqueProjects = Array.from(
                new Map(allProjects.map((project) => [project.id, project])).values()
            );
            console.log("過濾後的唯一專案列表:", uniqueProjects);

            setProjectList(uniqueProjects);
        } catch (error) {
            console.error("獲取專案時發生錯誤:", error);
        }
    }

    fetchData();
}, [projectId]); // 添加依賴，只需要 projectId

// useEffect(() => {
//   async function fetchData() {
//       try {
//           let projectData = null;
//           console.log("當前登入的使用者名稱:", userName);

//           // 確保有有效的 userName
//           if (!userName || userName === "未知指導老師") {
//               console.warn("未提供有效的指導老師名稱，跳過 API 請求");
//               return;
//           }

//           console.log("正在以 projectId 獲取資料:", projectId);

//           // 獲取單個專案資訊
//           if (projectId) {
//               projectData = await getProject(projectId);
//               console.log("已獲取單一專案資料:", projectData);

//               if (projectData) {
//                   // 保存專案資訊與進度
//                   setProjectInfo(projectData);
//                   localStorage.setItem("currentStage", projectData.currentStage);
//                   localStorage.setItem("currentSubStage", projectData.currentSubStage);
//                   setCurrentStageIndex(projectData.currentStage);
//                   setCurrentSubStageIndex(projectData.currentSubStage);
//               }
//           }

//           // 獲取特定指導老師的所有專案
//           const mentorName = projectData ? projectData.mentor : userName;
//           console.log("正在以指導老師名稱獲取專案:", mentorName);

//           const mentorProjects = await getProjectsByMentor(mentorName);
//           console.log("已獲取指導老師的專案:", mentorProjects);

//           // 合併專案列表
//           const allProjects = projectData ? [projectData, ...mentorProjects] : mentorProjects;
//           console.log("合併所有專案列表:", allProjects);

//           // 過濾唯一專案
//           const uniqueProjects = Array.from(
//               new Map(allProjects.map((project) => [project.id, project])).values()
//           );
//           console.log("過濾後的唯一專案列表:", uniqueProjects);

//           setProjectList(uniqueProjects);
//       } catch (error) {
//           console.error("獲取專案時發生錯誤:", error);
//       }
//   }

//   fetchData();
// }, [projectId, userName]); // 添加依賴 projectId 和 userName
  
  const cleanStage = () => {
    clearStageInfo();
  };

  const handleLogout = () => {
    Swal.fire({
      title: "登出",
      text: "確定要登出嗎?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5BA491",
      cancelButtonColor: "#d33",
      confirmButtonText: "確定",
      cancelButtonText: "取消",
    }).then(async (result) => {
      if (result.isConfirmed) {
        socket.disconnect();
        await logout();  // 使用新的 logout API
      }
    });
  };

  const Tooltip = ({ children, content }) => {
    return (
      <div className='relative group'>
        {children}
        <div className='absolute  hidden group-hover:block'>
          <div className='bg-gray-700 text-white text-caption rounded-lg py-1 px-2 whitespace-nowrap'>
            {content}
          </div>
        </div>
      </div>
    );
  };

  if (location.pathname === "/homepage") {
    return (
      <div className="z-40 h-16 w-full bg-[#FFFFFF] flex items-center justify-between pr-5 border-b-2 flex-shrink-0">
        <Link to="/homepage" className="flex px-5 items-center font-bold font-Mulish text-h2">
          <img src="/SDLS_LOGO_GEMINI.png" alt="Logo" className="h-14 w-auto" />
        </Link>
        <div className="flex items-center flex-shrink-0 gap-1">
          {/* 跨班觀摩按鈕 - 只有教師可見 */}
          {role === "teacher" && (
            <button
              onClick={() => navigate("/observation")}
              className="flex items-center space-x-1 mr-3 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-md px-2 py-1 sm:px-3 sm:py-2 text-body-sm font-semibold transition-colors duration-fast whitespace-nowrap"
              title="跨班專案觀摩"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden xs:inline">觀摩</span>
            </button>
          )}
          
          <div className="relative">
            <div
              className="font-bold cursor-pointer p-1 mr-1 rounded-lg mx-1 sm:mx-3 hover:bg-gray-100 transition-colors duration-fast flex items-center gap-1 whitespace-nowrap max-w-[6rem] sm:max-w-none truncate"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              title="用戶選單"
            >
              {userName}
              <ChevronDown className={`h-3 w-3 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <button
                  className="block w-full text-left px-4 py-2 text-body-sm text-gray-700 hover:bg-gray-100 transition-colors duration-fast"
                  onClick={() => {
                    navigate('/profile');
                    setUserDropdownOpen(false);
                  }}
                >
                  個人資料
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-body-sm text-gray-700 hover:bg-gray-100 transition-colors duration-fast"
                  onClick={() => {
                    navigate(role === "teacher" ? "/teacher-overview" : "/student-overview");
                    setUserDropdownOpen(false);
                  }}
                >
                  {role === "teacher" ? "教師總覽儀表板" : "個人學習儀表板"}
                </button>
              </div>
            )}
          </div>
          {/* 移除 dashboard icon 按鈕 */}
          <Announcement projectId={projectId || 'all'} role={role} projectList={projectList} />
          <button onClick={handleLogout} className="ml-1 sm:ml-3 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-md px-2 py-1 sm:p-component-xs font-semibold whitespace-nowrap">
            登出
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="z-40 h-16 w-full bg-[#FFFFFF] flex items-center justify-between px-3 sm:px-5 border-b-2 flex-shrink-0">
      <div className="flex items-center min-w-0 flex-1">
        <Link to="/homepage" className="flex px-2 sm:px-5 items-center font-bold font-Mulish text-body-lg sm:text-h2">
          <img src="/SDLS_LOGO_GEMINI.png" alt="Logo" className="h-10 sm:h-14 w-auto" />
        </Link>
        {!isOverviewPage && (
        <p className="font-bold text-body-sm sm:text-h3 text-teal-900 truncate">{projectInfo.name || "專案名稱"}</p>
        )}
        {/* 觀摩模式指示器 */}
        {isObservationMode && !isOverviewPage && (
          <div className="flex items-center ml-3 px-2 py-1 bg-yellow-100 border border-yellow-400 rounded-md">
            <Eye className="text-yellow-600 mr-1 h-4 w-4" />
            <span className="text-yellow-700 text-body-sm font-semibold">觀摩模式</span>
          </div>
        )}
      </div>
      {/* 右側功能 */}
      <div className="flex items-center flex-shrink-0">
        {!isOverviewPage && (
        <ul className="hidden sm:flex items-center justify-center space-x-1">
          {getProjectUserQuery.isLoading || projectId === undefined ? <></> :
            getProjectUserQuery.isError ? <p className='font-bold text-h2'>Error</p> :
              projectUsers.map((projectUser, index) => {
                const imgIndex = parseInt(projectUser.id) % 9;
                const userImg = personImg[imgIndex];
                return (
                  <li key={index} className="relative w-8 h-8 rounded-full shadow-xl" title={projectUser.username}>
                    <img src={userImg} alt="Person" className="w-full h-full object-cover" />
                  </li>
                )
              })
          }
          <li>
            <button className="p-1 rounded-md text-gray-500 hover:text-gray-900">
              <PlusCircle className="h-8 w-8" onClick={() => setReferralCodeModalOpen(true)} />
            </button>
          </li>
        </ul>
        )}
        
        <div className="flex items-center">
        <h3
          className="font-bold cursor-pointer p-1 mr-1 sm:mr-2 rounded-lg mx-1 sm:mx-3 text-body-sm sm:text-body hidden sm:block hover:bg-gray-100 transition-colors duration-fast"
          onClick={() => navigate(role === "teacher" ? "/teacher-overview" : "/student-overview")}
          title={role === "teacher" ? "教師總覽儀表板" : "個人學習儀表板"}
        >
          {userName}
        </h3>
        {/* 將 dashboard icon 按鈕移除 */}
        {/* 專案評論按鈕 - 插在使用者名稱/頭像與活動圖示之間 */}
        {!isOverviewPage && projectId && setShowProjectCommentDrawer && (
          <button
            onClick={() => setShowProjectCommentDrawer(!showProjectCommentDrawer)}
            className={
              `flex items-center justify-center mr-2 p-1 rounded-md transition-colors duration-fast ${showProjectCommentDrawer 
                ? 'bg-customgreen text-white' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
            }
            title="專案評論"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        )}
        {/* 專案活動按鈕 - 只在專案頁面顯示 */}
        {!isOverviewPage && projectId && setShowActivityStream && (
          <button
            onClick={() => setShowActivityStream(!showActivityStream)}
            className={
              `flex items-center justify-center mr-2 p-1 rounded-md transition-colors duration-fast ${showActivityStream 
                ? 'bg-customgreen text-white' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
            }
            title="專案活動"
          >
            <Activity className="h-5 w-5" />
          </button>
        )}
        </div>
        <Announcement projectId={projectId} role={role} projectList={projectList} />
        <button
          className="ml-1 sm:ml-3 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-md p-1.5 sm:p-component-xs font-semibold text-caption sm:text-body-sm flex items-center gap-1"
          onClick={async () => {
            socket.disconnect();
            await logout();
          }}
          title="登出"
        >
          <LogOut className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">登出</span>
        </button>
      </div>
      <Modal open={referralCodeModalOpen} onClose={() => setReferralCodeModalOpen(false)} opacity={true} position={"justify-center items-center"}>
        <button onClick={() => setReferralCodeModalOpen(false)} className=' absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
          <X className=' w-6 h-6' />
        </button>
        <div className='flex flex-col p-component-sm'>
          <h3 className=' font-bold text-body mb-3'>專案邀請碼:</h3>
          <h3 className=' text-center font-bold text-body-lg py-1 bg-slate-200/70 rounded-md'>
            {projectInfo.referral_code}
          </h3>
        </div>
      </Modal>
    </div>
  );
}
