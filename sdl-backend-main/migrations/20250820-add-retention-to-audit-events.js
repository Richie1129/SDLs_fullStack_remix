'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 新增 expiresAt 欄位 - 資料保留政策自動過期時間
    await queryInterface.addColumn('audit_events', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      comment: '自動過期時間，null 代表永久保留',
    });

    // 新增 consentLevel 欄位 - 記錄事件所需的同意等級
    await queryInterface.addColumn('audit_events', 'consentLevel', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'functional',
      comment: '同意等級: essential | functional | analytics | full',
    });

    // 為 expiresAt 建立索引 (加速清理排程查詢)
    await queryInterface.addIndex('audit_events', ['expiresAt'], {
      name: 'idx_audit_events_expires_at',
      where: { expiresAt: { [Sequelize.Op.ne]: null } },
    });

    // 為 consentLevel 建立索引
    await queryInterface.addIndex('audit_events', ['consentLevel'], {
      name: 'idx_audit_events_consent_level',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('audit_events', 'idx_audit_events_consent_level');
    await queryInterface.removeIndex('audit_events', 'idx_audit_events_expires_at');
    await queryInterface.removeColumn('audit_events', 'consentLevel');
    await queryInterface.removeColumn('audit_events', 'expiresAt');
  },
};
