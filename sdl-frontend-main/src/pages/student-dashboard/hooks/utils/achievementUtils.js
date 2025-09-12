/**
 * 成就等級計算工具
 */

/**
 * 成就閾值配置
 */
export const ACHIEVEMENT_THRESHOLDS = {
  idea: { bronze: 5, silver: 15, gold: 30 },
  task: { bronze: 5, silver: 15, gold: 30 },
  reflection: { bronze: 1, silver: 5, gold: 10 },
  ai: { bronze: 10, silver: 30, gold: 60 },
  peer_review: { bronze: 3, silver: 10, gold: 25 },
};

/**
 * 根據數量和閾值判斷等級
 */
export const getLevelForCount = (count, threshold) => {
  if (count >= threshold.gold) return 'gold';
  if (count >= threshold.silver) return 'silver';
  if (count >= threshold.bronze) return 'bronze';
  return 'none';
};

/**
 * 獲取下一個等級和目標
 */
export const getNextTarget = (count, threshold) => {
  if (count < threshold.bronze) return { nextLevel: 'bronze', nextTarget: threshold.bronze };
  if (count < threshold.silver) return { nextLevel: 'silver', nextTarget: threshold.silver };
  if (count < threshold.gold) return { nextLevel: 'gold', nextTarget: threshold.gold };
  return { nextLevel: null, nextTarget: threshold.gold };
};

/**
 * 創建成就對象
 */
export const createAchievement = (key, title, type, count, threshold) => {
  const level = getLevelForCount(count, threshold);
  const { nextLevel, nextTarget } = getNextTarget(count, threshold);
  const progressPercent = Math.min(100, Math.round((count / threshold.gold) * 100));
  
  const getDescription = (type, count, gold) => {
    switch (type) {
      case 'idea':
        return `已建立 ${count}/${gold} 個想法節點`;
      case 'task':
        return `已參與 ${count}/${gold} 個任務`;
      case 'reflection':
        return `已撰寫 ${count}/${gold} 篇反思日誌`;
      case 'ai':
        return `已進行 ${count}/${gold} 次 AI 互動`;
      default:
        return `已收到 ${count}/${gold} 則跨組評論`;
    }
  };

  return {
    key,
    title,
    type,
    level,
    current: count,
    thresholds: threshold,
    nextLevel,
    nextTarget,
    progressPercent,
    description: getDescription(type, count, threshold.gold)
  };
};