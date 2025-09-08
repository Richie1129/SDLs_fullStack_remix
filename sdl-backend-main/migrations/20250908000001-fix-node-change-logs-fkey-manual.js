'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 手動修正外鍵約束問題
    
    // 1. 檢查並刪除舊約束（如果存在）
    try {
      await queryInterface.removeConstraint('node_change_logs', 'node_change_logs_nodeId_fkey');
      console.log('✅ 已移除舊約束 node_change_logs_nodeId_fkey');
    } catch (error) {
      console.log('⚠️ 舊約束可能不存在或已被移除:', error.message);
    }

    try {
      await queryInterface.removeConstraint('node_change_logs', 'node_change_logs_nodeId_fkey_fixed');
      console.log('✅ 已移除約束 node_change_logs_nodeId_fkey_fixed');
    } catch (error) {
      console.log('⚠️ 約束不存在或已被移除:', error.message);
    }
    
    // 2. 確保 nodeId 可為 null
    await queryInterface.changeColumn('node_change_logs', 'nodeId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    console.log('✅ nodeId 欄位已設為允許 NULL');
    
    // 3. 重新添加正確的外鍵約束
    await queryInterface.addConstraint('node_change_logs', {
      fields: ['nodeId'],
      type: 'foreign key',
      name: 'node_change_logs_nodeId_fkey_new',
      references: {
        table: 'nodes',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'  // 節點刪除時設為 NULL，保留記錄
    });
    console.log('✅ 已添加新的外鍵約束 (SET NULL)');
  },

  async down(queryInterface, Sequelize) {
    // 回滾到原始狀態
    await queryInterface.removeConstraint('node_change_logs', 'node_change_logs_nodeId_fkey_new');
    
    await queryInterface.changeColumn('node_change_logs', 'nodeId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    
    await queryInterface.addConstraint('node_change_logs', {
      fields: ['nodeId'],
      type: 'foreign key',
      name: 'node_change_logs_nodeId_fkey',
      references: {
        table: 'nodes',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};