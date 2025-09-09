'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. 移除現有的外鍵約束
    await queryInterface.removeConstraint('task_change_logs', 'task_change_logs_taskId_fkey');
    
    // 2. 修改 taskId 欄位允許 NULL
    await queryInterface.changeColumn('task_change_logs', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,  // 改為允許 NULL
      references: {
        model: 'tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'  // 改為 SET NULL，保留記錄
    });
    
    console.log('✅ task_change_logs 外鍵約束已修正：onDelete 改為 SET NULL');
  },

  async down (queryInterface, Sequelize) {
    // 回滾：恢復原來的 CASCADE 約束和 NOT NULL
    await queryInterface.removeConstraint('task_change_logs', 'task_change_logs_taskId_fkey');
    
    // 先清理 taskId 為 NULL 的記錄（回滾時）
    await queryInterface.sequelize.query(
      'DELETE FROM task_change_logs WHERE "taskId" IS NULL'
    );
    
    await queryInterface.changeColumn('task_change_logs', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: false,  // 恢復 NOT NULL
      references: {
        model: 'tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'  // 恢復 CASCADE
    });
    
    console.log('🔄 已回滾 task_change_logs 外鍵約束至原始設定');
  }
};