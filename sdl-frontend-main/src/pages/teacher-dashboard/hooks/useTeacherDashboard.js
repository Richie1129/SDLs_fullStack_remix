import { useState, useEffect, useMemo } from "react";
import { useStudentData } from "./useStudentData";
import { useProjectData } from "./useProjectData";
import { useMetricsData } from "./useMetricsData";

/**
 * 新的教師儀表板主要Hook
 * 整合所有子 Hook 並提供統一的載入狀態管理
 */
export const useTeacherDashboard = (projectId, userRole) => {
  const [globalError, setGlobalError] = useState(null);

  // 使用新的分離式資料Hooks
  const studentData = useStudentData(projectId, userRole);
  const projectData = useProjectData(projectId, userRole);

  // 計算指標資料
  const metricsData = useMetricsData(studentData, projectData);

  // 統一的載入狀態
  const loading = useMemo(() => {
    return studentData.loading || projectData.loading;
  }, [studentData.loading, projectData.loading]);

  // 統一的錯誤處理
  const error = useMemo(() => {
    return globalError || studentData.error || projectData.error;
  }, [globalError, studentData.error, projectData.error]);

  // 合併後的完整資料
  const realData = useMemo(() => {
    if (loading) {
      return {
        loading: true,
        tasks: [],
        nodes: [],
        nodeRelations: [],
        projectName: "",
        students: [],
        reflections: [],
        chatrooms: [],
        chatHistory: [],
        submissions: [],
        projectActivity: [],
        allProjects: [],
        usageByUserId: {},
        aiCountByUserId: {}
      };
    }

    // 合併所有資料
    return {
      loading: false,
      // 來自 projectData
      tasks: projectData.tasks,
      nodes: projectData.nodes,
      nodeRelations: projectData.nodeRelations,
      projectName: projectData.projectName,
      chatrooms: projectData.chatrooms,
      chatHistory: projectData.chatHistory,
      projectActivity: projectData.projectActivity,
      allProjects: projectData.allProjects,
      
      // 來自 studentData
      students: studentData.students,
      reflections: studentData.reflections,
      submissions: studentData.submissions,
      usageByUserId: studentData.usageByUserId,
      aiCountByUserId: studentData.aiCountByUserId
    };
  }, [loading, studentData, projectData]);

  // 錯誤處理邏輯
  useEffect(() => {
    if (studentData.error && projectData.error) {
      setGlobalError("學生資料和專案資料獲取均失敗");
    } else if (studentData.error) {
      console.warn("學生資料獲取失敗，但專案資料正常");
    } else if (projectData.error) {
      console.warn("專案資料獲取失敗，但學生資料正常");
    } else {
      setGlobalError(null);
    }
  }, [studentData.error, projectData.error]);

  // 資料完整性檢查
  const dataIntegrity = useMemo(() => {
    if (loading) return { status: 'loading' };

    const checks = {
      hasStudents: studentData.students.length > 0,
      hasProjects: projectData.allProjects.length > 0,
      hasReflections: studentData.reflections.length > 0,
      hasTasks: projectData.tasks.length > 0,
      hasNodes: projectData.nodes.length > 0
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    return {
      status: 'complete',
      score: (passedChecks / totalChecks) * 100,
      details: checks,
      issues: Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => check)
    };
  }, [loading, studentData, projectData]);

  // 效能統計
  const performanceStats = useMemo(() => {
    return {
      studentsCount: studentData.students.length,
      projectsCount: projectData.allProjects.length,
      reflectionsCount: studentData.reflections.length,
      tasksCount: projectData.tasks.length,
      nodesCount: projectData.nodes.length,
      chatMessagesCount: projectData.chatHistory.length
    };
  }, [studentData, projectData]);

  // 重新整理資料的方法
  const refreshData = () => {
    console.log("🔄 觸發資料重新整理...");
    // 由於 projectId 和 userRole 未改變，useEffect 不會重新觸發
    // 可以透過改變 key 或其他方式來強制重新整理
    setGlobalError(null);
  };

  return {
    // 向後相容的資料格式
    realData,
    allProjectMembers: projectData.allProjectMembers,
    
    // 新的分離式資料
    enhancedStudents: metricsData.enhancedStudents,
    groupData: metricsData.groupData,
    classStats: metricsData.classStats,
    
    // 狀態管理
    loading,
    error,
    
    // 診斷和效能資訊
    dataIntegrity,
    performanceStats,
    
    // 操作方法
    refreshData
  };
};