import { useMemo } from "react";
import { formatRelativeTime } from "../utils";

/**
 * 自定義 Hook 用於計算學生相關指標
 * @param {object} data - 從 useProjectData 獲取的數據
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含所有計算後的指標
 */
export function useStudentMetrics(data, userName, projectId, userId) {
  // 為數據提供默認值，防止 undefined 錯誤
  const {
    teamAiInteractions = [],
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    teamReflections = [],
    teamMembers = [],
    chatHistory = [],
    aiInteractions = [],
    projectActivities = [],
    projectInfo = null
  } = data || {};

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
  const personalData = useMemo(() => {
    try {
      // 安全的篩選函數，避免在資料未載入時出錯
      const safeFilter = (arr, filterFn) => {
        if (!Array.isArray(arr)) return [];
        try {
          return arr.filter(filterFn);
        } catch (error) {
          console.error('篩選錯誤:', error);
          return [];
        }
      };

      // 安全獲取 Kanban 任務的列名
      const getAllColumnNames = () => {
        if (!Array.isArray(kanbanTasks) || kanbanTasks.length === 0) {
          return [];
        }
        try {
          return [...new Set(kanbanTasks.map(task => task?.columnName).filter(Boolean))];
        } catch (error) {
          console.error('獲取列名錯誤:', error);
          return [];
        }
      };

      // 安全計算任務狀態統計
      const getTasksByStatus = () => {
        try {
          const tasksByStatus = {};
          const allColumnNames = getAllColumnNames();
          
          allColumnNames.forEach(columnName => {
            tasksByStatus[columnName] = safeFilter(kanbanTasks, task => task?.columnName === columnName);
          });
          
          return tasksByStatus;
        } catch (error) {
          console.error('計算任務狀態錯誤:', error);
          return {};
        }
      };

      // 安全計算本週反思數
      const getWeeklyReflections = () => {
        try {
          return safeFilter(personalReflections, reflection => {
            if (!reflection?.createdAt) return false;
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(reflection.createdAt) > oneWeekAgo;
          }).length;
        } catch (error) {
          console.error('計算週反思數錯誤:', error);
          return 0;
        }
      };

      // 安全計算聊天訊息數
      const getChatMessages = () => {
        try {
          return safeFilter(chatHistory, chat => chat?.author === userName).length;
        } catch (error) {
          console.error('計算聊天訊息數錯誤:', error);
          return 0;
        }
      };

      return {
        id: 1,
        name: userName || "王小明",
        projectId: projectId || '',
        projectName: projectInfo?.name || "環境科學研究",
        currentStage: parseInt(localStorage.getItem("currentStage")) || 3,
        currentSubStage: parseInt(localStorage.getItem("currentSubStage")) || 2,
        progressPercentage: 65,
        lastActivity: "2024-01-15T10:30:00Z",
        weeklyReflections: getWeeklyReflections(),
        ideaNodes: Array.isArray(ideaNodes) ? ideaNodes.length : 0,
        status: "active",
        teamRole: "組長",
        chatMessages: getChatMessages(),
        qaQuestions: 5,
        aiInteractions: Array.isArray(aiInteractions) ? aiInteractions.length : 0,
        totalStudyTime: 45,
        averageSessionTime: 2.5,
        
        // 動態任務統計 - 基於真實的Kanban列表
        tasksByStatus: getTasksByStatus(),
        allColumnNames: getAllColumnNames(),
        
        completedTasks: safeFilter(kanbanTasks, task => {
          const status = task?.status?.toLowerCase() || '';
          return status.includes('完成') || status.includes('done') || 
                 status.includes('完畢') || status.includes('finished') ||
                 status.includes('completed') || status === '完成';
        }).length, // 真實完成任務數
        
        pendingTasks: safeFilter(kanbanTasks, task => {
          const status = task?.status?.toLowerCase() || '';
          return !(status.includes('完成') || status.includes('done') || 
                   status.includes('完畢') || status.includes('finished') ||
                   status.includes('completed') || status === '完成');
        }).length, // 真實進行中任務數
        
        totalTasks: Array.isArray(kanbanTasks) ? kanbanTasks.length : 0 // 總任務數
      };
    } catch (error) {
      console.error('個人資料計算錯誤:', error);
      return {
        id: 1,
        name: userName || "王小明",
        projectId: projectId || '',
        projectName: "環境科學研究",
        currentStage: 3,
        currentSubStage: 2,
        progressPercentage: 0,
        lastActivity: "2024-01-15T10:30:00Z",
        weeklyReflections: 0,
        ideaNodes: 0,
        status: "active",
        teamRole: "組長",
        chatMessages: 0,
        qaQuestions: 0,
        aiInteractions: 0,
        totalStudyTime: 0,
        averageSessionTime: 0,
        tasksByStatus: {},
        allColumnNames: [],
        completedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0
      };
    }
  }, [kanbanTasks, personalReflections, ideaNodes, chatHistory, aiInteractions, userName, projectInfo?.name, projectId]);

  // 學習軌跡資料（基於真實資料）
  const learningTrack = useMemo(() => {
    try {
      const activities = [];
      
      // 安全處理反思活動 - 顯示具體標題和內容摘要
      if (Array.isArray(personalReflections) && personalReflections.length > 0) {
        personalReflections.slice(0, 10).forEach(reflection => {
          if (!reflection || !reflection.createdAt) return;
          
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
            author: reflection.userName || userName || '匿名',
            type: 'reflection',
            createdAt: reflection.createdAt
          });
        });
      }

      // 安全處理想法節點活動 - 顯示節點標題和內容
      if (Array.isArray(ideaNodes) && ideaNodes.length > 0) {
        ideaNodes.slice(0, 10).forEach(node => {
          if (!node || !node.createdAt) return;
          
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
            detail: `「${node.title || '無標題'}」 - ${contentPreview}`,
            author: node.owner || node.username || node.user_name || '匿名',
            type: 'idea',
            createdAt: node.createdAt
          });
        });
      }

      // 安全處理任務活動 - 顯示任務創建和更新
      if (Array.isArray(kanbanTasks) && kanbanTasks.length > 0) {
        kanbanTasks.slice(0, 8).forEach(task => {
          if (!task || !(task.updatedAt || task.createdAt)) return;
          
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
              detail: `「${task.title || '無標題'}」 - ${taskPreview} (狀態: ${task.status || '未知'})`,
              author: task.owner || '未知',
              type: 'task',
              createdAt: task.updatedAt || task.createdAt
            });
          }
        });
      }

      // 安全處理聊天活動 - 顯示聊天內容摘要
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        chatHistory
          .filter(chat => chat && chat.author === userName && chat.createdAt)
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
      }

      // 安全處理 AI 互動活動 - 顯示問題內容
      if (Array.isArray(aiInteractions) && aiInteractions.length > 0) {
        aiInteractions.slice(0, 8).forEach(interaction => {
          if (!interaction || !interaction.createdAt) return;
          
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
            author: interaction.userName || userName || '匿名',
            type: 'ai',
            createdAt: interaction.createdAt
          });
        });
      }

      // 安全處理專案活動記錄 - 顯示具體變更
      if (Array.isArray(projectActivities) && projectActivities.length > 0) {
        projectActivities.slice(0, 5).forEach(activity => {
          if (!activity || !activity.createdAt) return;
          
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
      }

      // 如果沒有任何活動，提供預設的空狀態
      if (activities.length === 0) {
        return [{
          date: new Date().toISOString().split('T')[0],
          activities: [{
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: '歡迎加入專案',
            detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
            author: '系統',
            type: 'welcome',
            createdAt: new Date().toISOString()
          }]
        }];
      }

      // 按時間排序並分組
      const sortedActivities = activities
        .filter(activity => activity && activity.createdAt) // 確保有時間戳且不為空
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 25); // 增加顯示數量

      // 如果過濾後沒有活動，返回空狀態
      if (sortedActivities.length === 0) {
        return [{
          date: new Date().toISOString().split('T')[0],
          activities: [{
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: '歡迎加入專案',
            detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
            author: '系統',
            type: 'welcome',
            createdAt: new Date().toISOString()
          }]
        }];
      }

      // 按日期分組
      const groupedByDate = {};
      sortedActivities.forEach(activity => {
        if (activity && activity.date) {
          if (!groupedByDate[activity.date]) {
            groupedByDate[activity.date] = [];
          }
          groupedByDate[activity.date].push(activity);
        }
      });

      // 轉換為陣列格式
      const result = Object.keys(groupedByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .slice(0, 7) // 顯示最近7天
        .map(date => ({
          date,
          activities: groupedByDate[date] || []
        }));

      return result.length > 0 ? result : [{
        date: new Date().toISOString().split('T')[0],
        activities: [{
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: '歡迎加入專案',
          detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
          author: '系統',
          type: 'welcome',
          createdAt: new Date().toISOString()
        }]
      }];
      
    } catch (error) {
      console.error('學習軌跡處理錯誤:', error);
      return [{
        date: new Date().toISOString().split('T')[0],
        activities: [{
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: '載入中',
          detail: '正在載入學習活動...',
          author: '系統',
          type: 'loading',
          createdAt: new Date().toISOString()
        }]
      }];
    }
  }, [personalReflections, ideaNodes, kanbanTasks, chatHistory, aiInteractions, projectActivities, userName]);

  // 團隊成員資料（基於真實資料）
  const teammates = useMemo(() => {
    if (!Array.isArray(teamMembers) || !userId) {
      return [];
    }
    
    return teamMembers
      .filter(member => member && member.id && member.id != userId) // 排除自己並確保有效成員
      .map(member => ({
        name: member.username || member.name || "匿名成員",
        role: member.role || "研究員",
        progress: Math.floor(Math.random() * 100), // 暫時隨機，需要實際進度計算
        status: "active", // 可以根據最後活動時間判斷
        lastSeen: formatRelativeTime(member.updatedAt || member.createdAt)
      }));
  }, [teamMembers, userId]);

  // 學習目標（基於真實資料和預設目標）
  const learningGoals = useMemo(() => {
    // 直接使用原始狀態，避免依賴其他 useMemo
    const currentProgressPercentage = parseInt(localStorage.getItem("currentStage")) || 0;
    const weeklyReflectionsCount = Array.isArray(personalReflections) ? 
      personalReflections.filter(reflection => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(reflection.createdAt) > oneWeekAgo;
      }).length : 0;
    const ideaNodesCount = Array.isArray(ideaNodes) ? ideaNodes.length : 0;
    const chatMessagesCount = Array.isArray(chatHistory) ? 
      chatHistory.filter(chat => chat.author === userName).length : 0;
    
    return [
      { 
        id: 1, 
        title: "完成第3階段研究", 
        progress: Math.min(100, currentProgressPercentage * 20), 
        deadline: "2024-01-20", 
        priority: "high" 
      },
      { 
        id: 2, 
        title: "提交週報反思", 
        progress: Math.min(100, (weeklyReflectionsCount / 3) * 100), 
        deadline: "2024-01-18", 
        priority: "medium" 
      },
      { 
        id: 3, 
        title: "創建5個想法節點", 
        progress: Math.min(100, (ideaNodesCount / 5) * 100), 
        deadline: "2024-01-17", 
        priority: "low" 
      },
      { 
        id: 4, 
        title: "協助2位同學", 
        progress: Math.min(100, (chatMessagesCount / 20) * 100), 
        deadline: "2024-01-25", 
        priority: "medium" 
      }
    ];
  }, [personalReflections, ideaNodes, chatHistory, userName]);

  // 近期成就（基於真實資料）
  const achievements = useMemo(() => {
    // 直接計算數據，避免依賴其他 useMemo
    const ideaNodesCount = Array.isArray(ideaNodes) ? ideaNodes.length : 0;
    const weeklyReflectionsCount = Array.isArray(personalReflections) ? 
      personalReflections.filter(reflection => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(reflection.createdAt) > oneWeekAgo;
      }).length : 0;
    const chatMessagesCount = Array.isArray(chatHistory) ? 
      chatHistory.filter(chat => chat.author === userName).length : 0;
    const aiInteractionsCount = Array.isArray(aiInteractions) ? aiInteractions.length : 0;

    const achievementList = [];
    
    // 基於想法節點的成就
    if (ideaNodesCount >= 5) {
      achievementList.push({
        title: "創意大師",
        description: `創建了 ${ideaNodesCount} 個想法節點`,
        date: Array.isArray(ideaNodes) && ideaNodes.length > 0 ? ideaNodes[0].createdAt : new Date().toISOString(),
        type: "creativity"
      });
    }
    
    // 基於反思的成就
    if (weeklyReflectionsCount >= 3) {
      achievementList.push({
        title: "反思達人",
        description: `本週完成 ${weeklyReflectionsCount} 篇反思`,
        date: Array.isArray(personalReflections) && personalReflections.length > 0 ? personalReflections[0].createdAt : new Date().toISOString(),
        type: "reflection"
      });
    }
    
    // 基於協作的成就
    if (chatMessagesCount >= 10) {
      achievementList.push({
        title: "團隊協作者",
        description: `參與了 ${chatMessagesCount} 次團隊討論`,
        date: Array.isArray(chatHistory) && chatHistory.length > 0 ? chatHistory[0].createdAt : new Date().toISOString(),
        type: "collaboration"
      });
    }
    
    // 基於 AI 互動的成就
    if (aiInteractionsCount >= 5) {
      achievementList.push({
        title: "AI 探索者",
        description: `與AI助手進行了 ${aiInteractionsCount} 次互動`,
        date: Array.isArray(aiInteractions) && aiInteractions.length > 0 ? aiInteractions[0].createdAt : new Date().toISOString(),
        type: "ai"
      });
    }
    
    // 如果沒有任何成就，提供鼓勵性訊息
    if (achievementList.length === 0) {
      achievementList.push({
        title: "新手上路",
        description: "歡迎加入專案！開始您的學習之旅，很快就會有成就解鎖。",
        date: new Date().toISOString(),
        type: "welcome"
      });
    }
    
    return achievementList.slice(0, 3); // 最多顯示3個成就
  }, [ideaNodes, personalReflections, chatHistory, aiInteractions, userName]);

  return {
    teamStats,
    personalData,
    learningTrack,
    teammates,
    learningGoals,
    achievements
  };
}
