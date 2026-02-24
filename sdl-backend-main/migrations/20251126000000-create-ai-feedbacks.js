'use strict';

/**
 * Phase 3: AI Feedback 資料表
 * 
 * 記錄學生對 AI Coach 回應的評價
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_feedbacks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      project_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      idea_wall_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      node_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      agent_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'AI Agent 類型: IMPROVER, SYNTHESIZER, DEVIL'
      },
      feedback_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '回饋類型: helpful, not_helpful'
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'AI 回應的 session 識別碼'
      },
      additional_comment: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '額外文字回饋（未來擴充）'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 建立索引
    await queryInterface.addIndex('ai_feedbacks', ['project_id'], {
      name: 'idx_ai_feedback_project'
    });

    await queryInterface.addIndex('ai_feedbacks', ['agent_type'], {
      name: 'idx_ai_feedback_agent'
    });

    await queryInterface.addIndex('ai_feedbacks', ['feedback_type'], {
      name: 'idx_ai_feedback_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ai_feedbacks');
  }
};
