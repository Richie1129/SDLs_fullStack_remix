/**
 * TDD Test Suite: Portfolio Auto-Generation (Phase 2)
 *
 * 測試目標：實作 Portfolio 自動生成功能
 * - 從四階段資料自動整合學習歷程
 * - 生成標準化 Portfolio 模板
 * - 支援 PDF 匯出預覽
 *
 * TDD 流程：紅燈 → 綠燈 → 重構
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  aggregatePortfolioData,
  generatePortfolioTemplate,
  validatePortfolioForExport,
  formatPortfolioForPreview,
  generatePortfolio,
  STAGE_TITLES,
  SUB_STAGE_TITLES
} from '../../services/portfolioAutoGenService';

// ============================================
// Part 1: Data Aggregation Service Tests
// ============================================

describe('Portfolio Data Aggregation', () => {

  // 模擬專案資料
  const mockProjectData = {
    projectId: 'proj-123',
    projectName: '水質監測研究專案',
    members: ['Alice', 'Bob', 'Charlie'],
    createdAt: '2024-01-15',
    currentStage: 4,
    currentSubStage: 3
  };

  // 模擬各階段提交資料
  const mockSubmissions = [
    { id: 1, stage: '1-1', content: '{"研究主題":"水質監測系統設計"}', createdAt: '2024-01-20' },
    { id: 2, stage: '1-2', content: '{"研究目的":"探討水質監測自動化方案"}', createdAt: '2024-01-25' },
    { id: 3, stage: '1-3', content: '{"研究問題":"如何提升監測準確度"}', createdAt: '2024-02-01' },
    { id: 4, stage: '2-1', content: '{"研究構想":"採用 IoT 感測器方案"}', createdAt: '2024-02-10' },
    { id: 5, stage: '2-2', content: '{"記錄表格":"水質數據記錄表"}', createdAt: '2024-02-15' },
    { id: 6, stage: '2-3', content: '{"研究排程":"3個月實驗計畫"}', createdAt: '2024-02-20' },
    { id: 7, stage: '3-1', content: '{"嘗試性研究":"初步測試結果"}', createdAt: '2024-03-01' },
    { id: 8, stage: '3-2', content: '{"分析繪圖":"水質變化趨勢圖"}', createdAt: '2024-03-15' },
    { id: 9, stage: '3-3', content: '{"研究結果":"達成 90% 準確率"}', createdAt: '2024-03-25' },
    { id: 10, stage: '4-1', content: '{"進度檢視":"所有里程碑已完成"}', createdAt: '2024-04-01' },
    { id: 11, stage: '4-2', content: '{"研究討論":"導師建議改進方向"}', createdAt: '2024-04-10' },
    { id: 12, stage: '4-3', content: '{"研究結論":"系統可行性獲驗證"}', createdAt: '2024-04-20' },
  ];

  // 模擬反思日誌
  const mockReflections = [
    { id: 1, stage: 1, content: '學到了如何定義研究問題', rating: 4, createdAt: '2024-02-05' },
    { id: 2, stage: 2, content: '設計實驗方案的過程很有挑戰', rating: 5, createdAt: '2024-02-25' },
    { id: 3, stage: 3, content: '數據分析讓我更理解統計方法', rating: 4, createdAt: '2024-03-30' },
    { id: 4, stage: 4, content: '研究討論獲得很多寶貴回饋', rating: 5, createdAt: '2024-04-15' },
  ];

  // 模擬看板任務
  const mockTasks = [
    { id: 1, title: '文獻回顧', status: 'done', stage: 1 },
    { id: 2, title: '設計實驗', status: 'done', stage: 2 },
    { id: 3, title: '數據收集', status: 'done', stage: 3 },
    { id: 4, title: '撰寫報告', status: 'done', stage: 4 },
  ];

  describe('aggregatePortfolioData', () => {

    // 使用從 portfolioAutoGenService 導入的函式

    test('should aggregate all project data correctly', () => {
      const result = aggregatePortfolioData(mockProjectData, mockSubmissions, mockReflections, mockTasks);

      expect(result).not.toBeNull();
      expect(result.project.id).toBe('proj-123');
      expect(result.project.name).toBe('水質監測研究專案');
    });

    test('should group submissions by stage', () => {
      const result = aggregatePortfolioData(mockProjectData, mockSubmissions, mockReflections, mockTasks);

      expect(result.stages[1].submissions.length).toBe(3);
      expect(result.stages[2].submissions.length).toBe(3);
      expect(result.stages[3].submissions.length).toBe(3);
      expect(result.stages[4].submissions.length).toBe(3);
    });

    test('should group reflections by stage', () => {
      const result = aggregatePortfolioData(mockProjectData, mockSubmissions, mockReflections, mockTasks);

      expect(result.stages[1].reflections.length).toBe(1);
      expect(result.stages[2].reflections.length).toBe(1);
      expect(result.stages[3].reflections.length).toBe(1);
      expect(result.stages[4].reflections.length).toBe(1);
    });

    test('should calculate statistics correctly', () => {
      const result = aggregatePortfolioData(mockProjectData, mockSubmissions, mockReflections, mockTasks);

      expect(result.statistics.totalSubmissions).toBe(12);
      expect(result.statistics.totalReflections).toBe(4);
      expect(result.statistics.totalTasks).toBe(4);
      expect(result.statistics.completedTasks).toBe(4);
      expect(result.statistics.completionRate).toBe(100);
    });

    test('should handle empty data gracefully', () => {
      const result = aggregatePortfolioData(mockProjectData, [], [], []);

      expect(result).not.toBeNull();
      expect(result.statistics.totalSubmissions).toBe(0);
      expect(result.statistics.completionRate).toBe(0);
    });

    test('should return null for invalid project', () => {
      expect(aggregatePortfolioData(null, [], [], [])).toBeNull();
      expect(aggregatePortfolioData({}, [], [], [])).toBeNull();
    });

    test('should filter out stage 5 data', () => {
      const dataWithStage5 = [
        ...mockSubmissions,
        { id: 13, stage: '5-1', content: '{"封面":"封面資料"}', createdAt: '2024-05-01' },
        { id: 14, stage: '5-2', content: '{"摘要":"摘要內容"}', createdAt: '2024-05-02' },
      ];

      const result = aggregatePortfolioData(mockProjectData, dataWithStage5, mockReflections, mockTasks);

      expect(result.statistics.totalSubmissions).toBe(12); // Should not include stage 5
    });

    test('should include generation timestamp', () => {
      const result = aggregatePortfolioData(mockProjectData, mockSubmissions, mockReflections, mockTasks);

      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
    });
  });
});

// ============================================
// Part 2: Portfolio Template Generation Tests
// ============================================

describe('Portfolio Template Generation', () => {

  const mockAggregatedData = {
    project: {
      id: 'proj-123',
      name: '水質監測研究專案',
      members: ['Alice', 'Bob', 'Charlie'],
      startDate: '2024-01-15',
      currentStage: 4,
      currentSubStage: 3
    },
    stages: {
      1: {
        submissions: [
          { stage: '1-1', content: '{"研究主題":"水質監測系統設計"}' },
          { stage: '1-2', content: '{"研究目的":"探討水質監測自動化方案"}' },
          { stage: '1-3', content: '{"研究問題":"如何提升監測準確度"}' }
        ],
        reflections: [{ content: '學到了如何定義研究問題', rating: 4 }],
        tasks: [{ title: '文獻回顧', status: 'done' }]
      },
      2: { submissions: [], reflections: [], tasks: [] },
      3: { submissions: [], reflections: [], tasks: [] },
      4: { submissions: [], reflections: [], tasks: [] }
    },
    statistics: {
      totalSubmissions: 12,
      totalReflections: 4,
      totalTasks: 4,
      completedTasks: 4,
      completionRate: 100
    },
    generatedAt: '2024-04-20T10:00:00Z'
  };

  describe('generatePortfolioTemplate', () => {

    // 使用從 portfolioAutoGenService 導入的函式

    test('should generate valid template structure', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      expect(result).not.toBeNull();
      expect(result.metadata).toBeDefined();
      expect(result.coverPage).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.stages).toBeDefined();
      expect(result.conclusion).toBeDefined();
    });

    test('should generate correct cover page', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      expect(result.coverPage.title).toBe('水質監測研究專案');
      expect(result.coverPage.subtitle).toBe('自主學習歷程檔案');
      expect(result.coverPage.authors).toBe('Alice、Bob、Charlie');
    });

    test('should include all 4 stages', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      expect(result.stages.length).toBe(4);
      expect(result.stages[0].stageTitle).toBe('定標階段');
      expect(result.stages[1].stageTitle).toBe('擇策階段');
      expect(result.stages[2].stageTitle).toBe('監評階段');
      expect(result.stages[3].stageTitle).toBe('調節階段');
    });

    test('should parse submission content correctly', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      const stage1 = result.stages[0];
      expect(stage1.submissions.length).toBe(3);
      expect(stage1.submissions[0].subStageTitle).toBe('提出研究主題');
      expect(stage1.submissions[0].data['研究主題']).toBe('水質監測系統設計');
    });

    test('should include reflections in stage data', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      const stage1 = result.stages[0];
      expect(stage1.reflections.length).toBe(1);
      expect(stage1.reflections[0].content).toBe('學到了如何定義研究問題');
      expect(stage1.reflections[0].rating).toBe(4);
    });

    test('should calculate summary statistics', () => {
      const result = generatePortfolioTemplate(mockAggregatedData);

      expect(result.summary.totalStages).toBe(4);
      expect(result.summary.completedSubmissions).toBe(12);
      expect(result.summary.completedReflections).toBe(4);
      expect(result.summary.taskCompletionRate).toBe(100);
    });

    test('should return null for invalid data', () => {
      expect(generatePortfolioTemplate(null)).toBeNull();
      expect(generatePortfolioTemplate({})).toBeNull();
      expect(generatePortfolioTemplate({ stages: {} })).toBeNull();
    });
  });
});

// ============================================
// Part 3: Portfolio Export Service Tests
// ============================================

describe('Portfolio Export Service', () => {

  describe('validatePortfolioForExport', () => {

    // 使用從 portfolioAutoGenService 導入的函式

    test('should validate complete portfolio', () => {
      const completeTemplate = {
        metadata: { projectName: 'Test Project' },
        coverPage: { title: 'Test Title' },
        stages: [
          { hasContent: true, reflections: [{ content: 'reflection' }] },
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] }
        ]
      };

      const result = validatePortfolioForExport(completeTemplate);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.completeness.percentage).toBe(100);
    });

    test('should detect missing project name', () => {
      const incompleteTemplate = {
        metadata: {},
        coverPage: { title: 'Test Title' },
        stages: [{ hasContent: true, reflections: [] }]
      };

      const result = validatePortfolioForExport(incompleteTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('缺少專案名稱');
    });

    test('should detect empty stages', () => {
      const emptyTemplate = {
        metadata: { projectName: 'Test' },
        coverPage: { title: 'Test' },
        stages: [
          { hasContent: false, reflections: [] },
          { hasContent: false, reflections: [] },
          { hasContent: false, reflections: [] },
          { hasContent: false, reflections: [] }
        ]
      };

      const result = validatePortfolioForExport(emptyTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('所有階段都沒有內容');
    });

    test('should warn about incomplete stages', () => {
      const partialTemplate = {
        metadata: { projectName: 'Test' },
        coverPage: { title: 'Test' },
        stages: [
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] },
          { hasContent: false, reflections: [] },
          { hasContent: false, reflections: [] }
        ]
      };

      const result = validatePortfolioForExport(partialTemplate);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('只有 2/4 個階段有內容');
      expect(result.completeness.percentage).toBe(50);
    });

    test('should warn about missing reflections', () => {
      const noReflectionsTemplate = {
        metadata: { projectName: 'Test' },
        coverPage: { title: 'Test' },
        stages: [
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] },
          { hasContent: true, reflections: [] }
        ]
      };

      const result = validatePortfolioForExport(noReflectionsTemplate);

      expect(result.warnings).toContain('沒有任何反思日誌');
    });

    test('should handle null template', () => {
      const result = validatePortfolioForExport(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('模板資料不存在');
    });
  });
});

// ============================================
// Part 4: Portfolio Preview Component Tests
// ============================================

describe('Portfolio Preview Data', () => {

  describe('formatPortfolioForPreview', () => {

    // 使用從 portfolioAutoGenService 導入的函式

    test('should format template for preview', () => {
      const template = {
        coverPage: {
          title: 'Test Project',
          subtitle: '自主學習歷程檔案',
          authors: 'Alice',
          date: '2024-04-20'
        },
        summary: {
          totalStages: 4,
          completedSubmissions: 12,
          completedReflections: 4,
          taskCompletionRate: 100
        },
        stages: [
          {
            stageNumber: 1,
            stageTitle: '定標階段',
            hasContent: true,
            submissions: [{ subStageTitle: '提出研究主題', data: { '主題': 'Test' } }],
            reflections: []
          }
        ],
        conclusion: {
          hasAllStages: false,
          overallProgress: 25
        }
      };

      const result = formatPortfolioForPreview(template);

      expect(result).not.toBeNull();
      expect(result.sections.length).toBe(4); // cover, summary, stage, conclusion
      expect(result.exportReady).toBe(true);
    });

    test('should include cover section', () => {
      const template = {
        coverPage: {
          title: 'Test',
          subtitle: 'Sub',
          authors: 'Author',
          date: '2024-01-01'
        },
        stages: []
      };

      const result = formatPortfolioForPreview(template);
      const coverSection = result.sections.find(s => s.type === 'cover');

      expect(coverSection).toBeDefined();
      expect(coverSection.title).toBe('Test');
    });

    test('should include summary section with stats', () => {
      const template = {
        summary: {
          totalStages: 4,
          completedSubmissions: 10,
          completedReflections: 3,
          taskCompletionRate: 80
        },
        stages: []
      };

      const result = formatPortfolioForPreview(template);
      const summarySection = result.sections.find(s => s.type === 'summary');

      expect(summarySection).toBeDefined();
      expect(summarySection.stats.length).toBe(4);
      expect(summarySection.stats[0].value).toBe(4);
    });

    test('should only include stages with content', () => {
      const template = {
        stages: [
          { stageNumber: 1, stageTitle: 'Stage 1', hasContent: true, submissions: [], reflections: [] },
          { stageNumber: 2, stageTitle: 'Stage 2', hasContent: false, submissions: [], reflections: [] },
          { stageNumber: 3, stageTitle: 'Stage 3', hasContent: true, submissions: [], reflections: [] }
        ]
      };

      const result = formatPortfolioForPreview(template);
      const stageSections = result.sections.filter(s => s.type === 'stage');

      expect(stageSections.length).toBe(2);
      expect(stageSections[0].stageNumber).toBe(1);
      expect(stageSections[1].stageNumber).toBe(3);
    });

    test('should return null for null input', () => {
      expect(formatPortfolioForPreview(null)).toBeNull();
    });

    test('should calculate export readiness', () => {
      const minimalTemplate = {
        coverPage: { title: 'T' },
        summary: { totalStages: 4 },
        stages: [{ hasContent: true, stageNumber: 1, stageTitle: 'S', submissions: [], reflections: [] }]
      };

      const result = formatPortfolioForPreview(minimalTemplate);
      expect(result.exportReady).toBe(true);

      const emptyTemplate = { stages: [] };
      const emptyResult = formatPortfolioForPreview(emptyTemplate);
      expect(emptyResult.exportReady).toBe(false);
    });
  });
});

// ============================================
// Part 5: Integration Tests
// ============================================

describe('Portfolio Auto-Generation Integration', () => {

  test('should generate complete portfolio from raw data using service', () => {
    // 使用實際的 generatePortfolio 服務函式
    const rawProject = {
      projectId: 'test-proj',
      projectName: 'Integration Test Project',
      members: ['User1'],
      createdAt: '2024-01-01',
      currentStage: 4,
      currentSubStage: 3
    };

    const rawSubmissions = [
      { id: 1, stage: '1-1', content: '{"test":"data"}' }
    ];

    const result = generatePortfolio(rawProject, rawSubmissions, [], []);

    expect(result.success).toBe(true);
    expect(result.data.template.coverPage.title).toBe('Integration Test Project');
    expect(result.data.validation.isValid).toBe(true);
  });

  test('should handle project with no submissions gracefully', () => {
    const emptyProject = {
      projectId: 'empty-proj',
      projectName: 'Empty Project',
      members: [],
      currentStage: 1,
      currentSubStage: 1
    };

    const result = generatePortfolio(emptyProject, [], [], []);

    expect(result.success).toBe(true);
    expect(result.data.template.summary.completedSubmissions).toBe(0);
    // 驗證應該會有警告，因為所有階段都沒有內容
    expect(result.data.validation.errors).toContain('所有階段都沒有內容');
  });

  test('should return error for invalid project', () => {
    const result = generatePortfolio(null, [], [], []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('無效的專案資料');
  });
});
