/**
 * Portfolio 後端服務
 *
 * Option B: 四階段 SRL 循環 - Portfolio 自動生成功能（後端）
 * 將「歷程」階段從手動填寫改為根據平台資料自動生成
 *
 * 功能：
 * 1. 資料聚合 - 從四階段收集所有學習資料
 * 2. 模板生成 - 生成標準化 Portfolio 模板
 * 3. 匯出驗證 - 驗證 Portfolio 完整性
 */

const {
  FOUR_STAGE_CONFIG,
  filterStage5Data,
  filterSubmitsByStage
} = require('./fourStageFilterService');

// ============================================
// 配置常量
// ============================================

/**
 * 階段名稱
 * 與前端 portfolioAutoGenService.js 保持一致
 */
const STAGE_TITLES = {
  1: '定標階段',
  2: '擇策階段',
  3: '監評階段',
  4: '調節階段'
};

/**
 * 子階段名稱
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
};

// ============================================
// Part 1: Data Aggregation
// ============================================

/**
 * 聚合專案的所有學習資料（後端版本）
 * @param {Object} project - 專案資料
 * @param {Array} submissions - 提交記錄
 * @param {Array} reflections - 反思日誌
 * @param {Array} tasks - 看板任務
 * @returns {Object|null} 聚合後的資料
 */
const aggregateBackendPortfolioData = (project, submissions = [], reflections = [], tasks = []) => {
  // 驗證專案資料
  if (!project || (!project.id && !project.projectId)) {
    return null;
  }

  const projectId = project.id || project.projectId;

  // 過濾並按階段分組提交資料（排除 Stage 5）
  const filteredSubmissions = filterStage5Data(submissions);
  const submissionsByStage = filterSubmitsByStage(filteredSubmissions);

  // 按階段分組反思（只保留 Stage 1-4）
  const reflectionsByStage = { 1: [], 2: [], 3: [], 4: [] };

  (reflections || []).forEach(ref => {
    if (ref && ref.stage >= FOUR_STAGE_CONFIG.STAGE_MIN &&
        ref.stage <= FOUR_STAGE_CONFIG.STAGE_MAX) {
      reflectionsByStage[ref.stage].push(ref);
    }
  });

  // 按階段分組任務（只保留 Stage 1-4）
  const tasksByStage = { 1: [], 2: [], 3: [], 4: [] };

  (tasks || []).forEach(task => {
    if (task && task.stage >= FOUR_STAGE_CONFIG.STAGE_MIN &&
        task.stage <= FOUR_STAGE_CONFIG.STAGE_MAX) {
      tasksByStage[task.stage].push(task);
    }
  });

  // 計算統計資料（只計算 Stage 1-4）
  const totalSubmissions = filteredSubmissions.length;
  const totalReflections = Object.values(reflectionsByStage).flat().length;
  const totalTasks = Object.values(tasksByStage).flat().length;
  const completedTasks = (tasks || []).filter(t =>
    t.status === 'done' &&
    t.stage >= FOUR_STAGE_CONFIG.STAGE_MIN &&
    t.stage <= FOUR_STAGE_CONFIG.STAGE_MAX
  ).length;

  // 提取成員名稱
  const members = (project.users || project.members || []).map(u =>
    typeof u === 'string' ? u : (u.username || u.name || '未知')
  );

  return {
    project: {
      id: projectId,
      name: project.name || project.projectName,
      members: members,
      startDate: project.createdAt,
      currentStage: project.currentStage,
      currentSubStage: project.currentSubStage
    },
    stages: {
      1: { submissions: submissionsByStage[1], reflections: reflectionsByStage[1], tasks: tasksByStage[1] },
      2: { submissions: submissionsByStage[2], reflections: reflectionsByStage[2], tasks: tasksByStage[2] },
      3: { submissions: submissionsByStage[3], reflections: reflectionsByStage[3], tasks: tasksByStage[3] },
      4: { submissions: submissionsByStage[4], reflections: reflectionsByStage[4], tasks: tasksByStage[4] }
    },
    statistics: {
      totalSubmissions,
      totalReflections,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    generatedAt: new Date().toISOString()
  };
};

// ============================================
// Part 2: Template Generation
// ============================================

/**
 * 生成 Portfolio 模板（後端版本）
 * @param {Object} aggregatedData - 聚合後的資料
 * @returns {Object|null} Portfolio 模板
 */
const generateBackendPortfolioTemplate = (aggregatedData) => {
  if (!aggregatedData || !aggregatedData.project) {
    return null;
  }

  const { project, stages, statistics } = aggregatedData;

  // 生成各階段內容
  const stageContents = [];
  for (let i = 1; i <= 4; i++) {
    const stageData = stages[i];
    const submissions = stageData?.submissions || [];
    const reflections = stageData?.reflections || [];

    const submissionContents = submissions.map(sub => {
      let parsedData = {};
      try {
        parsedData = JSON.parse(sub.content);
      } catch {
        parsedData = { content: sub.content };
      }

      return {
        subStage: sub.stage,
        subStageTitle: SUB_STAGE_TITLES[sub.stage] || sub.stage,
        data: parsedData,
        createdAt: sub.createdAt
      };
    });

    stageContents.push({
      stageNumber: i,
      stageTitle: STAGE_TITLES[i],
      submissions: submissionContents,
      reflections: reflections.map(r => ({
        content: r.content,
        rating: r.rating,
        createdAt: r.createdAt
      })),
      hasContent: submissionContents.length > 0 || reflections.length > 0
    });
  }

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('zh-TW');
    } catch {
      return '';
    }
  };

  return {
    metadata: {
      projectName: project.name,
      projectId: project.id,
      members: project.members,
      startDate: project.startDate,
      generatedAt: aggregatedData.generatedAt
    },
    coverPage: {
      title: project.name,
      subtitle: '自主學習歷程檔案',
      authors: project.members.join('、'),
      date: formatDate(aggregatedData.generatedAt)
    },
    summary: {
      totalStages: 4,
      completedSubmissions: statistics.totalSubmissions,
      completedReflections: statistics.totalReflections,
      taskCompletionRate: statistics.completionRate
    },
    stages: stageContents,
    conclusion: {
      hasAllStages: stageContents.filter(s => s.hasContent).length === 4,
      overallProgress: statistics.completionRate
    }
  };
};

// ============================================
// Part 3: Export Validation
// ============================================

/**
 * 驗證 Portfolio 是否可匯出（後端版本）
 * @param {Object} template - Portfolio 模板
 * @returns {Object} 驗證結果
 */
const validateBackendPortfolio = (template) => {
  const errors = [];
  const warnings = [];

  if (!template) {
    errors.push('模板資料不存在');
    return { isValid: false, errors, warnings, completeness: { stagesWithContent: 0, totalStages: 4, percentage: 0 } };
  }

  // 檢查必要欄位
  if (!template.metadata?.projectName) {
    errors.push('缺少專案名稱');
  }

  if (!template.coverPage?.title) {
    errors.push('缺少封面標題');
  }

  // 檢查階段內容
  const stages = template.stages || [];
  const stagesWithContent = stages.filter(s => s.hasContent);

  if (stagesWithContent.length === 0) {
    errors.push('所有階段都沒有內容');
  } else if (stagesWithContent.length < 4) {
    warnings.push(`只有 ${stagesWithContent.length}/4 個階段有內容`);
  }

  // 檢查反思日誌
  const totalReflections = stages.reduce((sum, s) => sum + (s.reflections?.length || 0), 0);
  if (totalReflections === 0) {
    warnings.push('沒有任何反思日誌');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: {
      stagesWithContent: stagesWithContent.length,
      totalStages: 4,
      percentage: Math.round((stagesWithContent.length / 4) * 100)
    }
  };
};

// ============================================
// 匯出
// ============================================

module.exports = {
  STAGE_TITLES,
  SUB_STAGE_TITLES,
  aggregateBackendPortfolioData,
  generateBackendPortfolioTemplate,
  validateBackendPortfolio
};
