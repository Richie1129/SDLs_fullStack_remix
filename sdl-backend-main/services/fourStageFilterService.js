/**
 * 四階段過濾服務
 *
 * Option B: 四階段 SRL 循環 - 過濾 Stage 5 資料
 * 將「歷程」階段從 API 回應中過濾，改為獨立的 Portfolio 功能模組
 *
 * 功能：
 * 1. 過濾 Stage 5 資料
 * 2. 按階段分組資料
 * 3. 驗證階段格式
 */

// ============================================
// 配置常量
// ============================================

/**
 * 四階段配置
 * [Option B 隱藏] 原為五階段，現改為四階段
 */
const FOUR_STAGE_CONFIG = {
  STAGE_MIN: 1,
  STAGE_MAX: 4,          // [Option B 隱藏] 原值 5，改為 4
  SUB_STAGE_MIN: 1,
  SUB_STAGE_MAX: 3,      // [Option B 隱藏] 原值 10，改為 3
  HIDDEN_STAGE: 5        // 被隱藏的「歷程」階段
};

/**
 * 階段名稱對應表
 * [Option B 隱藏] 不包含 Stage 5
 */
const STAGE_TITLES = {
  1: '定標階段',
  2: '擇策階段',
  3: '監評階段',
  4: '調節階段'
  // [Option B 隱藏] 5: '歷程階段' - 改為獨立的 Portfolio 功能模組
};

/**
 * 子階段名稱對應表
 * [Option B 隱藏] 不包含 Stage 5 子階段
 */
const SUB_STAGE_TITLES = {
  '1-1': '提出研究主題',
  '1-2': '提出研究目的',
  '1-3': '提出研究問題',
  '2-1': '訂定研究構想表',
  '2-2': '設計研究記錄表',
  '2-3': '規劃研究排程',
  '3-1': '進行嘗試性研究',
  '3-2': '分析資料與繪圖',
  '3-3': '撰寫研究結果',
  '4-1': '檢視研究進度',
  '4-2': '進行研究討論',
  '4-3': '撰寫研究結論'
  // [Option B 隱藏] Stage 5 子階段
  // '5-1': '封面製作',
  // '5-2': '摘要撰寫',
  // '5-3': '目錄編制',
  // '5-4': '內容撰寫',
  // '5-5': '反思撰寫'
};

// ============================================
// 工具函式
// ============================================

/**
 * 解析階段格式
 * @param {string} stage - 階段字串 (如 "1-2")
 * @returns {object|null} { stageNum, subStageNum } 或 null
 */
const parseStageFormat = (stage) => {
  if (!stage || typeof stage !== 'string') {
    return null;
  }

  const parts = stage.split('-');
  if (parts.length !== 2) {
    return null;
  }

  const stageNum = parseInt(parts[0], 10);
  const subStageNum = parseInt(parts[1], 10);

  if (isNaN(stageNum) || isNaN(subStageNum)) {
    return null;
  }

  return { stageNum, subStageNum };
};

// ============================================
// 過濾函式
// ============================================

/**
 * 過濾 Stage 5 資料
 * @param {Array} submissions - 提交記錄陣列
 * @returns {Array} 過濾後的陣列（只包含 Stage 1-4）
 */
const filterStage5Data = (submissions) => {
  if (!submissions || !Array.isArray(submissions)) {
    return [];
  }

  return submissions.filter(sub => {
    if (!sub || !sub.stage) {
      return false;
    }

    const parsed = parseStageFormat(sub.stage);
    if (!parsed) {
      return false;
    }

    // 只保留 Stage 1-4
    return parsed.stageNum >= FOUR_STAGE_CONFIG.STAGE_MIN &&
           parsed.stageNum <= FOUR_STAGE_CONFIG.STAGE_MAX &&
           parsed.subStageNum >= FOUR_STAGE_CONFIG.SUB_STAGE_MIN &&
           parsed.subStageNum <= FOUR_STAGE_CONFIG.SUB_STAGE_MAX;
  });
};

/**
 * 按階段分組並過濾
 * @param {Array} submissions - 提交記錄陣列
 * @returns {Object} 按階段分組的物件 { 1: [...], 2: [...], 3: [...], 4: [...] }
 */
const filterSubmitsByStage = (submissions) => {
  const grouped = {
    1: [],
    2: [],
    3: [],
    4: []
  };

  if (!submissions || !Array.isArray(submissions)) {
    return grouped;
  }

  submissions.forEach(sub => {
    if (!sub || !sub.stage) {
      return;
    }

    const parsed = parseStageFormat(sub.stage);
    if (!parsed) {
      return;
    }

    // 只分組 Stage 1-4
    if (parsed.stageNum >= FOUR_STAGE_CONFIG.STAGE_MIN &&
        parsed.stageNum <= FOUR_STAGE_CONFIG.STAGE_MAX) {
      grouped[parsed.stageNum].push(sub);
    }
  });

  return grouped;
};

/**
 * 驗證是否為有效的四階段格式
 * @param {string} stage - 階段字串
 * @returns {boolean} 是否有效
 */
const isValidFourStageFormat = (stage) => {
  const parsed = parseStageFormat(stage);

  if (!parsed) {
    return false;
  }

  const { stageNum, subStageNum } = parsed;

  return stageNum >= FOUR_STAGE_CONFIG.STAGE_MIN &&
         stageNum <= FOUR_STAGE_CONFIG.STAGE_MAX &&
         subStageNum >= FOUR_STAGE_CONFIG.SUB_STAGE_MIN &&
         subStageNum <= FOUR_STAGE_CONFIG.SUB_STAGE_MAX;
};

// ============================================
// 匯出
// ============================================

module.exports = {
  FOUR_STAGE_CONFIG,
  STAGE_TITLES,
  SUB_STAGE_TITLES,
  parseStageFormat,
  filterStage5Data,
  filterSubmitsByStage,
  isValidFourStageFormat
};
