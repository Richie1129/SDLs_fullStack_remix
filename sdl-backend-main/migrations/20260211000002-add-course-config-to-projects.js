'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('projects', 'course_config', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {
        sessions_per_week: 2,           // 每週上課次數（預設一週兩堂課）
        has_homework: false,            // 是否有課後作業
        stage_duration_weeks: 2,        // 每階段持續週數
        analysis_window_sessions: 2     // 分析窗口（最近 N 堂課）
      },
      comment: '課程設定：用於求助迴避偵測的情境配置'
    });

    // 為現有專案設定預設值
    await queryInterface.sequelize.query(`
      UPDATE projects 
      SET course_config = '{"sessions_per_week": 2, "has_homework": false, "stage_duration_weeks": 2, "analysis_window_sessions": 2}'::jsonb
      WHERE course_config IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('projects', 'course_config');
  }
};
