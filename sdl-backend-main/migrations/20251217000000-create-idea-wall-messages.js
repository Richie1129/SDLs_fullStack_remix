'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('idea_wall_messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      senderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ideaWallId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'idea_walls',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      relatedNodeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'nodes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isAiIntervention: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    // Add indexes for performance
    await queryInterface.addIndex('idea_wall_messages', ['ideaWallId']);
    await queryInterface.addIndex('idea_wall_messages', ['relatedNodeId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('idea_wall_messages');
  }
};
