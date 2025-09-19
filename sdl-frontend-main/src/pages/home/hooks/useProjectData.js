import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  getAllProject,
  getProjectsByMentor,
  updateProject,
  deleteProject
} from '../../../api/project';
import { getAllTeachers, getProjectUser } from '../../../api/users';
import { getCurrentUsername } from '../../../utils/userUtils';

export const useProjectData = () => {
  const [teachers, setTeachers] = useState([]);
  const [members, setMembers] = useState([]);
  const [viewableProjects, setViewableProjects] = useState([]);
  const [classFilter, setClassFilter] = useState('all');
  const [completedSearch, setCompletedSearch] = useState('');
  const [doneSearch, setDoneSearch] = useState('');

  const role = localStorage.getItem("role");
  const userName = getCurrentUsername();
  const userClass = localStorage.getItem('class');
  const queryClient = useQueryClient();

  // 計算進度百分比
  const calculateProgress = (currentStage, currentSubStage) => {
    if (currentStage === 5) {
      return (12 + currentSubStage) / 17 * 100;
    } else {
      return ((currentStage - 1) * 3 + currentSubStage) / 17 * 100;
    }
  };

  const calculateProgressPercentage = (currentStage, currentSubStage) => {
    const percentage = calculateProgress(currentStage, currentSubStage);
    return percentage.toFixed(2);
  };

  // 主要專案查詢 - 根據角色決定
  const {
    isLoading,
    isError,
    error,
    data: projectData = []
  } = useQuery(
    role === "teacher" ? "TeacherProjectDatas" : "projectDatas",
    () => {
      if (role === "teacher") {
        return getProjectsByMentor(userName);
      } else {
        return getAllProject({ params: { userId: localStorage.getItem("id") } });
      }
    },
    {
      enabled: !!userName && !!role,
      staleTime: 5 * 60 * 1000, // 5分鐘緩存
    }
  );

  // 分類專案 - 使用 useMemo 避免重複計算
  const categorizedProjects = useMemo(() => {
    if (!projectData || !Array.isArray(projectData)) {
      return {
        ongoing: [],
        completed: [],
        done: []
      };
    }

    const ongoing = projectData.filter(project =>
      calculateProgress(project.currentStage, project.currentSubStage) < 75
    );

    const completed = projectData.filter(project =>
      calculateProgress(project.currentStage, project.currentSubStage) > 75 &&
      project.ProjectEnd === false
    );

    const done = projectData.filter(project =>
      project.ProjectEnd === true
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

  // 載入教師列表
  useEffect(() => {
    getAllTeachers().then(data => {
      setTeachers(data.user || []);
    }).catch(error => {
      console.error('Error fetching teachers:', error);
    });
  }, []);

  // 載入專案成員 - 根據角色不同處理
  useEffect(() => {
    if (!role || !projectData?.length) return;

    const fetchMembers = async () => {
      try {
        let projectIds = [];

        if (role === "teacher") {
          const mentorName = getCurrentUsername();
          if (!mentorName) return;

          const mentorProjects = await getProjectsByMentor(mentorName);
          projectIds = mentorProjects?.map(project => project.id) || [];
        } else {
          projectIds = projectData.map(project => project.id);
        }

        if (projectIds.length === 0) return;

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
        setMembers(projectUsers.flat());
      } catch (error) {
        console.error("獲取專案成員失敗:", error);
      }
    };

    fetchMembers();
  }, [role, projectData]);

  // 載入可觀摩專案 - 僅學生角色
  useEffect(() => {
    if (role !== "student" || !userClass) return;

    const fetchViewableProjects = async () => {
      try {
        const response = await getAllProject({
          params: { viewable_by: userClass },
          headers: { 'accessToken': localStorage.getItem('accessToken') }
        });

        let projects = response.projects || response || [];

        // 過濾掉使用者自己參與的專案
        const myId = String(localStorage.getItem('id') || '');
        const myName = getCurrentUsername() || '';
        projects = projects.filter(p => {
          if (!Array.isArray(p?.members)) return true;
          return !p.members.some(m =>
            String(m?.id ?? '') === myId || (m?.username || '') === myName
          );
        });

        setViewableProjects(projects);
      } catch (error) {
        console.error("獲取可觀摩專案失敗:", error);
        setViewableProjects([]);
      }
    };

    fetchViewableProjects();
  }, [role, userClass]);

  // 返回所有狀態和函數
  return {
    // 資料狀態
    projectData,
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