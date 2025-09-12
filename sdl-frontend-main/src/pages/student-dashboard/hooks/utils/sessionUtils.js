/**
 * Session 時間計算工具
 */

/**
 * Session 計算常數
 */
export const SESSION_CONFIG = {
  INACTIVITY_GAP_MS: 45 * 60 * 1000, // 45 分鐘
  MIN_SESSION_MS: 10 * 60 * 1000,    // 至少 10 分鐘
  MAX_SESSION_MS: 4 * 60 * 60 * 1000 // 最多 4 小時
};

/**
 * 將時間戳陣列計算為學習時段
 */
export const calculateLearningSession = (eventTimes) => {
  if (!Array.isArray(eventTimes) || eventTimes.length === 0) {
    return { totalHours: 0, averageHours: 0 };
  }

  // 排序時間戳
  const sortedTimes = [...eventTimes].sort((a, b) => a - b);
  
  const sessions = [];
  let startAt = null;
  let lastAt = null;

  for (const t of sortedTimes) {
    if (startAt === null) {
      startAt = t;
      lastAt = t;
      continue;
    }

    if (t - lastAt > SESSION_CONFIG.INACTIVITY_GAP_MS) {
      // 結束當前session
      const raw = lastAt - startAt;
      sessions.push(Math.max(SESSION_CONFIG.MIN_SESSION_MS, Math.min(SESSION_CONFIG.MAX_SESSION_MS, raw)));
      startAt = t;
      lastAt = t;
    } else {
      lastAt = t;
    }
  }

  // 處理最後一個session
  if (startAt !== null) {
    const raw = lastAt - startAt;
    sessions.push(Math.max(SESSION_CONFIG.MIN_SESSION_MS, Math.min(SESSION_CONFIG.MAX_SESSION_MS, raw)));
  }

  // 計算總時間和平均時間（小時）
  const totalHours = sessions.length ? (sessions.reduce((s, d) => s + d, 0) / 3600000) : 0;
  const averageHours = sessions.length ? (totalHours / sessions.length) : 0;

  return {
    totalHours: Number(totalHours.toFixed(1)),
    averageHours: Number(averageHours.toFixed(1)),
    sessionCount: sessions.length
  };
};