'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('user_consents').catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('user_consents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
      },
      consentLevel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'full',
      },
      consentedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ipAtConsent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },
};
