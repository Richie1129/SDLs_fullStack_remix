/**
 * 個人資料計算器
 */
import { useMemo } from "react";
import { calculateProgress } from "../../utils";
import { 
  normalizeId, 
  safeFilter, 
  assigneesIncludesUser, 
  isOwnedByUser,
  pushTimestamp,
  filterAiInteractionsByProject
} from "../utils/dataUtils";
import { getAllColumnNames, getTasksByStatus, getTaskCompletionStats } from "../utils/taskUtils";
import { calculateLearningSession } from "../utils/sessionUtils";

/**
 * 計算個人資料數據
 * @param {object} data - 原始資料
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 個人資料結果
 */
export function usePersonalData(data, userName, projectId, userId) {
  const {
    kanbanTasks = [],
    personalReflections = [],
    chatHistory = [],
    aiInteractions = [],
    projectActivities = [],
    projectInfo = null,
    submissions = [],
    usageSummary = null,
    ideaNodes = []
  } = data || {};

  return useMemo(() => {
    try {
      // 計算本週反思數
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

      // 計算聊天訊息數
      const getChatMessages = () => {
        try {
          return safeFilter(chatHistory, chat => chat?.author === userName).length;
        } catch (error) {
          console.error('計算聊天訊息數錯誤:', error);
          return 0;
        }
      };

      // 以 projectInfo 為主的進度計算
      const stage = Number(projectInfo?.currentStage) || 0;
      const subStage = Number(projectInfo?.currentSubStage) || 0;
      const progressPct = calculateProgress(stage, subStage);

      // 計算最後活動時間（多來源取最大值）
      const timestamps = [];
      const meId = normalizeId(userId);

      // 收集各種活動的時間戳
      personalReflections.forEach(r => {
        if (isOwnedByUser(r, userId, userName)) {
          pushTimestamp(timestamps, r?.updatedAt || r?.createdAt);
        }
      });

      kanbanTasks.forEach(t => {
        if (assigneesIncludesUser(t?.assignees, userId, userName) || isOwnedByUser(t, userId, userName)) {
          pushTimestamp(timestamps, t?.updatedAt || t?.createdAt);
        }
      });

      chatHistory.forEach(m => {
        if (m?.author === userName || normalizeId(m?.userId ?? m?.user_id) === meId) {
          pushTimestamp(timestamps, m?.createdAt);
        }
      });

      // AI 互動（僅專案內）
      const personalAiInteractionsInProject = filterAiInteractionsByProject(aiInteractions, projectId);
      personalAiInteractionsInProject.forEach(a => {
        if (isOwnedByUser(a, userId, userName)) {
          pushTimestamp(timestamps, a?.createdAt);
        }
      });

      projectActivities.forEach(a => {
        if (isOwnedByUser(a, userId, userName)) {
          pushTimestamp(timestamps, a?.createdAt);
        }
      });

      ideaNodes.forEach(n => {
        if (isOwnedByUser(n, userId, userName)) {
          pushTimestamp(timestamps, n?.createdAt);
        }
      });

      submissions.forEach(s => {
        if (normalizeId(s?.userId ?? s?.user_id) === meId) {
          pushTimestamp(timestamps, s?.createdAt);
        }
      });

      const lastActivityTs = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

      // QA 問題數
      const qaCount = getChatMessages();

      // 學習時長計算
      const learningSession = calculateLearningSession(timestamps);
      let { totalHours, averageHours } = learningSession;

      // 若後端有精準統計，優先使用
      if (usageSummary && typeof usageSummary.totalSeconds === 'number') {
        totalHours = Number((usageSummary.totalSeconds / 3600).toFixed(1));
      }
      if (usageSummary && typeof usageSummary.averageSeconds === 'number' && usageSummary.sessionCount > 0) {
        averageHours = Number((usageSummary.averageSeconds / 3600).toFixed(1));
      }

      // 任務統計
      const { completedTasks, pendingTasks, totalTasks } = getTaskCompletionStats(kanbanTasks);

      return {
        id: 1,
        name: userName || "學習者",
        projectId: projectId || '',
        projectName: projectInfo?.name || "",
        currentStage: stage,
        currentSubStage: subStage,
        progressPercentage: progressPct,
        lastActivity: lastActivityTs,
        weeklyReflections: getWeeklyReflections(),
        ideaNodes: Array.isArray(ideaNodes) ? ideaNodes.length : 0,
        status: "active",
        teamRole: "組員",
        chatMessages: getChatMessages(),
        qaQuestions: qaCount,
        aiInteractions: personalAiInteractionsInProject.length,
        totalStudyTime: totalHours,
        averageSessionTime: averageHours,
        
        // 動態任務統計
        tasksByStatus: getTasksByStatus(kanbanTasks),
        allColumnNames: getAllColumnNames(kanbanTasks),
        completedTasks,
        pendingTasks,
        totalTasks
      };
    } catch (error) {
      console.error('個人資料計算錯誤:', error);
      return {
        id: 1,
        name: userName || "學習者",
        projectId: projectId || '',
        projectName: projectInfo?.name || "",
        currentStage: Number(projectInfo?.currentStage) || 0,
        currentSubStage: Number(projectInfo?.currentSubStage) || 0,
        progressPercentage: 0,
        lastActivity: null,
        weeklyReflections: 0,
        ideaNodes: 0,
        status: "active",
        teamRole: "組員",
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
  }, [kanbanTasks, personalReflections, ideaNodes, chatHistory, aiInteractions, userName, projectInfo?.name, projectId, userId, projectActivities, submissions, usageSummary]);
}