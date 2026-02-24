'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    
    // 檢查 expiresAt 欄位是否存在
    const tableInfo = await queryInterface.describeTable('audit_events');
    
    if (!tableInfo.expiresAt) {
      await queryInterface.addColumn('audit_events', 'expiresAt', {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '自動過期時間，null 代表永久保留',
      });
      console.log('✓ Added expiresAt column to audit_events');
    }
    
    if (!tableInfo.consentLevel) {
      await queryInterface.addColumn('audit_events', 'consentLevel', {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'functional',
        comment: '同意等級: essential | functional | analytics | full',
      });
      console.log('✓ Added consentLevel column to audit_events');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('audit_events', 'expiresAt');
    await queryInterface.removeColumn('audit_events', 'consentLevel');
    console.log('✓ Removed expiresAt and consentLevel columns from audit_events');
  }
};
