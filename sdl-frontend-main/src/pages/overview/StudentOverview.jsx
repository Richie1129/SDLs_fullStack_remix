import React, { useState, useEffect } from "react";
import { getAllProject } from "../../api/project";
import { getProjectUser } from "../../api/users";
import { getAllPersonalDaily } from "../../api/reflection";
import { getChatroomHistory } from "../../api/chatroom";
import { getRagMessageHistory } from "../../api/rag";
import { getKanbanColumns, getProjectActivity } from "../../api/kanban";
import { getNodes } from "../../api/nodes";
import { getIdeaWall } from "../../api/ideaWall";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { FiBookOpen, FiTrendingUp, FiClipboard, FiMessageSquare, FiInfo, FiCpu } from 'react-icons/fi';
import TopBar from "../../components/TopBar";
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';
import { getCurrentUserId } from '../../utils/authUtils';
import { 
  calculateProgress, 
  formatRelativeTime, 
  getStatusColor, 
  getActivityIcon, 
  getColumnStyle,
  isCompletedStatus 
} from './utils/overviewUtils';

const StudentOverview = () => {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const userName = getCurrentUsername();
  
  // 狀態管理
  const [allProjects, setAllProjects] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [aiInteractions, setAiInteractions] = useState([]);
  const [projectActivities, setProjectActivities] = useState([]);
  const [ideaNodes, setIdeaNodes] = useState([]);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 獲取學生的所有專案
  const { data: projectData, isLoading: projectsLoading } = useQuery(
    "studentAllProjects", 
    () => getAllProject({ params: { userId } }),
    {
      onSuccess: (data) => {
        setAllProjects(data || []);
      }
    }
  );

  // 獲取所有相關資料
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        if (!allProjects.length) return;

        // 獲取所有專案的各種資料
        const dataPromises = allProjects.map(async (project) => {
          const projectData = { projectId: project.id, projectName: project.name };
          
          try {
            const [
              reflections,
              members,
              chatHistory,
              projectActivity,
              kanbanData,
              ideaWallData
            ] = await Promise.allSettled([
              // 反思記錄
              getAllPersonalDaily({ 
                projectId: project.id, 
                userId: userId,
                isTeacher: false 
              }),
              // 團隊成員
              getProjectUser(project.id),
              // 聊天記錄
              getChatroomHistory(project.id),
              // 專案活動
              getProjectActivity(project.id),
              // Kanban 任務
              getKanbanColumns(project.id),
              // 想法牆
              getIdeaWall(project.id, "1-1")
            ]);

            const results = {
              reflections: reflections.status === 'fulfilled' ? 
                (reflections.value || []).map(r => ({ ...r, ...projectData })) : [],
              members: members.status === 'fulfilled' ? 
                { [project.id]: members.value || [] } : { [project.id]: [] },
              chatHistory: chatHistory.status === 'fulfilled' ? 
                (chatHistory.value || []).map(c => ({ ...c, ...projectData })) : [],
              projectActivity: projectActivity.status === 'fulfilled' ? 
                (projectActivity.value || []).map(a => ({ ...a, ...projectData })) : [],
              kanbanTasks: [],
              ideaNodes: []
            };

            // 處理 Kanban 任務
            if (kanbanData.status === 'fulfilled' && kanbanData.value) {
              kanbanData.value.forEach(column => {
                if (column.task && Array.isArray(column.task)) {
                  column.task.forEach(task => {
                    results.kanbanTasks.push({
                      ...task,
                      ...projectData,
                      columnName: column.name
                    });
                  });
                }
              });
            }

            // 處理想法節點
            if (ideaWallData.status === 'fulfilled' && ideaWallData.value && ideaWallData.value.id) {
              try {
                const nodes = await getNodes(ideaWallData.value.id);
                results.ideaNodes = (nodes || []).map(n => ({ ...n, ...projectData }));
              } catch (error) {
                console.error(`獲取專案 ${project.id} 想法節點失敗:`, error);
              }
            }

            return results;
          } catch (error) {
            console.error(`獲取專案 ${project.id} 資料失敗:`, error);
            return {
              reflections: [],
              members: { [project.id]: [] },
              chatHistory: [],
              projectActivity: [],
              kanbanTasks: [],
              ideaNodes: []
            };
          }
        });

        // 獲取 AI 互動記錄
        const aiInteractionsPromise = getRagMessageHistory(userId).catch(error => {
          console.error("獲取 AI 互動失敗:", error);
          return [];
        });

        const [projectResults, aiData] = await Promise.all([
          Promise.all(dataPromises),
          aiInteractionsPromise
        ]);

        // 合併所有資料
        const allReflectionsData = projectResults.flatMap(r => r.reflections);
        const allMembersData = projectResults.reduce((acc, r) => ({ ...acc, ...r.members }), {});
        const allChatData = projectResults.flatMap(r => r.chatHistory);
        const allActivityData = projectResults.flatMap(r => r.projectActivity);
        const allTasksData = projectResults.flatMap(r => r.kanbanTasks);
        const allNodesData = projectResults.flatMap(r => r.ideaNodes);

        setAllReflections(allReflectionsData);
        setProjectMembers(allMembersData);
        setChatHistory(allChatData);
        setAiInteractions(aiData || []);
        setProjectActivities(allActivityData);
        setKanbanTasks(allTasksData);
        setIdeaNodes(allNodesData);

      } catch (error) {
        console.error("獲取資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    if (allProjects.length > 0) {
      fetchAllData();
    }
  }, [allProjects, userId]);

  // 計算個人統計（增強版）
  const personalStats = React.useMemo(() => {
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.ProjectEnd).length;
    const inProgressProjects = totalProjects - completedProjects;
    
    const averageProgress = totalProjects > 0 ? 
      Math.round(allProjects.reduce((sum, project) => {
        return sum + calculateProgress(project.currentStage, project.currentSubStage);
      }, 0) / totalProjects) : 0;

    const totalReflections = allReflections.length;
    const thisWeekReflections = allReflections.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    // 新增的統計
    const totalChatMessages = chatHistory.filter(chat => chat.author === userName).length;
    const totalAiInteractions = aiInteractions.length;
    const totalIdeaNodes = ideaNodes.length;
    
    // 動態任務統計 - 基於真實的Kanban列表
    const tasksByStatus = {};
    const allColumnNames = [...new Set(kanbanTasks.map(task => task.columnName))].filter(Boolean);
    
    // 為每個列表統計任務數量
    allColumnNames.forEach(columnName => {
      tasksByStatus[columnName] = kanbanTasks.filter(task => task.columnName === columnName);
    });

    const totalTasks = kanbanTasks.length;
    // 嘗試識別完成狀態的任務（支援多種命名方式）
    const completedTasks = kanbanTasks.filter(task => 
      isCompletedStatus(task.columnName)
    ).length;

    return {
      totalProjects,
      completedProjects,
      inProgressProjects,
      averageProgress,
      totalReflections,
      thisWeekReflections,
      totalChatMessages,
      totalAiInteractions,
      totalIdeaNodes,
      completedTasks,
      totalTasks,
      tasksByStatus,
      allColumnNames // 新增：所有列表名稱
    };
  }, [allProjects, allReflections, chatHistory, aiInteractions, ideaNodes, kanbanTasks, userName]);

  // 最近學習活動（增強版）
  const recentActivities = React.useMemo(() => {
    const activities = [];
    
    // 添加反思活動
    allReflections.slice(0, 5).forEach(reflection => {
      activities.push({
        type: "reflection",
        title: `提交學習反思`,
        description: `在 ${reflection.projectName} 中記錄學習心得`,
        time: formatRelativeTime(reflection.createdAt),
        projectName: reflection.projectName,
        createdAt: reflection.createdAt
      });
    });

    // 添加聊天活動
    chatHistory
      .filter(chat => chat.author === userName)
      .slice(0, 5)
      .forEach(chat => {
        activities.push({
          type: "chat",
          title: `參與團隊討論`,
          description: `在 ${chat.projectName} 中發表看法`,
          time: formatRelativeTime(chat.createdAt),
          projectName: chat.projectName,
          createdAt: chat.createdAt
        });
      });

    // 添加 AI 互動活動
    aiInteractions.slice(0, 5).forEach(interaction => {
      activities.push({
        type: "ai",
        title: `使用AI助手`,
        description: `諮詢學習相關問題`,
        time: formatRelativeTime(interaction.createdAt),
        projectName: "AI學習助手",
        createdAt: interaction.createdAt
      });
    });

    // 添加想法節點活動
    ideaNodes.slice(0, 5).forEach(node => {
      activities.push({
        type: "idea",
        title: `創建想法節點`,
        description: `在 ${node.projectName} 中發布新想法：${node.title}`,
        time: formatRelativeTime(node.createdAt),
        projectName: node.projectName,
        createdAt: node.createdAt
      });
    });

    // 添加任務活動
    kanbanTasks
      .filter(task => task.owner === userName || task.assignees?.includes(userName))
      .slice(0, 3)
      .forEach(task => {
        activities.push({
          type: "task",
          title: `更新任務`,
          description: `在 ${task.projectName} 中處理任務：${task.title}`,
          time: formatRelativeTime(task.updatedAt || task.createdAt),
          projectName: task.projectName,
          createdAt: task.updatedAt || task.createdAt
        });
      });

    // 添加專案進度更新
    allProjects.forEach(project => {
      activities.push({
        type: "progress",
        title: `專案進度更新`,
        description: `${project.name} - 第${project.currentStage}階段`,
        time: formatRelativeTime(project.updatedAt),
        projectName: project.name,
        createdAt: project.updatedAt
      });
    });

    // 按時間排序並取前8個
    return activities
      .filter(activity => activity.createdAt) // 只保留有時間戳的活動
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [allProjects, allReflections, chatHistory, aiInteractions, ideaNodes, kanbanTasks, userName]);

  if (projectsLoading || loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-50 overflow-hidden flex flex-col">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-component-sm sm:p-component-md-lg">
          <div className="max-w-7xl mx-auto">
            {/* 頁面標題 */}
            <div className="mb-6 sm:mb-16">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => navigate("/homepage")}
                  className="flex items-center p-component-xs mr-3 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="返回首頁"
                >
                  <HiArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-h2 sm:text-h1 lg:text-display font-extrabold text-teal-600 mb-2">
                    我的學習歷程
                  </h1>
                  <p className="text-body sm:text-body-lg text-gray-600">
                    歡迎回來，{userName}！追踪你的整體學習進度與成長軌跡。
                  </p>
                </div>
              </div>
            </div>

            {/* 統計卡片區域（增強版） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-stack-sm sm:gap-stack-md mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-caption sm:text-body-sm">參與專案</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.totalProjects}</p>
                  </div>
                  <FiBookOpen className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-caption sm:text-body-sm">平均進度</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.averageProgress}%</p>
                  </div>
                  <FiTrendingUp className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-caption sm:text-body-sm">總任務數</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.totalTasks}</p>
                  </div>
                  <FiClipboard className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-caption sm:text-body-sm">聊天互動</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.totalChatMessages}</p>
                  </div>
                  <FiMessageSquare className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-caption sm:text-body-sm">想法節點</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.totalIdeaNodes}</p>
                  </div>
                  <FiInfo className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-component-base sm:p-component-md-lg rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-caption sm:text-body-sm">AI互動</p>
                    <p className="text-h2 sm:text-h1 font-bold">{personalStats.totalAiInteractions}</p>
                  </div>
                  <FiCpu className="w-8 h-8 opacity-80" />
                </div>
              </div>
            </div>

            {/* 主要內容區域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md sm:gap-stack-md-lg">
              {/* 左側 - 專案列表 */}
              <div className="lg:col-span-2 space-y-stack-md sm:space-y-stack-md-lg">
                {/* 我的專案 */}
                <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4 sm:mb-6">我的專案</h2>
                  <div className="space-y-stack-sm max-h-96 overflow-y-auto">
                    {allProjects.length > 0 ? (
                      allProjects.map((project, index) => {
                        const progress = calculateProgress(project.currentStage, project.currentSubStage);
                        const members = projectMembers[project.id] || [];
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-component-base hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-stack-xs sm:space-y-0">
                              <h3 className="font-semibold text-gray-800 text-body sm:text-body-lg">{project.name}</h3>
                              <div className="flex items-center space-x-stack-xs">
                                <span className={`px-2 py-1 rounded-full text-caption font-medium ${getStatusColor(progress)}`}>
                                  {project.ProjectEnd ? "已完成" : `${progress}%`}
                                </span>
                                <button
                                  onClick={() => navigate(`/project/${project.id}/kanban`)}
                                  className="px-3 py-1 bg-teal-600 text-white text-caption rounded-lg hover:bg-teal-700 transition-colors"
                                >
                                  進入專案
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 text-body-sm mb-2 truncate">{project.describe}</p>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-caption text-gray-500 space-y-1 sm:space-y-0">
                              <span>階段: {project.currentStage}-{project.currentSubStage}</span>
                              <span>指導老師: {project.mentor}</span>
                            </div>
                            
                            <div className="mt-2 flex items-center text-caption text-gray-500">
                              <span className="mr-2">團隊成員:</span>
                              <div className="flex items-center space-x-1">
                                {members.slice(0, 3).map((member, idx) => (
                                  <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-caption">
                                    {member.username}
                                  </span>
                                ))}
                                {members.length > 3 && (
                                  <span className="text-gray-400">+{members.length - 3}</span>
                                )}
                              </div>
                            </div>
                            
                            {!project.ProjectEnd && (
                              <div className="mt-3">
                                <div className="flex justify-between text-caption text-gray-500 mb-1">
                                  <span>進度</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-slow" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>尚未參與任何專案</p>
                        <button
                          onClick={() => navigate("/homepage")}
                          className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          前往首頁加入專案
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 學習軌跡圖表 */}
                <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4">學習進度軌跡</h2>
                  <div className="space-y-stack-sm">
                    {allProjects.map((project, index) => {
                      const progress = calculateProgress(project.currentStage, project.currentSubStage);
                      return (
                        <div key={index} className="bg-gray-50 p-component-base rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700">{project.name}</span>
                            <span className="text-body-sm text-gray-500">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-slow" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="mt-2 text-caption text-gray-500">
                            目前階段: 第{project.currentStage}階段 - 子階段{project.currentSubStage}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 右側 - 最近活動（增強版） */}
              <div className="space-y-stack-md sm:space-y-stack-md-lg">
                {/* 最近學習活動 */}
                <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4 sm:mb-6">最近活動</h2>
                  <div className="space-y-stack-sm max-h-96 overflow-y-auto">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity, index) => (
                        <div key={index} className="border-l-4 border-teal-500 pl-4 py-2">
                          <div className="flex items-start space-x-stack-xs">
                            <span className="text-body-lg flex-shrink-0">{getActivityIcon(activity.type)}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-800 text-body-sm">{activity.title}</h4>
                              <p className="text-caption text-gray-600 mt-1 break-words">{activity.description}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-caption text-teal-600 font-medium truncate">{activity.projectName}</span>
                                <span className="text-caption text-gray-400 flex-shrink-0 ml-2">{activity.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">暫無最近活動</p>
                    )}
                  </div>
                </div>

                {/* 本週反思摘要 */}
                <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4">本週反思</h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {allReflections
                      .filter(r => {
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return new Date(r.createdAt) > oneWeekAgo;
                      })
                      .slice(0, 5)
                      .map((reflection, index) => (
                        <div key={index} className="bg-gray-50 p-component-sm rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-body-sm font-medium text-teal-600">{reflection.projectName}</span>
                            <span className="text-caption text-gray-400">{formatRelativeTime(reflection.createdAt)}</span>
                          </div>
                          <p className="text-body-sm text-gray-600 line-clamp-2">{reflection.content || "無內容"}</p>
                        </div>
                      ))}
                    {personalStats.thisWeekReflections === 0 && (
                      <p className="text-gray-500 text-center py-4">本週尚未撰寫反思</p>
                    )}
                  </div>
                </div>

                {/* 學習統計（增強版） */}
                <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4">學習統計</h2>
                  <div className="space-y-stack-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">總反思數</span>
                      <span className="font-semibold text-gray-800">{personalStats.totalReflections}篇</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">平均專案進度</span>
                      <span className="font-semibold text-gray-800">{personalStats.averageProgress}%</span>
                    </div>
                    
                    {/* 任務狀況詳細分解 */}
                    <div className="border-t pt-3">
                      <h3 className="text-body-sm font-medium text-gray-700 mb-3">任務狀況分布</h3>
                      <div className="space-y-stack-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-body-sm flex items-center gap-1"><FiClipboard className="w-3.5 h-3.5" /> 總任務</span>
                          <span className="font-semibold text-gray-800">{personalStats.totalTasks}</span>
                        </div>
                        {personalStats.allColumnNames.map(columnName => {
                          const style = getColumnStyle(columnName);
                          return (
                            <div key={columnName} className="flex justify-between items-center">
                              <span className="text-gray-600 text-body-sm">
                                {style.icon} {columnName}
                              </span>
                              <span className={`font-semibold ${style.color}`}>
                                {personalStats.tasksByStatus[columnName].length}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">團隊互動</span>
                      <span className="font-semibold text-gray-800">{personalStats.totalChatMessages}次</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">創意想法</span>
                      <span className="font-semibold text-gray-800">{personalStats.totalIdeaNodes}個</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">AI諮詢</span>
                      <span className="font-semibold text-gray-800">{personalStats.totalAiInteractions}次</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">學習活躍度</span>
                      <span className="font-semibold text-green-600">
                        {personalStats.thisWeekReflections > 0 ? "高" : "待提升"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentOverview;
