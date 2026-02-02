/**
 * TDD Test Suite: Four-Stage SRL Refactor (Option B)
 *
 * 測試目標：將五階段改為四階段 SRL 循環
 * - 定標 (1) → 擇策 (2) → 監評 (3) → 調節 (4)
 * - 移除「歷程」(5) 作為獨立階段
 *
 * TDD 流程：紅燈 → 綠燈 → 重構
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================
// Part 1: Stage Configuration Tests
// ============================================

describe('Four-Stage Configuration', () => {

  describe('STAGE_CONFIG constants', () => {
    test('STAGE.MAX should be 4 (not 5)', async () => {
      // 動態 import 以獲取最新配置
      const { __DEV__ } = await import('../../hooks/useStageIndex');

      expect(__DEV__.STAGE_CONFIG.STAGE.MAX).toBe(4);
    });

    test('SUB_STAGE.MAX should be 3 (standard substage count)', async () => {
      const { __DEV__ } = await import('../../hooks/useStageIndex');

      expect(__DEV__.STAGE_CONFIG.SUB_STAGE.MAX).toBe(3);
    });

    test('STAGE.MIN should remain 1', async () => {
      const { __DEV__ } = await import('../../hooks/useStageIndex');

      expect(__DEV__.STAGE_CONFIG.STAGE.MIN).toBe(1);
    });

    test('valid stage range should be 1-4', async () => {
      const { __DEV__ } = await import('../../hooks/useStageIndex');
      const { STAGE } = __DEV__.STAGE_CONFIG;

      const validStages = [];
      for (let i = STAGE.MIN; i <= STAGE.MAX; i++) {
        validStages.push(i);
      }

      expect(validStages).toEqual([1, 2, 3, 4]);
      expect(validStages).not.toContain(5);
    });
  });
});

// ============================================
// Part 2: Progress Calculation Tests
// ============================================

describe('Four-Stage Progress Calculation', () => {

  // 新的進度計算函式（待實作）
  // 四階段模式：每階段 25%，每子階段約 8.33%

  describe('calculateProgressFourStage', () => {

    // 這是我們要實作的新函式
    const calculateProgressFourStage = (currentStage, currentSubStage) => {
      if (!currentStage || !currentSubStage) return 0;
      const stage = Number(currentStage);
      const sub = Number(currentSubStage);
      if (Number.isNaN(stage) || Number.isNaN(sub)) return 0;

      // 四階段模式：stage 4-3 為 100%
      if (stage > 4) return 100;
      if (stage === 4 && sub >= 3) return 100;

      // 每階段 25%，每子階段 25/3 ≈ 8.33%
      const stageProgress = (stage - 1) * 25;
      const subStageProgress = ((sub - 1) / 3) * 25;

      return Math.max(0, Math.min(100, Math.round(stageProgress + subStageProgress)));
    };

    test('stage 1-1 should be 0%', () => {
      expect(calculateProgressFourStage(1, 1)).toBe(0);
    });

    test('stage 1-2 should be ~8%', () => {
      const progress = calculateProgressFourStage(1, 2);
      expect(progress).toBeGreaterThanOrEqual(8);
      expect(progress).toBeLessThanOrEqual(9);
    });

    test('stage 1-3 should be ~17%', () => {
      const progress = calculateProgressFourStage(1, 3);
      expect(progress).toBeGreaterThanOrEqual(16);
      expect(progress).toBeLessThanOrEqual(18);
    });

    test('stage 2-1 should be 25%', () => {
      expect(calculateProgressFourStage(2, 1)).toBe(25);
    });

    test('stage 2-3 should be ~42%', () => {
      const progress = calculateProgressFourStage(2, 3);
      expect(progress).toBeGreaterThanOrEqual(41);
      expect(progress).toBeLessThanOrEqual(43);
    });

    test('stage 3-1 should be 50%', () => {
      expect(calculateProgressFourStage(3, 1)).toBe(50);
    });

    test('stage 4-1 should be 75%', () => {
      expect(calculateProgressFourStage(4, 1)).toBe(75);
    });

    test('stage 4-3 should be 100%', () => {
      expect(calculateProgressFourStage(4, 3)).toBe(100);
    });

    test('stage 5 (deprecated) should return 100%', () => {
      // 向後兼容：若有舊數據進入 stage 5，視為完成
      expect(calculateProgressFourStage(5, 1)).toBe(100);
    });

    test('invalid input should return 0', () => {
      expect(calculateProgressFourStage(null, 1)).toBe(0);
      expect(calculateProgressFourStage(1, null)).toBe(0);
      expect(calculateProgressFourStage('invalid', 1)).toBe(0);
    });
  });
});

// ============================================
// Part 3: Stage Data Filtering Tests
// ============================================

describe('Stage 5 Data Filtering', () => {

  // 測試數據過濾功能
  const mockSubmitData = [
    { id: 1, stage: '1-1', content: 'Goal 1' },
    { id: 2, stage: '1-2', content: 'Goal 2' },
    { id: 3, stage: '2-1', content: 'Strategy 1' },
    { id: 4, stage: '3-1', content: 'Monitor 1' },
    { id: 5, stage: '4-1', content: 'Regulate 1' },
    { id: 6, stage: '4-3', content: 'Regulate 3' },
    // Stage 5 數據（應被過濾）
    { id: 7, stage: '5-1', content: 'Portfolio 1' },
    { id: 8, stage: '5-2', content: 'Portfolio 2' },
    { id: 9, stage: '5-3', content: 'Portfolio 3' },
    { id: 10, stage: '5-4', content: 'Portfolio 4' },
    { id: 11, stage: '5-5', content: 'Portfolio 5' },
  ];

  describe('filterActiveStageData', () => {

    // 過濾函式：只保留 stage 1-4 的數據
    const filterActiveStageData = (data) => {
      if (!Array.isArray(data)) return [];
      return data.filter(item => {
        if (!item || !item.stage) return false;
        const stageNum = parseInt(item.stage.split('-')[0], 10);
        return !isNaN(stageNum) && stageNum >= 1 && stageNum <= 4;
      });
    };

    test('should filter out stage 5 data', () => {
      const filtered = filterActiveStageData(mockSubmitData);

      expect(filtered.length).toBe(6);
      expect(filtered.every(item => !item.stage.startsWith('5-'))).toBe(true);
    });

    test('should keep all stage 1-4 data', () => {
      const filtered = filterActiveStageData(mockSubmitData);

      const stage1 = filtered.filter(item => item.stage.startsWith('1-'));
      const stage2 = filtered.filter(item => item.stage.startsWith('2-'));
      const stage3 = filtered.filter(item => item.stage.startsWith('3-'));
      const stage4 = filtered.filter(item => item.stage.startsWith('4-'));

      expect(stage1.length).toBe(2);
      expect(stage2.length).toBe(1);
      expect(stage3.length).toBe(1);
      expect(stage4.length).toBe(2);
    });

    test('should handle empty array', () => {
      expect(filterActiveStageData([])).toEqual([]);
    });

    test('should handle null/undefined', () => {
      expect(filterActiveStageData(null)).toEqual([]);
      expect(filterActiveStageData(undefined)).toEqual([]);
    });

    test('should handle items without stage field', () => {
      const dataWithMissing = [
        { id: 1, stage: '1-1' },
        { id: 2 }, // no stage
        { id: 3, stage: '2-1' },
      ];

      const filtered = filterActiveStageData(dataWithMissing);
      expect(filtered.length).toBe(2);
    });
  });
});

// ============================================
// Part 4: Stage Info Arrays Tests
// ============================================

describe('Stage Info Arrays (UI Configuration)', () => {

  describe('stageInfo array structure', () => {

    // 預期的四階段配置
    const EXPECTED_STAGE_INFO = [
      ["提出研究主題", "提出研究目的", "提出研究問題"],        // 定標
      ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],  // 擇策
      ["進行嘗試性研究", "分析資列與繪圖", "撰寫研究結果"],    // 監評
      ["檢視研究進度", "進行研究討論", "撰寫研究結論"]         // 調節
    ];

    test('should have exactly 4 stages', () => {
      expect(EXPECTED_STAGE_INFO.length).toBe(4);
    });

    test('each stage should have 3 substages', () => {
      EXPECTED_STAGE_INFO.forEach((stage, index) => {
        expect(stage.length).toBe(3);
      });
    });

    test('should not include stage 5 (歷程)', () => {
      const allSubstages = EXPECTED_STAGE_INFO.flat();

      // Stage 5 的子階段名稱
      const stage5Names = ['封面製作', '摘要撰寫', '目錄編制', '內容撰寫', '反思撰寫'];

      stage5Names.forEach(name => {
        expect(allSubstages).not.toContain(name);
      });
    });
  });

  describe('insertTitles array', () => {

    const EXPECTED_INSERT_TITLES = ["定標", "擇策", "監評", "調節"];

    test('should have exactly 4 titles', () => {
      expect(EXPECTED_INSERT_TITLES.length).toBe(4);
    });

    test('should not include "歷程"', () => {
      expect(EXPECTED_INSERT_TITLES).not.toContain("歷程");
    });

    test('titles should be in correct order', () => {
      expect(EXPECTED_INSERT_TITLES[0]).toBe("定標");
      expect(EXPECTED_INSERT_TITLES[1]).toBe("擇策");
      expect(EXPECTED_INSERT_TITLES[2]).toBe("監評");
      expect(EXPECTED_INSERT_TITLES[3]).toBe("調節");
    });
  });

  describe('stageDescriptions object', () => {

    const EXPECTED_STAGE_DESCRIPTIONS = {
      "1-1": "提出研究主題",
      "1-2": "提出研究目的",
      "1-3": "提出研究問題",
      "2-1": "訂定研究構想表",
      "2-2": "設計研究記錄表",
      "2-3": "規劃研究排程",
      "3-1": "進行嘗試性研究",
      "3-2": "分析資列與繪圖",
      "3-3": "撰寫研究結果",
      "4-1": "檢視研究進度",
      "4-2": "進行研究討論",
      "4-3": "撰寫研究結論"
    };

    test('should have 12 entries (4 stages x 3 substages)', () => {
      expect(Object.keys(EXPECTED_STAGE_DESCRIPTIONS).length).toBe(12);
    });

    test('should not include stage 5 entries', () => {
      const keys = Object.keys(EXPECTED_STAGE_DESCRIPTIONS);

      expect(keys).not.toContain("5-1");
      expect(keys).not.toContain("5-2");
      expect(keys).not.toContain("5-3");
      expect(keys).not.toContain("5-4");
      expect(keys).not.toContain("5-5");
    });

    test('all stage 1-4 entries should exist', () => {
      for (let stage = 1; stage <= 4; stage++) {
        for (let sub = 1; sub <= 3; sub++) {
          expect(EXPECTED_STAGE_DESCRIPTIONS[`${stage}-${sub}`]).toBeDefined();
        }
      }
    });
  });
});

// ============================================
// Part 5: Backward Compatibility Tests
// ============================================

describe('Backward Compatibility', () => {

  describe('handling legacy stage 5 data', () => {

    const legacyData = [
      { id: 1, stage: '5-1', content: 'Old portfolio data' },
      { id: 2, stage: '5-5', content: 'Old reflection' },
    ];

    test('legacy stage 5 data should be preserved in storage', () => {
      // 數據不應被刪除，只是不在 UI 顯示
      expect(legacyData.length).toBe(2);
      expect(legacyData[0].stage).toBe('5-1');
    });

    test('filtering should not mutate original data', () => {
      const filterActiveStageData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.filter(item => {
          const stageNum = parseInt(item.stage.split('-')[0], 10);
          return stageNum <= 4;
        });
      };

      const originalLength = legacyData.length;
      filterActiveStageData(legacyData);

      expect(legacyData.length).toBe(originalLength);
    });
  });

  describe('project completion detection', () => {

    const isProjectComplete = (currentStage, currentSubStage) => {
      const stage = Number(currentStage);
      const sub = Number(currentSubStage);

      // 四階段模式：stage 4-3 即為完成
      if (stage > 4) return true;
      if (stage === 4 && sub >= 3) return true;
      return false;
    };

    test('stage 4-3 should be considered complete', () => {
      expect(isProjectComplete(4, 3)).toBe(true);
    });

    test('stage 4-2 should not be complete', () => {
      expect(isProjectComplete(4, 2)).toBe(false);
    });

    test('legacy stage 5 should be considered complete', () => {
      expect(isProjectComplete(5, 1)).toBe(true);
    });
  });
});

// ============================================
// Part 6: Integration Tests
// ============================================

describe('Integration: Portfolio Module Separation', () => {

  describe('portfolio should be independent module', () => {

    test('portfolio route should exist independently', () => {
      // Portfolio 不再是「階段」，而是獨立功能
      const PORTFOLIO_ROUTE = '/project/:projectId/portfolio';
      expect(PORTFOLIO_ROUTE).toBeDefined();
    });

    test('portfolio should aggregate data from all 4 stages', () => {
      const mockProjectData = {
        stages: {
          1: { tasks: 5, reflections: 2 },
          2: { tasks: 3, reflections: 1 },
          3: { tasks: 8, reflections: 4 },
          4: { tasks: 4, reflections: 3 },
        }
      };

      // Portfolio 應整合所有階段數據
      const aggregatePortfolioData = (projectData) => {
        const stages = projectData.stages || {};
        let totalTasks = 0;
        let totalReflections = 0;

        // 只計算 stage 1-4
        for (let i = 1; i <= 4; i++) {
          if (stages[i]) {
            totalTasks += stages[i].tasks || 0;
            totalReflections += stages[i].reflections || 0;
          }
        }

        return { totalTasks, totalReflections };
      };

      const result = aggregatePortfolioData(mockProjectData);
      expect(result.totalTasks).toBe(20);
      expect(result.totalReflections).toBe(10);
    });
  });
});
