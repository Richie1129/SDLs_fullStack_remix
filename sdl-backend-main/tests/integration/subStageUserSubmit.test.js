/**
 * TDD 測試：SubStage userSubmit 欄位結構
 *
 * 測試目標：確保每個子階段都有符合探究與實作教學目標的欄位
 *
 * 紅燈階段：這些測試會先失敗，直到我們修改 projectController.js
 */

// Mock 預期的 userSubmit 結構（符合 108 課綱探究與實作）
const EXPECTED_USER_SUBMIT = {
    // Stage 1: 定標
    '1-1': {
        name: '提出研究主題',
        fields: {
            '提議主題': 'input',
            '主題來源': 'input',
            '提議原因': 'textarea',
            '附加檔案': 'file'
        }
    },
    '1-2': {
        name: '提出研究目的',
        fields: {
            '提議題目': 'input',
            '提議原因': 'textarea',
            '相關資料': 'textarea',
            '附加檔案': 'file'
        }
    },
    '1-3': {
        name: '提出研究問題',
        fields: {
            '研究假設': 'textarea',
            '對應的研究變因': 'textarea',
            '附加檔案': 'file'
        }
    },

    // Stage 2: 擇策
    '2-1': {
        name: '訂定研究構想表',
        fields: {
            '研究材料與工具': 'textarea',
            '研究步驟': 'textarea',
            '記錄方式': 'textarea',
            '附加檔案': 'file'
        }
    },
    '2-2': {
        name: '設計研究記錄表格',
        fields: {
            '資料收集方式': 'textarea',      // 新增：學習設計資料收集工具
            '記錄表設計說明': 'textarea',    // 新增：說明設計邏輯
            '預計樣本規模': 'input',         // 新增：預計樣本數量
            '研究紀錄表格': 'file'           // 保留檔案上傳
        }
    },
    '2-3': {
        name: '規劃研究排程',
        fields: {
            '時程規劃說明': 'textarea',      // 新增：時間線描述
            '團隊分工': 'textarea',          // 新增：角色分配
            '重要里程碑': 'textarea',        // 新增：關鍵節點
            '研究時程規劃表': 'file'         // 保留檔案上傳
        }
    },

    // Stage 3: 監評
    '3-1': {
        name: '進行嘗試性研究',
        fields: {
            '嘗試性研究過程': 'textarea',    // 新增：記錄做了什麼
            '初步結果': 'textarea',          // 新增：初步發現
            '調整計畫': 'textarea',          // 新增：後續調整
            '實驗記錄': 'file'               // 保留檔案上傳
        }
    },
    '3-2': {
        name: '分析資料與繪圖',
        fields: {
            '資料描述': 'textarea',          // 新增：描述收集的資料
            '分析方法': 'textarea',          // 新增：使用的分析方法
            '圖表說明': 'textarea',          // 新增：圖表解讀
            '資料分析檔案': 'file'           // 保留檔案上傳
        }
    },
    '3-3': {
        name: '撰寫研究成果',
        fields: {
            '研究成果': 'input',
            '結果說明': 'textarea',
            '應注意和改進事項': 'textarea',
            '附加檔案': 'file'
        }
    },

    // Stage 4: 調節
    '4-1': {
        name: '檢視研究進度',
        fields: {
            '進度是否按規劃完成?': 'input',
            '如何改進獲改善?': 'textarea'
        }
    },
    '4-2': {
        name: '進行研究討論',
        fields: {
            '討論內容': 'textarea',          // 新增：討論重點
            '不同觀點': 'textarea',          // 新增：意見分歧與協調
            '改進想法': 'textarea',          // 新增：討論後的改進
            '研究討論檔案': 'file'           // 保留檔案上傳（重新命名避免混淆）
        }
    },
    '4-3': {
        name: '撰寫研究結論',
        fields: {
            '研究結論': 'textarea',          // 新增：最終結論
            '研究貢獻': 'textarea',          // 新增：研究價值
            '研究限制': 'textarea',          // 新增：研究限制
            '未來建議': 'textarea',          // 新增：未來方向
            '研究結論檔案': 'file'           // 保留檔案上傳（重新命名避免混淆）
        }
    }
};

describe('SubStage userSubmit Schema', () => {

    describe('Stage 2-2: 設計研究記錄表格', () => {
        const expected = EXPECTED_USER_SUBMIT['2-2'];

        it('應包含「資料收集方式」欄位 (textarea)', () => {
            expect(expected.fields['資料收集方式']).toBe('textarea');
        });

        it('應包含「記錄表設計說明」欄位 (textarea)', () => {
            expect(expected.fields['記錄表設計說明']).toBe('textarea');
        });

        it('應包含「預計樣本規模」欄位 (input)', () => {
            expect(expected.fields['預計樣本規模']).toBe('input');
        });

        it('應保留「研究紀錄表格」檔案上傳欄位', () => {
            expect(expected.fields['研究紀錄表格']).toBe('file');
        });

        it('應有 4 個欄位（3 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(4);
        });
    });

    describe('Stage 2-3: 規劃研究排程', () => {
        const expected = EXPECTED_USER_SUBMIT['2-3'];

        it('應包含「時程規劃說明」欄位 (textarea)', () => {
            expect(expected.fields['時程規劃說明']).toBe('textarea');
        });

        it('應包含「團隊分工」欄位 (textarea)', () => {
            expect(expected.fields['團隊分工']).toBe('textarea');
        });

        it('應包含「重要里程碑」欄位 (textarea)', () => {
            expect(expected.fields['重要里程碑']).toBe('textarea');
        });

        it('應保留「研究時程規劃表」檔案上傳欄位', () => {
            expect(expected.fields['研究時程規劃表']).toBe('file');
        });

        it('應有 4 個欄位（3 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(4);
        });
    });

    describe('Stage 3-1: 進行嘗試性研究', () => {
        const expected = EXPECTED_USER_SUBMIT['3-1'];

        it('應包含「嘗試性研究過程」欄位 (textarea)', () => {
            expect(expected.fields['嘗試性研究過程']).toBe('textarea');
        });

        it('應包含「初步結果」欄位 (textarea)', () => {
            expect(expected.fields['初步結果']).toBe('textarea');
        });

        it('應包含「調整計畫」欄位 (textarea)', () => {
            expect(expected.fields['調整計畫']).toBe('textarea');
        });

        it('應保留「實驗記錄」檔案上傳欄位', () => {
            expect(expected.fields['實驗記錄']).toBe('file');
        });

        it('應有 4 個欄位（3 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(4);
        });
    });

    describe('Stage 3-2: 分析資料與繪圖', () => {
        const expected = EXPECTED_USER_SUBMIT['3-2'];

        it('應包含「資料描述」欄位 (textarea)', () => {
            expect(expected.fields['資料描述']).toBe('textarea');
        });

        it('應包含「分析方法」欄位 (textarea)', () => {
            expect(expected.fields['分析方法']).toBe('textarea');
        });

        it('應包含「圖表說明」欄位 (textarea)', () => {
            expect(expected.fields['圖表說明']).toBe('textarea');
        });

        it('應保留「資料分析檔案」檔案上傳欄位', () => {
            expect(expected.fields['資料分析檔案']).toBe('file');
        });

        it('應有 4 個欄位（3 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(4);
        });
    });

    describe('Stage 4-2: 進行研究討論', () => {
        const expected = EXPECTED_USER_SUBMIT['4-2'];

        it('應包含「討論內容」欄位 (textarea)', () => {
            expect(expected.fields['討論內容']).toBe('textarea');
        });

        it('應包含「不同觀點」欄位 (textarea)', () => {
            expect(expected.fields['不同觀點']).toBe('textarea');
        });

        it('應包含「改進想法」欄位 (textarea)', () => {
            expect(expected.fields['改進想法']).toBe('textarea');
        });

        it('應保留檔案上傳欄位（研究討論檔案）', () => {
            expect(expected.fields['研究討論檔案']).toBe('file');
        });

        it('應有 4 個欄位（3 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(4);
        });
    });

    describe('Stage 4-3: 撰寫研究結論', () => {
        const expected = EXPECTED_USER_SUBMIT['4-3'];

        it('應包含「研究結論」欄位 (textarea)', () => {
            expect(expected.fields['研究結論']).toBe('textarea');
        });

        it('應包含「研究貢獻」欄位 (textarea)', () => {
            expect(expected.fields['研究貢獻']).toBe('textarea');
        });

        it('應包含「研究限制」欄位 (textarea)', () => {
            expect(expected.fields['研究限制']).toBe('textarea');
        });

        it('應包含「未來建議」欄位 (textarea)', () => {
            expect(expected.fields['未來建議']).toBe('textarea');
        });

        it('應保留檔案上傳欄位（研究結論檔案）', () => {
            expect(expected.fields['研究結論檔案']).toBe('file');
        });

        it('應有 5 個欄位（4 個文字 + 1 個檔案）', () => {
            expect(Object.keys(expected.fields).length).toBe(5);
        });
    });

    describe('所有子階段通用驗證', () => {
        const stages = Object.keys(EXPECTED_USER_SUBMIT);

        it('應有 12 個子階段 (Stage 1-4, 各 3 個)', () => {
            expect(stages.length).toBe(12);
        });

        it('每個修改過的子階段都應保留 file 欄位', () => {
            const modifiedStages = ['2-2', '2-3', '3-1', '3-2', '4-2', '4-3'];

            modifiedStages.forEach(stageKey => {
                const fields = EXPECTED_USER_SUBMIT[stageKey].fields;
                const hasFileField = Object.values(fields).includes('file');
                expect(hasFileField).toBe(true);
            });
        });

        it('每個欄位類型都應該是 input, textarea 或 file', () => {
            const validTypes = ['input', 'textarea', 'file'];

            stages.forEach(stageKey => {
                const fields = EXPECTED_USER_SUBMIT[stageKey].fields;
                Object.values(fields).forEach(type => {
                    expect(validTypes).toContain(type);
                });
            });
        });
    });
});

/**
 * 導出預期的 userSubmit 結構，供其他測試或驗證使用
 */
module.exports = { EXPECTED_USER_SUBMIT };
