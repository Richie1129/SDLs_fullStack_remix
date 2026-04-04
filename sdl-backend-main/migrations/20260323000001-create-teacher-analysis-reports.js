'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teacher_analysis_reports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      model: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '分析使用的 AI 模型（Gemini / GPT-OSS-20B / Gemma-4-26B）',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '報告 Markdown 內容',
      },
      snapshot: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: '數據快照摘要（totalStudents, activeStudents 等）',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('teacher_analysis_reports', ['projectId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('teacher_analysis_reports');
  },
};
