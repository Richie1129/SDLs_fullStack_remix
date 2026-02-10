'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
        comment: '使用者 ID (對應 users.id)',
      },
      consentLevel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'full',
        comment: '同意等級: essential | functional | analytics | full (學習平台預設全同意)',
      },
      consentedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: '同意時間',
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '撤銷時間',
      },
      ipAtConsent: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '同意時的 IP 地址',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // 為 userId 建立唯一索引
    await queryInterface.addIndex('user_consents', ['userId'], {
      name: 'idx_user_consents_user_id',
      unique: true,
    });

    // 為 consentLevel 建立索引
    await queryInterface.addIndex('user_consents', ['consentLevel'], {
      name: 'idx_user_consents_consent_level',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_consents');
  },
};
