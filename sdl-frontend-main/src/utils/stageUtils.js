/**
 * 階段相關的共用工具函式
 * 統一了 SideBar.jsx 和 SubStageBar.jsx 中的重複邏輯
 */

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
