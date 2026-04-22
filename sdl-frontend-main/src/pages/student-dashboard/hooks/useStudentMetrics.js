
// 引入各個計算器
import { useTeamStats } from "./calculators/teamStatsCalculator";
import { usePersonalData } from "./calculators/personalDataCalculator";
import { useLearningGoals } from "./calculators/learningGoalsCalculator";
import { useAchievements } from "./calculators/achievementsCalculator";

/**
 * 自定義 Hook 用於計算學生相關指標
 * @param {object} data - 從 useProjectData 獲取的數據
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含所有計算後的指標
 */
export function useStudentMetrics(data, userName, projectId, userId) {
  return {
    teamStats: useTeamStats(data, projectId),
    personalData: usePersonalData(data, userName, projectId, userId),
    learningGoals: useLearningGoals(data, userName, projectId, userId),
    achievements: useAchievements(data, userName, projectId, userId),
  };
}