import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import Swal from 'sweetalert2';
import { toast, Toaster } from 'react-hot-toast';

// 組件
import TopBar from '../../components/TopBar';
import ProjectSection from './components/ProjectSection';
import ProjectModal from './components/ProjectModal';
import InviteModal from './components/InviteModal';
import SearchAndFilter from './components/SearchAndFilter';

// Hooks 和工具
import { useProjectData } from './hooks/useProjectData';
import { useUsername } from '../../hooks/useUserInfo';
import { createProject, inviteForProject, updateProject, deleteProject } from '../../api/project';
import { getRoleConfig, hasPermission } from './config/roleConfig';

export default function HomePage() {
  // 狀態管理
  const [activeIndex, setActiveIndex] = useState(0);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [inviteProjectModalOpen, setInviteProjectModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 專案表單狀態
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedMentor, setSelectedMentor] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // 使用自定義 Hook 獲取資料
  const {
    projectData,
    teachers,
    members,
    viewableProjects,
    ongoing,
    completed,
    done,
    classFilter,
    setClassFilter,
    completedSearch,
    setCompletedSearch,
    doneSearch,
    setDoneSearch,
    isLoading,
    calculateProgress,
    calculateProgressPercentage,
    queryClient,
    role,
    userName
  } = useProjectData();

  // 獲取角色配置
  const roleConfiguration = getRoleConfig(role);

  // 獲取用於篩選的班級列表
  const availableClasses = Array.from(new Set(
    members.map(m => m.class).filter(Boolean)
  ));

  // 專案資料映射 - 統一資料介面
  const projectDataMap = {
    viewable: viewableProjects,
    normal: ongoing,
    completed: completed,
    done: done
  };

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

  // 建立專案 Mutation
  const createMutation = useMutation(createProject, {
    onSuccess: (res) => {
      queryClient.invalidateQueries(roleConfiguration.queryKey);
      setCreateProjectModalOpen(false);
      resetForm();
      showSuccessAlert(res.message);
    },
    onError: (error) => {
      showErrorAlert(error.response?.data?.message || "建立失敗");
    }
  });

  // 更新專案 Mutation
  const updateMutation = useMutation(
    ({ projectId, projectData }) => updateProject(projectId, projectData),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries(roleConfiguration.queryKey);
        setEditProjectModalOpen(false);
        resetForm();
        showSuccessAlert(res.message);
      },
      onError: (error) => {
        showErrorAlert(error.response?.data?.message || "更新失敗");
      }
    }
  );

  // 邀請加入專案 Mutation
  const inviteMutation = useMutation(inviteForProject, {
    onSuccess: (res) => {
      queryClient.invalidateQueries(roleConfiguration.queryKey);
      setInviteProjectModalOpen(false);
      showSuccessAlert(res.message);
    },
    onError: (error) => {
      showErrorAlert(error.response?.data?.message || "加入失敗");
    }
  });

  // 刪除專案 Mutation
  const deleteMutation = useMutation(deleteProject, {
    onSuccess: (res) => {
      queryClient.invalidateQueries(roleConfiguration.queryKey);
      if (role === "teacher") {
        queryClient.invalidateQueries("TeacherProjectDatas");
      }
      showSuccessAlert(res.message);
    },
    onError: (error) => {
      showErrorAlert(error.response?.data?.message || "刪除失敗");
    }
  });

  // 表單處理函數
  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setSelectedMentor("");
    setSelectedProjectId(null);
  };

  const handleCreateProject = () => {
    const projectData = {
      projectName,
      projectdescribe: projectDescription,
      projectMentor: selectedMentor,
      userId: localStorage.getItem("id")
    };
    createMutation.mutate(projectData);
  };

  const handleUpdateProject = () => {
    const updatedProjectData = {
      projectName,
      projectdescribe: projectDescription,
      projectMentor: selectedMentor
    };
    updateMutation.mutate({
      projectId: selectedProjectId,
      projectData: updatedProjectData
    });
  };

  const handleEditProject = (project) => {
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.describe);
    setSelectedMentor(project.mentor);
    setEditProjectModalOpen(true);
  };

  const handleDeleteProject = (projectId) => {
    Swal.fire({
      title: "確定要刪除這個專案嗎？",
      text: "刪除後將無法恢復！",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "是，刪除！",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(projectId);
      }
    });
  };

  const handleInviteProject = (referralCode) => {
    const inviteData = {
      referral_Code: referralCode,
      userId: localStorage.getItem("id")
    };
    inviteMutation.mutate(inviteData);
  };

  // 通知函數
  const showSuccessAlert = (message) => {
    Swal.fire({
      icon: 'success',
      title: '成功',
      text: message,
      customClass: {
        backdrop: 'bg-red-500',
        popup: 'bg-[#F7F6F6]',
      },
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      icon: 'error',
      title: '失敗',
      text: message,
      customClass: {
        backdrop: 'bg-red-500',
        popup: 'bg-[#F7F6F6]',
      },
    });
  };

  if (isLoading) {
    return (
      <div className='min-w-full min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA491] mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-w-full min-h-screen bg-gray-100 overflow-auto scrollbar-hidden' data-tour={`${role}-dashboard`}>
      <TopBar />

      <div className='flex flex-col my-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 2xl:px-40 py-10 w-full items-center'>
        <div className='flex flex-col w-full'>
          {/* 根據角色配置動態渲染區塊 */}
          {roleConfiguration.sections.map((sectionConfig) => {
            const projects = projectDataMap[sectionConfig.type] || [];

            // 處理篩選組件
            let filterComponent = null;
            if (sectionConfig.showFilter) {
              const searchValue = sectionConfig.type === 'completed' ? completedSearch : doneSearch;
              const setSearchValue = sectionConfig.type === 'completed' ? setCompletedSearch : setDoneSearch;

              filterComponent = (
                <SearchAndFilter
                  role={role}
                  classFilter={sectionConfig.showClassFilter ? classFilter : 'all'}
                  setClassFilter={sectionConfig.showClassFilter ? setClassFilter : () => {}}
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                  classes={availableClasses}
                />
              );
            }

            return (
              <ProjectSection
                key={sectionConfig.index}
                index={sectionConfig.index}
                title={sectionConfig.title}
                projects={projects}
                type={sectionConfig.type}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                members={members}
                onEdit={hasPermission(role, 'canEdit') ? handleEditProject : undefined}
                onDelete={hasPermission(role, 'canDelete') ? handleDeleteProject : undefined}
                calculateProgress={calculateProgress}
                calculateProgressPercentage={calculateProgressPercentage}
                role={role}
                showCreateButton={sectionConfig.showCreateButton}
                showJoinButton={sectionConfig.showJoinButton}
                onCreateProject={() => setCreateProjectModalOpen(true)}
                onJoinProject={() => setInviteProjectModalOpen(true)}
                filterComponent={filterComponent}
              />
            );
          })}
        </div>
      </div>

      {/* Modal 組件 */}
      <ProjectModal
        isOpen={createProjectModalOpen || editProjectModalOpen}
        onClose={() => {
          setCreateProjectModalOpen(false);
          setEditProjectModalOpen(false);
          resetForm();
        }}
        isEditMode={editProjectModalOpen}
        projectName={projectName}
        setProjectName={setProjectName}
        projectDescription={projectDescription}
        setProjectDescription={setProjectDescription}
        selectedMentor={selectedMentor}
        setSelectedMentor={setSelectedMentor}
        teachers={teachers}
        onSubmit={editProjectModalOpen ? handleUpdateProject : handleCreateProject}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <InviteModal
        isOpen={inviteProjectModalOpen}
        onClose={() => setInviteProjectModalOpen(false)}
        onSubmit={handleInviteProject}
        isLoading={inviteMutation.isLoading}
      />

      <Toaster />
    </div>
  );
}