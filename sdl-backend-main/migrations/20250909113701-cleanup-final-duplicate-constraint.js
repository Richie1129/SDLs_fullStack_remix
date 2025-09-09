'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('🧹 清理最後一個重複的外鍵約束...');
    
    // 移除重複約束，保留原始的 task_change_logs_taskId_fkey
    try {
      await queryInterface.removeConstraint('task_change_logs', 'task_change_logs_taskId_fkey1');
      console.log('✅ 已移除重複約束: task_change_logs_taskId_fkey1');
    } catch (error) {
      console.log('⚠️ 約束 task_change_logs_taskId_fkey1 不存在或已移除');
    }
    
    console.log('✅ task_change_logs 約束清理完成 - 現在只有一個乾淨的約束');
  },

  async down (queryInterface, Sequelize) {
    console.log('🔄 回滾：重新建立重複約束（僅用於測試目的）...');
    
    // 重新建立重複約束（回滾時）
    await queryInterface.addConstraint('task_change_logs', {
      fields: ['taskId'],
      type: 'foreign key',
      name: 'task_change_logs_taskId_fkey1',
      references: {
        table: 'tasks',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    console.log('🔄 已回滾：重新建立重複約束');
  }
};