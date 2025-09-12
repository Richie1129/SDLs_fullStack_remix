/**
 * 團隊統計計算器
 */
import { useMemo } from "react";
import { filterAiInteractionsByProject } from "../utils/dataUtils";

/**
 * 計算團隊統計數據
 * @param {object} data - 原始資料
 * @param {string} projectId - 專案ID
 * @returns {object} 團隊統計結果
 */
export function useTeamStats(data, projectId) {
  const {
    teamAiInteractions = [],
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    teamReflections = []
  } = data || {};

  return useMemo(() => {
    // 篩選專案內的AI互動
    const teamAiInteractionsInProject = filterAiInteractionsByProject(teamAiInteractions, projectId);

    return {
      // 1. 專案中所有成員對科學助手使用次數
      teamAiInteractions: teamAiInteractionsInProject.length,
      
      // 2. 想法節點數
      ideaNodes: ideaNodes.length,
      
      // 3. 看板卡片數
      kanbanTasks: kanbanTasks.length,
      
      // 4. 反思日誌(專案中個人)
      personalReflections: personalReflections.length,
      
      // 5. 反思日誌總計(團隊)
      teamReflections: teamReflections.length
    };
  }, [teamAiInteractions, ideaNodes, kanbanTasks, personalReflections, teamReflections, projectId]);
}