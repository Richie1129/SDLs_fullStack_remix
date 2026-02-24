/**
 * TDD 測試：guidedQuestionsConfig 欄位映射
 *
 * 測試目標：
 * 1. 確保每個引導問題的 fieldName 對應實際的 userSubmit key
 * 2. 確保 CommonInput 正確渲染不同類型的輸入欄位
 *
 * 紅燈階段：這些測試會先失敗，直到我們重寫 guidedQuestionsConfig.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getGuidedQuestions, GUIDED_QUESTIONS, STAGE_NAMES } from '../../pages/submit/config/guidedQuestionsConfig';

// 預期的 userSubmit 結構（與後端測試保持一致）
const EXPECTED_USER_SUBMIT = {
    '1-1': {
        '提議主題': 'input',
        '主題來源': 'input',
        '提議原因': 'textarea',
        '附加檔案': 'file'
    },
    '1-2': {
        '提議題目': 'input',
        '提議原因': 'textarea',
        '相關資料': 'textarea',
        '附加檔案': 'file'
    },
    '1-3': {
        '研究假設': 'textarea',
        '對應的研究變因': 'textarea',
        '附加檔案': 'file'
    },
    '2-1': {
        '研究材料與工具': 'textarea',
        '研究步驟': 'textarea',
        '記錄方式': 'textarea',
        '附加檔案': 'file'
    },
    '2-2': {
        '資料收集方式': 'textarea',
        '記錄表設計說明': 'textarea',
        '預計樣本規模': 'input',
        '研究紀錄表格': 'file'
    },
    '2-3': {
        '時程規劃說明': 'textarea',
        '團隊分工': 'textarea',
        '重要里程碑': 'textarea',
        '研究時程規劃表': 'file'
    },
    '3-1': {
        '嘗試性研究過程': 'textarea',
        '初步結果': 'textarea',
        '調整計畫': 'textarea',
        '實驗記錄': 'file'
    },
    '3-2': {
        '資料描述': 'textarea',
        '分析方法': 'textarea',
        '圖表說明': 'textarea',
        '資料分析檔案': 'file'
    },
    '3-3': {
        '研究成果': 'input',
        '結果說明': 'textarea',
        '應注意和改進事項': 'textarea',
        '附加檔案': 'file'
    },
    '4-1': {
        '進度是否按規劃完成?': 'input',
        '如何改進獲改善?': 'textarea'
    },
    '4-2': {
        '討論內容': 'textarea',
        '不同觀點': 'textarea',
        '改進想法': 'textarea',
        '研究討論檔案': 'file'
    },
    '4-3': {
        '研究結論': 'textarea',
        '研究貢獻': 'textarea',
        '研究限制': 'textarea',
        '未來建議': 'textarea',
        '研究結論檔案': 'file'
    }
};

// 通用反思問題的 fieldName（應該存在於每個 stage）
const COMMON_REFLECTION_FIELD_NAMES = [
    '遇到的困難',
    '解決方法',
    '學習心得'
];

describe('guidedQuestionsConfig 欄位映射', () => {

    describe('Stage 1-1: 提出研究主題', () => {
        it('應有對應 userSubmit 欄位的引導問題', () => {
            const questions = getGuidedQuestions('1-1');
            const expectedFields = Object.keys(EXPECTED_USER_SUBMIT['1-1']);

            // 取得所有非反思問題的 fieldName
            const questionFieldNames = questions
                .filter(q => !COMMON_REFLECTION_FIELD_NAMES.includes(q.fieldName))
                .map(q => q.fieldName);

            // 每個預期欄位（除了 file）都應有對應的引導問題
            expectedFields
                .filter(f => EXPECTED_USER_SUBMIT['1-1'][f] !== 'file')
                .forEach(field => {
                    expect(questionFieldNames).toContain(field);
                });
        });
    });

    describe('Stage 2-2: 設計研究記錄表格', () => {
        it('應有「資料收集方式」的引導問題', () => {
            const questions = getGuidedQuestions('2-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('資料收集方式');
        });

        it('應有「記錄表設計說明」的引導問題', () => {
            const questions = getGuidedQuestions('2-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('記錄表設計說明');
        });

        it('應有「預計樣本規模」的引導問題', () => {
            const questions = getGuidedQuestions('2-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('預計樣本規模');
        });

        it('引導問題的 inputType 應與 userSubmit 類型一致', () => {
            const questions = getGuidedQuestions('2-2');
            const expected = EXPECTED_USER_SUBMIT['2-2'];

            questions.forEach(q => {
                if (expected[q.fieldName]) {
                    expect(q.inputType).toBe(expected[q.fieldName]);
                }
            });
        });
    });

    describe('Stage 2-3: 規劃研究排程', () => {
        it('應有「時程規劃說明」的引導問題', () => {
            const questions = getGuidedQuestions('2-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('時程規劃說明');
        });

        it('應有「團隊分工」的引導問題', () => {
            const questions = getGuidedQuestions('2-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('團隊分工');
        });

        it('應有「重要里程碑」的引導問題', () => {
            const questions = getGuidedQuestions('2-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('重要里程碑');
        });
    });

    describe('Stage 3-1: 進行嘗試性研究', () => {
        it('應有「嘗試性研究過程」的引導問題', () => {
            const questions = getGuidedQuestions('3-1');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('嘗試性研究過程');
        });

        it('應有「初步結果」的引導問題', () => {
            const questions = getGuidedQuestions('3-1');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('初步結果');
        });

        it('應有「調整計畫」的引導問題', () => {
            const questions = getGuidedQuestions('3-1');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('調整計畫');
        });
    });

    describe('Stage 3-2: 分析資料與繪圖', () => {
        it('應有「資料描述」的引導問題', () => {
            const questions = getGuidedQuestions('3-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('資料描述');
        });

        it('應有「分析方法」的引導問題', () => {
            const questions = getGuidedQuestions('3-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('分析方法');
        });

        it('應有「圖表說明」的引導問題', () => {
            const questions = getGuidedQuestions('3-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('圖表說明');
        });
    });

    describe('Stage 4-2: 進行研究討論', () => {
        it('應有「討論內容」的引導問題', () => {
            const questions = getGuidedQuestions('4-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('討論內容');
        });

        it('應有「不同觀點」的引導問題', () => {
            const questions = getGuidedQuestions('4-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('不同觀點');
        });

        it('應有「改進想法」的引導問題', () => {
            const questions = getGuidedQuestions('4-2');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('改進想法');
        });
    });

    describe('Stage 4-3: 撰寫研究結論', () => {
        it('應有「研究結論」的引導問題', () => {
            const questions = getGuidedQuestions('4-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('研究結論');
        });

        it('應有「研究貢獻」的引導問題', () => {
            const questions = getGuidedQuestions('4-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('研究貢獻');
        });

        it('應有「研究限制」的引導問題', () => {
            const questions = getGuidedQuestions('4-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('研究限制');
        });

        it('應有「未來建議」的引導問題', () => {
            const questions = getGuidedQuestions('4-3');
            const fieldNames = questions.map(q => q.fieldName);
            expect(fieldNames).toContain('未來建議');
        });
    });

    describe('通用反思問題', () => {
        const stagesWithReflection = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3'];

        it('每個階段都應包含「遇到的困難」反思問題', () => {
            stagesWithReflection.forEach(stageKey => {
                const questions = getGuidedQuestions(stageKey);
                const fieldNames = questions.map(q => q.fieldName);
                expect(fieldNames).toContain('遇到的困難');
            });
        });

        it('每個階段都應包含「解決方法」反思問題', () => {
            stagesWithReflection.forEach(stageKey => {
                const questions = getGuidedQuestions(stageKey);
                const fieldNames = questions.map(q => q.fieldName);
                expect(fieldNames).toContain('解決方法');
            });
        });

        it('每個階段都應包含「學習心得」反思問題', () => {
            stagesWithReflection.forEach(stageKey => {
                const questions = getGuidedQuestions(stageKey);
                const fieldNames = questions.map(q => q.fieldName);
                expect(fieldNames).toContain('學習心得');
            });
        });
    });

    describe('STAGE_NAMES 配置', () => {
        it('應有 12 個階段名稱 (Stage 1-4, 各 3 個)', () => {
            expect(Object.keys(STAGE_NAMES).length).toBe(12);
        });

        it('每個階段名稱都應對應正確的描述', () => {
            expect(STAGE_NAMES['1-1']).toBe('提出研究主題');
            expect(STAGE_NAMES['2-2']).toBe('設計研究記錄表格');
            expect(STAGE_NAMES['3-1']).toBe('進行嘗試性研究');
            expect(STAGE_NAMES['4-3']).toBe('撰寫研究結論');
        });
    });

    describe('引導問題結構驗證', () => {
        const allStages = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3'];

        it('每個引導問題都應有必要的屬性', () => {
            allStages.forEach(stageKey => {
                const questions = getGuidedQuestions(stageKey);

                questions.forEach(q => {
                    expect(q).toHaveProperty('id');
                    expect(q).toHaveProperty('question');
                    expect(q).toHaveProperty('hint');
                    expect(q).toHaveProperty('fieldName');
                    expect(q).toHaveProperty('inputType');
                    expect(q).toHaveProperty('required');
                });
            });
        });

        it('inputType 只能是 input, textarea 或 file', () => {
            const validTypes = ['input', 'textarea', 'file'];

            allStages.forEach(stageKey => {
                const questions = getGuidedQuestions(stageKey);

                questions.forEach(q => {
                    expect(validTypes).toContain(q.inputType);
                });
            });
        });
    });
});
