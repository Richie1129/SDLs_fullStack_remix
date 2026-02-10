'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('help_seeking_logs', {
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
      metacognitiveState: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'not_started, thought_unclear, initial_idea, specific_problem, asked_peers'
      },
      helpSeekingType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'adaptive, expedient, mixed'
      },
      askedSources: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of sources asked'
      },
      answers: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON object of guided question answers'
      },
      skippedThinking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user skipped the thinking phase'
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

    await queryInterface.addIndex('help_seeking_logs', ['userId']);
    await queryInterface.addIndex('help_seeking_logs', ['projectId']);
    await queryInterface.addIndex('help_seeking_logs', ['taskId']);
    await queryInterface.addIndex('help_seeking_logs', ['helpSeekingType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('help_seeking_logs');
  }
};
