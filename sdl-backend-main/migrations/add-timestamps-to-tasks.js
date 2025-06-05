'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 檢查 tasks 表格是否存在
      const tableExists = await queryInterface.describeTable('tasks');
      
      // 檢查是否已有 createdAt 和 updatedAt 欄位
      if (!tableExists.createdAt) {
        await queryInterface.addColumn('tasks', 'createdAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
        console.log('已為 tasks 表格添加 createdAt 欄位');
      }
      
      if (!tableExists.updatedAt) {
        await queryInterface.addColumn('tasks', 'updatedAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
        console.log('已為 tasks 表格添加 updatedAt 欄位');
      }
      
    } catch (error) {
      console.log('tasks 表格不存在或已有時間戳記欄位:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('tasks', 'createdAt');
      await queryInterface.removeColumn('tasks', 'updatedAt');
      console.log('已從 tasks 表格移除時間戳記欄位');
    } catch (error) {
      console.log('移除 tasks 表格時間戳記欄位失敗:', error.message);
    }
  }
}; 