/**
 * 學習軌跡計算器
 */
import { useMemo } from "react";
import { is5RsFormat, extract5RsText, calculate5RsCompleteness } from "../../../../utils/5RsUtils";
import { filterAiInteractionsByProject, isOwnedByUser, assigneesIncludesUser } from "../utils/dataUtils";

/**
 * 生成活動預覽文字
 */
const generateContentPreview = (content, maxLength = 50) => {
  if (!content || typeof content !== 'string') return '無內容預覽';
  
  try {
    if (is5RsFormat(content)) {
      const plain = extract5RsText(content) || '';
      const preview = plain.length > maxLength ? (plain.substring(0, maxLength) + '...') : (plain || '');
      const comp = calculate5RsCompleteness(content);
      return `5Rs 反思（完成度 ${comp.completed}/${comp.total}）- ${preview || '（尚無可顯示內容）'}`;
    } else {
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    }
  } catch (_) {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }
};

/**
 * 格式化活動時間
 */
const formatActivityTime = (createdAt) => ({
  date: new Date(createdAt).toISOString().split('T')[0],
  time: new Date(createdAt).toLocaleTimeString('zh-TW', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
});

/**
 * 創建學習活動項目
 */
const createActivityItem = (createdAt, action, detail, author, type) => ({
  ...formatActivityTime(createdAt),
  action,
  detail,
  author,
  type,
  createdAt
});

/**
 * 處理反思活動
 */
const processReflectionActivities = (personalReflections, userName) => {
  const activities = [];
  
  if (Array.isArray(personalReflections) && personalReflections.length > 0) {
    personalReflections.slice(0, 10).forEach(reflection => {
      if (!reflection || !reflection.createdAt) return;
      
      const contentPreview = generateContentPreview(reflection.content);
      const detail = `標題：${reflection.title || '無標題'} - ${contentPreview}`;
      
      activities.push(createActivityItem(
        reflection.createdAt,
        `提交學習反思`,
        detail,
        reflection.userName || userName || '匿名',
        'reflection'
      ));
    });
  }
  
  return activities;
};

/**
 * 處理想法節點活動
 */
const processIdeaNodeActivities = (ideaNodes) => {
  const activities = [];
  
  if (Array.isArray(ideaNodes) && ideaNodes.length > 0) {
    ideaNodes.slice(0, 10).forEach(node => {
      if (!node || !node.createdAt) return;
      
      const contentPreview = generateContentPreview(node.content, 40) || '無內容描述';
      const detail = `「${node.title || '無標題'}」 - ${contentPreview}`;
      
      activities.push(createActivityItem(
        node.createdAt,
        `創建想法節點`,
        detail,
        node.owner || node.username || node.user_name || '匿名',
        'idea'
      ));
    });
  }
  
  return activities;
};

/**
 * 處理任務活動
 */
const processTaskActivities = (kanbanTasks, userName, userId) => {
  const activities = [];
  
  if (Array.isArray(kanbanTasks) && kanbanTasks.length > 0) {
    kanbanTasks.slice(0, 8).forEach(task => {
      if (!task || !(task.updatedAt || task.createdAt)) return;
      
      const isOwner = isOwnedByUser(task, userId, userName);
      const isAssignee = assigneesIncludesUser(task?.assignees, userId, userName);
      
      if (isOwner || isAssignee) {
        const taskPreview = generateContentPreview(task.content, 45) || '無任務描述';
        const actionType = isOwner ? '創建任務' : '參與任務';
        const detail = `「${task.title || '無標題'}」 - ${taskPreview} (狀態: ${task.status || '未知'})`;
        
        activities.push(createActivityItem(
          task.updatedAt || task.createdAt,
          actionType,
          detail,
          task.owner || '未知',
          'task'
        ));
      }
    });
  }
  
  return activities;
};

/**
 * 處理聊天活動
 */
const processChatActivities = (chatHistory, userName) => {
  const activities = [];
  
  if (Array.isArray(chatHistory) && chatHistory.length > 0) {
    chatHistory
      .filter(chat => chat && chat.author === userName && chat.createdAt)
      .slice(0, 8)
      .forEach(chat => {
        const messagePreview = generateContentPreview(chat.message, 35) || '發送了一則訊息';
        const detail = `「${messagePreview}」`;
        
        activities.push(createActivityItem(
          chat.createdAt,
          `參與小組討論`,
          detail,
          chat.author,
          'chat'
        ));
      });
  }
  
  return activities;
};

/**
 * 處理AI互動活動
 */
const processAiInteractionActivities = (aiInteractions, projectId, userName, userId) => {
  const activities = [];
  
  if (Array.isArray(aiInteractions) && aiInteractions.length > 0) {
    const projectAiInteractions = filterAiInteractionsByProject(aiInteractions, projectId);
    
    projectAiInteractions
      .filter(interaction => {
        return interaction && interaction.createdAt && isOwnedByUser(interaction, userId, userName);
      })
      .slice(0, 8)
      .forEach(interaction => {
        const questionPreview = generateContentPreview(interaction.input_message, 40) || '向AI助手提問';
        const detail = `問題：「${questionPreview}」`;
        
        activities.push(createActivityItem(
          interaction.createdAt,
          `諮詢AI助手`,
          detail,
          interaction.userName || userName || '匿名',
          'ai'
        ));
      });
  }
  
  return activities;
};

/**
 * 處理專案活動記錄
 */
const processProjectActivities = (projectActivities, userName, userId) => {
  const activities = [];
  
  if (Array.isArray(projectActivities) && projectActivities.length > 0) {
    projectActivities
      .filter(activity => {
        return activity && activity.createdAt && isOwnedByUser(activity, userId, userName);
      })
      .slice(0, 5)
      .forEach(activity => {
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
        
        activities.push(createActivityItem(
          activity.createdAt,
          `專案變更`,
          actionDetail,
          activity.changedBy || activity.user || '系統',
          'progress'
        ));
      });
  }
  
  return activities;
};

/**
 * 生成預設空狀態活動
 */
const getDefaultEmptyState = () => {
  const now = new Date();
  return [{
    date: now.toISOString().split('T')[0],
    activities: [createActivityItem(
      now.toISOString(),
      '歡迎加入專案',
      '開始您的學習旅程！快建立您的第一個想法或反思吧。',
      '系統',
      'welcome'
    )]
  }];
};

/**
 * 按日期分組活動
 */
const groupActivitiesByDate = (activities) => {
  if (!activities.length) return getDefaultEmptyState();
  
  const groupedByDate = {};
  activities.forEach(activity => {
    if (activity && activity.date) {
      if (!groupedByDate[activity.date]) {
        groupedByDate[activity.date] = [];
      }
      groupedByDate[activity.date].push(activity);
    }
  });

  const result = Object.keys(groupedByDate)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 7) // 顯示最近7天
    .map(date => ({
      date,
      activities: groupedByDate[date] || []
    }));

  return result.length > 0 ? result : getDefaultEmptyState();
};

/**
 * 學習軌跡計算器
 * @param {object} data - 原始資料
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {Array} 學習軌跡資料
 */
export function useLearningTrack(data, userName, projectId, userId) {
  const {
    personalReflections = [],
    ideaNodes = [],
    kanbanTasks = [],
    chatHistory = [],
    aiInteractions = [],
    projectActivities = []
  } = data || {};

  return useMemo(() => {
    try {
      const activities = [];
      
      // 處理各種活動類型
      activities.push(...processReflectionActivities(personalReflections, userName));
      activities.push(...processIdeaNodeActivities(ideaNodes));
      activities.push(...processTaskActivities(kanbanTasks, userName, userId));
      activities.push(...processChatActivities(chatHistory, userName));
      activities.push(...processAiInteractionActivities(aiInteractions, projectId, userName, userId));
      activities.push(...processProjectActivities(projectActivities, userName, userId));

      // 如果沒有任何活動，提供預設的空狀態
      if (activities.length === 0) {
        return getDefaultEmptyState();
      }

      // 按時間排序並分組
      const sortedActivities = activities
        .filter(activity => activity && activity.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 25); // 增加顯示數量

      return groupActivitiesByDate(sortedActivities);
      
    } catch (error) {
      console.error('學習軌跡處理錯誤:', error);
      return [{
        date: new Date().toISOString().split('T')[0],
        activities: [createActivityItem(
          new Date().toISOString(),
          '載入中',
          '正在載入學習活動...',
          '系統',
          'loading'
        )]
      }];
    }
  }, [personalReflections, ideaNodes, kanbanTasks, chatHistory, aiInteractions, projectActivities, userName, projectId, userId]);
}