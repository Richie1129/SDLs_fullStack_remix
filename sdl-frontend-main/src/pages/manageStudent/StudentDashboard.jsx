import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getKanbanColumns } from "../../api/kanban";
import { getNodes, getNodeRelation } from "../../api/nodes";
import { getIdeaWall } from "../../api/ideaWall";

const StudentDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  const userName = localStorage.getItem("username");
  const userId = localStorage.getItem("id");
  
  // 真實資料狀態
  const [realData, setRealData] = useState({
    tasks: [],
    nodes: [],
    nodeRelations: [],
    projectName: "",
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
        
        // 獲取 Kanban 資料
        console.log("📢 取得 Kanban Columns, projectId:", parsedProjectId);
        const columnData = await getKanbanColumns(parsedProjectId);
        console.log("✅ 取得的 Column Data:", columnData);

        let allTasks = [];
        if (columnData && columnData.length > 0) {
          columnData.forEach(column => {
            column.task.forEach(task => {
              allTasks.push({
                ...task,
                columnId: column.id,
                status: column.name
              });
            });
          });
        }

        // 獲取想法牆資料
        console.log("📢 取得 IdeaWall Data, projectId:", parsedProjectId);
        const ideaWallData = await getIdeaWall(parsedProjectId, "1-1");
        console.log("✅ 取得的 IdeaWall Data:", ideaWallData);

        let allNodes = [];
        let allRelations = [];
        if (ideaWallData && ideaWallData.id) {
          const nodeData = await getNodes(ideaWallData.id);
          const relationData = await getNodeRelation(ideaWallData.id);
          allNodes = nodeData || [];
          allRelations = relationData || [];
        }

        setRealData({
          tasks: allTasks,
          nodes: allNodes,
          nodeRelations: allRelations,
          projectName: `專案 ${parsedProjectId}`,
          loading: false
        });

      } catch (error) {
        console.error("❌ 載入數據失敗:", error);
        setRealData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRealData();
  }, [parsedProjectId]);

  // 學生個人假資料（與真實資料結合）
  const mockPersonalData = {
    id: 1,
    name: userName || "王小明",
    projectId: parsedProjectId,
    projectName: realData.projectName || "環境科學研究",
    currentStage: parseInt(localStorage.getItem("currentStage")) || 3,
    currentSubStage: parseInt(localStorage.getItem("currentSubStage")) || 2,
    progressPercentage: 65,
    lastActivity: "2024-01-15T10:30:00Z",
    weeklyReflections: 3,
    ideaNodes: realData.nodes.length || 8, // 使用真實想法節點數量
    status: "active",
    teamRole: "組長",
    chatMessages: 25,
    qaQuestions: 5,
    aiInteractions: 12,
    totalStudyTime: 45, // 小時
    averageSessionTime: 2.5, // 小時
    completedTasks: realData.tasks.filter(task => task.status === "完成").length || 12, // 真實完成任務數
    pendingTasks: realData.tasks.filter(task => task.status !== "完成").length || 5 // 真實進行中任務數
  };

  // 學習軌跡資料（結合真實資料）
  const mockLearningTrack = [
    { 
      date: '2024-01-15', 
      activities: [
        { time: '10:30', action: '完成專案階段 3-2', type: 'progress', duration: '30分鐘' },
        ...realData.nodes.slice(0, 2).map((node, index) => ({
          time: `${14 + index}:${20 + index * 10}`,
          action: `發布想法節點：${node.title}`,
          type: 'idea',
          duration: '15分鐘'
        }))
      ]
    },
    { 
      date: '2024-01-14', 
      activities: [
        { time: '09:15', action: '提交每日反思記錄', type: 'reflection', duration: '25分鐘' },
        { time: '16:45', action: '參與小組討論', type: 'chat', duration: '40分鐘' },
        { time: '19:30', action: '使用AI助手查詢問題', type: 'ai', duration: '20分鐘' },
        ...realData.tasks.slice(0, 1).map((task, index) => ({
          time: `${11 + index}:${30 + index * 15}`,
          action: `更新任務：${task.title}`,
          type: 'progress',
          duration: '20分鐘'
        }))
      ]
    },
    { 
      date: '2024-01-13', 
      activities: [
        { time: '08:30', action: '上傳實驗數據檔案', type: 'file', duration: '10分鐘' },
        { time: '15:10', action: '回答同學Q&A問題', type: 'qa', duration: '15分鐘' },
        ...realData.nodes.slice(2, 4).map((node, index) => ({
          time: `${12 + index * 2}:${15 + index * 20}`,
          action: `創建想法節點：${node.title}`,
          type: 'idea',
          duration: '18分鐘'
        }))
      ]
    }
  ];

  // 小組成員資料
  const mockTeammates = [
    { name: "李小華", role: "研究員", progress: 45, status: "attention", lastSeen: "1天前" },
    { name: "陳小強", role: "資料分析師", progress: 72, status: "active", lastSeen: "2小時前" }
  ];

  // 學習目標
  const mockLearningGoals = [
    { id: 1, title: "完成第3階段研究", progress: 80, deadline: "2024-01-20", priority: "high" },
    { id: 2, title: "提交週報反思", progress: 60, deadline: "2024-01-18", priority: "medium" },
    { id: 3, title: "創建5個想法節點", progress: 100, deadline: "2024-01-17", priority: "low" },
    { id: 4, title: "協助2位同學", progress: 50, deadline: "2024-01-25", priority: "medium" }
  ];

  // 近期成就
  const mockAchievements = [
    { title: "創意大師", description: "連續一週每天創建想法節點", date: "2024-01-15", type: "creativity" },
    { title: "反思達人", description: "本月完成10篇深度反思", date: "2024-01-12", type: "reflection" },
    { title: "團隊協作者", description: "協助3位同學解決學習問題", date: "2024-01-10", type: "collaboration" }
  ];

  // 格式化時間
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours}小時前`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  };

  // 獲取活動類型顏色
  const getActivityColor = (type) => {
    switch (type) {
      case 'progress': return 'bg-teal-500';
      case 'idea': return 'bg-yellow-500';
      case 'reflection': return 'bg-blue-500';
      case 'chat': return 'bg-green-500';
      case 'qa': return 'bg-purple-500';
      case 'ai': return 'bg-pink-500';
      case 'file': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // 獲取優先級顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 獲取成就類型圖標
  const getAchievementIcon = (type) => {
    switch (type) {
      case 'creativity': return '💡';
      case 'reflection': return '📝';
      case 'collaboration': return '🤝';
      default: return '🏆';
    }
  };

  // 載入狀態
  if (realData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入學習資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 overflow-y-auto pt-16 pl-16">
      <div className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto pb-6">
        {/* 頁面標題 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600 mb-2">我的學習歷程</h1>
          <p className="text-sm sm:text-base text-gray-600">歡迎回來，{mockPersonalData.name}！繼續你的學習旅程吧。</p>
          {realData.nodes.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              已載入 {realData.nodes.length} 個想法節點，{realData.tasks.length} 個任務
            </p>
          )}
        </div>

        {/* 統計卡片區域 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs sm:text-sm">學習進度</p>
                <p className="text-xl sm:text-3xl font-bold">{mockPersonalData.progressPercentage}%</p>
              </div>
              <div className="text-2xl sm:text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">本週反思</p>
                <p className="text-xl sm:text-3xl font-bold">{mockPersonalData.weeklyReflections}</p>
              </div>
              <div className="text-2xl sm:text-4xl">📝</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">想法節點</p>
                <p className="text-xl sm:text-3xl font-bold">{mockPersonalData.ideaNodes}</p>
              </div>
              <div className="text-2xl sm:text-4xl">💡</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">AI互動</p>
                <p className="text-xl sm:text-3xl font-bold">{mockPersonalData.aiInteractions}</p>
              </div>
              <div className="text-2xl sm:text-4xl">🤖</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* 左側主要內容 */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* 學習進度詳情 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">專案進度詳情</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
                    <span className="font-medium text-gray-700 text-sm sm:text-base">{mockPersonalData.projectName}</span>
                    <span className="text-xs sm:text-sm text-gray-500">第 {mockPersonalData.currentStage} 階段</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-teal-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${mockPersonalData.progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <span>當前子階段: {mockPersonalData.currentSubStage}</span>
                    <span>{mockPersonalData.progressPercentage}% 完成</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">學習統計</h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">總學習時間</span>
                        <span className="font-medium">{mockPersonalData.totalStudyTime}小時</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">平均每次</span>
                        <span className="font-medium">{mockPersonalData.averageSessionTime}小時</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2 text-sm sm:text-base">任務狀況</h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">已完成</span>
                        <span className="font-medium">{mockPersonalData.completedTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">進行中</span>
                        <span className="font-medium">{mockPersonalData.pendingTasks}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 學習軌跡 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">近期學習軌跡</h2>
              <div className="space-y-4 sm:space-y-6 max-h-96 overflow-y-auto">
                {mockLearningTrack.map((day, dayIndex) => (
                  <div key={dayIndex}>
                    <div className="flex items-center mb-3">
                      <div className="bg-teal-100 text-teal-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 space-y-3">
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex} className="flex items-start space-x-2 sm:space-x-4">
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full ${getActivityColor(activity.type)}`}></div>
                            <span className="text-xs text-gray-500 w-10 sm:w-12">{activity.time}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-800 break-words">{activity.action}</p>
                            <p className="text-xs text-gray-500">耗時: {activity.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 學習目標 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">我的學習目標</h2>
              <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
                {mockLearningGoals.map((goal) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                      <h3 className="font-medium text-gray-800 text-sm sm:text-base">{goal.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border self-start ${getPriorityColor(goal.priority)}`}>
                        {goal.priority === 'high' ? '高優先級' : 
                         goal.priority === 'medium' ? '中優先級' : '低優先級'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                        <span>進度</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      截止日期: {new Date(goal.deadline).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側側邊欄 */}
          <div className="space-y-4 sm:space-y-8">
            {/* 團隊成員狀況 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">我的小組</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-teal-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      我
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{mockPersonalData.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{mockPersonalData.teamRole}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                        {mockPersonalData.progressPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {mockTeammates.map((teammate, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {teammate.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{teammate.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{teammate.role}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-500 mb-1">{teammate.lastSeen}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          teammate.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {teammate.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 近期成就 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">近期成就</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {mockAchievements.map((achievement, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl sm:text-2xl flex-shrink-0">{getAchievementIcon(achievement.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 text-xs sm:text-sm">{achievement.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 break-words">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(achievement.date).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 快速統計 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">學習統計</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">聊天訊息</span>
                  <span className="font-bold text-blue-600">{mockPersonalData.chatMessages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">Q&A 提問</span>
                  <span className="font-bold text-green-600">{mockPersonalData.qaQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">AI 諮詢</span>
                  <span className="font-bold text-purple-600">{mockPersonalData.aiInteractions}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium text-xs sm:text-sm">學習活躍度</span>
                  <span className="font-bold text-teal-600">
                    {Math.round((mockPersonalData.chatMessages + mockPersonalData.qaQuestions + mockPersonalData.aiInteractions) / 3)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard