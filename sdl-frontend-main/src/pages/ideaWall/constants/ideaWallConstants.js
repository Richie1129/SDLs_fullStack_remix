/**
 * IdeaWall 常數定義
 */

// 節點顏色配置 - 高對比度 12 色調色板
// 色相差異大，確保每個顏色都非常容易區分
export const NODE_COLORS = [
    "#DC2626", // 🔴 深紅 - Red 600
    "#EA580C", // 🟠 深橙 - Orange 600
    "#CA8A04", // 🟡 金黃 - Yellow 600
    "#65A30D", // 🟢 深綠 - Lime 600
    "#059669", // 💚 深翠綠 - Emerald 600
    "#0891B2", // 🩵 深青 - Cyan 600
    "#2563EB", // 🔵 深藍 - Blue 600
    "#7C3AED", // 🟣 深紫 - Violet 600
    "#C026D3", // 💜 深洋紅 - Fuchsia 600
    "#DB2777", // 🩷 深粉 - Pink 600
    "#16A34A", // 🟩 中綠 - Green 600
    "#0D9488", // 🟦 深藍綠 - Teal 600
];

// AI Agent 類型對應名稱
export const AGENT_NAMES = {
    'IMPROVER': '想法改進者',
    'SYNTHESIZER': '知識整合者',
    'DEVIL': '魔鬼代言人'
};

// Toast 顯示時長
export const TOAST_DURATION = {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 10000
};

// Modal 類型
export const MODAL_TYPES = {
    CREATE_OPTION: 'createOption',
    BUILD_ON_OPTION: 'buildOnOption',
    CREATE_NODE: 'createNode',
    UPDATE_NODE: 'updateNode',
    KB_COACH: 'kbCoach'
};
