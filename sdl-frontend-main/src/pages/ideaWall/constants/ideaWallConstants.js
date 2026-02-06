/**
 * IdeaWall 常數定義
 */

// 節點顏色配置
export const NODE_COLORS = [
    "#5BA491", "#26547C", "#F25757", "#AF7A6D", "#183446", 
    "#9395D3", "#FF6542", "#78290F", "#DEA47E", "#9DACFF", 
    "#2F3061", "#FFD166"
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
