'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('🧹 開始清理重複的 task_change_logs 外鍵約束...');
    
    // 移除所有重複的 CASCADE 約束（保留第一個 SET NULL 約束）
    const constraintsToRemove = [
      'task_change_logs_taskId_fkey1',
      'task_change_logs_taskId_fkey2', 
      'task_change_logs_taskId_fkey3',
      'task_change_logs_taskId_fkey4',
      'task_change_logs_taskId_fkey5',
      'task_change_logs_taskId_fkey6'
    ];
    
    for (const constraint of constraintsToRemove) {
      try {
        await queryInterface.removeConstraint('task_change_logs', constraint);
        console.log(`✅ 已移除約束: ${constraint}`);
      } catch (error) {
        console.log(`⚠️ 約束 ${constraint} 不存在或已移除`);
      }
    }
    
    // 確保 taskId 欄位允許 NULL
    await queryInterface.changeColumn('task_change_logs', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,  // 允許 NULL，用於已刪除的任務
      references: {
        model: 'tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'  // 確保是 SET NULL，不是 CASCADE
    });
    
    console.log('✅ task_change_logs 約束清理完成');
  },

  async down (queryInterface, Sequelize) {
    // 回滾時恢復 NOT NULL 約束
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
      onDelete: 'CASCADE'  // 恢復 CASCADE（僅回滾時）
    });
    
    console.log('🔄 已回滾 task_change_logs 約束設定');
  }
};