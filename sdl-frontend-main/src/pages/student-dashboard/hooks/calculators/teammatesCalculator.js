/**
 * 團隊成員計算器
 */
import { useMemo } from "react";
import { formatRelativeTime, calculateProgress } from "../../utils";
import { normalizeId, assigneesIncludesUser, isOwnedByUser } from "../utils/dataUtils";

/**
 * 團隊成員計算器
 * @param {object} data - 原始資料
 * @param {string} userId - 當前用戶ID
 * @returns {Array} 團隊成員資料
 */
export function useTeammates(data, userId) {
  const {
    teamMembers = [],
    kanbanTasks = [],
    personalReflections = [],
    ideaNodes = [],
    chatHistory = []
  } = data || {};

  return useMemo(() => {
    if (!Array.isArray(teamMembers) || !userId) return [];

    return teamMembers
      .filter(member => member && member.id && String(member.id) !== String(userId))
      .map(member => {
        const name = member.username || member.name || "匿名成員";
        const mid = member.id;
        const stage = Number(member.currentStage) || 0;
        const subStage = Number(member.currentSubStage) || 0;
        const progress = calculateProgress(stage, subStage);

        // 收集該成員最近活動時間戳
        const timestamps = [];
        const pushTime = (t) => { 
          if (t) timestamps.push(new Date(t).getTime()); 
        };

        // 任務活動
        kanbanTasks.forEach(task => {
          const assigned = assigneesIncludesUser(task?.assignees, mid, name);
          const createdByMember = isOwnedByUser(task, mid, name);
          if (assigned || createdByMember) {
            pushTime(task?.updatedAt || task?.createdAt);
          }
        });

        // 反思活動
        personalReflections.forEach(reflection => {
          if (isOwnedByUser(reflection, mid, name)) {
            pushTime(reflection?.createdAt);
          }
        });

        // 想法節點活動
        ideaNodes.forEach(node => {
          if (isOwnedByUser(node, mid, name)) {
            pushTime(node?.createdAt);
          }
        });

        // 聊天活動
        chatHistory.forEach(chat => {
          const chatUserId = normalizeId(chat?.userId ?? chat?.user_id);
          const chatAuthor = chat?.author ?? chat?.username ?? chat?.user_name ?? '';
          if ((chatUserId && chatUserId === normalizeId(mid)) || (chatAuthor && chatAuthor === name)) {
            pushTime(chat?.createdAt);
          }
        });

        // 計算最後活動時間
        const lastTimestamp = timestamps.length ? Math.max(...timestamps) : null;
        const lastSeen = lastTimestamp ? formatRelativeTime(new Date(lastTimestamp).toISOString()) : '無活動';

        // 根據進度判斷狀態
        let status = 'inactive';
        if (progress >= 80) status = 'excellent';
        else if (progress >= 50) status = 'active';
        else status = 'attention';

        return {
          name,
          role: member.role || "研究員",
          progress,
          status,
          lastSeen
        };
      });
  }, [teamMembers, userId, kanbanTasks, personalReflections, ideaNodes, chatHistory]);
}