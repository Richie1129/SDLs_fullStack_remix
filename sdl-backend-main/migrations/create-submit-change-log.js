'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('submit_change_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      submitId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'submits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      changeType: {
        type: Sequelize.ENUM('create', 'update', 'delete'),
        allowNull: false
      },
      fieldName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      oldValue: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      newValue: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changedBy: {
        type: Sequelize.STRING,
        allowNull: false
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('submit_change_logs');
  }
}; 