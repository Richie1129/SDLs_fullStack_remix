import React, { useState, useEffect, useRef } from 'react'
import TopBar from '../../components/TopBar';
import SideBar from '../../components/SideBar';
import Modal from '../../components/Modal';
import OnboardingTour from '../../components/OnboardingTour';
import ContextualHelp from '../../components/ContextualHelp';
import toast, { Toaster } from 'react-hot-toast';
import { GrFormClose } from "react-icons/gr";
import { FaSortDown } from "react-icons/fa";
import { BsBoxArrowInRight } from "react-icons/bs";
import Loader from '../../components/Loader';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createProject, getAllProject, inviteForProject, getProjectsByMentor, updateProject, deleteProject } from '../../api/project';
import { getAllTeachers, getProjectUser } from '../../api/users';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { GrFormAdd } from "react-icons/gr";
import { MdAddchart } from "react-icons/md";
import dateFormat from 'dateformat';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';  // 引入Font Awesome圖標

export default function HomePage() {
  const [projectData, setProjectData] = useState([]);
  const [createprojectData, setCreateProjectData] = useState({ projectMentor: "" });
  const [inviteprojectData, setInviteProjectData] = useState({});
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [inviteProjectModalOpen, setInviteProjectModalOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [doneProjects, setDoneProjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);  // 用於記錄當前打開的Accordion索引
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem('username');
  const [member, setMembers] = useState([]);
  const {
    isLoading,
    isError,
    error,
    data
  } = useQuery("projectDatas", () => getAllProject(
    { params: { userId: localStorage.getItem("id") } }),
    { onSuccess: setProjectData }
  );
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const handleEditProject = (project) => {
  setSelectedProjectId(project.id);
  setProjectName(project.name);
  setProjectDescription(project.describe);
  setCreateProjectModalOpen(false); // 確保不會開啟錯誤的 Modal
  setEditProjectModalOpen(true);
};

const handleUpdateProject = (projectId) => {
  const updatedProjectData = {
    projectName,
    projectdescribe: projectDescription,
    projectMentor: createprojectData.projectMentor,  // ✅ 修正為正確的變數,
  };

  updateMutate({ projectId, projectData: updatedProjectData });
};

const { mutate: updateMutate } = useMutation(
  ({ projectId, projectData }) => updateProject(projectId, projectData), 
  {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries("projectDatas"); // 重新獲取專案數據
      setEditProjectModalOpen(false); // 關閉 Modal

      Swal.fire({
        icon: "success",
        title: "成功",
        text: res.message,
        customClass: {
          backdrop: "bg-red-500",
          popup: "bg-[#F7F6F6]",
        },
      });
    },
    onError: (error) => {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "失敗",
        text: error.response?.data?.message || "更新失敗，請重試！",
        customClass: {
          backdrop: "bg-red-500",
          popup: "bg-[#F7F6F6]",
        },
      });
    },
  }
);

  // const {mutate} = useMutation( createProject, {
  //   onSuccess : ( res ) =>{
  //     console.log(res);
  //     queryClient.invalidateQueries("projectDatas")
  //     sucesssReferralCodeNotify(res.message)
  //   },
  //   onError : (error) =>{
  //     console.log(error);
  //     errorReferralCodeNotify(error.response.data.message)
  //   }
  // })

  useEffect(() => {
    getAllTeachers().then(data => {
      console.log(data)
      setTeachers(data.user); // 根據你的API響應調整
    }).catch(error => {
      console.log('Error fetching teachers:', error);
    });
  }, []);

  // 檢查是否是第一次使用
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`hasSeenTour_${role}_${userName}`);
    
    if (!hasSeenTour) {
      setShowOnboarding(true);
    }
  }, [role, userName]);

  const handleTourComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem(`hasSeenTour_${role}_${userName}`, 'true');
  };

  // useEffect(() => {
  //     async function fetchMembers() {
  //         try {
  //             const mentorName = localStorage.getItem("username");
  //             console.log("當前老師名稱:", mentorName);
  
  //             if (!mentorName) {
  //                 console.error("未找到老師名稱，無法獲取專案用戶資訊");
  //                 return;
  //             }
  
  //             const mentorProjects = await getProjectsByMentor(mentorName);
  //             console.log("老師指導的專案:", mentorProjects);
  
  //             if (!mentorProjects || mentorProjects.length === 0) {
  //                 console.warn("該老師沒有指導任何專案");
  //                 return;
  //             }
  
  //             const projectIds = mentorProjects.map(project => project.id);
  //             console.log("老師的專案 ID 列表:", projectIds);
  
  //             const projectUsersPromises = projectIds.map(async (projectId) => {
  //                 try {
  //                     console.log(`正在獲取專案 ID ${projectId} 的用戶`);
  //                     const users = await getProjectUser(projectId);
  //                     console.log(`專案 ID ${projectId} 的用戶:`, users);
  //                     return users.map(user => ({ ...user, projectId }));  // 這裡加入 projectId
  //                 } catch (err) {
  //                     console.error(`獲取專案 ID ${projectId} 的用戶失敗`, err);
  //                     return [];
  //                 }
  //             });
  
  //             const projectUsers = await Promise.all(projectUsersPromises);
  //             const flatUsers = projectUsers.flat();
  
  //             console.log("所有專案的用戶資訊 (展開後):", flatUsers);
  
  //             // 這行很重要，確保 React 重新渲染
  //             setMembers(projectUsers.flat());  // 確保資料更新
  
  //         } catch (error) {
  //             console.error("獲取老師所指導專案的用戶資訊失敗:", error);
  //         }
  //     }
  
  //     fetchMembers();
  // }, []);

  useEffect(() => {
    async function fetchTeacherMembers() {
        try {
            const mentorName = localStorage.getItem("username");
            if (!mentorName) {
                console.error("未找到老師名稱，無法獲取專案用戶資訊");
                return;
            }

            const mentorProjects = await getProjectsByMentor(mentorName);
            if (!mentorProjects || mentorProjects.length === 0) {
                console.warn("該老師沒有指導任何專案");
                return;
            }

            const projectIds = mentorProjects.map(project => project.id);

            const projectUsersPromises = projectIds.map(async (projectId) => {
                try {
                    const users = await getProjectUser(projectId);
                    return users.map(user => ({ ...user, projectId }));
                } catch (err) {
                    console.error(`獲取專案 ID ${projectId} 的用戶失敗`, err);
                    return [];
                }
            });

            const projectUsers = await Promise.all(projectUsersPromises);
            setMembers(projectUsers.flat());  // 更新成員
            console.log("老師的所有專案成員:", projectUsers.flat());
        } catch (error) {
            console.error("獲取老師所指導專案的用戶資訊失敗:", error);
        }
    }

    if (role === "teacher") {
        fetchTeacherMembers();
    }
}, [role]);

useEffect(() => {
  async function fetchStudentMembers() {
      try {
          const userId = localStorage.getItem("id");
          if (!userId) {
              console.error("未找到學生 ID，無法獲取專案用戶資訊");
              return;
          }

          const studentProjects = await getAllProject({ params: { userId } });
          if (!studentProjects || studentProjects.length === 0) {
              console.warn("該學生沒有參與任何專案");
              return;
          }

          const projectIds = studentProjects.map(project => project.id);

          const projectUsersPromises = projectIds.map(async (projectId) => {
              try {
                  const users = await getProjectUser(projectId);
                  return users.map(user => ({ ...user, projectId }));
              } catch (err) {
                  console.error(`獲取專案 ID ${projectId} 的用戶失敗`, err);
                  return [];
              }
          });

          const projectUsers = await Promise.all(projectUsersPromises);
          setMembers(projectUsers.flat());  // 更新成員
          console.log("學生的所有專案成員:", projectUsers.flat());
      } catch (error) {
          console.error("獲取學生所屬專案的用戶資訊失敗:", error);
      }
  }

  if (role === "student") {
      fetchStudentMembers();
  }
}, [role]);

  const { mutate } = useMutation(createProject, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries("projectDatas")
      setCreateProjectModalOpen(false);
      // sucesssReferralCodeNotify(res.message)
      Swal.fire({
        icon: 'success',
        title: '成功',
        text: res.message,
        customClass: {
          backdrop: 'bg-red-500', // 背景颜色
          popup: 'bg-[#F7F6F6]', // 弹出框背景颜色
        },
      });
    },
    onError: (error) => {
      console.log(error);
      // errorReferralCodeNotify(error.response.data.message)
      Swal.fire({
        icon: 'error',
        title: '失敗',
        text: error.response.data.message,
        customClass: {
          backdrop: 'bg-red-500', // 背景颜色
          popup: 'bg-[#F7F6F6]', // 弹出框背景颜色
        },
      });
    }
  })

  // const {mutate: referral_CodeMutate } = useMutation( inviteForProject, {
  //   onSuccess : ( res ) =>{
  //     console.log(res);
  //     queryClient.invalidateQueries("projectDatas")
  //     sucesssReferralCodeNotify(res.message)
  //   },
  //   onError : (error) =>{
  //     console.log(error);
  //     errorReferralCodeNotify(error.response.data.message)
  //   }
  // })
  const { mutate: referral_CodeMutate } = useMutation(inviteForProject, {
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries('projectDatas');
      // 使用SweetAlert2显示成功消息
      Swal.fire({
        icon: 'success',
        title: '成功',
        text: res.message,
        customClass: {
          backdrop: 'bg-red-500', // 背景颜色
          popup: 'bg-[#F7F6F6]', // 弹出框背景颜色
        },
      });
    },
    onError: (error) => {
      console.log(error);
      // 使用SweetAlert2显示错误消息
      Swal.fire({
        icon: 'error',
        title: '失敗',
        text: error.response.data.message,
        customClass: {
          backdrop: 'bg-red-500', // 背景颜色
          popup: 'bg-[#F7F6F6]', // 弹出框背景颜色
        },
      });
    },
  });
  const handleChange = e => {
    const { name, value } = e.target;
    console.log(name, value)

    if (name === 'projectName') {
      setProjectName(value);
    } else if (name === 'projectdescribe') {
      setProjectDescription(value);
    }

    setCreateProjectData(prev => ({
      ...prev,
      [name]: value,
      userId: localStorage.getItem("id")
    }));
  }

  const handleCreateProject = () => {
    mutate(createprojectData);
    // if (createprojectData.projectMentor === "") {
    //   toast.error("請選擇指導老師");
    //   return;
    // }
    setProjectName("");
    setProjectDescription("");
  }

  const handleChangeReferral_Code = e => {
    const { name, value } = e.target;
    setInviteProjectData({
      [name]: value,
      userId: localStorage.getItem("id")
    })
  }

  const handleSubmitReferral_Code = () => {
    referral_CodeMutate(inviteprojectData);
  }

  const errorReferralCodeNotify = (toastContent) => toast.error(toastContent);
  const sucesssReferralCodeNotify = (toastContent) => toast.success(toastContent);

  const { mutate: deleteMutate } = useMutation(deleteProject, {
    onSuccess: (res) => {
        queryClient.invalidateQueries("projectDatas");
        Swal.fire({
            icon: "success",
            title: "成功",
            text: res.message,
        });
    },
    onError: (error) => {
        Swal.fire({
            icon: "error",
            title: "失敗",
            text: error.response?.data?.message || "刪除失敗！",
        });
    },
});

const handleDeleteProject = (projectId) => {
    Swal.fire({
        title: "確定要刪除這個專案嗎？",
        text: "刪除後將無法恢復！",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "是，刪除！",
    }).then((result) => {
        if (result.isConfirmed) {
            deleteMutate(projectId);
        }
    });
};

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
          <div className='bg-gray-700 text-white text-xs rounded-lg py-1 px-2  whitespace-normal overflow-wrap: break-word'>
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
          <div className='bg-gray-700 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap'>
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

      // stageEnd=true
      setDoneProjects(done);
      setOngoingProjects(ongoing);
      setCompletedProjects(completed);
    }
  }, [projectData]);

  if (role == "student") {
    return (
      <div className='min-w-full min-h-screen bg-gray-100 overflow-auto scrollbar-hidden' data-tour="student-dashboard">
        <TopBar />
        <div className='flex flex-col my-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 2xl:px-40 py-10 w-full items-center'>
          {/* 新手歡迎提示 */}
          {!localStorage.getItem(`hasSeenTour_${role}_${userName}`) && (
            <div className="w-full mb-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    歡迎來到自主學習平台！
                  </h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>第一次使用嗎？點擊右下角的幫助按鈕獲取引導，或查看下方的快速開始指南。</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className='flex flex-col w-full '>
            {/* 為新手添加快速開始卡片 */}
            {!localStorage.getItem(`hasSeenTour_${role}_${userName}`) && (
              <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  快速開始指南
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">1️⃣</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">加入活動</h3>
                    <p className="text-sm text-gray-600">使用老師提供的邀請碼加入學習活動</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">2️⃣</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">查看任務</h3>
                    <p className="text-sm text-gray-600">點擊活動卡片查看學習任務和進度</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">3️⃣</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">開始學習</h3>
                    <p className="text-sm text-gray-600">完成任務並記錄學習反思</p>
                  </div>
                </div>
              </div>
            )}
            
            <Accordion
              index={0}
              title="進行中活動"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              <div className='flex justify-start mb-4 mt-2 pl-4' data-tour="ongoing-projects">
                {/* <h2 className="text-lg font-bold mr-8 pt-5">進行中</h2> */}
                <button
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105 mr-4"
                >
                  <MdAddchart className="mr-2" /> 建立活動
                </button>
                <button
                  onClick={() => setInviteProjectModalOpen(true)}
                  className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105"
                >
                  <MdAddchart className="mr-2" /> 加入活動
                </button>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  2xl:grid-cols-3 gap-4 place-items-center'>
                {ongoingProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow-lg hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
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
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <div className='flex justify-between gap-2 mt-2'>
                      <button 
                        onClick={() => handleEditProject(projectItem)} 
                        className="flex-1 bg-customgreen text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold">
                        編輯活動
                      </button>
                      <button className='flex-1 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>查看活動
                      </button>
                    </div>
                  </div>
                ))}
                {ongoingProjects.length === 0 && (
                  <div className="col-span-full">
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">還沒有進行中的活動</h3>
                      <p className="mt-1 text-sm text-gray-500">開始您的學習旅程，點擊下方按鈕加入活動吧！</p>
                      <div className="mt-6">
                        <button
                          onClick={() => setInviteProjectModalOpen(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#5BA491] hover:bg-[#5BA491]/80"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          加入活動
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Accordion>
            <Accordion
              index={1}
              title="已結束活動"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              {/* <h2 className="text-lg font-bold mb-4 mt-10">已完成</h2> */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
                {completedProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <div className='flex items-center'>
                      <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>製作學習歷程</button>
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
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
                {doneProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-gray-300 w-full rounded-lg shadow hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center'>
                        <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <button className='ml-2 bg-[#5BA491] text-white px-3 font-bold py-1 rounded hover:bg-[#5BA491]/80 transition duration-150 ease-in-out'>
                        匯出
                      </button>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: '100%' }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>查看學習歷程</button>
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        </div>

        <Modal open={createProjectModalOpen || editProjectModalOpen} 
                onClose={() => {
                  setCreateProjectModalOpen(false);
                  setEditProjectModalOpen(false);
                }} 
                opacity={true} 
                position={"justify-center items-center"}>

            <button onClick={() => {
                setCreateProjectModalOpen(false);
                setEditProjectModalOpen(false);
              }} 
              className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
              <GrFormClose className='w-6 h-6' />
            </button>

            <div className='flex flex-col p-3'>
              <h3 className='font-bold text-base mb-3'>
                {editProjectModalOpen ? "更新活動" : "建立活動"}
              </h3>

              <p className='font-bold text-base mb-3'>活動名稱</p>
              <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                type="text"
                placeholder="活動名稱..."
                name='projectName'
                onChange={handleChange}
                value={projectName}
                required
              />

              <p className='font-bold text-base mb-3'>活動描述</p>
              <textarea className="rounded outline-none ring-2 ring-customgreen w-full p-1"
                rows={3}
                placeholder="活動描述..."
                name='projectdescribe'
                onChange={handleChange}
                value={projectDescription}
              />

              <div className="mt-4">
                <label className="block text-gray-700 text-base">指導老師</label>
                <select name="projectMentor" onChange={handleChange} value={createprojectData.projectMentor} 
                        className="text-base w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-customgreen focus:bg-white focus:outline-none" required>
                  <option value="" disabled>- 請選擇指導老師 -</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.username}>{teacher.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='flex justify-end m-2'>
              <button onClick={() => {
                  setCreateProjectModalOpen(false);
                  setEditProjectModalOpen(false);
                }}
                className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2">
                取消
              </button>

              <button onClick={() => {
                  if (editProjectModalOpen) {
                    handleUpdateProject(selectedProjectId);
                  } else {
                    handleCreateProject();
                  }
                }}
                type="submit"
                className="mx-auto w-full h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white">
                {editProjectModalOpen ? "更新" : "儲存"}
              </button>
            </div>
          </Modal>
        <Modal open={inviteProjectModalOpen} onClose={() => setInviteProjectModalOpen(false)} opacity={true} position={"justify-center items-center"}>
          <button onClick={() => setInviteProjectModalOpen(false)} className=' absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
            <GrFormClose className=' w-6 h-6' />
          </button>
          <div className='flex flex-col p-3'>
            <h3 className=' font-bold text-base mb-3'>活動邀請碼</h3>
            <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3 "
              type="text"
              minLength="6"
              placeholder="輸入活動邀請碼..."
              name='referral_Code'
              onChange={handleChangeReferral_Code}
              required
            />
          </div>
          <div className='flex justify-end m-2'>
            <button onClick={() => {
              handleSubmitReferral_Code();
              setInviteProjectModalOpen(false);
            }}
              className="mx-auto w-1/4 h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white"
              type="submit"
            >
              加入
            </button>

          </div>
        </Modal>
        <Toaster />
        
        {/* 添加導覽和幫助組件 */}
        <ContextualHelp currentPage="home" />
        {showOnboarding && (
          <OnboardingTour 
            isOpen={showOnboarding}
            onClose={handleTourComplete}
            userRole={role}
          />
        )}
      </div>
    )
  } else if (role == "teacher") {
    const {
      isLoading,
      isError,
      error,
      data
    } = useQuery("TeacherProjectDatas", () => getProjectsByMentor(userName), {
      onSuccess: setProjectData,
    });

    return (
      <div className='min-w-full min-h-screen bg-gray-100 overflow-auto scrollbar-hidden' data-tour="teacher-dashboard">
        <TopBar />
        <div className='flex flex-col my-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 2xl:px-40 py-10 w-full items-center'>
          {/* 新手歡迎提示 */}
          {!localStorage.getItem(`hasSeenTour_${role}_${userName}`) && (
            <div className="w-full mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">
                    歡迎來到教師管理平台！
                  </h3>
                  <div className="mt-1 text-sm text-purple-700">
                    <p>您可以在這裡創建和管理學習活動，監控學生進度。點擊幫助按鈕獲取詳細指導。</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className='flex flex-col w-full '>
            {/* 為新手教師添加快速開始卡片 */}
            {!localStorage.getItem(`hasSeenTour_${role}_${userName}`) && (
              <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  教師快速開始指南
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">🎯</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">建立活動</h3>
                    <p className="text-sm text-gray-600">點擊"建立活動"按鈕創建新的學習專案</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👥</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">邀請學生</h3>
                    <p className="text-sm text-gray-600">分享活動邀請碼給學生加入</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">監控進度</h3>
                    <p className="text-sm text-gray-600">追蹤學生學習進度和反思內容</p>
                  </div>
                </div>
              </div>
            )}
            
            <Accordion
              index={0}
              title="進行中活動"
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            >
              <div className='flex justify-start mb-4 mt-2 pl-4' data-tour="teacher-ongoing-projects">
                {/* <h2 className="text-lg font-bold mr-8 pt-5">進行中</h2> */}
                <button
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105 mr-4"
                  data-tour="create-project"
                >
                  <MdAddchart className="mr-2" /> 建立活動
                </button>
                <button
                  onClick={() => setInviteProjectModalOpen(true)}
                  className="flex items-center justify-center bg-[#5BA491] hover:bg-[#5BA491]/80 text-white font-semibold rounded-lg px-6 py-2 shadow-md transition duration-200 ease-in-out transform hover:scale-105"
                >
                  <MdAddchart className="mr-2" /> 加入活動
                </button>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 place-items-center'>
                {ongoingProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow-lg hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
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
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <div className='flex justify-between gap-2 mt-2'>
                      <button 
                        onClick={() => handleEditProject(projectItem)} 
                        className="flex-1 bg-customgreen text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold">
                        編輯活動
                      </button>
                      <button 
                        className='flex-1 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' 
                        onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>
                        查看活動
                      </button>
                      <button 
                        onClick={() => handleDeleteProject(projectItem.id)} 
                        className="flex-1 bg-[#FF0000]/80 text-white rounded-lg px-4 py-2 transition duration-200 ease-in-out font-semibold">
                        刪除活動
                      </button>
                    </div>
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
              {/* <h2 className="text-lg font-bold mb-4 mt-10">已完成</h2> */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
                {completedProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-white w-full rounded-lg shadow hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <div className='flex items-center'>
                      <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: `${calculateProgress(projectItem.currentStage, projectItem.currentSubStage)}%` }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>製作學習歷程</button>
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
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
                {doneProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((projectItem, index) => (
                  <div key={index} className='bg-gray-300 w-full rounded-lg shadow hover:shadow-lg  p-4 flex flex-col space-y-4 hover:scale-105 transition-transform duration-200 ease-out'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center'>
                        <h3 className='text-xl font-bold text-[#5BA491]'>{projectItem.name}</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-[#5BA491]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <button className='ml-2 bg-[#5BA491] text-white px-3 font-bold py-1 rounded hover:bg-[#5BA491]/80 transition duration-150 ease-in-out'>
                        匯出
                      </button>
                    </div>
                    <Tooltip children={"活動描述"} content={`${projectItem.describe}`}>
                      <p className='text-gray-600 font-semibold truncate overflow-hidden h-6 '>{projectItem.describe}</p>
                    </Tooltip>
                    <div className='text-sm text-gray-500 font-bold'>
                      目前階段：{projectItem.currentStage}-{projectItem.currentSubStage}
                    </div>
                    <div className='text-sm text-gray-500'>指導老師：{projectItem.mentor}</div>
                    <div className='text-sm text-gray-500'>邀請碼：{projectItem.referral_code}</div>
                    <div className='text-sm text-gray-500'>成員：
                    {member
                      .filter(member => member.projectId === projectItem.id)
                      .map(member => member.username)
                      .join("、") || "無成員"}
                    </div>
                    <div className='flex justify-between text-sm text-gray-500'>
                      <span className='flex items-center'>
                        創建於 {dateFormat(projectItem.createdAt, "yyyy/mm/dd")}
                      </span>
                      <span className='flex items-center'>
                        更新於 {formatRelativeTime(projectItem.updatedAt)}
                      </span>
                    </div>
                    <ProgressTooltip children={"活動進度"} content={`已完成${calculateProgressPercentage(projectItem.currentStage, projectItem.currentSubStage)}%`}>
                      <div className='w-full bg-gray-200 rounded-full h-2.5 '>
                        <div className='bg-[#5BA491] h-2.5 rounded-full transition-all duration-300 ease-in-out' style={{ width: '100%' }}></div>
                      </div>
                    </ProgressTooltip>
                    <button className='mt-2 bg-[#5BA491] text-white rounded-lg px-4 py-2 hover:bg-[#5BA491]/80 transition duration-200 ease-in-out font-semibold' onClick={() => navigate(`/project/${projectItem.id}/kanban`)}>查看學習歷程</button>
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        </div>

        <Modal open={createProjectModalOpen || editProjectModalOpen} 
                onClose={() => {
                  setCreateProjectModalOpen(false);
                  setEditProjectModalOpen(false);
                }} 
                opacity={true} 
                position={"justify-center items-center"}>

            <button onClick={() => {
                setCreateProjectModalOpen(false);
                setEditProjectModalOpen(false);
              }} 
              className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
              <GrFormClose className='w-6 h-6' />
            </button>

            <div className='flex flex-col p-3'>
              <h3 className='font-bold text-base mb-3'>
                {editProjectModalOpen ? "更新活動" : "建立活動"}
              </h3>

              <p className='font-bold text-base mb-3'>活動名稱</p>
              <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                type="text"
                placeholder="活動名稱..."
                name='projectName'
                onChange={handleChange}
                value={projectName}
                required
              />

              <p className='font-bold text-base mb-3'>活動描述</p>
              <textarea className="rounded outline-none ring-2 ring-customgreen w-full p-1"
                rows={3}
                placeholder="活動描述..."
                name='projectdescribe'
                onChange={handleChange}
                value={projectDescription}
              />

              <div className="mt-4">
                <label className="block text-gray-700 text-base">指導老師</label>
                <select name="projectMentor" onChange={handleChange} value={createprojectData.projectMentor} 
                        className="text-base w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-customgreen focus:bg-white focus:outline-none" required>
                  <option value="" disabled>- 請選擇指導老師 -</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.username}>{teacher.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='flex justify-end m-2'>
              <button onClick={() => {
                  setCreateProjectModalOpen(false);
                  setEditProjectModalOpen(false);
                }}
                className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2">
                取消
              </button>

              <button onClick={() => {
                  if (editProjectModalOpen) {
                    handleUpdateProject(selectedProjectId);
                  } else {
                    handleCreateProject();
                  }
                }}
                type="submit"
                className="mx-auto w-full h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white">
                {editProjectModalOpen ? "更新" : "儲存"}
              </button>
            </div>
          </Modal>
        <Modal open={inviteProjectModalOpen} onClose={() => setInviteProjectModalOpen(false)} opacity={true} position={"justify-center items-center"}>
          <button onClick={() => setInviteProjectModalOpen(false)} className=' absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
            <GrFormClose className=' w-6 h-6' />
          </button>
          <div className='flex flex-col p-3'>
            <h3 className=' font-bold text-base mb-3'>活動邀請碼</h3>
            <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3 "
              type="text"
              minLength="6"
              placeholder="輸入活動邀請碼..."
              name='referral_Code'
              onChange={handleChangeReferral_Code}
              required
            />
          </div>
          <div className='flex justify-end m-2'>
            <button onClick={() => {
              handleSubmitReferral_Code();
              setInviteProjectModalOpen(false);
            }}
              className="mx-auto w-1/4 h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white"
              type="submit"
            >
              加入
            </button>

          </div>
        </Modal>
        <Toaster />
        
        {/* 添加導覽和幫助組件 */}
        <ContextualHelp currentPage="home" />
        {showOnboarding && (
          <OnboardingTour 
            isOpen={showOnboarding}
            onClose={handleTourComplete}
            userRole={role}
          />
        )}
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
        className="flex justify-between items-center w-full py-2 px-4 bg-gray-200 rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-gray-300 transition duration-300"
        onClick={handleToggle}
      >
        <span className="font-semibold">{title}</span>
        {isActive ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
      </button>
      <div
        ref={contentRef}
        style={{ height: isActive ? `${height}px` : "0px", overflow: 'hidden' }}
        className="transition-height bg-customgreen/5 duration-500 ease-in-out my-1  "
      >
        <div className="text-left px-2 py-2">
          {children}
        </div>
      </div>
    </div>
  );
};

