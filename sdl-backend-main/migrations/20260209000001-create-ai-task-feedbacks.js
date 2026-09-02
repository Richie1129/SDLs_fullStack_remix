'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ai_task_feedbacks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        }
      },
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      helpSeekingLogId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'help_seeking_logs',
          key: 'id'
        }
      },
      feedbackType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'helpful, not_helpful'
      },
      feedbackDetail: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('ai_task_feedbacks', ['userId']);
    await queryInterface.addIndex('ai_task_feedbacks', ['taskId']);
    await queryInterface.addIndex('ai_task_feedbacks', ['helpSeekingLogId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ai_task_feedbacks');
  }
};
