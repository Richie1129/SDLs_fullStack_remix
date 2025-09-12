
// 引入各個計算器
import { useTeamStats } from "./calculators/teamStatsCalculator";
import { usePersonalData } from "./calculators/personalDataCalculator";
import { useLearningTrack } from "./calculators/learningTrackCalculator";
import { useTeammates } from "./calculators/teammatesCalculator";
import { useLearningGoals } from "./calculators/learningGoalsCalculator";
import { useAchievements } from "./calculators/achievementsCalculator";

/**
 * 自定義 Hook 用於計算學生相關指標
 * 重構後的版本 - 作為組合器使用各個專用計算器
 * @param {object} data - 從 useProjectData 獲取的數據
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含所有計算後的指標
 */
export function useStudentMetrics(data, userName, projectId, userId) {
  // 使用各個專用計算器
  const teamStats = useTeamStats(data, projectId);
  const personalData = usePersonalData(data, userName, projectId, userId);
  const learningTrack = useLearningTrack(data, userName, projectId, userId);
  const teammates = useTeammates(data, userId);
  const learningGoals = useLearningGoals(data, userName, projectId, userId);
  const achievements = useAchievements(data, userName, projectId, userId);

  // 返回組合結果 - 保持與原版本完全相同的介面
  return {
    teamStats,
    personalData,
    learningTrack,
    teammates,
    learningGoals,
    achievements
  };
}