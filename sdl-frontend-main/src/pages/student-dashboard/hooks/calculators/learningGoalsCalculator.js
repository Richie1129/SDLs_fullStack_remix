/**
 * 學習目標計算器
 */
import { useMemo } from "react";
import { calculateProgress } from "../../utils";
import { 
  normalizeId, 
  assigneesIncludesUser, 
  isOwnedByUser, 
  isTaskCompleted,
  filterAiInteractionsByProject
} from "../utils/dataUtils";
import { isGoalTask } from "../utils/taskUtils";

/**
 * 創建學習目標項目
 */
const createGoal = (id, title, current, target, priority = 'medium') => ({
  id, 
  title, 
  current, 
  target, 
  progress: Math.max(0, Math.min(100, Math.round((current / Math.max(1, target)) * 100))), 
  priority
});

/**
 * 計算活動天數統計
 */
const calculateActivityStreak = (userId, userName, data) => {
  const { personalReflections, kanbanTasks, ideaNodes, chatHistory, aiInteractions } = data;
  const meId = normalizeId(userId);
  const meName = userName || '';
  
  const days = new Set();
  const pushDay = (dateString) => { 
    if (!dateString) return; 
    const dt = new Date(dateString); 
    days.add(dt.toISOString().split('T')[0]); 
  };

  // 個人反思活動
  personalReflections.forEach(reflection => {
    if (isOwnedByUser(reflection, userId, userName)) {
      pushDay(reflection?.createdAt);
    }
  });

  // 任務活動
  kanbanTasks.forEach(task => {
    if (assigneesIncludesUser(task?.assignees, userId, userName)) {
      pushDay(task?.updatedAt || task?.createdAt);
    }
  });

  // 想法節點活動
  ideaNodes.forEach(node => {
    if (isOwnedByUser(node, userId, userName)) {
      pushDay(node?.createdAt);
    }
  });

  // 聊天活動
  chatHistory.forEach(chat => {
    const chatUserId = normalizeId(chat?.userId ?? chat?.user_id);
    if ((chatUserId && chatUserId === meId) || (chat?.author === meName)) {
      pushDay(chat?.createdAt);
    }
  });

  // AI 互動活動
  aiInteractions.forEach(interaction => {
    if (isOwnedByUser(interaction, userId, userName)) {
      pushDay(interaction?.createdAt);
    }
  });

  // 計算最近7天內的活動天數
  const last7Days = Array.from(days).filter(dateString => {
    const date = new Date(dateString);
    const now = new Date();
    return (now - date) / (1000 * 60 * 60 * 24) <= 7;
  }).length;

  return last7Days;
};

/**
 * 學習目標計算器
 * @param {object} data - 原始資料
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {Array} 學習目標列表
 */
export function useLearningGoals(data, userName, projectId, userId) {
  const {
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    submissions = [],
    aiInteractions = [],
    ragMessages = undefined,
    chatHistory = [],
    projectInfo = null
  } = data || {};

  return useMemo(() => {
    const meId = normalizeId(userId);
    const meName = userName || '';
    const currentStage = Number(projectInfo?.currentStage) || 0;
    const currentSubStage = Number(projectInfo?.currentSubStage) || 0;

    // 1. 個人想法節點數
    const personalIdeaCount = ideaNodes.filter(node => 
      isOwnedByUser(node, userId, userName)
    ).length;

    // 2. 指派給自己的任務
    const tasksAssignedToMe = kanbanTasks.filter(task => 
      assigneesIncludesUser(task?.assignees, userId, userName)
    );
    const tasksCompletedByMe = tasksAssignedToMe.filter(isTaskCompleted).length;

    // 3. 個人反思數
    const personalReflectionCount = personalReflections.filter(reflection => 
      isOwnedByUser(reflection, userId, userName)
    ).length;

    // 4. 歷程檔案提交數
    const personalSubmissionsCount = submissions.filter(submission => 
      normalizeId(submission?.userId ?? submission?.user_id) === meId
    ).length;

    // 5. AI 互動數（專案內）
    const personalRag = Array.isArray(ragMessages) ? ragMessages : aiInteractions;
    const projectAiInteractions = filterAiInteractionsByProject(personalRag, projectId);
    const personalAiCount = projectAiInteractions.filter(interaction => 
      isOwnedByUser(interaction, userId, userName)
    ).length;

    // 6. 聊天參與數
    const personalChatCount = chatHistory.filter(chat => 
      chat?.author === meName || normalizeId(chat?.userId ?? chat?.user_id) === meId
    ).length;

    // 7. 同儕評論數
    const myCommentsCount = Array.isArray(data?.projectComments) 
      ? data.projectComments.filter(comment => {
          const commentUserId = normalizeId(comment?.user?.id ?? comment?.userId);
          const commentUserName = comment?.user?.username ?? comment?.username ?? comment?.author ?? '';
          return (commentUserId && commentUserId === meId) || (commentUserName && commentUserName === meName);
        }).length
      : 0;

    // 8. 活動連續天數
    const activityStreak = calculateActivityStreak(userId, userName, data);

    // 9. 目標任務完成數
    const goalTasksAssignedToMe = tasksAssignedToMe.filter(isGoalTask);
    const goalTasksDoneByMe = goalTasksAssignedToMe.filter(isTaskCompleted).length;

    // 10. 下一階段進度
    const currentProgress = calculateProgress(currentStage, currentSubStage);
    const nextTarget = currentSubStage >= 3
      ? calculateProgress(currentStage + 1, 1)
      : calculateProgress(currentStage, currentSubStage + 1);
    const towardNextPercent = Math.min(100, Math.round((currentProgress / Math.max(1, nextTarget)) * 100));

    // 構建10個學習目標
    const goals = [
      createGoal('g1', '發表想法節點 5 個', personalIdeaCount, 5, 'medium'),
      createGoal('g2', '完成指派任務 3 個', tasksCompletedByMe, 3, 'high'),
      createGoal('g3', '撰寫個人反思 3 篇', personalReflectionCount, 3, 'high'),
      createGoal('g4', '上傳歷程檔案 2 份', personalSubmissionsCount, 2, 'medium'),
      createGoal('g5', '使用科學助手 5 次', personalAiCount, 5, 'medium'),
      createGoal('g6', '參與小組討論 5 則', personalChatCount, 5, 'low'),
      createGoal('g7', '給予同儕評論 3 則', myCommentsCount, 3, 'medium'),
      createGoal('g8', '連續 5 天有學習活動', activityStreak, 5, 'medium'),
      createGoal('g9', '完成 2 張學習目標卡', goalTasksDoneByMe, 2, 'high'),
      { 
        id: 'g10', 
        title: '達成下一個階段里程碑', 
        current: currentProgress, 
        target: nextTarget, 
        progress: towardNextPercent, 
        priority: 'high' 
      }
    ];

    return goals;
  }, [
    ideaNodes,
    kanbanTasks,
    personalReflections,
    submissions,
    aiInteractions,
    ragMessages,
    chatHistory,
    data?.projectComments,
    projectInfo?.currentStage,
    projectInfo?.currentSubStage,
    userId,
    userName,
    projectId
  ]);
}