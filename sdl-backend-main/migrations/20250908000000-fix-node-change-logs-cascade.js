'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 刪除現有的外鍵約束
    await queryInterface.removeConstraint('node_change_logs', 'node_change_logs_nodeId_fkey');
    
    // 2. 重新添加外鍵約束，但改為 SET NULL 而不是 CASCADE
    await queryInterface.addConstraint('node_change_logs', {
      fields: ['nodeId'],
      type: 'foreign key',
      name: 'node_change_logs_nodeId_fkey_fixed',
      references: {
        table: 'nodes',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'  // 改為 SET NULL，保留記錄但清空 nodeId
    });
    
    // 3. 允許 nodeId 為 null (如果還沒有的話)
    await queryInterface.changeColumn('node_change_logs', 'nodeId', {
      type: Sequelize.INTEGER,
      allowNull: true,  // 允許為 null
      references: {
        model: 'nodes',
        key: 'id'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // 回滾：恢復原來的 CASCADE 約束
    await queryInterface.removeConstraint('node_change_logs', 'node_change_logs_nodeId_fkey_fixed');
    
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