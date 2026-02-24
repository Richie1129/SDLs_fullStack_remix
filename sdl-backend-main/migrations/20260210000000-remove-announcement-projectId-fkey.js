'use strict';

/**
 * 移除 announcements 表的 projectId 外鍵約束
 *
 * 原因：公告系統使用負數 projectId 來標識學生模式公告（例如 -1 代表發給 userId=1 的學生），
 * 但外鍵約束要求 projectId 必須存在於 projects 表中，導致學生模式公告無法建立。
 * 應用層已經在 controller 中驗證專案是否存在，因此移除資料庫層的外鍵約束。
 */
module.exports = {
  async up(queryInterface) {
    // 檢查約束是否存在再移除（冪等操作）
    try {
      await queryInterface.removeConstraint('announcements', 'announcements_projectId_fkey');
    } catch (error) {
      // 約束可能已經不存在（例如已手動移除）
      console.log('外鍵約束可能已移除:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // 回滾時重新建立外鍵約束
    await queryInterface.addConstraint('announcements', {
      fields: ['projectId'],
      type: 'foreign key',
      name: 'announcements_projectId_fkey',
      references: {
        table: 'projects',
        field: 'id'
      },
      onUpdate: 'SET NULL',
      onDelete: 'SET NULL'
    });
  }
};
