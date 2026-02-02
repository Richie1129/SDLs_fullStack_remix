/**
 * Portfolio Auto-Generation Service
 *
 * Option B: 四階段 SRL 循環 - Portfolio 自動生成功能
 * 將「歷程」階段從手動填寫改為根據平台資料自動生成
 *
 * 功能：
 * 1. 資料聚合 - 從四階段收集所有學習資料
 * 2. 模板生成 - 生成標準化 Portfolio 模板
 * 3. 匯出驗證 - 驗證 Portfolio 完整性
 * 4. 預覽格式化 - 準備預覽顯示資料
 */

// ============================================
// 階段配置常量
// ============================================

export const STAGE_TITLES = {
  1: '定標階段',
  2: '擇策階段',
  3: '監評階段',
  4: '調節階段'
};

export const SUB_STAGE_TITLES = {
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
 * 聚合專案的所有學習資料
 * @param {Object} project - 專案資料
 * @param {Array} submissions - 提交記錄
 * @param {Array} reflections - 反思日誌
 * @param {Array} tasks - 看板任務
 * @returns {Object|null} 聚合後的資料
 */
export const aggregatePortfolioData = (project, submissions = [], reflections = [], tasks = []) => {
  if (!project || !project.projectId) {
    return null;
  }

  // 按階段分組提交資料（只保留 Stage 1-4）
  const submissionsByStage = { 1: [], 2: [], 3: [], 4: [] };

  (submissions || []).forEach(sub => {
    if (sub && sub.stage) {
      const stageNum = parseInt(sub.stage.split('-')[0], 10);
      if (stageNum >= 1 && stageNum <= 4) {
        submissionsByStage[stageNum].push(sub);
      }
    }
  });

  // 按階段分組反思
  const reflectionsByStage = { 1: [], 2: [], 3: [], 4: [] };

  (reflections || []).forEach(ref => {
    if (ref && ref.stage >= 1 && ref.stage <= 4) {
      reflectionsByStage[ref.stage].push(ref);
    }
  });

  // 按階段分組任務
  const tasksByStage = { 1: [], 2: [], 3: [], 4: [] };

  (tasks || []).forEach(task => {
    if (task && task.stage >= 1 && task.stage <= 4) {
      tasksByStage[task.stage].push(task);
    }
  });

  // 計算統計資料
  const totalSubmissions = Object.values(submissionsByStage).flat().length;
  const totalReflections = Object.values(reflectionsByStage).flat().length;
  const totalTasks = Object.values(tasksByStage).flat().length;
  const completedTasks = (tasks || []).filter(t => t.status === 'done').length;

  return {
    project: {
      id: project.projectId,
      name: project.projectName,
      members: project.members || [],
      startDate: project.createdAt,
      currentStage: project.currentStage,
      currentSubStage: project.currentSubStage
    },
    stages: {
      1: { submissions: submissionsByStage[1], reflections: reflectionsByStage[1], tasks: tasksByStage[1] },
      2: { submissions: submissionsByStage[2], reflections: reflectionsByStage[2], tasks: tasksByStage[2] },
      3: { submissions: submissionsByStage[3], reflections: reflectionsByStage[3], tasks: tasksByStage[3] },
      4: { submissions: submissionsByStage[4], reflections: reflectionsByStage[4], tasks: tasksByStage[4] },
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
 * 生成 Portfolio 模板
 * @param {Object} aggregatedData - 聚合後的資料
 * @returns {Object|null} Portfolio 模板
 */
export const generatePortfolioTemplate = (aggregatedData) => {
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
      try {
        const parsed = JSON.parse(sub.content);
        return {
          subStage: sub.stage,
          subStageTitle: SUB_STAGE_TITLES[sub.stage] || sub.stage,
          data: parsed,
          createdAt: sub.createdAt
        };
      } catch {
        return {
          subStage: sub.stage,
          subStageTitle: SUB_STAGE_TITLES[sub.stage] || sub.stage,
          data: { content: sub.content },
          createdAt: sub.createdAt
        };
      }
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
      date: new Date(aggregatedData.generatedAt).toLocaleDateString('zh-TW')
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
 * 驗證 Portfolio 是否可匯出
 * @param {Object} template - Portfolio 模板
 * @returns {Object} 驗證結果
 */
export const validatePortfolioForExport = (template) => {
  const errors = [];
  const warnings = [];

  if (!template) {
    errors.push('模板資料不存在');
    return { isValid: false, errors, warnings };
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
// Part 4: Preview Formatting
// ============================================

/**
 * 格式化 Portfolio 供預覽使用
 * @param {Object} template - Portfolio 模板
 * @returns {Object|null} 預覽格式化資料
 */
export const formatPortfolioForPreview = (template) => {
  if (!template) return null;

  const sections = [];

  // 封面
  if (template.coverPage) {
    sections.push({
      type: 'cover',
      title: template.coverPage.title,
      subtitle: template.coverPage.subtitle,
      authors: template.coverPage.authors,
      date: template.coverPage.date
    });
  }

  // 摘要
  if (template.summary) {
    sections.push({
      type: 'summary',
      title: '學習歷程摘要',
      stats: [
        { label: '總階段數', value: template.summary.totalStages },
        { label: '提交記錄', value: template.summary.completedSubmissions },
        { label: '反思日誌', value: template.summary.completedReflections },
        { label: '任務完成率', value: `${template.summary.taskCompletionRate}%` }
      ]
    });
  }

  // 各階段內容
  (template.stages || []).forEach(stage => {
    if (stage.hasContent) {
      sections.push({
        type: 'stage',
        stageNumber: stage.stageNumber,
        title: stage.stageTitle,
        submissions: stage.submissions.map(sub => ({
          subTitle: sub.subStageTitle,
          content: sub.data,
          createdAt: sub.createdAt
        })),
        reflections: stage.reflections
      });
    }
  });

  // 結論
  if (template.conclusion) {
    sections.push({
      type: 'conclusion',
      title: '學習總結',
      isComplete: template.conclusion.hasAllStages,
      progress: template.conclusion.overallProgress
    });
  }

  return {
    sections,
    totalPages: Math.ceil(sections.length * 1.5), // 估算頁數
    exportReady: sections.length >= 3 // 至少需要封面、摘要、一個階段
  };
};

// ============================================
// Part 5: Main Generator Function
// ============================================

/**
 * 生成完整的 Portfolio（主要入口函式）
 * @param {Object} project - 專案資料
 * @param {Array} submissions - 提交記錄
 * @param {Array} reflections - 反思日誌
 * @param {Array} tasks - 看板任務
 * @returns {Object} 完整的 Portfolio 生成結果
 */
export const generatePortfolio = (project, submissions = [], reflections = [], tasks = []) => {
  // Step 1: Aggregate data
  const aggregatedData = aggregatePortfolioData(project, submissions, reflections, tasks);

  if (!aggregatedData) {
    return {
      success: false,
      error: '無效的專案資料',
      data: null
    };
  }

  // Step 2: Generate template
  const template = generatePortfolioTemplate(aggregatedData);

  if (!template) {
    return {
      success: false,
      error: '模板生成失敗',
      data: null
    };
  }

  // Step 3: Validate
  const validation = validatePortfolioForExport(template);

  // Step 4: Format for preview
  const previewData = formatPortfolioForPreview(template);

  return {
    success: true,
    data: {
      template,
      validation,
      preview: previewData,
      aggregatedData
    }
  };
};

// ============================================
// Export default
// ============================================

export default {
  aggregatePortfolioData,
  generatePortfolioTemplate,
  validatePortfolioForExport,
  formatPortfolioForPreview,
  generatePortfolio,
  STAGE_TITLES,
  SUB_STAGE_TITLES
};
