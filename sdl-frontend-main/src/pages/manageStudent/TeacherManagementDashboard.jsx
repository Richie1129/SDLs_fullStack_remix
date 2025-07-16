import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getKanbanColumns, getProjectActivity } from "../../api/kanban";
import { getNodes, getNodeRelation } from "../../api/nodes";
import { getIdeaWall } from "../../api/ideaWall";
import { getProjectUser } from "../../api/users";
import { getAllPersonalDaily } from "../../api/reflection";
import { getAllChatrooms } from "../../api/question";
import { getChatroomHistory } from "../../api/chatroom";
import { getAllSubmit } from "../../api/submit";
import { getProjectsByMentor } from "../../api/project";

const TeacherManagementDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  
  // 檢視模式狀態
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'all-students', 'groups', 'individual', 'analytics'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // 用戶角色
  const userRole = localStorage.getItem("role");
  
  // 專案成員資料狀態
  const [allProjectMembers, setAllProjectMembers] = useState({});
  
  // 真實資料狀態
  const [realData, setRealData] = useState({
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
    loading: true
  });

  // 獲取真實專案資料
  useEffect(() => {
    if (!parsedProjectId) {
      console.warn("❌ projectId 未定義");
      return;
    }

    const fetchRealData = async () => {
      try {
        setRealData(prev => ({ ...prev, loading: true }));
        
        // 獲取當前用戶身份和資訊
        const currentUserId = localStorage.getItem("userId");
        const currentUsername = localStorage.getItem("username");
        const isTeacher = userRole === 'teacher';
        
        // 並行獲取所有資料
        const [
          columnData,
          ideaWallData,
          studentsData,
          reflectionsData,
          chatroomsData,
          submissionsData,
          projectActivityData,
          allProjectsData
        ] = await Promise.allSettled([
          getKanbanColumns(parsedProjectId),
          getIdeaWall(parsedProjectId, 1), // 添加 stage 參數
          getProjectUser(parsedProjectId),
          getAllPersonalDaily({ 
            projectId: parsedProjectId, 
            userId: currentUserId, 
            isTeacher: isTeacher 
          }),
          getAllChatrooms(parsedProjectId),
          getAllSubmit({ 
            params: { projectId: parsedProjectId }
          }),
          getProjectActivity(parsedProjectId),
          currentUsername ? getProjectsByMentor(currentUsername) : Promise.resolve([])
        ]);

        // 處理看板任務
        let allTasks = [];
        if (columnData.status === 'fulfilled' && columnData.value) {
          columnData.value.forEach(column => {
            // 處理不同的任務字段名稱
            const tasks = column.kanban_tasks || column.task || [];
            if (Array.isArray(tasks)) {
              const tasksWithStatus = tasks.map(task => ({
                ...task,
                status: column.title || column.name,
                columnId: column.id
              }));
              allTasks.push(...tasksWithStatus);
            }
          });
          // 按照 columnId 排序
          allTasks.sort((a, b) => a.columnId - b.columnId);
        }

        // 處理想法節點 - 使用正確的 stage 格式
        let allNodes = [];
        let allRelations = [];
        let fetchedIdeaWallIds = [];
        
        // 方法1: 使用 "1-1" 格式的 stage 參數（根據您的成功案例）
        try {
          console.log("🎯 嘗試使用 stage '1-1' 獲取想法牆");
          const correctIdeaWallData = await getIdeaWall(parsedProjectId, "1-1");
          console.log("✅ 取得的 IdeaWall Data:", correctIdeaWallData);

          if (correctIdeaWallData && correctIdeaWallData.id) {
            fetchedIdeaWallIds = [correctIdeaWallData.id];
            console.log("📢 取得 Nodes, ideaWallIds:", fetchedIdeaWallIds);

            const nodePromises = fetchedIdeaWallIds.map(id => getNodes(id));
            const allNodeData = await Promise.all(nodePromises);
            allNodes = allNodeData.flat();
            console.log("✅ Nodes Data:", allNodes);

            // 取得節點關聯
            console.log("📢 取得 Node 關聯, ideaWallIds:", fetchedIdeaWallIds);
            const relationPromises = fetchedIdeaWallIds.map(id => getNodeRelation(id));
            const allRelationData = await Promise.all(relationPromises);
            allRelations = allRelationData.flat();
            console.log("✅ Node Relations Data:", allRelations);
          } else {
            console.warn("❌ 無法獲取 IdeaWall IDs with stage '1-1'");
          }
        } catch (nodeError) {
          console.warn("⚠️ Stage '1-1' 想法牆節點資料獲取失敗:", nodeError);
        }

        // 方法2: 如果 "1-1" 失敗，嘗試其他常見的 stage 格式
        if (allNodes.length === 0) {
          const stageFormats = ["1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"];
          for (const stageFormat of stageFormats) {
            try {
              console.log(`🎯 嘗試 stage '${stageFormat}' 獲取想法牆和節點`);
              const ideaWall = await getIdeaWall(parsedProjectId, stageFormat);
              if (ideaWall && ideaWall.id) {
                const nodeData = await getNodes(ideaWall.id);
                const relationData = await getNodeRelation(ideaWall.id);
                if (nodeData && nodeData.length > 0) {
                  allNodes = nodeData;
                  allRelations = relationData || [];
                  fetchedIdeaWallIds = [ideaWall.id];
                  console.log(`✅ Stage '${stageFormat}' 節點獲取成功:`, allNodes.length);
                  break;
                }
              }
            } catch (error) {
              console.warn(`⚠️ Stage '${stageFormat}' 失敗:`, error);
            }
          }
        }

        // 方法3: 如果所有 stage 格式都失敗，嘗試使用原始的想法牆資料
        if (allNodes.length === 0 && ideaWallData.status === 'fulfilled' && ideaWallData.value && ideaWallData.value.id) {
          try {
            console.log("🎯 最後嘗試使用原始想法牆 ID 獲取節點:", ideaWallData.value.id);
            const nodeData = await getNodes(ideaWallData.value.id);
            const relationData = await getNodeRelation(ideaWallData.value.id);
            allNodes = nodeData || [];
            allRelations = relationData || [];
            fetchedIdeaWallIds = [ideaWallData.value.id];
            console.log("✅ 原始想法牆節點獲取成功:", allNodes.length);
          } catch (nodeError) {
            console.warn("⚠️ 原始想法牆節點資料獲取失敗:", nodeError);
          }
        }

        console.log("📊 最終節點統計:", { 
          節點數量: allNodes.length, 
          關聯數量: allRelations.length,
          想法牆IDs: fetchedIdeaWallIds,
          想法牆狀態: ideaWallData.status,
          想法牆資料: ideaWallData.value 
        });

        // 獲取聊天記錄
        let allChatHistory = [];
        if (chatroomsData.status === 'fulfilled' && chatroomsData.value) {
          for (const chatroom of chatroomsData.value) {
            try {
              const history = await getChatroomHistory(chatroom.id);
              if (history && Array.isArray(history)) {
                allChatHistory.push(...history.map(msg => ({
                  ...msg,
                  chatroomId: chatroom.id,
                  chatroomTitle: chatroom.title
                })));
              }
            } catch (chatError) {
              console.warn(`⚠️ 聊天室 ${chatroom.id} 歷史記錄獲取失敗:`, chatError);
            }
          }
        }

        // 獲取專案名稱
        let projectName = `專案 ${parsedProjectId}`;
        if (allProjectsData.status === 'fulfilled' && allProjectsData.value) {
          const currentProject = allProjectsData.value.find(p => p.id === parsedProjectId);
          if (currentProject) {
            projectName = currentProject.name || currentProject.title || projectName;
          }
        }

        const finalData = {
          tasks: allTasks,
          nodes: allNodes,
          nodeRelations: allRelations,
          projectName: projectName,
          students: studentsData.status === 'fulfilled' ? (studentsData.value || []) : [],
          reflections: reflectionsData.status === 'fulfilled' ? (reflectionsData.value || []) : [],
          chatrooms: chatroomsData.status === 'fulfilled' ? (chatroomsData.value || []) : [],
          chatHistory: allChatHistory,
          submissions: submissionsData.status === 'fulfilled' ? (submissionsData.value || []) : [],
          projectActivity: projectActivityData.status === 'fulfilled' ? (projectActivityData.value || []) : [],
          allProjects: allProjectsData.status === 'fulfilled' ? (allProjectsData.value || []) : [],
          loading: false
        };

        // 記錄 API 調用結果
        console.log("📊 API 調用結果:", {
          columnData: columnData.status,
          ideaWallData: ideaWallData.status,
          studentsData: studentsData.status,
          reflectionsData: reflectionsData.status,
          chatroomsData: chatroomsData.status,
          submissionsData: submissionsData.status,
          projectActivityData: projectActivityData.status,
          allProjectsData: allProjectsData.status
        });

        // 記錄失敗的 API 調用
        [
          { name: 'reflections', data: reflectionsData },
          { name: 'submissions', data: submissionsData },
          { name: 'allProjects', data: allProjectsData }
        ].forEach(({ name, data }) => {
          if (data.status === 'rejected') {
            console.warn(`⚠️ ${name} API 調用失敗:`, data.reason);
          }
        });

        console.log("📊 教師管理儀表板資料總覽:", {
          學生數量: finalData.students.length,
          專案數量: finalData.allProjects.length,
          任務數量: finalData.tasks.length,
          想法節點數量: finalData.nodes.length,
          反思記錄數量: finalData.reflections.length,
          聊天記錄數量: finalData.chatHistory.length
        });

        // 詳細記錄資料結構以便調試
        console.log("📋 詳細資料結構:", {
          students: finalData.students.map(s => ({ 
            id: s.id, 
            username: s.username, 
            name: s.name,
            role: s.role 
          })),
          sampleReflection: finalData.reflections[0],
          sampleNode: finalData.nodes[0],
          sampleSubmission: finalData.submissions[0],
          sampleTask: finalData.tasks[0]
        });

        setRealData(finalData);

      } catch (error) {
        console.error("❌ 資料獲取失敗:", error);
        setRealData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRealData();
  }, [parsedProjectId]);

  // 獲取所有專案的成員資料
  useEffect(() => {
    if (realData.allProjects.length === 0 || realData.loading) return;

    const fetchAllProjectMembers = async () => {
      const memberPromises = realData.allProjects.map(async (project) => {
        try {
          const members = await getProjectUser(project.id);
          return { projectId: project.id, members: members || [] };
        } catch (error) {
          console.warn(`⚠️ 專案 ${project.id} 成員資料獲取失敗:`, error);
          return { projectId: project.id, members: [] };
        }
      });

      const results = await Promise.all(memberPromises);
      const membersMap = {};
      results.forEach(({ projectId, members }) => {
        membersMap[projectId] = members;
      });

      setAllProjectMembers(membersMap);
    };

    fetchAllProjectMembers();
  }, [realData.allProjects, realData.loading]);

  // 計算專案進度
  const calculateProgress = (currentStage, currentSubStage) => {
    if (!currentStage || !currentSubStage) return 0;
    
    if (currentStage === 5) {
      return Math.min(((12 + currentSubStage) / 17) * 100, 100);
    } else {
      return Math.min((((currentStage - 1) * 3 + currentSubStage) / 17) * 100, 100);
    }
  };

  // 格式化相對時間
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '未知時間';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return '剛剛';
    if (diffInMinutes < 60) return `${diffInMinutes}分鐘前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小時前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  };

  // 獲取學生狀態顏色
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 計算學生統計資料
  const enhancedStudents = useMemo(() => {
    return realData.students.map(student => {
      // 更寬泛的學生匹配邏輯
      const studentIdentifiers = [
        student.username,
        student.name,
        student.user_name,
        student.userName,
        `${student.id}`,
        student.email
      ].filter(Boolean);

      // 計算學生活動統計
      const studentReflections = realData.reflections.filter(r => 
        studentIdentifiers.includes(r.username) ||
        studentIdentifiers.includes(r.userName) ||
        studentIdentifiers.includes(r.user_name) ||
        studentIdentifiers.includes(r.name) ||
        r.user_id === student.id ||
        r.userId === student.id ||
        `${r.user_id}` === `${student.id}` ||
        `${r.userId}` === `${student.id}`
      );
      
      const studentNodes = realData.nodes.filter(n => 
        studentIdentifiers.includes(n.owner) ||
        studentIdentifiers.includes(n.username) ||
        studentIdentifiers.includes(n.user_name) ||
        studentIdentifiers.includes(n.name) ||
        n.user_id === student.id ||
        n.userId === student.id ||
        `${n.user_id}` === `${student.id}` ||
        `${n.userId}` === `${student.id}`
      );
      
      const studentChatMessages = realData.chatHistory.filter(c => 
        studentIdentifiers.includes(c.username) ||
        studentIdentifiers.includes(c.userName) ||
        studentIdentifiers.includes(c.user_name) ||
        studentIdentifiers.includes(c.name) ||
        c.user_id === student.id ||
        c.userId === student.id ||
        `${c.user_id}` === `${student.id}` ||
        `${c.userId}` === `${student.id}`
      );
      
      const studentSubmissions = realData.submissions.filter(s => 
        studentIdentifiers.includes(s.username) ||
        studentIdentifiers.includes(s.userName) ||
        studentIdentifiers.includes(s.user_name) ||
        studentIdentifiers.includes(s.name) ||
        s.user_id === student.id ||
        s.userId === student.id ||
        `${s.user_id}` === `${student.id}` ||
        `${s.userId}` === `${student.id}`
      );

      // 計算學生相關的看板任務
      const studentTasks = realData.tasks.filter(t => 
        studentIdentifiers.includes(t.owner) ||
        studentIdentifiers.includes(t.created_by) ||
        studentIdentifiers.includes(t.username) ||
        studentIdentifiers.includes(t.user_name) ||
        t.user_id === student.id ||
        t.userId === student.id ||
        `${t.user_id}` === `${student.id}` ||
        `${t.userId}` === `${student.id}` ||
        (t.assignees && t.assignees.some(a => 
          studentIdentifiers.includes(a.username) ||
          studentIdentifiers.includes(a.name) ||
          a.id === student.id ||
          `${a.id}` === `${student.id}`
        ))
      );

      // 計算進度
      const currentStage = student.currentStage || 1;
      const currentSubStage = student.currentSubStage || 1;
      const progressPercentage = Math.round(calculateProgress(currentStage, currentSubStage));

      // 計算最後活動時間
      const allActivities = [
        ...studentReflections.map(r => r.createdAt || r.created_at || r.updatedAt || r.updated_at),
        ...studentNodes.map(n => n.createdAt || n.created_at || n.updatedAt || n.updated_at),
        ...studentChatMessages.map(c => c.createdAt || c.created_at || c.updatedAt || c.updated_at),
        ...studentSubmissions.map(s => s.createdAt || s.created_at || s.updatedAt || s.updated_at),
        ...studentTasks.map(t => t.createdAt || t.created_at || t.updatedAt || t.updated_at)
      ].filter(Boolean);

      const lastActivity = allActivities.length > 0 
        ? new Date(Math.max(...allActivities.map(d => new Date(d).getTime()))).toISOString()
        : null;

      // 計算學生狀態
      let status = 'inactive';
      if (progressPercentage >= 80) status = 'excellent';
      else if (progressPercentage >= 60) status = 'active';
      else if (progressPercentage >= 30) status = 'attention';

      console.log(`📊 學生 ${student.username || student.name} 統計:`, {
        反思: studentReflections.length,
        想法節點: studentNodes.length,
        聊天訊息: studentChatMessages.length,
        提交作業: studentSubmissions.length,
        看板任務: studentTasks.length,
        進度百分比: progressPercentage
      });

      return {
        ...student,
        projectName: realData.projectName,
        currentStage,
        currentSubStage,
        progressPercentage,
        lastActivity,
        weeklyReflections: studentReflections.length,
        ideaNodes: studentNodes.length,
        chatMessages: studentChatMessages.length,
        qaQuestions: studentSubmissions.length,
        kanbanTasks: studentTasks.length,
        aiInteractions: Math.floor(Math.random() * 20), // 暫時使用隨機數
        status,
        teamRole: student.role || '學生'
      };
    });
  }, [realData]);

  // 生成小組資料
  const groupData = useMemo(() => {
    // 簡單的小組劃分邏輯 - 可以根據實際需求調整
    const groups = [];
    for (let i = 0; i < enhancedStudents.length; i += 3) {
      const groupMembers = enhancedStudents.slice(i, i + 3);
      if (groupMembers.length > 0) {
        const averageProgress = Math.round(
          groupMembers.reduce((sum, student) => sum + student.progressPercentage, 0) / groupMembers.length
        );
        
        groups.push({
          id: Math.floor(i / 3) + 1,
          name: `學習小組 ${Math.floor(i / 3) + 1}`,
          projectName: realData.projectName,
          members: groupMembers.map(s => s.username || s.name),
          averageProgress,
          collaborationScore: Math.min(averageProgress + Math.floor(Math.random() * 20), 100),
          totalIdeaNodes: groupMembers.reduce((sum, student) => sum + student.ideaNodes, 0),
          teamReflections: groupMembers.reduce((sum, student) => sum + student.weeklyReflections, 0)
        });
      }
    }
    return groups;
  }, [enhancedStudents, realData.projectName]);

  // 計算班級統計
  const classStats = useMemo(() => {
    const allStudents = [];
    Object.values(allProjectMembers).forEach(members => {
      members.forEach(member => {
        if (!allStudents.some(s => s.id === member.id || s.username === member.username)) {
          allStudents.push(member);
        }
      });
    });

    const totalStudents = allStudents.length > 0 ? allStudents.length : enhancedStudents.length;
    const averageProgress = enhancedStudents.length > 0 ? 
      Math.round(enhancedStudents.reduce((sum, student) => sum + student.progressPercentage, 0) / enhancedStudents.length) : 0;

    const activeStudents = enhancedStudents.filter(s => 
      s.status === 'active' || s.status === 'excellent'
    ).length;

    const needAttentionStudents = enhancedStudents.filter(s => 
      s.status === 'attention' || s.status === 'inactive'
    ).length;

    return {
      totalStudents,
      totalProjects: realData.allProjects.length,
      averageProgress,
      activeStudents,
      needAttentionStudents,
      totalReflections: realData.reflections.length,
      totalIdeaNodes: realData.nodes.length,
      totalChatMessages: realData.chatHistory.length,
      totalTasks: realData.tasks.length,
      totalSubmissions: realData.submissions.length
    };
  }, [enhancedStudents, allProjectMembers, realData]);

  // 載入狀態
  if (realData.loading) {
    return (
      <div className="h-screen w-full bg-gray-50 pt-16 pl-16 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 渲染檢視模式切換按鈕
  const renderViewModeButtons = () => (
    <div className="flex flex-wrap gap-1 sm:gap-2">
      <button
        onClick={() => setViewMode('overview')}
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          viewMode === 'overview' 
            ? 'bg-teal-600 text-white' 
            : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
        }`}
      >
        總覽
      </button>
      <button
        onClick={() => setViewMode('all-students')}
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          viewMode === 'all-students' 
            ? 'bg-teal-600 text-white' 
            : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
        }`}
      >
        所有學生
      </button>
      <button
        onClick={() => setViewMode('groups')}
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          viewMode === 'groups' 
            ? 'bg-teal-600 text-white' 
            : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
        }`}
      >
        小組檢視
      </button>
      <button
        onClick={() => setViewMode('individual')}
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          viewMode === 'individual' 
            ? 'bg-teal-600 text-white' 
            : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
        }`}
      >
        個人檢視
      </button>
      <button
        onClick={() => setViewMode('analytics')}
        className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          viewMode === 'analytics' 
            ? 'bg-teal-600 text-white' 
            : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
        }`}
      >
        數據分析
      </button>
    </div>
  );

  // 渲染統計卡片
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">總學生數</h3>
        <p className="text-lg sm:text-3xl font-bold text-teal-600">{classStats.totalStudents}</p>
        <p className="text-xs text-gray-400 mt-1">活躍學生: {classStats.activeStudents}</p>
      </div>
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">平均進度</h3>
        <p className="text-lg sm:text-3xl font-bold text-blue-600">{classStats.averageProgress}%</p>
        <p className="text-xs text-gray-400 mt-1">需關注: {classStats.needAttentionStudents}人</p>
      </div>
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">反思記錄</h3>
        <p className="text-lg sm:text-3xl font-bold text-green-600">{classStats.totalReflections}</p>
        <p className="text-xs text-gray-400 mt-1">本週新增</p>
      </div>
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">想法節點</h3>
        <p className="text-lg sm:text-3xl font-bold text-purple-600">{classStats.totalIdeaNodes}</p>
        <p className="text-xs text-gray-400 mt-1">創意發想</p>
      </div>
    </div>
  );

  // 渲染總覽檢視
  const renderOverviewView = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* 快速統計 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">班級概況</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">學習進度分佈</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>優秀 (80%+)</span>
                <span>{enhancedStudents.filter(s => s.status === 'excellent').length}人</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>良好 (60-79%)</span>
                <span>{enhancedStudents.filter(s => s.status === 'active').length}人</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>需關注 (&lt;60%)</span>
                <span>{enhancedStudents.filter(s => s.status === 'attention' || s.status === 'inactive').length}人</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">活動統計</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>看板任務</span>
                <span>{classStats.totalTasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>反思記錄</span>
                <span>{classStats.totalReflections}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>想法節點</span>
                <span>{classStats.totalIdeaNodes}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">專案狀態</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>總專案數</span>
                <span>{classStats.totalProjects}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>當前專案</span>
                <span>{realData.projectName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>參與學生</span>
                <span>{enhancedStudents.length}人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近活動 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">最近活動</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          {(() => {
            // 收集當前專案的所有活動
            const activities = [];
            
            // 添加反思活動
            realData.reflections.forEach(reflection => {
              const userName = reflection.username || reflection.userName || reflection.user_name || reflection.name || '學生';
              const studentInfo = enhancedStudents.find(s => 
                s.username === userName || 
                s.name === userName ||
                s.id === reflection.user_id ||
                s.id === reflection.userId
              );
              const displayName = studentInfo ? (studentInfo.username || studentInfo.name) : userName;
              
              activities.push({
                type: "reflection",
                title: `學生提交反思`,
                description: `${displayName} 提交學習反思`,
                time: formatRelativeTime(reflection.createdAt || reflection.created_at),
                createdAt: reflection.createdAt || reflection.created_at,
                user: displayName
              });
            });

            // 添加想法節點活動
            realData.nodes.forEach(node => {
              const userName = node.owner || node.username || node.user_name || node.name || '學生';
              const studentInfo = enhancedStudents.find(s => 
                s.username === userName || 
                s.name === userName ||
                s.id === node.user_id ||
                s.id === node.userId
              );
              const displayName = studentInfo ? (studentInfo.username || studentInfo.name) : userName;
              
              activities.push({
                type: "idea",
                title: `新增想法節點`,
                description: `${displayName} 發布新想法：「${node.title}」`,
                time: formatRelativeTime(node.createdAt || node.created_at),
                createdAt: node.createdAt || node.created_at,
                user: displayName
              });
            });

            // 添加提交活動
            realData.submissions.forEach(submission => {
              const userName = submission.username || submission.userName || submission.user_name || submission.name || '學生';
              const studentInfo = enhancedStudents.find(s => 
                s.username === userName || 
                s.name === userName ||
                s.id === submission.user_id ||
                s.id === submission.userId
              );
              const displayName = studentInfo ? (studentInfo.username || studentInfo.name) : userName;
              
              activities.push({
                type: "submission",
                title: `作業提交`,
                description: `${displayName} 提交作業`,
                time: formatRelativeTime(submission.createdAt || submission.created_at),
                createdAt: submission.createdAt || submission.created_at,
                user: displayName
              });
            });

            // 添加看板任務活動
            realData.tasks.forEach(task => {
              const userName = task.owner || task.created_by || task.username || task.user_name || '學生';
              const studentInfo = enhancedStudents.find(s => 
                s.username === userName || 
                s.name === userName ||
                s.id === task.user_id ||
                s.id === task.userId
              );
              const displayName = studentInfo ? (studentInfo.username || studentInfo.name) : userName;
              
              activities.push({
                type: "task",
                title: `看板任務`,
                description: `${displayName} 建立任務：「${task.title}」`,
                time: formatRelativeTime(task.createdAt || task.created_at),
                createdAt: task.createdAt || task.created_at,
                user: displayName
              });
            });

            // 添加聊天活動
            realData.chatHistory.forEach(chat => {
              const userName = chat.username || chat.userName || chat.user_name || chat.name || '學生';
              const studentInfo = enhancedStudents.find(s => 
                s.username === userName || 
                s.name === userName ||
                s.id === chat.user_id ||
                s.id === chat.userId
              );
              const displayName = studentInfo ? (studentInfo.username || studentInfo.name) : userName;
              
              activities.push({
                type: "chat",
                title: `參與討論`,
                description: `${displayName} 在聊天室中發言`,
                time: formatRelativeTime(chat.createdAt || chat.created_at),
                createdAt: chat.createdAt || chat.created_at,
                user: displayName
              });
            });

            // 按時間排序並取前15個
            return activities
              .filter(activity => activity.createdAt)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 15)
              .map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    activity.type === 'reflection' ? 'bg-green-500' :
                    activity.type === 'idea' ? 'bg-purple-500' :
                    activity.type === 'submission' ? 'bg-blue-500' :
                    activity.type === 'task' ? 'bg-orange-500' : 'bg-teal-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded mb-1">
                      {activity.type === 'reflection' ? '反思' :
                       activity.type === 'idea' ? '想法' :
                       activity.type === 'submission' ? '提交' :
                       activity.type === 'task' ? '任務' : '討論'}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      {activity.user}
                    </span>
                  </div>
                </div>
              ));
          })()}
          {(() => {
            const totalActivities = realData.reflections.length + realData.nodes.length + realData.submissions.length + realData.chatHistory.length + realData.tasks.length;
            return totalActivities === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無最近活動</div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );

  // 渲染所有學生檢視
  const renderAllStudentsView = () => (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">
        所有學生概覽
        <span className="ml-2 text-sm text-gray-500">({enhancedStudents.length} 位學生)</span>
      </h2>
      
      {/* 學生統計摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-blue-700">總反思記錄</h3>
          <p className="text-xl font-bold text-blue-600">{enhancedStudents.reduce((sum, s) => sum + s.weeklyReflections, 0)}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-purple-700">總想法節點</h3>
          <p className="text-xl font-bold text-purple-600">{enhancedStudents.reduce((sum, s) => sum + s.ideaNodes, 0)}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-orange-700">總看板任務</h3>
          <p className="text-xl font-bold text-orange-600">{enhancedStudents.reduce((sum, s) => sum + s.kanbanTasks, 0)}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-green-700">平均進度</h3>
          <p className="text-xl font-bold text-green-600">
            {enhancedStudents.length > 0 ? Math.round(enhancedStudents.reduce((sum, s) => sum + s.progressPercentage, 0) / enhancedStudents.length) : 0}%
          </p>
        </div>
      </div>
      
      {/* 桌面版表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-3 text-left">學生姓名</th>
                <th className="border p-3 text-left">當前專案</th>
                <th className="border p-3 text-center">進度</th>
                <th className="border p-3 text-center">最後活動</th>
                <th className="border p-3 text-center">反思記錄</th>
                <th className="border p-3 text-center">想法節點</th>
                <th className="border p-3 text-center">看板任務</th>
                <th className="border p-3 text-center">聊天訊息</th>
                <th className="border p-3 text-center">狀態</th>
                <th className="border p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {enhancedStudents.length > 0 ? enhancedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="border p-3 font-medium">
                    <div>
                      <p className="font-semibold">{student.username || student.name}</p>
                      <p className="text-xs text-gray-500">{student.teamRole}</p>
                    </div>
                  </td>
                  <td className="border p-3">
                    <div>
                      <p className="font-medium">{student.projectName}</p>
                      <p className="text-xs text-gray-500">階段 {student.currentStage}-{student.currentSubStage}</p>
                    </div>
                  </td>
                  <td className="border p-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full" 
                          style={{ width: `${student.progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{student.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="border p-3 text-center text-sm text-gray-600">
                    {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.weeklyReflections > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {student.weeklyReflections}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.ideaNodes > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {student.ideaNodes}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.kanbanTasks > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {student.kanbanTasks}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.chatMessages > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                      {student.chatMessages}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                      {student.status === 'excellent' ? '優秀' : 
                       student.status === 'active' ? '活躍' :
                       student.status === 'attention' ? '需關注' : '不活躍'}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setViewMode('individual');
                      }}
                      className="bg-teal-500 text-white px-3 py-1 rounded text-sm hover:bg-teal-600 transition-colors"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="10" className="border p-6 text-center text-gray-500">
                    暫無學生資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 行動裝置版卡片 */}
      <div className="lg:hidden space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
           style={{ scrollBehavior: 'smooth' }}>
        {enhancedStudents.length > 0 ? enhancedStudents.map((student) => (
          <div key={student.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-800">{student.username || student.name}</h3>
                <p className="text-sm text-gray-600">{student.projectName}</p>
                <p className="text-xs text-gray-500">{student.teamRole} • 階段 {student.currentStage}-{student.currentSubStage}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                {student.status === 'excellent' ? '優秀' : 
                 student.status === 'active' ? '活躍' :
                 student.status === 'attention' ? '需關注' : '不活躍'}
              </span>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">學習進度</span>
                <span className="text-sm font-medium">{student.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${student.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500">反思</p>
                <p className={`font-medium ${student.weeklyReflections > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {student.weeklyReflections}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">想法</p>
                <p className={`font-medium ${student.ideaNodes > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                  {student.ideaNodes}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">任務</p>
                <p className={`font-medium ${student.kanbanTasks > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {student.kanbanTasks}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">聊天</p>
                <p className={`font-medium ${student.chatMessages > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                  {student.chatMessages}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                最後活動: {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
              </span>
              <button 
                onClick={() => {
                  setSelectedStudent(student);
                  setViewMode('individual');
                }}
                className="bg-teal-500 text-white px-3 py-2 rounded text-sm hover:bg-teal-600 transition-colors"
              >
                查看詳情
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-8">
            暫無學生資料
          </div>
        )}
      </div>
    </div>
  );

  // 渲染小組檢視
  const renderGroupsView = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">小組選擇</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          {groupData.map((group) => (
            <div 
              key={group.id} 
              onClick={() => setSelectedGroup(group)}
              className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedGroup?.id === group.id 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300'
              }`}
            >
              <h3 className="font-semibold text-base sm:text-lg">{group.name}</h3>
              <p className="text-gray-600 text-sm">{group.projectName}</p>
              <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                <span className="text-xs sm:text-sm text-gray-500">成員: {group.members.join(', ')}</span>
                <span className="text-xs sm:text-sm font-medium text-teal-600">平均進度: {group.averageProgress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">{selectedGroup.name} - 詳細分析</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-teal-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-teal-700">平均進度</h3>
              <p className="text-lg sm:text-2xl font-bold text-teal-600">{selectedGroup.averageProgress}%</p>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-blue-700">協作分數</h3>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{selectedGroup.collaborationScore}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-green-700">總想法節點</h3>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{selectedGroup.totalIdeaNodes}</p>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-purple-700">團隊反思</h3>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{selectedGroup.teamReflections}</p>
            </div>
          </div>

          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">成員姓名</th>
                  <th className="border p-3 text-center">角色</th>
                  <th className="border p-3 text-center">個人進度</th>
                  <th className="border p-3 text-center">貢獻度</th>
                  <th className="border p-3 text-center">最後活動</th>
                </tr>
              </thead>
              <tbody>
                {enhancedStudents
                  .filter(student => selectedGroup.members.includes(student.username || student.name))
                  .map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border p-3 font-medium">{student.username || student.name}</td>
                      <td className="border p-3 text-center">{student.teamRole}</td>
                      <td className="border p-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-teal-600 h-2 rounded-full" 
                              style={{ width: `${student.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{student.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="border p-3 text-center">
                        <span className="text-sm font-medium">
                          {Math.round((student.chatMessages + student.ideaNodes + student.weeklyReflections) / 3)}%
                        </span>
                      </td>
                      <td className="border p-3 text-center text-sm text-gray-600">
                        {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* 行動裝置版卡片 */}
          <div className="lg:hidden space-y-3">
            {enhancedStudents
              .filter(student => selectedGroup.members.includes(student.username || student.name))
              .map((student) => (
                <div key={student.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{student.username || student.name}</h3>
                      <p className="text-sm text-gray-600">{student.teamRole}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">個人進度</span>
                      <span className="text-sm font-medium">{student.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full" 
                        style={{ width: `${student.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span>貢獻度: </span>
                    <span className="font-medium text-gray-800">
                      {Math.round((student.chatMessages + student.ideaNodes + student.weeklyReflections) / 3)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染個人檢視
  const renderIndividualView = () => {
    const student = selectedStudent || enhancedStudents[0];
    
    if (!student) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-600">暫無學生資料</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-700">{student.username || student.name} - 詳細學習歷程</h2>
            {userRole === 'teacher' && enhancedStudents.length > 1 && (
              <div className="w-full sm:w-auto">
                <select 
                  value={student.id}
                  onChange={(e) => {
                    const selectedId = parseInt(e.target.value);
                    const selected = enhancedStudents.find(s => s.id === selectedId);
                    setSelectedStudent(selected);
                  }}
                  className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {enhancedStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.username || s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-base sm:text-lg font-semibold mb-3">學習進度分析</h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">專案進度</span>
                  <span className="text-sm text-gray-600">{student.progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-teal-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${student.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-xs sm:text-sm text-gray-600 space-y-1">
                  <p>當前階段: 第 {student.currentStage} 階段 - 子階段 {student.currentSubStage}</p>
                  <p>專案名稱: {student.projectName}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-700">學習活躍度</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>聊天訊息</span>
                      <span>{student.chatMessages}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Q&A 提問</span>
                      <span>{student.qaQuestions}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>AI 互動</span>
                      <span>{student.aiInteractions}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-green-700">創作表現</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>想法節點</span>
                      <span>{student.ideaNodes}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>反思記錄</span>
                      <span>{student.weeklyReflections}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>檔案上傳</span>
                      <span>{Math.floor(Math.random() * 10) + 5}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">狀態與建議</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${getStatusColor(student.status)}`}>
                  <span className="text-xs sm:text-sm font-medium">
                    {student.status === 'excellent' ? '學習表現優秀' : 
                     student.status === 'active' ? '學習狀態良好' :
                     student.status === 'attention' ? '需要關注' : '學習不活躍'}
                  </span>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-yellow-700 mb-2">學習建議</h4>
                  <ul className="text-xs text-yellow-600 space-y-1">
                    {student.status === 'attention' || student.status === 'inactive' ? (
                      <>
                        <li>• 建議增加反思記錄頻率</li>
                        <li>• 可嘗試更多想法創作</li>
                        <li>• 建議主動參與小組討論</li>
                      </>
                    ) : (
                      <>
                        <li>• 保持良好的學習習慣</li>
                        <li>• 可協助其他同學學習</li>
                        <li>• 嘗試挑戰更深入的主題</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-purple-700 mb-2">團隊角色</h4>
                  <p className="text-xs text-purple-600">{student.teamRole}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    最後活動: {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 近期學習軌跡 */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-700">近期學習軌跡</h3>
          <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            {(() => {
              // 收集該學生的所有活動
              const studentActivities = [];
              
              // 添加學生的反思活動
              realData.reflections
                .filter(r => {
                  const studentIdentifiers = [
                    student.username,
                    student.name,
                    student.user_name,
                    student.userName,
                    `${student.id}`,
                    student.email
                  ].filter(Boolean);
                  
                  return studentIdentifiers.includes(r.username) ||
                    studentIdentifiers.includes(r.userName) ||
                    studentIdentifiers.includes(r.user_name) ||
                    studentIdentifiers.includes(r.name) ||
                    r.user_id === student.id ||
                    r.userId === student.id ||
                    `${r.user_id}` === `${student.id}` ||
                    `${r.userId}` === `${student.id}`;
                })
                .forEach(reflection => {
                  studentActivities.push({
                    type: 'reflection',
                    title: '提交學習反思',
                    description: `提交學習反思：「${reflection.title || '無標題'}」`,
                    time: formatRelativeTime(reflection.createdAt || reflection.created_at),
                    createdAt: reflection.createdAt || reflection.created_at,
                    data: reflection
                  });
                });

              // 添加學生的想法節點活動
              realData.nodes
                .filter(n => {
                  const studentIdentifiers = [
                    student.username,
                    student.name,
                    student.user_name,
                    student.userName,
                    `${student.id}`,
                    student.email
                  ].filter(Boolean);
                  
                  return studentIdentifiers.includes(n.owner) ||
                    studentIdentifiers.includes(n.username) ||
                    studentIdentifiers.includes(n.user_name) ||
                    studentIdentifiers.includes(n.name) ||
                    n.user_id === student.id ||
                    n.userId === student.id ||
                    `${n.user_id}` === `${student.id}` ||
                    `${n.userId}` === `${student.id}`;
                })
                .forEach(node => {
                  studentActivities.push({
                    type: 'idea',
                    title: '發布新想法節點',
                    description: `發布新想法節點：「${node.title}」`,
                    time: formatRelativeTime(node.createdAt || node.created_at),
                    createdAt: node.createdAt || node.created_at,
                    data: node
                  });
                });

              // 添加學生的任務活動
              realData.tasks
                .filter(t => {
                  const studentIdentifiers = [
                    student.username,
                    student.name,
                    student.user_name,
                    student.userName,
                    `${student.id}`,
                    student.email
                  ].filter(Boolean);
                  
                  return studentIdentifiers.includes(t.owner) ||
                    studentIdentifiers.includes(t.created_by) ||
                    studentIdentifiers.includes(t.username) ||
                    studentIdentifiers.includes(t.user_name) ||
                    t.user_id === student.id ||
                    t.userId === student.id ||
                    `${t.user_id}` === `${student.id}` ||
                    `${t.userId}` === `${student.id}` ||
                    (t.assignees && t.assignees.some(a => 
                      studentIdentifiers.includes(a.username) ||
                      studentIdentifiers.includes(a.name) ||
                      a.id === student.id ||
                      `${a.id}` === `${student.id}`
                    ));
                })
                .forEach(task => {
                  studentActivities.push({
                    type: 'task',
                    title: '看板任務活動',
                    description: `參與任務：「${task.title}」`,
                    time: formatRelativeTime(task.createdAt || task.created_at),
                    createdAt: task.createdAt || task.created_at,
                    data: task
                  });
                });

              // 添加學生的提交活動
              realData.submissions
                .filter(s => {
                  const studentIdentifiers = [
                    student.username,
                    student.name,
                    student.user_name,
                    student.userName,
                    `${student.id}`,
                    student.email
                  ].filter(Boolean);
                  
                  return studentIdentifiers.includes(s.username) ||
                    studentIdentifiers.includes(s.userName) ||
                    studentIdentifiers.includes(s.user_name) ||
                    studentIdentifiers.includes(s.name) ||
                    s.user_id === student.id ||
                    s.userId === student.id ||
                    `${s.user_id}` === `${student.id}` ||
                    `${s.userId}` === `${student.id}`;
                })
                .forEach(submission => {
                  studentActivities.push({
                    type: 'submission',
                    title: '作業提交',
                    description: `提交作業`,
                    time: formatRelativeTime(submission.createdAt || submission.created_at),
                    createdAt: submission.createdAt || submission.created_at,
                    data: submission
                  });
                });

              // 添加學生的聊天活動
              realData.chatHistory
                .filter(c => {
                  const studentIdentifiers = [
                    student.username,
                    student.name,
                    student.user_name,
                    student.userName,
                    `${student.id}`,
                    student.email
                  ].filter(Boolean);
                  
                  return studentIdentifiers.includes(c.username) ||
                    studentIdentifiers.includes(c.userName) ||
                    studentIdentifiers.includes(c.user_name) ||
                    studentIdentifiers.includes(c.name) ||
                    c.user_id === student.id ||
                    c.userId === student.id ||
                    `${c.user_id}` === `${student.id}` ||
                    `${c.userId}` === `${student.id}`;
                })
                .forEach(chat => {
                  studentActivities.push({
                    type: 'chat',
                    title: '參與討論',
                    description: `在聊天室中發言`,
                    time: formatRelativeTime(chat.createdAt || chat.created_at),
                    createdAt: chat.createdAt || chat.created_at,
                    data: chat
                  });
                });

              // 按時間排序並取前20個
              const sortedActivities = studentActivities
                .filter(activity => activity.createdAt)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 20);

              if (sortedActivities.length === 0) {
                return (
                  <div className="text-center text-gray-500 py-6">
                    <div className="mb-2">📝</div>
                    <p>該學生尚未有學習軌跡記錄</p>
                  </div>
                );
              }

              return sortedActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    activity.type === 'reflection' ? 'bg-blue-500' :
                    activity.type === 'idea' ? 'bg-yellow-500' :
                    activity.type === 'task' ? 'bg-orange-500' :
                    activity.type === 'submission' ? 'bg-green-500' : 'bg-teal-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 break-words">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded whitespace-nowrap">
                    {activity.type === 'reflection' ? '反思' :
                     activity.type === 'idea' ? '想法' :
                     activity.type === 'task' ? '任務' :
                     activity.type === 'submission' ? '提交' : '討論'}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    );
  };

  // 渲染數據分析檢視
  const renderAnalyticsView = () => {
    // 🔹 建立關聯對照表
    const relationMap = {};
    realData.nodeRelations.forEach(relation => {
      if (!relationMap[relation.from]) {
        relationMap[relation.from] = [];
      }
      relationMap[relation.from].push(relation.to);
    });

    console.log("🔍 數據分析 - 關聯對照表:", relationMap);
    console.log("🔍 數據分析 - 節點數量:", realData.nodes.length);
    console.log("🔍 數據分析 - 關聯數量:", realData.nodeRelations.length);

    // 計算創作者統計
    const nodeCreators = realData.nodes.reduce((acc, node) => {
      const creator = node.owner || node.username || node.user_name || '未知';
      acc[creator] = (acc[creator] || 0) + 1;
      return acc;
    }, {});

    // 計算任務創建者統計
    const taskCreators = realData.tasks.reduce((acc, task) => {
      const creator = task.owner || task.created_by || task.username || '未知';
      acc[creator] = (acc[creator] || 0) + 1;
      return acc;
    }, {});

    // 計算學生活動統計
    const studentActivity = enhancedStudents.map(student => ({
      name: student.username || student.name,
      reflections: student.weeklyReflections,
      nodes: student.ideaNodes,
      tasks: student.kanbanTasks,
      totalActivity: student.weeklyReflections + student.ideaNodes + student.kanbanTasks
    })).sort((a, b) => b.totalActivity - a.totalActivity);

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* 數據概覽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">總想法節點</h3>
            <p className="text-2xl sm:text-3xl font-bold">{realData.nodes.length}</p>
            <p className="text-xs mt-1 opacity-80">
              活躍創作者: {Object.keys(nodeCreators).length}人
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">看板任務</h3>
            <p className="text-2xl sm:text-3xl font-bold">{realData.tasks.length}</p>
            <p className="text-xs mt-1 opacity-80">
              已完成: {realData.tasks.filter(t => t.status === '已完成' || t.status === 'Done').length}
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">節點關聯</h3>
            <p className="text-2xl sm:text-3xl font-bold">{realData.nodeRelations.length}</p>
            <p className="text-xs mt-1 opacity-80">
              平均每節點: {realData.nodes.length > 0 ? (realData.nodeRelations.length / realData.nodes.length).toFixed(1) : 0} 個連結
            </p>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">學習反思</h3>
            <p className="text-2xl sm:text-3xl font-bold">{realData.reflections.length}</p>
            <p className="text-xs mt-1 opacity-80">
              平均每人: {enhancedStudents.length > 0 ? (realData.reflections.length / enhancedStudents.length).toFixed(1) : 0} 篇
            </p>
          </div>
        </div>

        {/* 學生活動排行榜 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">學生活動排行榜</h2>
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentActivity.slice(0, 10).map((student, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{student.name}</p>
                    <div className="text-xs text-gray-600 flex space-x-3">
                      <span>反思: {student.reflections}</span>
                      <span>想法: {student.nodes}</span>
                      <span>任務: {student.tasks}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600">{student.totalActivity}</p>
                    <p className="text-xs text-gray-500">總活動</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 想法牆統計 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">想法牆統計</h2>
          
          {/* 創作者排行 */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3 text-gray-600">創作者排行</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
                 style={{ scrollBehavior: 'smooth' }}>
              {Object.entries(nodeCreators)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 9)
                .map(([creator, count], index) => (
                  <div key={creator} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-sm font-medium text-purple-800">{creator}</span>
                    <span className="text-sm text-purple-600">{count} 個節點</span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="max-h-96 overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
                 style={{ scrollBehavior: 'smooth' }}>
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-2 text-left">擁有者</th>
                    <th className="border p-2 text-left">標題</th>
                    <th className="border p-2 text-center">建立時間</th>
                    <th className="border p-2 text-center">延伸節點</th>
                  </tr>
                </thead>
                <tbody>
                  {realData.nodes.length > 0 ? (
                    (() => {
                      // 計算 rowSpan
                      const ownerRowSpan = {};
                      realData.nodes.forEach((node) => {
                        const owner = node.owner || node.username || node.user_name || '未知';
                        ownerRowSpan[owner] = (ownerRowSpan[owner] || 0) + 1;
                      });

                      let processedOwners = new Set();

                      return realData.nodes.map((node, index) => {
                        const owner = node.owner || node.username || node.user_name || '未知';
                        const isFirstOfOwner = !processedOwners.has(owner);
                        processedOwners.add(owner);

                        return (
                          <tr key={node.id || index} className="hover:bg-gray-50">
                            {isFirstOfOwner && (
                              <td className="border p-2 text-left bg-gray-50 font-medium" rowSpan={ownerRowSpan[owner]}>
                                {owner}
                              </td>
                            )}
                            <td className="border p-2 text-left">{node.title || '無標題'}</td>
                            <td className="border p-2 text-center text-sm">
                              {node.createdAt ? new Date(node.createdAt).toLocaleString('zh-TW', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "無資料"}
                            </td>
                            <td className={`border p-2 text-center text-sm ${relationMap[node.id]?.length > 0 ? "font-bold text-teal-600" : "text-gray-500"}`}>
                              {relationMap[node.id]?.length > 0
                                ? relationMap[node.id]
                                    .map(id => {
                                      const targetNode = realData.nodes.find(n => n.id === id);
                                      return targetNode ? targetNode.title : `節點${id}`;
                                    })
                                    .join(", ")
                                : "無延伸節點"}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  ) : (
                    <tr>
                      <td colSpan="4" className="border p-4 text-center text-gray-500">無節點數據</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 行動裝置版卡片 */}
          <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
            {realData.nodes.length > 0 ? realData.nodes.map((node, index) => (
              <div key={node.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800 text-sm">{node.title || '無標題'}</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {node.owner || node.username || node.user_name || '未知'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {node.createdAt ? new Date(node.createdAt).toLocaleString('zh-TW') : "無資料"}
                </p>
                <div className="text-xs">
                  <span className="text-gray-600">延伸節點: </span>
                  <span className={relationMap[node.id]?.length > 0 ? "font-medium text-teal-600" : "text-gray-500"}>
                    {relationMap[node.id]?.length > 0
                      ? relationMap[node.id]
                          .map(id => {
                            const targetNode = realData.nodes.find(n => n.id === id);
                            return targetNode ? targetNode.title : `節點${id}`;
                          })
                          .join(", ")
                      : "無延伸節點"}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">無節點數據</div>
            )}
          </div>
        </div>

        {/* 進度看板統計 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">進度看板統計</h2>
          
          {/* 任務創建者排行 */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3 text-gray-600">任務創建者排行</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
                 style={{ scrollBehavior: 'smooth' }}>
              {Object.entries(taskCreators)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 9)
                .map(([creator, count], index) => (
                  <div key={creator} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium text-orange-800">{creator}</span>
                    <span className="text-sm text-orange-600">{count} 個任務</span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="max-h-96 overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
                 style={{ scrollBehavior: 'smooth' }}>
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-2 text-left">狀態</th>
                    <th className="border p-2 text-left">標題</th>
                    <th className="border p-2 text-left">內容</th>
                    <th className="border p-2 text-center">建立者</th>
                    <th className="border p-2 text-center">負責人</th>
                    <th className="border p-2 text-center">圖片</th>
                  </tr>
                </thead>
                <tbody>
                  {realData.tasks.length > 0 ? (
                    realData.tasks.sort((a, b) => a.columnId - b.columnId).reduce((acc, task, index, array) => {
                      const prevTask = array[index - 1];
                      const showStatus = !prevTask || prevTask.status !== task.status;
                      
                      acc.push(
                        <tr key={task.id || index} className="hover:bg-gray-50">
                          {showStatus && (
                            <td 
                              className="border p-2 font-medium bg-gray-50 text-center" 
                              rowSpan={array.filter(t => t.status === task.status).length}
                            >
                              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                                {task.status}
                              </span>
                            </td>
                          )}
                          <td className="border p-2">{task.title || '無標題'}</td>
                          <td className="border p-2">
                            <div className="max-w-xs truncate">
                              {task.content || '無內容'}
                            </div>
                          </td>
                          <td className="border p-2 text-center">{task.owner || task.created_by || '未知'}</td>
                          <td className="border p-2 text-center">
                            {task.assignees?.length > 0 
                              ? task.assignees.map(a => a.username || a.name).join(", ")
                              : task.assigned_to || '未指派'}
                          </td>
                          <td className="border p-2 text-center">
                            {task.images?.length > 0 ? (
                              <img 
                                src={task.images[0]} 
                                alt="任務圖片" 
                                className="w-8 h-8 object-cover rounded mx-auto"
                              />
                            ) : task.image ? (
                              <img 
                                src={task.image} 
                                alt="任務圖片" 
                                className="w-8 h-8 object-cover rounded mx-auto"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">無圖片</span>
                            )}
                          </td>
                        </tr>
                      );
                      return acc;
                    }, [])
                  ) : (
                    <tr>
                      <td colSpan="6" className="border p-4 text-center text-gray-500">無任務數據</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 行動裝置版卡片 */}
          <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
            {realData.tasks.length > 0 ? realData.tasks.map((task, index) => (
              <div key={task.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800 text-sm">{task.title || '無標題'}</h3>
                  <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                    {task.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {task.content || '無內容'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">建立者: </span>
                    <span className="font-medium">{task.owner || task.created_by || '未知'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">負責人: </span>
                    <span className="font-medium">
                      {task.assignees?.length > 0 
                        ? task.assignees.map(a => a.username || a.name).join(", ")
                        : task.assigned_to || '未指派'}
                    </span>
                  </div>
                </div>
                {(task.images?.length > 0 || task.image) && (
                  <div className="mt-2">
                    <img 
                      src={task.images?.[0] || task.image} 
                      alt="任務圖片" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">無任務數據</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-gray-50 pt-16 pl-16 overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100 hover:scrollbar-thumb-customgreen/80" 
           style={{ scrollBehavior: 'smooth' }}>
        <div className="p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 標題和檢視模式切換 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 space-y-3 lg:space-y-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600">
                {userRole === 'teacher' ? '教師管理儀表板' : '我的學習歷程'}
              </h1>
              
              {userRole === 'teacher' && renderViewModeButtons()}
            </div>

            {/* 統計卡片 */}
            {renderStatsCards()}

            {/* 主要內容區域 */}
            <div className="space-y-6 pb-6">
              {userRole === 'teacher' ? (
                <>
                  {viewMode === 'overview' && renderOverviewView()}
                  {viewMode === 'all-students' && renderAllStudentsView()}
                  {viewMode === 'groups' && renderGroupsView()}
                  {viewMode === 'individual' && renderIndividualView()}
                  {viewMode === 'analytics' && renderAnalyticsView()}
                </>
              ) : (
                renderIndividualView()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherManagementDashboard;
