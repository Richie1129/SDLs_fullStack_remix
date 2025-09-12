/**
 * 成就系統計算器
 */
import { useMemo } from "react";
import { 
  normalizeId, 
  assigneesIncludesUser, 
  isOwnedByUser,
  filterAiInteractionsByProject
} from "../utils/dataUtils";
import { 
  ACHIEVEMENT_THRESHOLDS, 
  createAchievement 
} from "../utils/achievementUtils";

/**
 * 計算團隊成就數據
 */
const calculateTeamAchievements = (data, projectId) => {
  const {
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    reflectionLogs = [],
    teamAiInteractions = [],
    ragMessagesTeam = undefined,
    peerComments = [],
    teamMembers = []
  } = data;

  // 團隊數據計算
  const teamIdeaCount = ideaNodes.length;
  const teamTaskCount = kanbanTasks.length;
  
  // 反思日誌 - 優先使用 reflectionLogs，後備使用 personalReflections
  const reflectionLogsTeam = Array.isArray(reflectionLogs) 
    ? reflectionLogs 
    : personalReflections;
  const teamReflectionCount = reflectionLogsTeam.length;

  // AI 互動 - 專案範圍內
  const teamRag = Array.isArray(ragMessagesTeam) ? ragMessagesTeam : teamAiInteractions;
  const projectAiInteractionsTeam = filterAiInteractionsByProject(teamRag, projectId);
  const teamAiCount = projectAiInteractionsTeam.length;

  // 跨組評論數
  const currentProjectId = normalizeId(projectId);
  const teamMemberIdSet = new Set(
    teamMembers.map(member => String(member?.id ?? ''))
  );

  const teamPeerReviewCount = peerComments.filter(comment => {
    const commenterPid = normalizeId(comment?.commenterProjectId ?? comment?.commenter_project_id);
    if (commenterPid != null) {
      return commenterPid !== currentProjectId;
    }
    const commenterId = comment?.user?.id ?? comment?.userId;
    return commenterId != null && !teamMemberIdSet.has(String(commenterId));
  }).length;

  // 建立團隊成就
  return [
    createAchievement('idea_creator_team', '想法創造者', 'idea', teamIdeaCount, ACHIEVEMENT_THRESHOLDS.idea),
    createAchievement('task_master_team', '任務執行家', 'task', teamTaskCount, ACHIEVEMENT_THRESHOLDS.task),
    createAchievement('reflective_thinker_team', '深度反思者', 'reflection', teamReflectionCount, ACHIEVEMENT_THRESHOLDS.reflection),
    createAchievement('ai_explorer_team', 'AI 探險家', 'ai', teamAiCount, ACHIEVEMENT_THRESHOLDS.ai),
    createAchievement('peer_review_team', '人氣專案', 'peer_review', teamPeerReviewCount, ACHIEVEMENT_THRESHOLDS.peer_review),
  ];
};

/**
 * 計算個人成就數據
 */
const calculatePersonalAchievements = (data, userId, userName, projectId) => {
  const {
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    aiInteractions = [],
    ragMessages = undefined
  } = data;

  const meId = normalizeId(userId);
  const meName = userName || '';

  // 個人想法節點數
  const personalIdeaCount = ideaNodes.filter(node => 
    isOwnedByUser(node, userId, userName)
  ).length;

  // 個人任務數（指派給自己的任務）
  const personalTaskCount = kanbanTasks.filter(task => 
    assigneesIncludesUser(task?.assignees, userId, userName)
  ).length;

  // 個人反思數
  const personalReflectionCount = personalReflections.filter(reflection => 
    isOwnedByUser(reflection, userId, userName)
  ).length;

  // 個人AI互動數（專案內）
  const personalRag = Array.isArray(ragMessages) ? ragMessages : aiInteractions;
  const projectAiInteractionsPersonal = filterAiInteractionsByProject(personalRag, projectId);
  const personalAiCount = projectAiInteractionsPersonal.filter(interaction => 
    isOwnedByUser(interaction, userId, userName)
  ).length;

  // 建立個人成就
  return [
    createAchievement('idea_creator_personal', '想法創造者', 'idea', personalIdeaCount, ACHIEVEMENT_THRESHOLDS.idea),
    createAchievement('task_master_personal', '任務執行家', 'task', personalTaskCount, ACHIEVEMENT_THRESHOLDS.task),
    createAchievement('reflective_thinker_personal', '深度反思者', 'reflection', personalReflectionCount, ACHIEVEMENT_THRESHOLDS.reflection),
    createAchievement('ai_explorer_personal', 'AI 探險家', 'ai', personalAiCount, ACHIEVEMENT_THRESHOLDS.ai),
  ];
};

/**
 * 成就系統計算器
 * @param {object} data - 原始資料
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含團隊和個人成就的對象
 */
export function useAchievements(data, userName, projectId, userId) {
  const {
    reflectionLogs,
    personalReflections = [],
    ideaNodes = [],
    kanbanTasks = [],
    aiInteractions = [],
    teamAiInteractions = [],
    ragMessages,
    ragMessagesTeam,
    peerComments = [],
    teamMembers = []
  } = data || {};

  return useMemo(() => {
    const achievementData = {
      reflectionLogs,
      personalReflections,
      ideaNodes,
      kanbanTasks,
      aiInteractions,
      teamAiInteractions,
      ragMessages,
      ragMessagesTeam,
      peerComments,
      teamMembers
    };

    const team = calculateTeamAchievements(achievementData, projectId);
    const personal = calculatePersonalAchievements(achievementData, userId, userName, projectId);

    return { team, personal };
  }, [
    reflectionLogs,
    personalReflections,
    ideaNodes,
    kanbanTasks,
    aiInteractions,
    teamAiInteractions,
    ragMessages,
    ragMessagesTeam,
    peerComments,
    teamMembers,
    userId,
    userName,
    projectId
  ]);
}