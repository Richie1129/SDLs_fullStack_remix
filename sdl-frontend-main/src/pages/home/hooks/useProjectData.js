import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  getAllProject,
  getProjectsByMentor,
  updateProject,
  deleteProject
} from '../../../api/project';
import { getAllTeachers, batchGetProjectUsers } from '../../../api/users';
import { getCurrentUsername } from '../../../utils/userUtils';
import { getCurrentUserId, getCurrentUserRole } from '../../../utils/authUtils';
import { userStorage, authStorage } from '../../../services/storageService';
import { getCurrentSemester } from '../../../utils/semesterUtils';

export const useProjectData = () => {
  const [members, setMembers] = useState([]);
  const [classFilter, setClassFilter] = useState('all');
  const [completedSearch, setCompletedSearch] = useState('');
  const [doneSearch, setDoneSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState(getCurrentSemester());

  const role = getCurrentUserRole();
  const userName = getCurrentUsername();
  const userClass = userStorage.get('class');
  const queryClient = useQueryClient();

  // [Option B 隱藏] 計算進度百分比 - 四階段模式（共 12 個子階段）
  const calculateProgress = (currentStage, currentSubStage) => {
    // 向後兼容：Stage 5 視為 100% 完成
    if (currentStage > 4) {
      return 100;
    }
    // Stage 4-3 視為 100% 完成
    if (currentStage === 4 && currentSubStage >= 3) {
      return 100;
    }
    // 四階段計算：每階段 25%，每子階段約 8.33%
    const stageProgress = (currentStage - 1) * 25;
    const subStageProgress = ((currentSubStage - 1) / 3) * 25;
    return Math.min(100, stageProgress + subStageProgress);
  };

  const calculateProgressPercentage = (currentStage, currentSubStage) => {
    const percentage = calculateProgress(currentStage, currentSubStage);
    return percentage.toFixed(2);
  };

  // 主要專案查詢 - 根據角色決定，加入學期過濾
  const {
    isLoading,
    isError,
    error,
    data: projectData = []
  } = useQuery(
    role === "teacher"
      ? ["TeacherProjectDatas", semesterFilter]
      : ["projectDatas", semesterFilter],
    () => {
      if (role === "teacher") {
        return getProjectsByMentor(userName, semesterFilter);
      } else {
        return getAllProject({
          params: { userId: getCurrentUserId(), semester: semesterFilter }
        });
      }
    },
    {
      enabled: !!userName && !!role,
      staleTime: 5 * 60 * 1000, // 5分鐘緩存
    }
  );

  const { data: teachers = [] } = useQuery(
    'teachers',
    getAllTeachers,
    {
      staleTime: 10 * 60 * 1000,
      select: (data) => data?.user || [],
    }
  );

  // [Option B 隱藏] 分類專案 - 使用 useMemo 避免重複計算
  const categorizedProjects = useMemo(() => {
    if (!projectData || !Array.isArray(projectData)) {
      return {
        ongoing: [],
        completed: [],
        done: []
      };
    }

    // 判斷專案是否已結束（Stage 4-3 完成或 ProjectEnd）
    const isProjectEnded = (project) => {
      return project.ProjectEnd === true ||
             (project.currentStage === 4 && project.currentSubStage >= 3) ||
             project.currentStage > 4;  // 向後兼容舊的 Stage 5 資料
    };

    // 判斷專案是否已完成歷程（已生成 AI Portfolio）
    const isPortfolioCompleted = (project) => {
      return project.portfolioGenerated === true;
    };

    // 進行中活動：未達 75% 且未結束
    const ongoing = projectData.filter(project =>
      !isProjectEnded(project) &&
      calculateProgress(project.currentStage, project.currentSubStage) < 75
    );

    // 已結束活動：已結束（Stage 4-3 或 ProjectEnd）但尚未生成 Portfolio
    const completed = projectData.filter(project =>
      isProjectEnded(project) && !isPortfolioCompleted(project)
    );

    // 已完成歷程：已生成 AI Portfolio
    const done = projectData.filter(project =>
      isPortfolioCompleted(project)
    );

    return { ongoing, completed, done };
  }, [projectData]);

  // 套用篩選的專案
  const filteredProjects = useMemo(() => {
    const filterByClass = (projects) => {
      if (role !== 'teacher' || classFilter === 'all') return projects;
      return projects.filter(p => {
        const classes = Array.from(new Set(
          members.filter(m => m.projectId === p.id).map(m => m.class).filter(Boolean)
        ));
        return classes.includes(classFilter);
      });
    };

    const filterBySearch = (projects, searchTerm) => {
      if (!searchTerm.trim()) return projects;
      const q = searchTerm.trim().toLowerCase();
      return projects.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.describe || '').toLowerCase().includes(q)
      );
    };

    return {
      ongoing: filterByClass(categorizedProjects.ongoing),
      completed: filterBySearch(filterByClass(categorizedProjects.completed), completedSearch),
      done: filterBySearch(filterByClass(categorizedProjects.done), doneSearch)
    };
  }, [categorizedProjects, classFilter, completedSearch, doneSearch, members, role]);

  // 載入專案成員 - 使用批次 API 優化
  useEffect(() => {
    if (!role || !projectData?.length) return;

    const fetchMembers = async () => {
      try {
        let projectIds = [];

        projectIds = projectData.map(project => project.id);

        if (projectIds.length === 0) return;

        console.log('[useProjectData] 開始批次載入成員，專案數:', projectIds.length);

        // 使用批次 API 一次獲取所有專案的用戶
        const usersByProject = await batchGetProjectUsers(projectIds);

        // 將結果扁平化
        const allMembers = [];
        Object.entries(usersByProject).forEach(([projectId, users]) => {
          users.forEach(user => {
            allMembers.push(user);
          });
        });

        setMembers(allMembers);
        console.log('[useProjectData] 成員載入完成，總數:', allMembers.length);

      } catch (error) {
        console.error('[useProjectData] 載入成員失敗:', error);
        setMembers([]);
      }
    };

    fetchMembers();
  }, [role, projectData]);

  // 學生端：取得所有學期的專案（只用於產生學期下拉選單，不受 semesterFilter 影響）
  const { data: allStudentProjects = [] } = useQuery(
    ['allStudentProjectsForSemesters'],
    () => getAllProject({ params: { userId: getCurrentUserId(), semester: 'all' } }),
    {
      enabled: role === 'student' && !!userName,
      staleTime: 10 * 60 * 1000,
    }
  );

  // 可觀摩專案查詢 - 加入學期過濾
  const { data: viewableProjectsData = [] } = useQuery(
    ['viewableProjects', userClass, role, semesterFilter],
    async () => {
      try {
        const response = await getAllProject({
          params: { viewable_by: userClass, semester: semesterFilter },
          headers: { 'accessToken': authStorage.get('accessToken') }
        });

        let projects = [];
        if (response?.error) {
          console.warn("getAllProject 回傳錯誤:", response.error);
        } else if (Array.isArray(response?.projects)) {
          projects = response.projects;
        } else if (Array.isArray(response)) {
          projects = response;
        }

        const myId = getCurrentUserId();
        const myName = getCurrentUsername() || '';
        return projects.filter(p => {
          if (!Array.isArray(p?.members)) return true;
          return !p.members.some(m =>
            (m?.id ?? 0) === myId || (m?.username || '') === myName
          );
        });
      } catch (error) {
        console.error("獲取可觀摩專案失敗:", error);
        return [];
      }
    },
    {
      enabled: role === 'student' && !!userClass,
      staleTime: 5 * 60 * 1000,
    }
  );

  const viewableProjects = role === 'student' ? viewableProjectsData : [];

  // 返回所有狀態和函數
  return {
    // 資料狀態
    projectData,
    allStudentProjects,
    teachers,
    members,
    viewableProjects,

    // 分類後的專案
    ...categorizedProjects,
    ...filteredProjects,

    // 篩選狀態
    classFilter,
    setClassFilter,
    completedSearch,
    setCompletedSearch,
    doneSearch,
    setDoneSearch,
    semesterFilter,
    setSemesterFilter,

    // 查詢狀態
    isLoading,
    isError,
    error,

    // 工具函數
    calculateProgress,
    calculateProgressPercentage,

    // Query client for mutations
    queryClient,

    // 用戶資訊
    role,
    userName,
    userClass
  };
};
