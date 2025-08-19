import { useMemo } from "react";
import { calculateProgress } from "../utils";

export const useTeacherMetrics = (realData, allProjectMembers) => {
  // 計算增強的學生資料
  const enhancedStudents = useMemo(() => {
    if (!realData.students || realData.students.length === 0) return [];

    return realData.students.map(student => {
      // 基本資料
      const studentId = student.id;
      const username = student.username || student.name;
      
      // 計算進度
      const progressPercentage = calculateProgress(student.currentStage, student.currentSubStage);
      
      // 計算學習活動統計
      const weeklyReflections = realData.reflections.filter(r => 
        r.user_id === studentId || r.userId === studentId || 
        r.username === username || r.user_name === username
      ).length;
      
      const ideaNodes = realData.nodes.filter(n => 
        n.user_id === studentId || n.userId === studentId ||
        n.owner === username || n.username === username || n.user_name === username
      ).length;
      
      const kanbanTasks = realData.tasks.filter(t => 
        t.user_id === studentId || t.userId === studentId ||
        t.owner === username || t.created_by === username ||
        (t.assignees && t.assignees.some(a => a.id === studentId || a.username === username))
      ).length;
      
      const chatMessages = realData.chatHistory.filter(msg => 
        msg.user_id === studentId || msg.userId === studentId ||
        msg.username === username || msg.user_name === username
      ).length;

      // 計算問答和 AI 互動（如果有相關資料）
      const qaQuestions = realData.submissions.filter(s => 
        (s.user_id === studentId || s.userId === studentId) && s.type === 'question'
      ).length;
      
      const aiInteractions = (realData.aiCountByUserId && realData.aiCountByUserId[studentId])
        ? realData.aiCountByUserId[studentId]
        : 0;

      const usageTotalSeconds = (realData.usageByUserId && realData.usageByUserId[studentId])
        ? realData.usageByUserId[studentId]
        : 0;
      const usageHours = Math.round((usageTotalSeconds / 3600) * 10) / 10; // 1 decimal

      // 找到最後活動時間
      const activities = [
        ...realData.reflections.filter(r => 
          r.user_id === studentId || r.userId === studentId
        ).map(r => ({ time: r.createdAt || r.created_at, type: 'reflection' })),
        ...realData.tasks.filter(t => 
          t.user_id === studentId || t.userId === studentId ||
          (t.assignees && t.assignees.some(a => a.id === studentId))
        ).map(t => ({ time: t.createdAt || t.created_at, type: 'task' })),
        ...realData.chatHistory.filter(msg => 
          msg.user_id === studentId || msg.userId === studentId
        ).map(msg => ({ time: msg.createdAt || msg.created_at, type: 'chat' }))
      ];
      
      const lastActivity = activities.length > 0 
        ? activities.sort((a, b) => new Date(b.time) - new Date(a.time))[0].time
        : null;

      // 判斷學生狀態
      let status = 'inactive';
      if (progressPercentage >= 80 && weeklyReflections >= 3) {
        status = 'excellent';
      } else if (progressPercentage >= 60 && (weeklyReflections >= 1 || kanbanTasks >= 1)) {
        status = 'active';
      } else if (progressPercentage >= 40 || weeklyReflections >= 1) {
        status = 'attention';
      }

      return {
        ...student,
        progressPercentage,
        weeklyReflections,
        ideaNodes,
        kanbanTasks,
        chatMessages,
        qaQuestions,
        aiInteractions,
        usageHours,
        lastActivity,
        status,
        teamRole: student.role || student.teamRole || '成員',
        projectName: realData.projectName || '未知專案'
      };
    });
  }, [realData, allProjectMembers]);

  // 生成小組資料
  const groupData = useMemo(() => {
    if (enhancedStudents.length === 0) return [];

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
    const totalIdeaNodes = enhancedStudents.reduce((sum, s) => sum + s.ideaNodes, 0);
    const totalTasks = realData.tasks.length;
    const totalProjects = Object.keys(allProjectMembers).length || realData.allProjects.length;

    const totalUsageHours = enhancedStudents.reduce((sum, s) => sum + (s.usageHours || 0), 0);
    const averageUsageHours = totalStudents > 0 ? Math.round((totalUsageHours / totalStudents) * 10) / 10 : 0;

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
  }, [enhancedStudents, realData, allProjectMembers]);

  return {
    enhancedStudents,
    groupData,
    classStats
  };
};
