'use strict';

/**
 * Migration: 更新 SubStage userSubmit 欄位
 *
 * 目的：為只有檔案上傳的子階段新增文字輸入欄位，符合 108 課綱探究與實作教學目標
 *
 * 影響的子階段：
 * - 2-2 (設計研究記錄表格)
 * - 2-3 (規劃研究排程)
 * - 3-1 (進行嘗試性研究)
 * - 3-2 (分析資料與繪圖)
 * - 4-2 (進行研究討論)
 * - 4-3 (撰寫研究結論)
 *
 * 特性：
 * - 非破壞性遷移：只新增欄位，不刪除
 * - 現有提交記錄的 content JSON 保持不變
 */

const NEW_USER_SUBMIT = {
    '設計研究記錄表格': {
        '資料收集方式': 'textarea',
        '記錄表設計說明': 'textarea',
        '預計樣本規模': 'input',
        '研究紀錄表格': 'file'
    },
    '規劃研究排程': {
        '時程規劃說明': 'textarea',
        '團隊分工': 'textarea',
        '重要里程碑': 'textarea',
        '研究時程規劃表': 'file'
    },
    '進行嘗試性研究': {
        '嘗試性研究過程': 'textarea',
        '初步結果': 'textarea',
        '調整計畫': 'textarea',
        '實驗記錄': 'file'
    },
    '分析資料與繪圖': {
        '資料描述': 'textarea',
        '分析方法': 'textarea',
        '圖表說明': 'textarea',
        '資料分析檔案': 'file'
    },
    '進行研究討論': {
        '討論內容': 'textarea',
        '不同觀點': 'textarea',
        '改進想法': 'textarea',
        '研究討論檔案': 'file'
    },
    '撰寫研究結論': {
        '研究結論': 'textarea',
        '研究貢獻': 'textarea',
        '研究限制': 'textarea',
        '未來建議': 'textarea',
        '研究結論檔案': 'file'
    }
};

// 舊的 userSubmit 結構（用於 rollback）
const OLD_USER_SUBMIT = {
    '設計研究記錄表格': {
        '研究紀錄表格': 'file'
    },
    '規劃研究排程': {
        '研究時程規劃表': 'file'
    },
    '進行嘗試性研究': {
        '實驗記錄': 'file'
    },
    '分析資料與繪圖': {
        '資料分析檔案': 'file'
    },
    '進行研究討論': {
        '研究討論': 'file'
    },
    '撰寫研究結論': {
        '研究結論': 'file'
    }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('🚀 開始更新 sub_stages 的 userSubmit 欄位...');

        for (const [name, userSubmit] of Object.entries(NEW_USER_SUBMIT)) {
            try {
                const [affectedRows] = await queryInterface.sequelize.query(
                    `UPDATE sub_stages
                     SET "userSubmit" = :userSubmit, "updatedAt" = NOW()
                     WHERE name = :name`,
                    {
                        replacements: {
                            userSubmit: JSON.stringify(userSubmit),
                            name: name
                        },
                        type: Sequelize.QueryTypes.UPDATE
                    }
                );

                console.log(`✅ 更新 "${name}": ${affectedRows || '已更新'}`);
            } catch (error) {
                console.error(`❌ 更新 "${name}" 失敗:`, error.message);
                throw error;
            }
        }

        console.log('✅ 所有 sub_stages 更新完成！');
    },

    async down(queryInterface, Sequelize) {
        console.log('🔄 開始回滾 sub_stages 的 userSubmit 欄位...');

        for (const [name, userSubmit] of Object.entries(OLD_USER_SUBMIT)) {
            try {
                await queryInterface.sequelize.query(
                    `UPDATE sub_stages
                     SET "userSubmit" = :userSubmit, "updatedAt" = NOW()
                     WHERE name = :name`,
                    {
                        replacements: {
                            userSubmit: JSON.stringify(userSubmit),
                            name: name
                        },
                        type: Sequelize.QueryTypes.UPDATE
                    }
                );

                console.log(`✅ 回滾 "${name}"`);
            } catch (error) {
                console.error(`❌ 回滾 "${name}" 失敗:`, error.message);
                throw error;
            }
        }

        console.log('✅ 回滾完成！');
    }
};
