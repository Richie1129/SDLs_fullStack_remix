'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 創建索引
    await queryInterface.addIndex('refresh_tokens', ['token'], {
      unique: true,
      name: 'refresh_tokens_token_unique'
    });

    await queryInterface.addIndex('refresh_tokens', ['userId', 'expiresAt'], {
      name: 'refresh_tokens_userId_expiresAt_index'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('refresh_tokens');
  }
};
