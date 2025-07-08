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

const TeacherDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'students', 'groups', 'analytics'
  
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
        
        // 並行獲取所有資料
        const [
          columnData,
          ideaWallData,
          studentsData,
          reflectionsData,
          chatroomsData,
          chatHistoryData,
          submissionsData,
          projectActivityData,
          allProjectsData
        ] = await Promise.allSettled([
          // 獲取 Kanban 資料
          getKanbanColumns(parsedProjectId),
          // 獲取想法牆資料
          getIdeaWall(parsedProjectId, "1-1"),
          // 獲取專案學生資料
          getProjectUser(parsedProjectId),
          // 獲取反思記錄
          getAllPersonalDaily({ projectId: parsedProjectId, isTeacher: true }),
          // 獲取聊天室
          getAllChatrooms(parsedProjectId),
          // 獲取聊天記錄
          getChatroomHistory(parsedProjectId),
          // 獲取提交記錄
          getAllSubmit({ params: { projectId: parsedProjectId } }),
          // 獲取專案活動
          getProjectActivity(parsedProjectId),
          // 獲取教師的所有專案
          getProjectsByMentor(localStorage.getItem("username"))
        ]);

        console.log("📢 取得所有資料:", {
          columnData: columnData.status === 'fulfilled' ? columnData.value : null,
          studentsData: studentsData.status === 'fulfilled' ? studentsData.value : null,
          reflectionsData: reflectionsData.status === 'fulfilled' ? reflectionsData.value : null
        });

        // 處理 Kanban 任務
        let allTasks = [];
        if (columnData.status === 'fulfilled' && columnData.value && columnData.value.length > 0) {
          columnData.value.forEach(column => {
            column.task.forEach(task => {
              allTasks.push({
                ...task,
                columnId: column.id,
                status: column.name
              });
            });
          });
        }

        // 處理想法節點
        let allNodes = [];
        let allRelations = [];
        if (ideaWallData.status === 'fulfilled' && ideaWallData.value && ideaWallData.value.id) {
          try {
            const nodeData = await getNodes(ideaWallData.value.id);
            const relationData = await getNodeRelation(ideaWallData.value.id);
            allNodes = nodeData || [];
            allRelations = relationData || [];
          } catch (nodeError) {
            console.warn("⚠️ 節點資料獲取失敗:", nodeError);
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
          chatHistory: chatHistoryData.status === 'fulfilled' ? (chatHistoryData.value || []) : [],
          submissions: submissionsData.status === 'fulfilled' ? (submissionsData.value || []) : [],
          projectActivity: projectActivityData.status === 'fulfilled' ? (projectActivityData.value || []) : [],
          allProjects: allProjectsData.status === 'fulfilled' ? (allProjectsData.value || []) : [],
          loading: false
        };

        // 調試信息
        console.log("📊 教師儀表板資料總覽:", {
          學生數量: finalData.students.length,
          專案數量: finalData.allProjects.length,
          任務數量: finalData.tasks.length,
          想法節點數量: finalData.nodes.length,
          反思記錄數量: finalData.reflections.length,
          聊天記錄數量: finalData.chatHistory.length
        });

        if (finalData.students.length > 0) {
          console.log("👥 學生資料樣本:", finalData.students[0]);
        }
        if (finalData.allProjects.length > 0) {
          console.log("📚 專案資料樣本:", finalData.allProjects[0]);
        }
        if (finalData.nodes.length > 0) {
          console.log("💡 想法節點樣本:", finalData.nodes[0]);
        }

        setRealData(finalData);

      } catch (error) {
        console.error("❌ 載入數據失敗:", error);
        setRealData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRealData();
  }, [parsedProjectId]);
  
  // 獲取所有專案的成員資料
  useEffect(() => {
    const fetchAllProjectMembers = async () => {
      if (realData.allProjects.length === 0) return;
      
      try {
        const membersData = {};
        
        // 為每個專案獲取成員資料
        const memberPromises = realData.allProjects.map(async (project) => {
          try {
            const projectMembers = await getProjectUser(project.id);
            membersData[project.id] = projectMembers || [];
            console.log(`專案 ${project.name} (ID: ${project.id}) 的成員:`, projectMembers);
          } catch (error) {
            console.error(`獲取專案 ${project.id} 成員失敗:`, error);
            membersData[project.id] = [];
          }
        });
        
        await Promise.all(memberPromises);
        setAllProjectMembers(membersData);
        console.log("所有專案成員資料:", membersData);
        
      } catch (error) {
        console.error("獲取專案成員資料失敗:", error);
      }
    };
    
    if (realData.allProjects.length > 0 && !realData.loading) {
      fetchAllProjectMembers();
    }
  }, [realData.allProjects, realData.loading]);

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

  // 計算專案進度（參考HomePage的計算方式）
  const calculateProgress = (currentStage, currentSubStage) => {
    if (currentStage === 5) {
      return (12 + currentSubStage) / 17 * 100;
    } else {
      return ((currentStage - 1) * 3 + currentSubStage) / 17 * 100;
    }
  };

  // 班級概覽統計（使用真實資料）
  const classStats = React.useMemo(() => {
    // 計算所有專案的學生總數（去重）
    const allStudents = [];
    Object.values(allProjectMembers).forEach(members => {
      members.forEach(member => {
        // 避免重複計算同一個學生
        if (!allStudents.some(s => s.id === member.id || s.username === member.username)) {
          allStudents.push(member);
        }
      });
    });

    const totalStudents = allStudents.length > 0 ? allStudents.length : realData.students.length;
    const studentsForCalculation = allStudents.length > 0 ? allStudents : realData.students;

    return {
      totalStudents,
      totalProjects: realData.allProjects.length,
      averageProgress: studentsForCalculation.length > 0 ? 
        Math.round(studentsForCalculation.reduce((sum, student) => {
          // 使用正確的進度計算方式
          const stage = student.currentStage || 1;
          const subStage = student.currentSubStage || 1;
          const progress = calculateProgress(stage, subStage);
          return sum + Math.min(progress, 100);
        }, 0) / studentsForCalculation.length) : 0,
      activeStudents: studentsForCalculation.filter(student => {
        // 最近一週內有活動的學生
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(student.updatedAt || student.lastActivity || student.createdAt) > oneWeekAgo;
      }).length,
      needAttention: studentsForCalculation.filter(student => {
        const stage = student.currentStage || 1;
        const subStage = student.currentSubStage || 1;
        const progress = calculateProgress(stage, subStage);
        return progress < 30; // 進度低於30%需要關注
      }).length,
      excellentPerformers: studentsForCalculation.filter(student => {
        const stage = student.currentStage || 1;
        const subStage = student.currentSubStage || 1;
        const progress = calculateProgress(stage, subStage);
        return progress >= 80; // 進度高於80%為優秀
      }).length,
      weeklyReflections: realData.reflections.filter(reflection => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(reflection.createdAt) > oneWeekAgo;
      }).length,
      totalIdeaNodes: realData.nodes.length,
      aiInteractions: realData.chatHistory.filter(chat => 
        chat.sender?.includes('AI') || chat.isBot || chat.type === 'ai'
      ).length,
      realTasks: realData.tasks.length
    };
  }, [allProjectMembers, realData, calculateProgress]);

  // 最近活動（使用真實資料）
  const recentActivities = React.useMemo(() => {
    const activities = [];
    
    // 輔助函數：獲取用戶名稱
    const getUserName = (item) => {
      return item.userName || item.username || item.user || item.author || 
             item.owner || item.assignee || item.name || 
             (item.userId && realData.students.find(s => s.id == item.userId)?.username) ||
             "匿名用戶";
    };
    
    // 添加專案活動記錄
    realData.projectActivity.slice(0, 3).forEach(activity => {
      activities.push({
        student: getUserName(activity),
        action: activity.action || activity.description || "執行了操作",
        time: formatRelativeTime(activity.createdAt || activity.timestamp),
        type: "progress"
      });
    });

    // 添加想法節點創建活動
    realData.nodes.slice(0, 3).forEach(node => {
      activities.push({
        student: getUserName(node),
        action: `發布想法節點：${node.title}`,
        time: formatRelativeTime(node.createdAt),
        type: "idea"
      });
    });

    // 添加反思提交活動
    realData.reflections.slice(0, 3).forEach(reflection => {
      activities.push({
        student: getUserName(reflection),
        action: "提交學習反思",
        time: formatRelativeTime(reflection.createdAt),
        type: "reflection"
      });
    });

    // 添加任務更新活動
    realData.tasks.slice(0, 3).forEach(task => {
      activities.push({
        student: getUserName(task),
        action: `更新任務：${task.title}`,
        time: formatRelativeTime(task.updatedAt || task.createdAt),
        type: "progress"
      });
    });

    // 過濾出有效的活動並排序
    return activities
      .filter(activity => activity.student !== "匿名用戶" || realData.students.length === 0) // 只有在沒有學生資料時才顯示匿名用戶
      .sort((a, b) => {
        // 將時間字符串轉換為數字進行比較
        const timeA = new Date(a.time === '剛剛' ? new Date() : a.time);
        const timeB = new Date(b.time === '剛剛' ? new Date() : b.time);
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [realData, formatRelativeTime]);

  // 需要關注的學生（使用真實資料）
  const studentsNeedAttention = React.useMemo(() => {
    return realData.students
      .map(student => {
        const stage = student.currentStage || 1;
        const subStage = student.currentSubStage || 1;
        const progress = Math.min(calculateProgress(stage, subStage), 100);
        
        // 計算最後活動時間
        const lastActivity = student.updatedAt || student.lastActivity || student.createdAt;
        const lastActivityTime = lastActivity ? formatRelativeTime(lastActivity) : "未知";
        
        // 判斷學生的問題類型和嚴重程度
        let issue = "";
        let severity = "low";
        
        if (progress < 20) {
          issue = "進度嚴重落後";
          severity = "high";
        } else if (progress < 40) {
          issue = "進度落後";
          severity = "medium";
        } else {
          // 檢查反思記錄
          const studentReflections = realData.reflections.filter(r => 
            r.userId === student.id || r.userName === student.username || r.username === student.username
          );
          if (studentReflections.length === 0) {
            issue = "缺少反思記錄";
            severity = "medium";
          } else {
            // 檢查最近參與度
            const recentActivity = new Date();
            recentActivity.setDate(recentActivity.getDate() - 3);
            if (new Date(lastActivity) < recentActivity) {
              issue = "最近較少活動";
              severity = "low";
            }
          }
        }
        
        return {
          name: student.username || student.name || student.userName || `學生${student.id}`,
          issue,
          progress: Math.round(progress),
          lastActivity: lastActivityTime,
          severity,
          needsAttention: severity !== "low" || progress < 50
        };
      })
      .filter(student => student.needsAttention)
      .sort((a, b) => {
        // 按嚴重程度排序
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5); // 只顯示前5個需要關注的學生
  }, [realData, calculateProgress, formatRelativeTime]);

  // 專案統計（使用真實資料）
  const projectStats = React.useMemo(() => {
    return realData.allProjects.map(project => {
      // 獲取該專案的學生列表
      const projectStudents = allProjectMembers[project.id] || [];
      
      // 計算平均進度
      const avgProgress = projectStudents.length > 0 ? 
        Math.round(projectStudents.reduce((sum, student) => {
          const stage = student.currentStage || project.currentStage || 1;
          const subStage = student.currentSubStage || project.currentSubStage || 1;
          const progress = calculateProgress(stage, subStage);
          return sum + progress;
        }, 0) / projectStudents.length) : 
        // 如果沒有學生資料，使用專案本身的進度
        Math.round(calculateProgress(project.currentStage || 1, project.currentSubStage || 1));
      
      // 判斷專案狀態
      let status = "良好";
      if (avgProgress >= 80) {
        status = "優秀";
      } else if (avgProgress < 50) {
        status = "需關注";
      }
      
      console.log(`專案 ${project.name}: 學生數 ${projectStudents.length}, 平均進度 ${avgProgress}%`);
      
      return {
        name: project.name || project.title || `專案 ${project.id}`,
        students: projectStudents.length,
        studentNames: projectStudents.map(s => s.username || s.name || s.userName).filter(Boolean),
        avgProgress,
        status
      };
    }).slice(0, 6); // 最多顯示6個專案
  }, [realData.allProjects, allProjectMembers, calculateProgress]);

  // 學習趨勢數據（使用真實資料）
  const learningTrends = useMemo(() => {
    const weeks = 5;
    const weeklyData = {
      weeklyProgress: [],
      reflectionSubmissions: [],
      ideaCreation: [],
      collaborationScore: []
    };
    
    for (let i = weeks - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);
      
      // 計算該週的平均進度
      const weekProgress = realData.students.length > 0 ? 
        Math.round(realData.students.reduce((sum, student) => {
          const stage = student.currentStage || 1;
          const subStage = student.currentSubStage || 1;
          const progress = calculateProgress(stage, subStage);
          return sum + progress;
        }, 0) / realData.students.length) : 0;
      
      // 計算該週的反思提交數
      const weekReflections = realData.reflections.filter(reflection => {
        const reflectionDate = new Date(reflection.createdAt);
        return reflectionDate >= startDate && reflectionDate < endDate;
      }).length;
      
      // 計算該週的想法創建數
      const weekIdeas = realData.nodes.filter(node => {
        const nodeDate = new Date(node.createdAt);
        return nodeDate >= startDate && nodeDate < endDate;
      }).length;
      
      // 計算協作分數（基於聊天和互動）
      const weekCollaboration = Math.min(100, 
        (weekReflections * 2) + (weekIdeas * 3) + 50
      );
      
      weeklyData.weeklyProgress.push(weekProgress);
      weeklyData.reflectionSubmissions.push(weekReflections);
      weeklyData.ideaCreation.push(weekIdeas);
      weeklyData.collaborationScore.push(weekCollaboration);
    }
    
    return weeklyData;
  }, [realData.students, realData.reflections, realData.nodes]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'progress': return '📈';
      case 'idea': return '💡';
      case 'reflection': return '📝';
      case 'help': return '🤝';
      case 'file': return '📎';
      default: return '📋';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case '優秀': return 'bg-green-100 text-green-800';
      case '良好': return 'bg-blue-100 text-blue-800';
      case '需關注': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 載入狀態
  if (realData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入班級資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 overflow-y-auto pt-16 pl-16">
      <div className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto pb-6">
        {/* 頁面標題與導航 */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600 mb-2">教師管理儀表板</h1>
            <p className="text-sm sm:text-base text-gray-600">監控和指導學生的學習進度</p>
            {realData.nodes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {realData.projectName} - {realData.nodes.length} 個想法節點，{realData.tasks.length} 個任務
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'overview' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
              }`}
            >
              總覽
            </button>
            <button
              onClick={() => setViewMode('students')}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'students' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
              }`}
            >
              學生管理
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'analytics' 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
              }`}
            >
              數據分析
            </button>
          </div>
        </div>

        {/* 主要統計卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">總學生數</p>
                <p className="text-xl sm:text-3xl font-bold">{classStats.totalStudents}</p>
              </div>
              <div className="text-2xl sm:text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">平均進度</p>
                <p className="text-xl sm:text-3xl font-bold">{classStats.averageProgress}%</p>
              </div>
              <div className="text-2xl sm:text-4xl">📊</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">活躍學習者</p>
                <p className="text-xl sm:text-3xl font-bold">{classStats.activeStudents}</p>
              </div>
              <div className="text-2xl sm:text-4xl">⚡</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs sm:text-sm">需要關注</p>
                <p className="text-xl sm:text-3xl font-bold">{classStats.needAttention}</p>
              </div>
              <div className="text-2xl sm:text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* 左側主要內容 */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-8">
              {/* 專案統計 */}
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">專案進度概覽</h2>
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                  {projectStats.map((project, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                        <h3 className="font-medium text-gray-800 text-sm sm:text-base">{project.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${getProjectStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500 text-xs sm:text-sm">學生數量</span>
                          <p className="font-medium">{project.students} 人</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs sm:text-sm">平均進度</span>
                          <p className="font-medium">{project.avgProgress}%</p>
                        </div>
                        <div className="sm:flex sm:items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-teal-600 h-2 rounded-full" 
                              style={{ width: `${project.avgProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      {/* 成員名單 */}
                      {project.studentNames && project.studentNames.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-500 text-xs sm:text-sm mb-2 block">專案成員</span>
                          <div className="flex flex-wrap gap-1">
                            {project.studentNames.map((name, idx) => (
                              <span 
                                key={idx} 
                                className="inline-block bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 真實專案資料 */}
              {realData.tasks.length > 0 && (
                <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">當前專案實際進度</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-teal-50 p-3 sm:p-4 rounded-lg">
                      <h3 className="font-medium text-teal-800 mb-2 text-sm sm:text-base">任務統計</h3>
                      <p className="text-2xl font-bold text-teal-600">{realData.tasks.length}</p>
                      <p className="text-xs text-teal-600">總任務數</p>
                    </div>
                    <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2 text-sm sm:text-base">想法節點</h3>
                      <p className="text-2xl font-bold text-yellow-600">{realData.nodes.length}</p>
                      <p className="text-xs text-yellow-600">創意發想數</p>
                    </div>
                  </div>
                  
                  {/* 任務狀態分佈 */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">任務狀態分佈</h4>
                    <div className="space-y-2">
                      {/* 計算任務狀態分佈 */}
                      {Object.entries(
                        realData.tasks.reduce((acc, task) => {
                          acc[task.status] = (acc[task.status] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{status}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-teal-600 h-2 rounded-full" 
                                style={{ width: `${(count / realData.tasks.length) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 最新想法節點 */}
                  {realData.nodes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">最新想法節點</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {realData.nodes.slice(0, 3).map((node, index) => (
                          <div key={node.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{node.title}</p>
                              <p className="text-xs text-gray-500">創建者: {node.owner}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 學習趨勢圖表區域 */}
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">學習趨勢分析</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-3 text-sm sm:text-base">週進度趨勢</h3>
                    <div className="flex items-end space-x-1 sm:space-x-2 h-24 sm:h-32">
                      {learningTrends.weeklyProgress.map((value, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="bg-blue-500 w-full rounded-t"
                            style={{ height: `${value}%` }}
                          ></div>
                          <span className="text-xs text-blue-600 mt-1">W{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-3 text-sm sm:text-base">反思提交量</h3>
                    <div className="flex items-end space-x-1 sm:space-x-2 h-24 sm:h-32">
                      {learningTrends.reflectionSubmissions.map((value, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="bg-green-500 w-full rounded-t"
                            style={{ height: `${(value / 25) * 100}%` }}
                          ></div>
                          <span className="text-xs text-green-600 mt-1">W{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側側邊欄 */}
            <div className="space-y-4 sm:space-y-8">
              {/* 需要關注的學生 */}
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">需要關注的學生</h2>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {studentsNeedAttention.length > 0 ? (
                    studentsNeedAttention.map((student, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(student.severity)}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-sm sm:text-base">{student.name}</h3>
                          <span className="text-xs">{student.progress}%</span>
                        </div>
                        <p className="text-xs sm:text-sm mb-1">{student.issue}</p>
                        <p className="text-xs opacity-75">最後活動: {student.lastActivity}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">👏</div>
                      <p className="text-gray-500 text-sm">所有學生表現良好！</p>
                      {realData.students.length === 0 && (
                        <p className="text-gray-400 text-xs mt-1">尚無學生資料</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 最近活動 */}
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">最近活動</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="text-base sm:text-lg flex-shrink-0">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-800 break-words">
                            <span className="text-teal-600">{activity.student}</span> {activity.action}
                          </p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-gray-500 text-sm">暫無最近活動</p>
                      <p className="text-gray-400 text-xs mt-1">學生活動會在這裡顯示</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 快速統計 */}
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">本週統計</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs sm:text-sm">總反思數</span>
                    <span className="font-bold text-blue-600">{classStats.weeklyReflections}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs sm:text-sm">想法節點</span>
                    <span className="font-bold text-green-600">{classStats.totalIdeaNodes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs sm:text-sm">AI 互動</span>
                    <span className="font-bold text-purple-600">{classStats.aiInteractions}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium text-xs sm:text-sm">班級活躍度</span>
                    <span className="font-bold text-teal-600">
                      {Math.round((classStats.activeStudents / classStats.totalStudents) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'students' && (
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">學生詳細管理</h2>
            <p className="text-sm sm:text-base text-gray-600">這裡可以整合原本的 ManageStudents 組件內容</p>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">深度數據分析</h2>
            <p className="text-sm sm:text-base text-gray-600">詳細的學習分析報表和預測功能</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard; 