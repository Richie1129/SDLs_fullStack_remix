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
import { getCurrentSemester } from '../../utils/semesterUtils';

// 總覽頁每批並行抓取的專案數（F10）
const OVERVIEW_FETCH_BATCH = 3;
import CrossProjectSuggestions from './components/CrossProjectSuggestions';
import GrowthTrendChart from './components/GrowthTrendChart';
import { 
  calculateProgress, 
  formatRelativeTime, 
  getStatusColor, 
  getActivityIcon, 
  isCompletedStatus 
} from './utils/overviewUtils';

const SDL_STAGES = {
  1: { name: '定標', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  2: { name: '擇策', bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200' },
  3: { name: '監評', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
  4: { name: '調節', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
};

const SUB_STAGE_NAMES = {
  1: ['提出研究主題', '提出研究目的', '提出研究問題'],
  2: ['訂定研究構想表', '設計研究記錄表格', '規劃研究排程'],
  3: ['進行嘗試性研究', '分析資料與繪圖', '撰寫研究結果'],
  4: ['檢視研究進度', '進行研究討論', '撰寫研究結論'],
};

const SdlStageBadge = ({ stage, subStage }) => {
  const s = SDL_STAGES[stage];
  if (!s) return <span className="text-caption text-gray-400">未開始</span>;
  const subStageName = subStage ? SUB_STAGE_NAMES[stage]?.[subStage - 1] : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.name}
      {subStageName ? <span className="opacity-60">· {subStageName}</span> : null}
    </span>
  );
};

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
  const [selectedSemester, setSelectedSemester] = useState('all');

  // 從所有專案中提取可用學期（降序排列）
  const availableSemesters = React.useMemo(() => {
    const semesters = [...new Set(allProjects.map(p => p.semester).filter(Boolean))];
    return semesters.sort((a, b) => b.localeCompare(a));
  }, [allProjects]);

  // 根據學期篩選後的專案
  const filteredProjects = React.useMemo(() => {
    if (selectedSemester === 'all') return allProjects;
    return allProjects.filter(p => p.semester === selectedSemester);
  }, [allProjects, selectedSemester]);

  // 獲取學生的所有專案
  const { data: projectData, isLoading: projectsLoading } = useQuery(
    ["studentAllProjects", userId],
    () => getAllProject({ params: { userId, semester: 'all' } }),
    {
      staleTime: 5 * 60 * 1000,
      onSuccess: (data) => {
        setAllProjects(data || []);
      }
    }
  );

  // F10：專案列表載入後，預設切到目前學期（有該學期的專案才切），避免一開始就抓所有學期
  const [semesterInitialized, setSemesterInitialized] = useState(false);
  useEffect(() => {
    if (semesterInitialized || allProjects.length === 0) return;
    setSemesterInitialized(true);
    const current = getCurrentSemester();
    if (current && allProjects.some(p => p.semester === current)) {
      setSelectedSemester(current);
    }
  }, [allProjects, semesterInitialized]);

  // F10：只抓目前選定學期的專案，搬進 useQuery（staleTime 5 分鐘）；
  // 切分頁或切學期再切回來不會重打；每批最多 3 個專案並行，避免 8 個專案瞬間 56 個請求
  const fetchProjectBundle = async (project) => {
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
        getAllPersonalDaily({ projectId: project.id, userId: userId, isTeacher: false }),
        getProjectUser(project.id),
        getChatroomHistory(project.id),
        getProjectActivity(project.id),
        getKanbanColumns(project.id),
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

      if (kanbanData.status === 'fulfilled' && kanbanData.value) {
        kanbanData.value.forEach(column => {
          if (column.task && Array.isArray(column.task)) {
            column.task.forEach(task => {
              results.kanbanTasks.push({ ...task, ...projectData, columnName: column.name });
            });
          }
        });
      }

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
      return { reflections: [], members: { [project.id]: [] }, chatHistory: [], projectActivity: [], kanbanTasks: [], ideaNodes: [] };
    }
  };

  const fetchOverviewData = async (projects) => {
    const projectResults = [];
    for (let i = 0; i < projects.length; i += OVERVIEW_FETCH_BATCH) {
      const batch = projects.slice(i, i + OVERVIEW_FETCH_BATCH);
      projectResults.push(...await Promise.all(batch.map(fetchProjectBundle)));
    }
    const aiData = await getRagMessageHistory(userId).catch(error => {
      console.error("獲取 AI 互動失敗:", error);
      return [];
    });
    return {
      reflections: projectResults.flatMap(r => r.reflections),
      members: projectResults.reduce((acc, r) => ({ ...acc, ...r.members }), {}),
      chatHistory: projectResults.flatMap(r => r.chatHistory),
      activities: projectResults.flatMap(r => r.projectActivity),
      kanbanTasks: projectResults.flatMap(r => r.kanbanTasks),
      ideaNodes: projectResults.flatMap(r => r.ideaNodes),
      aiInteractions: aiData || []
    };
  };

  const scopedProjectIds = React.useMemo(
    () => filteredProjects.map(p => p.id).sort((a, b) => a - b),
    [filteredProjects]
  );
  const { isFetching: overviewFetching } = useQuery(
    ['studentOverviewData', userId, scopedProjectIds.join(',')],
    () => fetchOverviewData(filteredProjects),
    {
      enabled: !projectsLoading && semesterInitialized,
      staleTime: 5 * 60 * 1000,
      keepPreviousData: true,
      onSuccess: (data) => {
        setAllReflections(data.reflections);
        setProjectMembers(data.members);
        setChatHistory(data.chatHistory);
        setAiInteractions(data.aiInteractions);
        setProjectActivities(data.activities);
        setKanbanTasks(data.kanbanTasks);
        setIdeaNodes(data.ideaNodes);
      },
      onError: (error) => console.error("獲取資料失敗:", error)
    }
  );

  useEffect(() => {
    setLoading(projectsLoading || (!semesterInitialized && allProjects.length > 0) || overviewFetching);
  }, [projectsLoading, semesterInitialized, allProjects.length, overviewFetching]);

  // 篩選後的專案 ID 集合（供 personalStats 與 GrowthTrendChart 共用）
  const filteredProjectIds = React.useMemo(
    () => new Set(filteredProjects.map(p => p.id)),
    [filteredProjects]
  );

  // 計算個人統計（增強版）
  const personalStats = React.useMemo(() => {
    const totalProjects = filteredProjects.length;

    const completedProjects = filteredProjects.filter(p => p.ProjectEnd).length;
    const inProgressProjects = totalProjects - completedProjects;
    
    const averageProgress = totalProjects > 0 ? 
      Math.round(filteredProjects.reduce((sum, project) => {
        return sum + calculateProgress(project.currentStage, project.currentSubStage);
      }, 0) / totalProjects) : 0;

    // 依篩選學期過濾次要資料
    const filteredChatHistory = chatHistory.filter(c => filteredProjectIds.has(c.projectId));
    const filteredKanbanTasks = kanbanTasks.filter(t => filteredProjectIds.has(t.projectId));
    const filteredIdeaNodes = ideaNodes.filter(n => filteredProjectIds.has(n.projectId) && n.owner === userName);
    const filteredReflections = allReflections.filter(r => filteredProjectIds.has(r.projectId));

    const totalReflections = filteredReflections.length;
    const thisWeekReflections = filteredReflections.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    const totalChatMessages = filteredChatHistory.filter(chat => chat.author === userName).length;
    const totalAiInteractions = aiInteractions.length;
    const totalIdeaNodes = filteredIdeaNodes.length;
    
    const totalTasks = filteredKanbanTasks.length;
    // 嘗試識別完成狀態的任務（支援多種命名方式）
    const completedTasks = filteredKanbanTasks.filter(task => 
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
    };
  }, [filteredProjects, filteredProjectIds, allReflections, chatHistory, aiInteractions, ideaNodes, kanbanTasks, userName]);

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

            {/* 學期篩選 */}
            {availableSemesters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-body-sm text-gray-500 font-medium">學期：</span>
                <button
                  onClick={() => setSelectedSemester('all')}
                  className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                    selectedSemester === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600'
                  }`}
                >
                  全部學期
                </button>
                {availableSemesters.map(sem => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                      selectedSemester === sem
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600'
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            )}

            {/* 統計卡片區域 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-stack-sm sm:gap-stack-md mb-6 sm:mb-8">
              {/* 參與專案 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">參與專案</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-teal-600">
                    <FiBookOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.totalProjects}</p>
                <p className="text-caption text-[#888780] mb-3">進行中 {personalStats.inProgressProjects} 個</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${personalStats.totalProjects > 0 ? 100 : 0}%` }} />
                </div>
              </div>

              {/* 平均進度 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">平均進度</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-customgreen">
                    <FiTrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.averageProgress}%</p>
                <p className="text-caption text-[#888780] mb-3">完成 {personalStats.completedProjects} 個</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-customgreen" style={{ width: `${personalStats.averageProgress}%` }} />
                </div>
              </div>

              {/* 總任務數 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">總任務數</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E6F1FB] text-blue-600">
                    <FiClipboard className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.totalTasks}</p>
                <p className="text-caption text-[#888780] mb-3">完成 {personalStats.completedTasks} 項</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${personalStats.totalTasks > 0 ? Math.round((personalStats.completedTasks / personalStats.totalTasks) * 100) : 0}%` }} />
                </div>
              </div>

              {/* 聊天互動 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">聊天互動</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-teal-600">
                    <FiMessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.totalChatMessages}</p>
                <p className="text-caption text-[#888780] mb-3">本人發言</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: '70%' }} />
                </div>
              </div>

              {/* 想法節點 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">想法節點</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#EAF3DE] text-teal-600">
                    <FiInfo className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.totalIdeaNodes}</p>
                <p className="text-caption text-[#888780] mb-3">創意發想</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: '60%' }} />
                </div>
              </div>

              {/* AI互動 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">AI互動</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FAEEDA] text-amber-600">
                    <FiCpu className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{personalStats.totalAiInteractions}</p>
                <p className="text-caption text-[#888780] mb-3">AI諮詢次數</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: '80%' }} />
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
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((project, index) => {
                        const progress = calculateProgress(project.currentStage, project.currentSubStage);
                        const members = projectMembers[project.id] || [];
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-component-base hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-stack-xs sm:space-y-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-800 text-body sm:text-body-lg">{project.name}</h3>
                                {project.semester && (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-caption font-medium rounded-full border border-indigo-200">
                                    {project.semester}
                                  </span>
                                )}
                              </div>
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
                              <SdlStageBadge stage={project.currentStage} subStage={project.currentSubStage} />
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
                        <p>{selectedSemester === 'all' ? '尚未參與任何專案' : `${selectedSemester} 學期無專案`}</p>
                        {selectedSemester === 'all' && (
                          <button
                            onClick={() => navigate("/homepage")}
                            className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            前往首頁加入專案
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 月度成長趨勢折線圖（診斷性層次，隨學期篩選變動） */}
                <GrowthTrendChart
                  allReflections={allReflections.filter(r => filteredProjectIds.has(r.projectId))}
                  kanbanTasks={kanbanTasks.filter(t => filteredProjectIds.has(t.projectId))}
                  aiInteractions={aiInteractions.filter(a =>
                    selectedSemester === 'all' || (a.project_id && filteredProjectIds.has(a.project_id))
                  )}
                  ideaNodes={ideaNodes.filter(n => filteredProjectIds.has(n.projectId) && n.owner === userName)}
                  userName={userName}
                  userId={userId}
                />

              </div>

              {/* 右側 - 最近活動（增強版） */}
              <div className="space-y-stack-md sm:space-y-stack-md-lg">
                {/* 跨專案可操作建議 */}
                <CrossProjectSuggestions
                  activeProjects={filteredProjects.filter(p => !p.ProjectEnd)}
                  allReflections={allReflections}
                  kanbanTasks={kanbanTasks}
                  aiInteractions={aiInteractions}
                />

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

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentOverview;
