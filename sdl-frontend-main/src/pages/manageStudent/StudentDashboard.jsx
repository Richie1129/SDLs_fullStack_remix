import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getKanbanColumns, getProjectActivity } from "../../api/kanban";
import { getNodes, getNodeRelation } from "../../api/nodes";
import { getIdeaWall } from "../../api/ideaWall";
import { getAllPersonalDaily, getAllTeamDaily } from "../../api/reflection";
import { getChatroomHistory } from "../../api/chatroom";
import { getRagMessageHistory } from "../../api/rag";
import { getProjectUser } from "../../api/users";
import { getAllSubmit } from "../../api/submit";
import { getProject } from "../../api/project";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const userId = localStorage.getItem("id");
  const userName = localStorage.getItem("username");
  
  // 狀態管理
  const [projectInfo, setProjectInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [teamReflections, setTeamReflections] = useState([]);
  const [teamAiInteractions, setTeamAiInteractions] = useState([]);
  const [personalReflections, setPersonalReflections] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [aiInteractions, setAiInteractions] = useState([]);
  const [projectActivities, setProjectActivities] = useState([]);
  const [ideaNodes, setIdeaNodes] = useState([]);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 獲取所有專案資料
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // 並行獲取基本專案資料
        const [
          projectResponse,
          membersResponse,
          chatResponse,
          projectActivityResponse,
          kanbanResponse,
          ideaWallResponse
        ] = await Promise.allSettled([
          getProject(projectId),
          getProjectUser(projectId),
          getChatroomHistory(projectId),
          getProjectActivity(projectId),
          getKanbanColumns(projectId),
          getIdeaWall(projectId, "1-1")
        ]);

        // 處理基本資料
        const project = projectResponse.status === 'fulfilled' ? projectResponse.value : null;
        const members = membersResponse.status === 'fulfilled' ? membersResponse.value || [] : [];
        const chat = chatResponse.status === 'fulfilled' ? chatResponse.value || [] : [];
        const activity = projectActivityResponse.status === 'fulfilled' ? projectActivityResponse.value || [] : [];
        const kanban = kanbanResponse.status === 'fulfilled' ? kanbanResponse.value || [] : [];
        const ideaWall = ideaWallResponse.status === 'fulfilled' ? ideaWallResponse.value : null;

        setProjectInfo(project);
        setTeamMembers(members);
        setChatHistory(chat);
        setProjectActivities(activity);

        // 處理 Kanban 任務
        const tasks = [];
        kanban.forEach(column => {
          if (column.task && Array.isArray(column.task)) {
            column.task.forEach(task => {
              tasks.push({
                ...task,
                columnName: column.name
              });
            });
          }
        });
        setKanbanTasks(tasks);

        // 處理想法節點
        if (ideaWall && ideaWall.id) {
          try {
            const nodes = await getNodes(ideaWall.id);
            setIdeaNodes(nodes || []);
          } catch (error) {
            console.error("獲取想法節點失敗:", error);
            setIdeaNodes([]);
          }
        }

        // 獲取反思資料（個人和團隊）
        const [
          personalReflectionsResponse,
          teamReflectionsResponse
        ] = await Promise.allSettled([
          getAllPersonalDaily({ 
            projectId: projectId, 
            userId: userId,
            isTeacher: false 
          }),
          getAllTeamDaily({ params: { projectId: projectId } })
        ]);

        const personalRefl = personalReflectionsResponse.status === 'fulfilled' ? 
          personalReflectionsResponse.value || [] : [];
        const teamRefl = teamReflectionsResponse.status === 'fulfilled' ? 
          teamReflectionsResponse.value || [] : [];

        setPersonalReflections(personalRefl);
        setTeamReflections(teamRefl);

        // 獲取團隊所有成員的AI互動記錄
        if (members.length > 0) {
          const aiPromises = members.map(async (member) => {
            try {
              const aiData = await getRagMessageHistory(member.id);
              return aiData || [];
            } catch (error) {
              console.error(`獲取成員 ${member.username} AI記錄失敗:`, error);
              return [];
            }
          });

          const aiResults = await Promise.allSettled(aiPromises);
          const allAiInteractions = aiResults
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value);

          setTeamAiInteractions(allAiInteractions);

          // 獲取個人AI記錄
          try {
            const personalAi = await getRagMessageHistory(userId);
            setAiInteractions(personalAi || []);
          } catch (error) {
            console.error("獲取個人AI記錄失敗:", error);
            setAiInteractions([]);
          }
        }

      } catch (error) {
        console.error("獲取專案資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, userId]);

  // 計算小組統計數據
  const teamStats = useMemo(() => {
    return {
      // 1. 專案中所有成員對科學助手使用次數
      teamAiInteractions: teamAiInteractions.length,
      
      // 2. 想法節點數
      ideaNodes: ideaNodes.length,
      
      // 3. 看板卡片數
      kanbanTasks: kanbanTasks.length,
      
      // 4. 反思日誌(專案中個人)
      personalReflections: personalReflections.length,
      
      // 5. 反思日誌總計(團隊)
      teamReflections: teamReflections.length
    };
  }, [teamAiInteractions, ideaNodes, kanbanTasks, personalReflections, teamReflections]);

  // 學生個人資料（基於真實資料計算）
  const personalData = {
    id: 1,
    name: userName || "王小明",
    projectId: projectId,
    projectName: projectInfo?.name || "環境科學研究",
    currentStage: parseInt(localStorage.getItem("currentStage")) || 3,
    currentSubStage: parseInt(localStorage.getItem("currentSubStage")) || 2,
    progressPercentage: 65,
    lastActivity: "2024-01-15T10:30:00Z",
    weeklyReflections: personalReflections.filter(reflection => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(reflection.createdAt) > oneWeekAgo;
    }).length, // 真實的本週反思數
    ideaNodes: ideaNodes.length, // 真實想法節點數量
    status: "active",
    teamRole: "組長",
    chatMessages: chatHistory.filter(chat => chat.author === userName).length, // 真實聊天訊息數
    qaQuestions: 5, // 暫時保留假資料，需要額外的 Q&A API
    aiInteractions: aiInteractions.length, // 真實 AI 互動數
    totalStudyTime: 45, // 小時
    averageSessionTime: 2.5, // 小時
    
    // 動態任務統計 - 基於真實的Kanban列表
    get tasksByStatus() {
      const tasksByStatus = {};
      const allColumnNames = [...new Set(kanbanTasks.map(task => task.columnName))].filter(Boolean);
      
      // 為每個列表統計任務數量
      allColumnNames.forEach(columnName => {
        tasksByStatus[columnName] = kanbanTasks.filter(task => task.columnName === columnName);
      });
      
      return tasksByStatus;
    },
    
    get allColumnNames() {
      return [...new Set(kanbanTasks.map(task => task.columnName))].filter(Boolean);
    },
    
    completedTasks: kanbanTasks.filter(task => {
      const status = task.status?.toLowerCase() || '';
      return status.includes('完成') || status.includes('done') || 
             status.includes('完畢') || status.includes('finished') ||
             status.includes('completed') || status === '完成';
    }).length, // 真實完成任務數
    
    pendingTasks: kanbanTasks.filter(task => {
      const status = task.status?.toLowerCase() || '';
      return !(status.includes('完成') || status.includes('done') || 
               status.includes('完畢') || status.includes('finished') ||
               status.includes('completed') || status === '完成');
    }).length, // 真實進行中任務數
    
    totalTasks: kanbanTasks.length // 總任務數
  };

  // 學習軌跡資料（基於真實資料）
  const learningTrack = () => {
    const activities = [];
    
    // 添加反思活動 - 顯示具體標題和內容摘要
    personalReflections.slice(0, 10).forEach(reflection => {
      const contentPreview = reflection.content ? 
        (reflection.content.length > 50 ? 
          reflection.content.substring(0, 50) + '...' : 
          reflection.content) : '無內容預覽';
      
      activities.push({
        date: new Date(reflection.createdAt).toISOString().split('T')[0],
        time: new Date(reflection.createdAt).toLocaleTimeString('zh-TW', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        action: `提交學習反思`,
        detail: `標題：${reflection.title || '無標題'} - ${contentPreview}`,
        author: reflection.userName || userName,
        type: 'reflection',
        createdAt: reflection.createdAt
      });
    });

    // 添加想法節點活動 - 顯示節點標題和內容
    ideaNodes.slice(0, 10).forEach(node => {
      const contentPreview = node.content ? 
        (node.content.length > 40 ? 
          node.content.substring(0, 40) + '...' : 
          node.content) : '無內容描述';
      
      activities.push({
        date: new Date(node.createdAt).toISOString().split('T')[0],
        time: new Date(node.createdAt).toLocaleTimeString('zh-TW', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        action: `創建想法節點`,
        detail: `「${node.title}」 - ${contentPreview}`,
        author: node.author || node.creator || '匿名',
        type: 'idea',
        createdAt: node.createdAt
      });
    });

    // 添加任務活動 - 顯示任務創建和更新
    kanbanTasks.slice(0, 8).forEach(task => {
      const isOwner = task.owner === userName;
      const isAssignee = task.assignees?.includes(userName);
      
      if (isOwner || isAssignee) {
        const taskPreview = task.content ? 
          (task.content.length > 45 ? 
            task.content.substring(0, 45) + '...' : 
            task.content) : '無任務描述';
        
        const actionType = isOwner ? '創建任務' : '參與任務';
        
        activities.push({
          date: new Date(task.updatedAt || task.createdAt).toISOString().split('T')[0],
          time: new Date(task.updatedAt || task.createdAt).toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: actionType,
          detail: `「${task.title}」 - ${taskPreview} (狀態: ${task.status})`,
          author: task.owner || '未知',
          type: 'task',
          createdAt: task.updatedAt || task.createdAt
        });
      }
    });

    // 添加聊天活動 - 顯示聊天內容摘要
    chatHistory
      .filter(chat => chat.author === userName)
      .slice(0, 8)
      .forEach(chat => {
        const messagePreview = chat.message ? 
          (chat.message.length > 35 ? 
            chat.message.substring(0, 35) + '...' : 
            chat.message) : '發送了一則訊息';
        
        activities.push({
          date: new Date(chat.createdAt).toISOString().split('T')[0],
          time: new Date(chat.createdAt).toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: `參與小組討論`,
          detail: `「${messagePreview}」`,
          author: chat.author,
          type: 'chat',
          createdAt: chat.createdAt
        });
      });

    // 添加 AI 互動活動 - 顯示問題內容
    aiInteractions.slice(0, 8).forEach(interaction => {
      const questionPreview = interaction.input_message ? 
        (interaction.input_message.length > 40 ? 
          interaction.input_message.substring(0, 40) + '...' : 
          interaction.input_message) : '向AI助手提問';
      
      activities.push({
        date: new Date(interaction.createdAt).toISOString().split('T')[0],
        time: new Date(interaction.createdAt).toLocaleTimeString('zh-TW', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        action: `諮詢AI助手`,
        detail: `問題：「${questionPreview}」`,
        author: interaction.userName || userName,
        type: 'ai',
        createdAt: interaction.createdAt
      });
    });

    // 添加專案活動記錄 - 顯示具體變更
    projectActivities.slice(0, 5).forEach(activity => {
      let actionDetail = '執行了專案操作';
      
      if (activity.changeType) {
        switch (activity.changeType) {
          case 'CREATE':
            actionDetail = `創建了「${activity.task?.title || '新項目'}」`;
            break;
          case 'UPDATE':
            actionDetail = `更新了「${activity.task?.title || '項目'}」`;
            break;
          case 'DELETE':
            actionDetail = `刪除了「${activity.task?.title || '項目'}」`;
            break;
          case 'MOVE':
            actionDetail = `移動了「${activity.task?.title || '項目'}」`;
            break;
          default:
            actionDetail = activity.description || activity.action || '執行了操作';
        }
      }
      
      activities.push({
        date: new Date(activity.createdAt).toISOString().split('T')[0],
        time: new Date(activity.createdAt).toLocaleTimeString('zh-TW', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        action: `專案變更`,
        detail: actionDetail,
        author: activity.changedBy || activity.user || '系統',
        type: 'progress',
        createdAt: activity.createdAt
      });
    });

    // 按時間排序並分組
    const sortedActivities = activities
      .filter(activity => activity.createdAt) // 確保有時間戳
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 25); // 增加顯示數量

    // 按日期分組
    const groupedByDate = {};
    sortedActivities.forEach(activity => {
      if (!groupedByDate[activity.date]) {
        groupedByDate[activity.date] = [];
      }
      groupedByDate[activity.date].push(activity);
    });

    // 轉換為陣列格式
    return Object.keys(groupedByDate)
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, 7) // 顯示最近7天
      .map(date => ({
        date,
        activities: groupedByDate[date]
      }));
  };

  // 團隊成員資料（基於真實資料）
  const teammates = teamMembers
    .filter(member => member.id != userId) // 排除自己
    .map(member => ({
      name: member.username || member.name || "匿名成員",
      role: member.role || "研究員",
      progress: Math.floor(Math.random() * 100), // 暫時隨機，需要實際進度計算
      status: "active", // 可以根據最後活動時間判斷
      lastSeen: formatRelativeTime(member.updatedAt || member.createdAt)
    }));

  // 學習目標（基於真實資料和預設目標）
  const learningGoals = [
    { 
      id: 1, 
      title: "完成第3階段研究", 
      progress: Math.min(100, personalData.progressPercentage), 
      deadline: "2024-01-20", 
      priority: "high" 
    },
    { 
      id: 2, 
      title: "提交週報反思", 
      progress: Math.min(100, (personalData.weeklyReflections / 3) * 100), 
      deadline: "2024-01-18", 
      priority: "medium" 
    },
    { 
      id: 3, 
      title: "創建5個想法節點", 
      progress: Math.min(100, (personalData.ideaNodes / 5) * 100), 
      deadline: "2024-01-17", 
      priority: "low" 
    },
    { 
      id: 4, 
      title: "協助2位同學", 
      progress: Math.min(100, (personalData.chatMessages / 20) * 100), 
      deadline: "2024-01-25", 
      priority: "medium" 
    }
  ];

  // 近期成就（基於真實資料）
  const achievements = () => {
    const achievementList = [];
    
    // 基於想法節點的成就
    if (personalData.ideaNodes >= 5) {
      achievementList.push({
        title: "創意大師",
        description: `創建了 ${personalData.ideaNodes} 個想法節點`,
        date: ideaNodes.length > 0 ? ideaNodes[0].createdAt : new Date().toISOString(),
        type: "creativity"
      });
    }
    
    // 基於反思的成就
    if (personalData.weeklyReflections >= 3) {
      achievementList.push({
        title: "反思達人",
        description: `本週完成 ${personalData.weeklyReflections} 篇反思`,
        date: personalReflections.length > 0 ? personalReflections[0].createdAt : new Date().toISOString(),
        type: "reflection"
      });
    }
    
    // 基於協作的成就
    if (personalData.chatMessages >= 10) {
      achievementList.push({
        title: "團隊協作者",
        description: `參與了 ${personalData.chatMessages} 次團隊討論`,
        date: chatHistory.length > 0 ? chatHistory[0].createdAt : new Date().toISOString(),
        type: "collaboration"
      });
    }
    
    // 基於 AI 互動的成就
    if (personalData.aiInteractions >= 5) {
      achievementList.push({
        title: "AI 探索者",
        description: `與AI助手進行了 ${personalData.aiInteractions} 次互動`,
        date: aiInteractions.length > 0 ? aiInteractions[0].createdAt : new Date().toISOString(),
        type: "ai"
      });
    }
    
    return achievementList.slice(0, 3); // 最多顯示3個成就
  };

  // 格式化時間
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '未知時間';
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
      case 'task': return 'bg-indigo-500';
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
      case 'ai': return '🤖';
      default: return '🏆';
    }
  };

  // 為列表名稱分配顏色和圖標
  const getColumnStyle = (columnName) => {
    const name = columnName.toLowerCase();
    
    // 待處理類型
    if (name.includes('待處理') || name.includes('待辦') || name.includes('to do') || 
        name.includes('todo') || name.includes('backlog')) {
      return { color: 'text-orange-600', icon: '⏳' };
    }
    
    // 進行中類型
    if (name.includes('進行中') || name.includes('in progress') || name.includes('doing') ||
        name.includes('進展') || name.includes('工作中') || name.includes('處理中')) {
      return { color: 'text-blue-600', icon: '🔄' };
    }
    
    // 完成類型
    if (name.includes('完成') || name.includes('done') || name.includes('finished') ||
        name.includes('completed') || name.includes('完畢')) {
      return { color: 'text-green-600', icon: '✅' };
    }
    
    // 審核/檢查類型
    if (name.includes('審核') || name.includes('review') || name.includes('檢查') ||
        name.includes('驗證') || name.includes('測試')) {
      return { color: 'text-purple-600', icon: '👀' };
    }
    
    // 暫停/擱置類型
    if (name.includes('暫停') || name.includes('擱置') || name.includes('on hold') ||
        name.includes('blocked') || name.includes('延期')) {
      return { color: 'text-gray-600', icon: '⏸️' };
    }
    
    // 默認類型
    return { color: 'text-green-600', icon: '📋' };
  };

  // 載入狀態
  if (loading) {
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
          <p className="text-sm sm:text-base text-gray-600">歡迎回來，{personalData.name}！繼續你的學習旅程吧。</p>
          {ideaNodes.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              已載入 {ideaNodes.length} 個想法節點，{kanbanTasks.length} 個任務
            </p>
          )}
        </div>

        {/* 小組統計卡片區域 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 sm:p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">團隊AI諮詢</p>
                <p className="text-lg sm:text-2xl font-bold">{teamStats.teamAiInteractions}</p>
                <p className="text-purple-200 text-xs">次數</p>
              </div>
              <div className="text-xl sm:text-2xl">🤖</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 sm:p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs">想法節點</p>
                <p className="text-lg sm:text-2xl font-bold">{teamStats.ideaNodes}</p>
                <p className="text-yellow-200 text-xs">個數</p>
              </div>
              <div className="text-xl sm:text-2xl">💡</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">看板卡片</p>
                <p className="text-lg sm:text-2xl font-bold">{teamStats.kanbanTasks}</p>
                <p className="text-green-200 text-xs">張數</p>
              </div>
              <div className="text-xl sm:text-2xl">📋</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">個人反思</p>
                <p className="text-lg sm:text-2xl font-bold">{teamStats.personalReflections}</p>
                <p className="text-blue-200 text-xs">篇數</p>
              </div>
              <div className="text-xl sm:text-2xl">📝</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-3 sm:p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs">團隊反思</p>
                <p className="text-lg sm:text-2xl font-bold">{teamStats.teamReflections}</p>
                <p className="text-teal-200 text-xs">篇數</p>
              </div>
              <div className="text-xl sm:text-2xl">👥</div>
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
                    <span className="font-medium text-gray-700 text-sm sm:text-base">{personalData.projectName}</span>
                    <span className="text-xs sm:text-sm text-gray-500">第 {personalData.currentStage} 階段</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-teal-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${personalData.progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <span>當前子階段: {personalData.currentSubStage}</span>
                    <span>{personalData.progressPercentage}% 完成</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">學習統計</h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">總學習時間</span>
                        <span className="font-medium">{personalData.totalStudyTime}小時</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">平均每次</span>
                        <span className="font-medium">{personalData.averageSessionTime}小時</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2 text-sm sm:text-base">任務狀況</h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">📋 總任務</span>
                        <span className="font-medium">{personalData.totalTasks}</span>
                      </div>
                      {personalData.allColumnNames.map(columnName => {
                        const style = getColumnStyle(columnName);
                        return (
                          <div key={columnName} className="flex justify-between">
                            <span className="text-green-600">
                              {style.icon} {columnName}
                            </span>
                            <span className={`font-medium ${style.color}`}>
                              {personalData.tasksByStatus[columnName].length}
                            </span>
                      </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 學習軌跡 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">近期學習軌跡</h2>
              <div className="space-y-4 sm:space-y-6 max-h-96 overflow-y-auto">
                {learningTrack().map((day, dayIndex) => (
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
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-xs sm:text-sm font-medium text-gray-800">{activity.action}</p>
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{activity.author}</span>
                            </div>
                            <p className="text-xs text-gray-600 break-words leading-relaxed">{activity.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {learningTrack().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>尚無學習活動記錄</p>
                    <p className="text-xs mt-1">開始參與專案活動後，這裡會顯示詳細的學習軌跡</p>
                  </div>
                )}
              </div>
            </div>

            {/* 學習目標 */}
            <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">我的學習目標</h2>
              <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
                {learningGoals.map((goal) => (
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
                      <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{personalData.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{personalData.teamRole}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                        {personalData.progressPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {teammates.map((teammate, index) => (
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
                {achievements().map((achievement, index) => (
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
                  <span className="font-bold text-blue-600">{personalData.chatMessages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">Q&A 提問</span>
                  <span className="font-bold text-green-600">{personalData.qaQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs sm:text-sm">AI 諮詢</span>
                  <span className="font-bold text-purple-600">{personalData.aiInteractions}</span>
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
