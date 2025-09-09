'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('🔧 修正 task_change_logs.taskId 欄位允許 NULL...');
    
    // 修改 taskId 欄位為允許 NULL
    await queryInterface.changeColumn('task_change_logs', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,  // 關鍵：允許 NULL，用於已刪除的任務記錄
    });
    
    console.log('✅ task_change_logs.taskId 現在允許 NULL 值');
  },

  async down (queryInterface, Sequelize) {
    console.log('🔄 回滾：將 task_change_logs.taskId 改回 NOT NULL...');
    
    // 回滾前先清理 NULL 值
    await queryInterface.sequelize.query(
      'DELETE FROM task_change_logs WHERE "taskId" IS NULL'
    );
    
    // 恢復 NOT NULL 約束
    await queryInterface.changeColumn('task_change_logs', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: false,  // 恢復 NOT NULL
    });
    
    console.log('✅ 已回滾 task_change_logs.taskId 為 NOT NULL');
  }
};