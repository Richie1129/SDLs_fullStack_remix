"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('projects');

    // Step 1: 新增 semester 欄位（先允許 null 以便回填）
    if (!table.semester) {
      await queryInterface.addColumn('projects', 'semester', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: '學期代碼，例如 113-2'
      });
    }

    // Step 2: 回填現有專案的學期（根據 createdAt 計算台灣學期）
    // 學年 = 西元年 - 1911
    // 第 1 學期：8 月 ~ 隔年 1 月
    // 第 2 學期：2 月 ~ 7 月
    await queryInterface.sequelize.query(`
      UPDATE projects
      SET semester = CASE
        WHEN EXTRACT(MONTH FROM "createdAt") >= 2 AND EXTRACT(MONTH FROM "createdAt") <= 7
          THEN CONCAT(
            (EXTRACT(YEAR FROM "createdAt") - 1911)::TEXT,
            '-2'
          )
        WHEN EXTRACT(MONTH FROM "createdAt") = 1
          THEN CONCAT(
            (EXTRACT(YEAR FROM "createdAt") - 1 - 1911)::TEXT,
            '-1'
          )
        ELSE
          CONCAT(
            (EXTRACT(YEAR FROM "createdAt") - 1911)::TEXT,
            '-1'
          )
      END
      WHERE semester IS NULL
    `);

    // Step 3: 設定 NOT NULL 約束
    await queryInterface.changeColumn('projects', 'semester', {
      type: Sequelize.STRING(10),
      allowNull: false,
      comment: '學期代碼，例如 113-2'
    });

    // Step 4: 建立索引
    try {
      await queryInterface.addIndex('projects', ['semester'], {
        name: 'projects_semester_idx'
      });
    } catch (e) { /* 索引已存在則忽略 */ }

    try {
      await queryInterface.addIndex('projects', ['mentor', 'semester'], {
        name: 'projects_mentor_semester_idx'
      });
    } catch (e) { /* 索引已存在則忽略 */ }
  },

  async down(queryInterface) {
    // 移除索引
    try {
      await queryInterface.removeIndex('projects', 'projects_mentor_semester_idx');
    } catch (e) { /* ignore if not exists */ }
    try {
      await queryInterface.removeIndex('projects', 'projects_semester_idx');
    } catch (e) { /* ignore if not exists */ }

    // 移除欄位
    const table = await queryInterface.describeTable('projects');
    if (table.semester) {
      await queryInterface.removeColumn('projects', 'semester');
    }
  }
};
