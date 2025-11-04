/**
 * 資料格式化工具 - 用於學習歷程匯出功能
 *
 * 提供以下功能：
 * 1. 解析 5Rs 反思結構
 * 2. 轉換階段代碼為中文名稱
 * 3. 格式化統計資料
 */

/**
 * 階段名稱對應表
 */
const STAGE_NAMES = {
  '1': '定標階段',
  '2': '啟動階段',
  '3': '規劃階段',
  '4': '執行階段',
  '5': '收尾階段'
};

/**
 * 5Rs 欄位中文名稱
 */
const FIVE_RS_LABELS = {
  reporting: '描述 (Reporting)',
  responding: '反應 (Responding)',
  relating: '關聯 (Relating)',
  reasoning: '分析 (Reasoning)',
  reconstructing: '重建 (Reconstructing)'
};

/**
 * 轉換階段代碼為中文名稱
 * @param {string} stageCode - 階段代碼，格式："1-2"
 * @returns {object} - { stage: '定標階段', subStage: '1-2' }
 */
function formatStageName(stageCode) {
  if (!stageCode || typeof stageCode !== 'string') {
    return { stage: '未知階段', subStage: stageCode || 'N/A' };
  }

  const mainStage = stageCode.split('-')[0];
  const stageName = STAGE_NAMES[mainStage] || '未知階段';

  return {
    stage: stageName,
    subStage: stageCode,
    displayName: `${stageName} (${stageCode})`
  };
}

/**
 * 解析 5Rs 反思內容
 * @param {string} content - 反思內容（可能是純文字或 JSON 字串）
 * @returns {object} - { is5Rs: boolean, data?: object, text?: string }
 */
function parse5RsContent(content) {
  if (!content) {
    return { is5Rs: false, text: '' };
  }

  // 嘗試解析為 JSON
  try {
    const parsed = JSON.parse(content);

    // 檢查是否為 5Rs 格式
    if (parsed.type === '5Rs_reflection' && parsed.data) {
      return {
        is5Rs: true,
        data: {
          reporting: parsed.data.reporting || '',
          responding: parsed.data.responding || '',
          relating: parsed.data.relating || '',
          reasoning: parsed.data.reasoning || '',
          reconstructing: parsed.data.reconstructing || ''
        }
      };
    }

    // 是 JSON 但不是 5Rs 格式
    return { is5Rs: false, text: JSON.stringify(parsed, null, 2) };

  } catch (e) {
    // 不是 JSON，直接返回純文字
    return { is5Rs: false, text: content };
  }
}

/**
 * 格式化日期為「2025/01/15」格式
 * @param {Date|string} date - 日期
 * @returns {string} - 格式化後的日期字串
 */
function formatDate(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * 格式化日期時間為「2025/01/15 14:30」格式
 * @param {Date|string} date - 日期時間
 * @returns {string} - 格式化後的日期時間字串
 */
function formatDateTime(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 按階段分組 Submit 資料
 * @param {Array} submits - Submit 陣列
 * @returns {object} - { '1': [...], '2': [...], ... }
 */
function groupSubmitsByStage(submits) {
  if (!Array.isArray(submits)) return {};

  const grouped = {};

  submits.forEach(submit => {
    const mainStage = submit.stage ? submit.stage.split('-')[0] : 'unknown';

    if (!grouped[mainStage]) {
      grouped[mainStage] = [];
    }

    grouped[mainStage].push(submit);
  });

  return grouped;
}

/**
 * 計算統計資料
 * @param {object} projectData - 完整的專案資料
 * @returns {object} - 統計資料
 */
function calculateStatistics(projectData) {
  const stats = {
    totalSubmits: 0,
    totalPersonalReflections: 0,
    totalTeamReflections: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalIdeaNodes: 0,
    currentStage: 'N/A',
    currentProgress: 0
  };

  // 提交數量
  if (projectData.submits && Array.isArray(projectData.submits)) {
    stats.totalSubmits = projectData.submits.length;
  }

  // 個人反思數量
  if (projectData.daily_personals && Array.isArray(projectData.daily_personals)) {
    stats.totalPersonalReflections = projectData.daily_personals.length;
  }

  // 團隊反思數量
  if (projectData.daily_teams && Array.isArray(projectData.daily_teams)) {
    stats.totalTeamReflections = projectData.daily_teams.length;
  }

  // 想法牆節點數量
  if (projectData.idea_walls && Array.isArray(projectData.idea_walls)) {
    projectData.idea_walls.forEach(ideaWall => {
      if (ideaWall.nodes && Array.isArray(ideaWall.nodes)) {
        stats.totalIdeaNodes += ideaWall.nodes.length;
      }
    });
  }

  // 看板任務統計
  if (projectData.kanban && projectData.kanban.columns) {
    projectData.kanban.columns.forEach(column => {
      if (column.tasks && Array.isArray(column.tasks)) {
        stats.totalTasks += column.tasks.length;

        // 假設最後一個 column 是「已完成」
        // 或者可以根據 column 名稱判斷
        if (column.name === '已完成' || column.name === 'Done' || column.name === 'Completed') {
          stats.completedTasks += column.tasks.length;
        }
      }
    });
  }

  // 當前階段
  if (projectData.currentStage) {
    const stageInfo = formatStageName(`${projectData.currentStage}-${projectData.currentSubStage || 1}`);
    stats.currentStage = stageInfo.displayName;
    stats.currentProgress = Math.round((projectData.currentStage / 5) * 100);
  }

  // 計算任務完成率
  stats.taskCompletionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return stats;
}

/**
 * 安全地解析 JSON 欄位
 * @param {string|object} data - 可能是 JSON 字串或物件
 * @returns {object|null} - 解析後的物件或 null
 */
function safeJSONParse(data) {
  if (!data) return null;

  // 如果已經是物件，直接返回
  if (typeof data === 'object') return data;

  // 嘗試解析字串
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * 截斷文字（用於預覽）
 * @param {string} text - 原始文字
 * @param {number} maxLength - 最大長度
 * @returns {string} - 截斷後的文字
 */
function truncateText(text, maxLength = 200) {
  if (!text || typeof text !== 'string') return '';

  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + '...';
}

module.exports = {
  formatStageName,
  parse5RsContent,
  formatDate,
  formatDateTime,
  groupSubmitsByStage,
  calculateStatistics,
  safeJSONParse,
  truncateText,
  STAGE_NAMES,
  FIVE_RS_LABELS
};
