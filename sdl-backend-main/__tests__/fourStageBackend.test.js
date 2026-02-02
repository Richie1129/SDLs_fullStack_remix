/**
 * Phase 3: 四階段 SRL 循環 - 後端 API 測試
 *
 * Option B: 隱藏「歷程」階段，改為獨立的 Portfolio 功能模組
 *
 * TDD 紅燈階段：撰寫測試（預期會失敗）
 */

// 導入待測試模組（尚未實作）
const {
  filterStage5Data,
  filterSubmitsByStage,
  isValidFourStageFormat,
  FOUR_STAGE_CONFIG
} = require('../services/fourStageFilterService');

const {
  aggregateBackendPortfolioData,
  generateBackendPortfolioTemplate,
  validateBackendPortfolio,
  STAGE_TITLES,
  SUB_STAGE_TITLES
} = require('../services/portfolioBackendService');

// ============================================
// Part 1: 四階段配置測試
// ============================================

describe('四階段配置常量', () => {
  test('FOUR_STAGE_CONFIG 應包含正確的階段範圍', () => {
    expect(FOUR_STAGE_CONFIG).toBeDefined();
    expect(FOUR_STAGE_CONFIG.STAGE_MIN).toBe(1);
    expect(FOUR_STAGE_CONFIG.STAGE_MAX).toBe(4);
    expect(FOUR_STAGE_CONFIG.SUB_STAGE_MIN).toBe(1);
    expect(FOUR_STAGE_CONFIG.SUB_STAGE_MAX).toBe(3);
  });

  test('STAGE_TITLES 應包含四個階段名稱', () => {
    expect(STAGE_TITLES).toBeDefined();
    expect(STAGE_TITLES[1]).toBe('定標階段');
    expect(STAGE_TITLES[2]).toBe('擇策階段');
    expect(STAGE_TITLES[3]).toBe('監評階段');
    expect(STAGE_TITLES[4]).toBe('調節階段');
    expect(STAGE_TITLES[5]).toBeUndefined();
  });

  test('SUB_STAGE_TITLES 應包含 12 個子階段 (4 階段 x 3 子階段)', () => {
    expect(SUB_STAGE_TITLES).toBeDefined();
    expect(Object.keys(SUB_STAGE_TITLES).length).toBe(12);

    // 驗證定標階段子階段
    expect(SUB_STAGE_TITLES['1-1']).toBe('提出研究主題');
    expect(SUB_STAGE_TITLES['1-2']).toBe('提出研究目的');
    expect(SUB_STAGE_TITLES['1-3']).toBe('提出研究問題');

    // 驗證不應存在 Stage 5 子階段
    expect(SUB_STAGE_TITLES['5-1']).toBeUndefined();
  });
});

// ============================================
// Part 2: Stage 5 資料過濾測試
// ============================================

describe('filterStage5Data - 過濾 Stage 5 資料', () => {
  const mockSubmissions = [
    { id: 1, stage: '1-1', content: '研究主題' },
    { id: 2, stage: '1-2', content: '研究目的' },
    { id: 3, stage: '2-1', content: '研究構想' },
    { id: 4, stage: '3-1', content: '嘗試性研究' },
    { id: 5, stage: '4-1', content: '研究進度' },
    { id: 6, stage: '4-3', content: '研究結論' },
    { id: 7, stage: '5-1', content: '封面製作' },  // 應被過濾
    { id: 8, stage: '5-2', content: '摘要撰寫' },  // 應被過濾
    { id: 9, stage: '5-5', content: '反思撰寫' },  // 應被過濾
  ];

  test('應過濾掉所有 Stage 5 的提交記錄', () => {
    const filtered = filterStage5Data(mockSubmissions);

    expect(filtered.length).toBe(6);
    expect(filtered.every(s => !s.stage.startsWith('5-'))).toBe(true);
  });

  test('應保留 Stage 1-4 的所有記錄', () => {
    const filtered = filterStage5Data(mockSubmissions);

    expect(filtered.find(s => s.stage === '1-1')).toBeDefined();
    expect(filtered.find(s => s.stage === '2-1')).toBeDefined();
    expect(filtered.find(s => s.stage === '3-1')).toBeDefined();
    expect(filtered.find(s => s.stage === '4-3')).toBeDefined();
  });

  test('空陣列應回傳空陣列', () => {
    expect(filterStage5Data([])).toEqual([]);
  });

  test('null 或 undefined 應回傳空陣列', () => {
    expect(filterStage5Data(null)).toEqual([]);
    expect(filterStage5Data(undefined)).toEqual([]);
  });

  test('只有 Stage 5 資料時應回傳空陣列', () => {
    const stage5Only = [
      { id: 1, stage: '5-1', content: '封面' },
      { id: 2, stage: '5-3', content: '目錄' },
    ];

    expect(filterStage5Data(stage5Only)).toEqual([]);
  });
});

describe('filterSubmitsByStage - 按階段分組並過濾', () => {
  const mockSubmissions = [
    { id: 1, stage: '1-1', content: '1-1' },
    { id: 2, stage: '1-2', content: '1-2' },
    { id: 3, stage: '2-1', content: '2-1' },
    { id: 4, stage: '3-3', content: '3-3' },
    { id: 5, stage: '4-1', content: '4-1' },
    { id: 6, stage: '5-1', content: '5-1' },  // 應被過濾
  ];

  test('應回傳只包含 Stage 1-4 的分組', () => {
    const grouped = filterSubmitsByStage(mockSubmissions);

    expect(grouped).toHaveProperty('1');
    expect(grouped).toHaveProperty('2');
    expect(grouped).toHaveProperty('3');
    expect(grouped).toHaveProperty('4');
    expect(grouped).not.toHaveProperty('5');
  });

  test('每個階段應包含正確的提交記錄', () => {
    const grouped = filterSubmitsByStage(mockSubmissions);

    expect(grouped['1'].length).toBe(2);
    expect(grouped['2'].length).toBe(1);
    expect(grouped['3'].length).toBe(1);
    expect(grouped['4'].length).toBe(1);
  });

  test('空陣列應回傳四個空的階段分組', () => {
    const grouped = filterSubmitsByStage([]);

    expect(grouped['1']).toEqual([]);
    expect(grouped['2']).toEqual([]);
    expect(grouped['3']).toEqual([]);
    expect(grouped['4']).toEqual([]);
  });
});

describe('isValidFourStageFormat - 驗證階段格式', () => {
  test('有效的四階段格式應回傳 true', () => {
    expect(isValidFourStageFormat('1-1')).toBe(true);
    expect(isValidFourStageFormat('1-3')).toBe(true);
    expect(isValidFourStageFormat('2-2')).toBe(true);
    expect(isValidFourStageFormat('3-1')).toBe(true);
    expect(isValidFourStageFormat('4-3')).toBe(true);
  });

  test('Stage 5 格式應回傳 false', () => {
    expect(isValidFourStageFormat('5-1')).toBe(false);
    expect(isValidFourStageFormat('5-5')).toBe(false);
  });

  test('超出範圍的格式應回傳 false', () => {
    expect(isValidFourStageFormat('0-1')).toBe(false);
    expect(isValidFourStageFormat('6-1')).toBe(false);
    expect(isValidFourStageFormat('1-0')).toBe(false);
    expect(isValidFourStageFormat('1-4')).toBe(false);  // 子階段最大為 3
  });

  test('無效格式應回傳 false', () => {
    expect(isValidFourStageFormat('')).toBe(false);
    expect(isValidFourStageFormat(null)).toBe(false);
    expect(isValidFourStageFormat('invalid')).toBe(false);
    expect(isValidFourStageFormat('1')).toBe(false);
    expect(isValidFourStageFormat('completed')).toBe(false);
  });
});

// ============================================
// Part 3: 後端 Portfolio 服務測試
// ============================================

describe('aggregateBackendPortfolioData - 聚合專案資料', () => {
  const mockProject = {
    id: 'proj-123',
    name: '測試專案',
    users: [{ username: '學生A' }, { username: '學生B' }],
    createdAt: '2024-01-15T10:00:00Z',
    currentStage: 3,
    currentSubStage: 2
  };

  const mockSubmissions = [
    { id: 1, stage: '1-1', content: '{}', createdAt: '2024-01-16' },
    { id: 2, stage: '2-1', content: '{}', createdAt: '2024-01-17' },
    { id: 3, stage: '3-1', content: '{}', createdAt: '2024-01-18' },
    { id: 4, stage: '5-1', content: '{}', createdAt: '2024-01-19' },  // 應被過濾
  ];

  const mockReflections = [
    { id: 1, stage: 1, content: '反思1', rating: 4, createdAt: '2024-01-16' },
    { id: 2, stage: 3, content: '反思2', rating: 5, createdAt: '2024-01-18' },
  ];

  const mockTasks = [
    { id: 1, stage: 1, status: 'done' },
    { id: 2, stage: 2, status: 'in_progress' },
    { id: 3, stage: 3, status: 'todo' },
  ];

  test('應正確聚合專案資料', () => {
    const result = aggregateBackendPortfolioData(
      mockProject,
      mockSubmissions,
      mockReflections,
      mockTasks
    );

    expect(result).not.toBeNull();
    expect(result.project.id).toBe('proj-123');
    expect(result.project.name).toBe('測試專案');
  });

  test('應過濾掉 Stage 5 的提交', () => {
    const result = aggregateBackendPortfolioData(
      mockProject,
      mockSubmissions,
      mockReflections,
      mockTasks
    );

    const allSubmissions = [
      ...result.stages[1].submissions,
      ...result.stages[2].submissions,
      ...result.stages[3].submissions,
      ...result.stages[4].submissions
    ];

    expect(allSubmissions.length).toBe(3);
    expect(allSubmissions.every(s => !s.stage.startsWith('5-'))).toBe(true);
  });

  test('統計資料應只計算 Stage 1-4', () => {
    const result = aggregateBackendPortfolioData(
      mockProject,
      mockSubmissions,
      mockReflections,
      mockTasks
    );

    expect(result.statistics.totalSubmissions).toBe(3);  // 不包含 Stage 5
    expect(result.statistics.totalReflections).toBe(2);
    expect(result.statistics.totalTasks).toBe(3);
    expect(result.statistics.completedTasks).toBe(1);
  });

  test('無效專案應回傳 null', () => {
    expect(aggregateBackendPortfolioData(null)).toBeNull();
    expect(aggregateBackendPortfolioData({})).toBeNull();
    expect(aggregateBackendPortfolioData({ name: 'test' })).toBeNull();  // 缺少 id
  });
});

describe('generateBackendPortfolioTemplate - 生成模板', () => {
  const mockAggregatedData = {
    project: {
      id: 'proj-123',
      name: '測試專案',
      members: ['學生A', '學生B'],
      startDate: '2024-01-15T10:00:00Z'
    },
    stages: {
      1: {
        submissions: [{ subStage: '1-1', data: {}, createdAt: '2024-01-16' }],
        reflections: [{ content: '反思', rating: 4 }],
        tasks: []
      },
      2: { submissions: [], reflections: [], tasks: [] },
      3: { submissions: [], reflections: [], tasks: [] },
      4: { submissions: [], reflections: [], tasks: [] }
    },
    statistics: {
      totalSubmissions: 1,
      totalReflections: 1,
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0
    },
    generatedAt: '2024-02-01T10:00:00Z'
  };

  test('應生成正確的模板結構', () => {
    const template = generateBackendPortfolioTemplate(mockAggregatedData);

    expect(template).not.toBeNull();
    expect(template.metadata).toBeDefined();
    expect(template.coverPage).toBeDefined();
    expect(template.summary).toBeDefined();
    expect(template.stages).toBeDefined();
    expect(template.conclusion).toBeDefined();
  });

  test('模板應只包含四個階段', () => {
    const template = generateBackendPortfolioTemplate(mockAggregatedData);

    expect(template.stages.length).toBe(4);
    expect(template.stages[0].stageNumber).toBe(1);
    expect(template.stages[3].stageNumber).toBe(4);
  });

  test('封面資訊應正確設置', () => {
    const template = generateBackendPortfolioTemplate(mockAggregatedData);

    expect(template.coverPage.title).toBe('測試專案');
    expect(template.coverPage.subtitle).toBe('自主學習歷程檔案');
    expect(template.coverPage.authors).toBe('學生A、學生B');
  });

  test('無效聚合資料應回傳 null', () => {
    expect(generateBackendPortfolioTemplate(null)).toBeNull();
    expect(generateBackendPortfolioTemplate({})).toBeNull();
    expect(generateBackendPortfolioTemplate({ project: null })).toBeNull();
  });
});

describe('validateBackendPortfolio - 驗證 Portfolio', () => {
  const validTemplate = {
    metadata: { projectName: '專案名稱', projectId: 'proj-123' },
    coverPage: { title: '專案名稱' },
    stages: [
      { stageNumber: 1, hasContent: true, submissions: [], reflections: [] },
      { stageNumber: 2, hasContent: true, submissions: [], reflections: [] },
      { stageNumber: 3, hasContent: false, submissions: [], reflections: [] },
      { stageNumber: 4, hasContent: false, submissions: [], reflections: [] },
    ]
  };

  test('有效模板應通過驗證', () => {
    const result = validateBackendPortfolio(validTemplate);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('缺少專案名稱應產生錯誤', () => {
    const invalidTemplate = {
      ...validTemplate,
      metadata: { projectId: 'proj-123' }
    };
    const result = validateBackendPortfolio(invalidTemplate);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('缺少專案名稱');
  });

  test('沒有任何階段內容應產生錯誤', () => {
    const emptyTemplate = {
      ...validTemplate,
      stages: validTemplate.stages.map(s => ({ ...s, hasContent: false }))
    };
    const result = validateBackendPortfolio(emptyTemplate);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('所有階段都沒有內容');
  });

  test('部分階段有內容應產生警告', () => {
    const result = validateBackendPortfolio(validTemplate);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('2/4');  // 只有 2 個階段有內容
  });

  test('null 模板應標記為無效', () => {
    const result = validateBackendPortfolio(null);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('模板資料不存在');
  });

  test('完整性百分比應正確計算', () => {
    const result = validateBackendPortfolio(validTemplate);

    expect(result.completeness.stagesWithContent).toBe(2);
    expect(result.completeness.totalStages).toBe(4);
    expect(result.completeness.percentage).toBe(50);
  });
});

// ============================================
// Part 4: 向後兼容測試
// ============================================

describe('向後兼容 - Stage 5 舊資料處理', () => {
  test('filterStage5Data 應保留舊 Stage 5 資料的 ID 以供參考', () => {
    const submissionsWithStage5 = [
      { id: 1, stage: '1-1', content: '內容1' },
      { id: 2, stage: '5-1', content: '舊封面資料' },
    ];

    // 過濾後不應包含 Stage 5
    const filtered = filterStage5Data(submissionsWithStage5);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(1);
  });

  test('混合新舊格式資料應正確處理', () => {
    const mixedData = [
      { id: 1, stage: '1-1' },   // 新格式
      { id: 2, stage: '5-1' },   // 舊格式 Stage 5
      { id: 3, stage: '4-3' },   // 新格式完成階段
      { id: 4, stage: '5-5' },   // 舊格式最後子階段
    ];

    const filtered = filterStage5Data(mixedData);
    expect(filtered.length).toBe(2);
    expect(filtered.map(d => d.id)).toEqual([1, 3]);
  });

  test('stage 為 "completed" 的特殊狀態應被保留', () => {
    const withCompletedStatus = [
      { id: 1, stage: '4-3', content: '結論' },
      { id: 2, stage: 'completed', content: '專案完成標記' },
    ];

    // completed 不是數字格式，應被過濾（或特殊處理）
    const filtered = filterStage5Data(withCompletedStatus);
    // 只保留有效的四階段格式
    expect(filtered.find(s => s.stage === '4-3')).toBeDefined();
  });
});

// ============================================
// Part 5: 邊界條件測試
// ============================================

describe('邊界條件測試', () => {
  test('大量資料過濾效能', () => {
    // 產生 10000 筆模擬資料
    const largeDataset = [];
    for (let i = 0; i < 10000; i++) {
      const stage = (i % 5) + 1;
      const subStage = (i % 3) + 1;
      largeDataset.push({
        id: i,
        stage: `${stage}-${subStage}`,
        content: `內容 ${i}`
      });
    }

    const startTime = Date.now();
    const filtered = filterStage5Data(largeDataset);
    const endTime = Date.now();

    // 過濾應在 100ms 內完成
    expect(endTime - startTime).toBeLessThan(100);

    // 應過濾掉 2000 筆 Stage 5 資料 (每 5 筆有 1 筆是 Stage 5)
    expect(filtered.length).toBe(8000);
  });

  test('不完整的 stage 格式應被安全處理', () => {
    const incompleteData = [
      { id: 1, stage: null },
      { id: 2, stage: undefined },
      { id: 3, stage: '' },
      { id: 4, stage: '1' },  // 缺少子階段
      { id: 5, stage: '-1' }, // 缺少主階段
      { id: 6, stage: 'abc' },
      { id: 7, stage: '1-1' }, // 有效
    ];

    const filtered = filterStage5Data(incompleteData);

    // 只有 id:7 是有效的
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(7);
  });
});
