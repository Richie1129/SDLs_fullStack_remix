import { useMemo } from "react";
import { calculateProgress } from "../utils";
import { calculateUserActivityStats } from "../utils/dataUtils";

/**
 * 統計和指標資料的專門 Hook
 * 負責計算學生指標、小組資料和班級統計
 */
export const useMetricsData = (studentData, projectData) => {
  // 計算增強的學生資料
  const enhancedStudents = useMemo(() => {
    const { students, reflections, submissions, aiCountByUserId, usageByUserId } = studentData;
    const { tasks, nodes, chatHistory, projectName } = projectData;

    if (!Array.isArray(students) || students.length === 0) return [];

    console.log("📊 開始計算學生指標...", { 學生數量: students.length });

    return students.map(student => {
      const studentId = student.userId || student.id;
      const username = student.username;

      // 計算進度
      const progressPercentage = calculateProgress(student.currentStage, student.currentSubStage);

      // 使用正規化的統計計算函式
      const activityStats = calculateUserActivityStats(studentId, username, {
        reflections,
        nodes,
        tasks,
        chatHistory,
        submissions
      });

      // AI 互動和使用時長
      const aiInteractions = aiCountByUserId[studentId] || 0;
      const usageTotalSeconds = usageByUserId[studentId] || 0;
      const usageHours = Math.round((usageTotalSeconds / 3600) * 10) / 10;

      // 找到最後活動時間
      const activities = [
        ...reflections
          .filter(r => r.userId === studentId || r.username === username)
          .map(r => ({ time: r.createdAt, type: 'reflection' })),
        ...tasks
          .filter(t => 
            t.userId === studentId || t.username === username ||
            (t.assignees && t.assignees.some(a => a.userId === studentId))
          )
          .map(t => ({ time: t.createdAt, type: 'task' })),
        ...chatHistory
          .filter(msg => msg.userId === studentId || msg.username === username)
          .map(msg => ({ time: msg.createdAt, type: 'chat' }))
      ];

      const lastActivity = activities.length > 0
        ? activities.sort((a, b) => new Date(b.time) - new Date(a.time))[0].time
        : null;

      // 判斷學生狀態
      let status = 'inactive';
      if (progressPercentage >= 80 && activityStats.reflections >= 3) {
        status = 'excellent';
      } else if (progressPercentage >= 60 && (activityStats.reflections >= 1 || activityStats.tasks >= 1)) {
        status = 'active';
      } else if (progressPercentage >= 40 || activityStats.reflections >= 1) {
        status = 'attention';
      }

      return {
        ...student,
        progressPercentage,
        weeklyReflections: activityStats.reflections,
        ideaNodes: activityStats.nodes,
        kanbanTasks: activityStats.tasks,
        chatMessages: activityStats.chatMessages,
        qaQuestions: submissions.filter(s => 
          (s.userId === studentId) && s.type === 'question'
        ).length,
        aiInteractions,
        usageHours,
        lastActivity,
        status,
        teamRole: student.role || student.teamRole || '成員',
        projectName: projectName || '未知專案'
      };
    });
  }, [studentData, projectData]);

  // 生成小組資料
  const groupData = useMemo(() => {
    if (enhancedStudents.length === 0) return [];

    console.log("👥 開始計算小組資料...");

    // 按專案分組學生
    const projectGroups = enhancedStudents.reduce((acc, student) => {
      const projectId = student.projectId || 'default';
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(student);
      return acc;
    }, {});

    // 轉換為小組資料格式
    return Object.entries(projectGroups).map(([projectId, members], index) => {
      const memberNames = members.map(m => m.username || m.name);
      const averageProgress = members.length > 0
        ? Math.round(members.reduce((sum, m) => sum + m.progressPercentage, 0) / members.length)
        : 0;

      const collaborationScore = Math.round(
        members.reduce((sum, m) => sum + m.chatMessages + m.ideaNodes, 0) / members.length
      );

      const totalIdeaNodes = members.reduce((sum, m) => sum + m.ideaNodes, 0);
      const teamReflections = members.reduce((sum, m) => sum + m.weeklyReflections, 0);

      return {
        id: projectId,
        name: `小組 ${index + 1}`,
        projectName: members[0]?.projectName || '未知專案',
        members: memberNames,
        averageProgress,
        collaborationScore,
        totalIdeaNodes,
        teamReflections
      };
    });
  }, [enhancedStudents]);

  // 計算班級統計
  const classStats = useMemo(() => {
    const { tasks, nodes } = projectData;
    const { allProjects, allProjectMembers } = projectData;

    const totalStudents = enhancedStudents.length;
    const activeStudents = enhancedStudents.filter(s =>
      s.status === 'excellent' || s.status === 'active'
    ).length;
    const needAttentionStudents = enhancedStudents.filter(s =>
      s.status === 'attention' || s.status === 'inactive'
    ).length;

    const averageProgress = totalStudents > 0
      ? Math.round(enhancedStudents.reduce((sum, s) => sum + s.progressPercentage, 0) / totalStudents)
      : 0;

    const totalReflections = enhancedStudents.reduce((sum, s) => sum + s.weeklyReflections, 0);
    const totalIdeaNodes = nodes.length;
    const totalTasks = tasks.length;
    const totalProjects = Object.keys(allProjectMembers).length || allProjects.length;

    const totalUsageHours = enhancedStudents.reduce((sum, s) => sum + (s.usageHours || 0), 0);
    const averageUsageHours = totalStudents > 0 ? Math.round((totalUsageHours / totalStudents) * 10) / 10 : 0;

    console.log("📈 班級統計計算完成:", {
      總學生數: totalStudents,
      活躍學生: activeStudents,
      平均進度: averageProgress
    });

    return {
      totalStudents,
      activeStudents,
      needAttentionStudents,
      averageProgress,
      totalReflections,
      totalIdeaNodes,
      totalTasks,
      totalProjects,
      totalUsageHours,
      averageUsageHours
    };
  }, [enhancedStudents, projectData]);

  return {
    enhancedStudents,
    groupData,
    classStats
  };
};