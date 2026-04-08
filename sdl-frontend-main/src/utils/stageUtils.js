/**
 * 階段相關的共用工具函式
 * 統一了 SideBar.jsx 和 SubStageBar.jsx 中的重複邏輯
 */

/**
 * 計算專案進度百分比（全專案統一版本）
 * 四階段模式：每階段 25%，每子階段 25/3 ≈ 8.33%
 * stage 4-3 視為 100%（專案完成）
 * @param {number} currentStage - 當前階段 (1-4)
 * @param {number} currentSubStage - 當前子階段 (1-3)
 * @returns {number} 進度百分比 (0-100)
 */
export const calculateProgress = (currentStage, currentSubStage) => {
  if (!currentStage || !currentSubStage) return 0;
  const stage = Number(currentStage);
  const sub = Number(currentSubStage);
  if (Number.isNaN(stage) || Number.isNaN(sub)) return 0;

  // 向後兼容：若為舊的 stage 5 數據，視為完成
  if (stage > 4) return 100;
  // 四階段完成條件：stage 4, substage 3
  if (stage === 4 && sub >= 3) return 100;

  // 四階段計算：每階段 25%，每子階段 25/3 ≈ 8.33%
  const stageProgress = (stage - 1) * 25;
  const subStageProgress = ((sub - 1) / 3) * 25;
  return Math.max(0, Math.min(100, Math.round(stageProgress + subStageProgress)));
};

/**
 * 取得階段背景色
 * @param {number} stageIndex - 要查詢的階段/子階段 index
 * @param {number} currentIndex - 目前所在的 stage/subStage index（需用 parseInt 轉換）
 * @returns {string} 十六進位顏色碼
 */
export function getStageColor(stageIndex, currentIndex) {
    const current = parseInt(currentIndex, 10);
    if (current === stageIndex) {
        return '#5BA491'; // 當前階段
    } else if (stageIndex < current) {
        return '#7C968F'; // 已完成階段
    } else {
        return '#BEBEBE'; // 未來階段
    }
}

/**
 * 取得階段文字色
 * @param {number} stageIndex - 要查詢的階段/子階段 index
 * @param {number} currentIndex - 目前所在的 stage/subStage index
 * @returns {string} Tailwind CSS 文字色 class
 */
export function getStageTextColor(stageIndex, currentIndex) {
    const current = parseInt(currentIndex, 10);
    if (current === stageIndex) {
        return 'text-white animate-pulse'; // 當前階段
    } else if (stageIndex < current) {
        return 'text-slate-200'; // 已完成階段
    } else {
        return 'text-slate-700'; // 未來階段
    }
}
