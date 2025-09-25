'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
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
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
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

    // 創建索引
    await queryInterface.addIndex('password_reset_tokens', ['token'], {
      unique: true,
      name: 'password_reset_tokens_token_unique'
    });

    await queryInterface.addIndex('password_reset_tokens', ['userId'], {
      name: 'password_reset_tokens_userId_index'
    });

    await queryInterface.addIndex('password_reset_tokens', ['expiresAt'], {
      name: 'password_reset_tokens_expiresAt_index'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('password_reset_tokens');
  }
};
