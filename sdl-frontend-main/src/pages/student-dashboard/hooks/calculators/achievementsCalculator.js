/**
 * 成就系統計算器（個人）
 */
import { useMemo } from "react";
import {
  assigneesIncludesUser,
  isOwnedByUser,
  filterAiInteractionsByProject
} from "../utils/dataUtils";
import {
  ACHIEVEMENT_THRESHOLDS,
  createAchievement
} from "../utils/achievementUtils";

/**
 * 成就系統計算器
 * @param {object} data - 原始資料
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {Array} 個人成就陣列
 */
export function useAchievements(data, userName, projectId, userId) {
  const {
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    aiInteractions = [],
    ragMessages,
  } = data || {};

  return useMemo(() => {
    const personalIdeaCount = ideaNodes.filter(node =>
      isOwnedByUser(node, userId, userName)
    ).length;

    const personalTaskCount = kanbanTasks.filter(task =>
      assigneesIncludesUser(task?.assignees, userId, userName)
    ).length;

    const personalReflectionCount = personalReflections.filter(reflection =>
      isOwnedByUser(reflection, userId, userName)
    ).length;

    const personalRag = Array.isArray(ragMessages) ? ragMessages : aiInteractions;
    const projectAi = filterAiInteractionsByProject(personalRag, projectId);
    const personalAiCount = projectAi.filter(interaction =>
      isOwnedByUser(interaction, userId, userName)
    ).length;

    return [
      createAchievement('idea_creator', '想法創造者', 'idea', personalIdeaCount, ACHIEVEMENT_THRESHOLDS.idea),
      createAchievement('task_master', '任務執行家', 'task', personalTaskCount, ACHIEVEMENT_THRESHOLDS.task),
      createAchievement('reflective_thinker', '深度反思者', 'reflection', personalReflectionCount, ACHIEVEMENT_THRESHOLDS.reflection),
      createAchievement('ai_explorer', 'AI 探險家', 'ai', personalAiCount, ACHIEVEMENT_THRESHOLDS.ai),
    ];
  }, [
    ideaNodes,
    kanbanTasks,
    personalReflections,
    aiInteractions,
    ragMessages,
    userId,
    userName,
    projectId,
  ]);
}
