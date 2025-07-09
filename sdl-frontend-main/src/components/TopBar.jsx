import React, { useState, useEffect, useContext } from 'react';
import { IoIosNotificationsOutline } from "react-icons/io";
import { BsChevronDown, BsPlusCircleDotted } from "react-icons/bs";
import { TbBell } from "react-icons/tb"; // 引入鈴鐺圖示
import { AiOutlineDashboard } from "react-icons/ai"; // 引入專案總覽圖示(原)
import { LuLayoutDashboard } from "react-icons/lu";
import { RiDashboardLine } from "react-icons/ri"; // 添加儀表板圖示
import { getProjectUser } from '../api/users';
import { getProject, getProjectsByMentor } from '../api/project';
import { getAnnouncements, createAnnouncement } from '../api/announcement';
import { useQuery } from 'react-query';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { GrFormClose } from "react-icons/gr";
import Modal from './Modal';
import Swal from 'sweetalert2';
import { socket } from '../utils/socket';
import { Context } from '../context/context';

export default function TopBar() {
  const [projectUsers, setProjectUsers] = useState([{ id: "", username: "" }]);
  const [projectInfo, setProjectInfo] = useState({});
  const [referralCodeModalOpen, setReferralCodeModalOpen] = useState(false);
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 檢查是否為overview頁面
  const isOverviewPage = location.pathname === '/student-overview' || location.pathname === '/teacher-overview';
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null); // 用於存儲當前選中的公告
  const [projectList, setProjectList] = useState([]);
  const userName = localStorage.getItem('username');
  const personImg = [
    '/person/man1.png', '/person/man2.png', '/person/man3.png',
    '/person/man4.png', '/person/man5.png', '/person/man6.png',
    '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
  ];

  const handleAnnouncementClick = (announcement) => {
      setSelectedAnnouncement(announcement); // 設置當前公告
  };

  // 關閉公告詳情模態框
  const handleCloseAnnouncementModal = () => {
      setSelectedAnnouncement(null);
  };

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotificationModalOpen, setNewNotificationModalOpen] = useState(false); // 控制新增公告的 Modal

  const role = localStorage.getItem("role") || "guest"; // 預設值為 "guest"，避免空值
  const { currentStageIndex, setCurrentStageIndex, currentSubStageIndex, setCurrentSubStageIndex } = useContext(Context);

  const getProjectUserQuery = useQuery("getProjectUser", () => getProjectUser(projectId), {
    onSuccess: setProjectUsers,
    enabled: !!projectId,
  });

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
                localStorage.setItem("currentStage", projectData.currentStage);
                localStorage.setItem("currentSubStage", projectData.currentSubStage);
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
    localStorage.removeItem('currentStage');
    localStorage.removeItem('currentSubStage');
    localStorage.removeItem('stageEnd');
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
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        socket.disconnect();
        navigate("/");
      }
    });
  };

  const handleNotificationClick = (id) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === id ? { ...notification, isRead: true } : notification
    );
    setNotifications(updatedNotifications);
  };

  const handleAddNotification = () => {
    setNewNotificationModalOpen(true);
  };

  // 發佈公告
const handleSaveNotification = async (newTitle, newDescription) => {
    if (!selectedGroup) {
        Swal.fire({
            title: '錯誤',
            text: '請選擇一個組別後再發佈公告',
            icon: 'warning',
        });
        return;
    }

    const payload = {
        title: newTitle,
        content: newDescription,
        author: localStorage.getItem('username') || 'Unknown Author',
        projectId: selectedGroup === 'all' ? null : selectedGroup, // 明確處理 "all" 與特定組別的對應
    };

    try {
        console.log('即將發送的公告數據:', payload);
        const newAnnouncement = await createAnnouncement(payload);
        setNotifications((prev) => [...prev, newAnnouncement]);
        setNewNotificationModalOpen(false);
        Swal.fire({
            title: '成功',
            text: '公告已成功發佈',
            icon: 'success',
        });
    } catch (error) {
        console.error('公告發佈失敗:', error);
        Swal.fire({
            title: '公告發佈失敗',
            text: error.response?.data?.message || error.message || '請稍後再試',
            icon: 'error',
        });
    }
};

useEffect(() => {
  if (projectId) {
      console.log(`加入房間: ${projectId}`);
      socket.emit('join_project', projectId); // 加入專案房間

      socket.on('receiveAnnouncement', (data) => {
          console.log("收到公告:", data);
          setNotifications((prev) => [...prev, data]);
      });

      return () => {
          console.log(`離開房間: ${projectId}`);
          socket.off('receiveAnnouncement'); // 清除事件監聽
      };
  }
}, [projectId]);

// 載入公告列表
useEffect(() => {
  async function fetchAnnouncements() {
      try {
          console.log("正在載入公告列表...");
          const announcements = await getAnnouncements();
          console.log("公告列表載入成功:", announcements);
          setNotifications(announcements); // 更新公告狀態
      } catch (error) {
          console.error("公告載入失敗:", error);
      }
  }

  fetchAnnouncements();
}, []); // 移除 projectId 的依賴

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

  if (location.pathname === "/homepage") {
    return (
      <div className="fixed z-40 h-16 w-full bg-[#FFFFFF] flex items-center justify-between pr-5 border-b-2">
        <Link to="/homepage" className="flex px-5 items-center font-bold font-Mulish text-2xl">
          <img src="/SDLS_LOGOO.jpg" alt="Logo" className="h-14 w-auto" />
        </Link>
        <div className="flex items-center">
          <h3 className="font-bold p-1 mr-2 rounded-lg mx-3">
            {localStorage.getItem("username")}
          </h3>
          <div className="relative flex items-center">
          <button
            className="flex items-center justify-center mr-2 p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => navigate(role === "teacher" ? "/teacher-overview" : "/student-overview")}
            title={role === "teacher" ? "教師總覽儀表板" : "個人學習儀表板"}
          >
            <RiDashboardLine size={20} />
          </button>
          </div>
          <div className="relative">
            <TbBell size={24} className="ml-2 cursor-pointer" onClick={() => setShowNotifications(!showNotifications)} />
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">通知</h3>
                  <div className="max-h-60 overflow-y-auto">
                  {notifications.length > 0 ? (
                      notifications.map((notification, index) => (
                          <div 
                              key={`${notification.id}-${index}`} // 為重複的 id 添加索引作為補充
                              className="flex items-center mb-2 p-2 border-b cursor-pointer"
                              onClick={() => setSelectedAnnouncement(notification)} // 點擊後設置選中的公告
                          >
                              <h4 className="text-sm font-bold">{notification.title}</h4>
                              <p className="text-xs text-gray-500 truncate">{notification.content || "沒有內容"}</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500">目前沒有任何公告。</p>
                  )}
                  </div>
                  {/* 老師角色顯示新增公告按鈕 */}
                  {role === "teacher" && (
                    <button
                      className="w-full mt-2 py-2 bg-[#5BA491] text-white text-sm font-semibold rounded-lg hover:bg-[#5BA491]"
                      onClick={() => {
                        console.log('新增公告按鈕被觸發');
                        handleAddNotification();
                      }}
                    >
                      + 新公告
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="ml-3 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-md p-2 font-semibold">
            登出
          </button>
        </div>
        {/* 新增公告 Modal */}
        <Modal open={newNotificationModalOpen} onClose={() => setNewNotificationModalOpen(false)}>
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg w-full max-w-sm sm:max-w-md mx-auto">
            <h3 className="text-lg sm:text-2xl font-semibold mb-4 sm:mb-6 text-center">新增公告</h3>
            <form>
              <div className="mb-3 sm:mb-4">
                <label htmlFor="groupSelect" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  選擇組別
                </label>
                <select
                  id="groupSelect"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">全部組別</option>
                  {projectList.map((project, index) => (
                    <option key={`${project.id}-${index}`} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3 sm:mb-4">
                <label htmlFor="newTitle" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  標題
                </label>
                <input
                  type="text"
                  id="newTitle"
                  placeholder="請輸入公告標題"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="mb-3 sm:mb-4">
                <label htmlFor="newDescription" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  內容
                </label>
                <textarea
                  id="newDescription"
                  placeholder="請輸入公告內容"
                  rows="3"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm resize-none"
                ></textarea>
              </div>
              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 text-sm"
                  onClick={() => setNewNotificationModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="px-3 sm:px-4 py-2 bg-[#5BA491] text-white rounded-lg hover:bg-[#5BA491] text-sm"
                  onClick={() => {
                    const newTitle = document.getElementById("newTitle").value;
                    const newDescription = document.getElementById("newDescription").value;
                    handleSaveNotification(newTitle, newDescription);
                  }}
                >
                  發佈
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="fixed z-40 h-16 w-full bg-[#FFFFFF] flex items-center justify-between px-3 sm:px-5 border-b-2">
      <div className="flex items-center min-w-0 flex-1">
        <Link to="/homepage" className="flex px-2 sm:px-5 items-center font-bold font-Mulish text-lg sm:text-2xl">
          <img src="/SDLS_LOGOO.jpg" alt="Logo" className="h-10 sm:h-14 w-auto" />
        </Link>
        {!isOverviewPage && (
        <p className="font-bold text-sm sm:text-xl text-teal-900 truncate">{projectInfo.name || "專案名稱"}</p>
        )}
      </div>
      {/* 右側功能 */}
      <div className="flex items-center flex-shrink-0">
        {!isOverviewPage && (
        <ul className="flex items-center justify-center space-x-1">
          {getProjectUserQuery.isLoading || projectId === undefined ? <></> :
            getProjectUserQuery.isError ? <p className='font-bold text-2xl'>Error</p> :
              projectUsers.map((projectUser, index) => {
                const imgIndex = parseInt(projectUser.id) % 9;
                const userImg = personImg[imgIndex];
                return (
                  <Tooltip key={index} children={""} content={`${projectUser.username}`}>
                    <li  className="relative w-8 h-8 rounded-full shadow-xl">
                    <img src={userImg} alt="Person" className="w-full h-full object-cover" />
                  </li>
                  </Tooltip>
                )
              })
          }
          <li>
            <button className="p-1 rounded-md text-gray-500 hover:text-gray-900 ">
              <BsPlusCircleDotted size={32} onClick={() => setReferralCodeModalOpen(true)} />
            </button>
          </li>
        </ul>
        )}
        
        <div className="flex items-center">
        <h3 className="font-bold cursor-pointer p-1 mr-1 sm:mr-2 rounded-lg mx-1 sm:mx-3 text-sm sm:text-base hidden sm:block">
          {localStorage.getItem("username")}
        </h3>
          {/* 全局儀表板按鈕 */}
          <button
            className="flex items-center justify-center mr-2 p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => navigate(role === "teacher" ? "/teacher-overview" : "/student-overview")}
            title={role === "teacher" ? "教師總覽儀表板" : "個人學習儀表板"}
          >
            <RiDashboardLine size={20} />
          </button>
        </div>
        <TbBell
          size={24}
          className="ml-2 cursor-pointer"
          onClick={() => setShowNotifications(!showNotifications)}
        />
        {showNotifications && (
          <div
            className="absolute right-2 sm:right-4 top-12 w-72 sm:w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50"
            style={{
              maxWidth: "calc(100vw - 2rem)",
            }}
          >
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">通知</h3>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <div
                      key={`${notification.id}-${index}`}
                      className="flex items-center mb-2 p-2 border-b cursor-pointer"
                      onClick={() => setSelectedAnnouncement(notification)}
                    >
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      )}
                    <div className="flex-1">
                      <h4 className="text-sm font-bold">{notification.title}</h4>
                      <p className="text-xs text-gray-500 truncate">{notification.content || "沒有內容"}</p>
                    </div>
                  </div>
                  ))
                ) : (
                  <p className="text-gray-500">目前沒有任何公告。</p>
                )}
              </div>
              {role === "teacher" && (
                <button
                  className="w-full mt-2 py-2 bg-[#5BA491] text-white text-sm font-semibold rounded-lg hover:bg-[#5BA491]"
                  onClick={() => {
                    console.log('新增公告按鈕被觸發');
                    handleAddNotification();
                  }}
                >
                  + 新公告
                </button>
              )}
            </div>
          </div>
        )}
        <button
          className="ml-1 sm:ml-3 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-md p-1 sm:p-2 font-semibold text-xs sm:text-sm"
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          <span className="hidden sm:inline">登出</span>
          <span className="sm:hidden">出</span>
        </button>
      </div>
      <Modal open={referralCodeModalOpen} onClose={() => setReferralCodeModalOpen(false)} opacity={true} position={"justify-center items-center"}>
        <button onClick={() => setReferralCodeModalOpen(false)} className=' absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
          <GrFormClose className=' w-6 h-6' />
        </button>
        <div className='flex flex-col p-3'>
          <h3 className=' font-bold text-base mb-3'>專案邀請碼:</h3>
          <h3 className=' text-center font-bold text-lg py-1 bg-slate-200/70 rounded-md'>
            {projectInfo.referral_code}
          </h3>
        </div>
      </Modal>

      {/* 新增公告 Modal */}
      <Modal open={newNotificationModalOpen} onClose={() => setNewNotificationModalOpen(false)}>
        <div className="p-6 bg-white rounded-lg shadow-lg w-full max-w-md mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-center">新增公告</h3>
          <form>
            <div className="mb-4">
              <label htmlFor="groupSelect" className="block text-sm font-medium text-gray-700 mb-1">
                選擇組別
              </label>
              <select
                id="groupSelect"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="all">全部組別</option>
                {projectList.map((project, index) => (
                  <option key={`${project.id}-${index}`} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="newTitle" className="block text-sm font-medium text-gray-700 mb-1">
                標題
              </label>
              <input
                type="text"
                id="newTitle"
                placeholder="請輸入公告標題"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700 mb-1">
                內容
              </label>
              <textarea
                id="newDescription"
                placeholder="請輸入公告內容"
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-lg"
              ></textarea>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                onClick={() => setNewNotificationModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-[#5BA491] text-white rounded-lg hover:bg-[#5BA491]"
                onClick={() => {
                  const newTitle = document.getElementById("newTitle").value;
                  const newDescription = document.getElementById("newDescription").value;
                  handleSaveNotification(newTitle, newDescription);
                }}
              >
                發佈
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 公告詳情 Modal */}
      {selectedAnnouncement && (
        <Modal open={true} onClose={() => setSelectedAnnouncement(null)}>
          <div className="p-6 bg-white rounded-lg shadow-lg w-full max-w-md mx-auto">
            <h3 className="text-2xl font-semibold mb-4">{selectedAnnouncement.title}</h3>
            <p className="text-gray-700 mb-4">{selectedAnnouncement.content}</p>
            <div className="text-right">
              <button
                className="px-4 py-2 bg-[#5BA491] text-white rounded-lg hover:bg-[#5BA491]"
                onClick={() => setSelectedAnnouncement(null)}
              >
                關閉
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}