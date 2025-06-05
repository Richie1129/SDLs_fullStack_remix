'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['submits', 'daily_personals', 'daily_teams'];

    for (const tableName of tables) {
      try {
        // 檢查表格是否存在
        const tableExists = await queryInterface.describeTable(tableName);
        
        // 檢查是否已有 createdAt 和 updatedAt 欄位
        if (!tableExists.createdAt) {
          await queryInterface.addColumn(tableName, 'createdAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          });
          console.log(`已為 ${tableName} 表格添加 createdAt 欄位`);
        }
        
        if (!tableExists.updatedAt) {
          await queryInterface.addColumn(tableName, 'updatedAt', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          });
          console.log(`已為 ${tableName} 表格添加 updatedAt 欄位`);
        }
        
      } catch (error) {
        console.log(`${tableName} 表格不存在或已有時間戳記欄位:`, error.message);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ['submits', 'daily_personals', 'daily_teams'];

    for (const tableName of tables) {
      try {
        await queryInterface.removeColumn(tableName, 'createdAt');
        await queryInterface.removeColumn(tableName, 'updatedAt');
        console.log(`已從 ${tableName} 表格移除時間戳記欄位`);
      } catch (error) {
        console.log(`移除 ${tableName} 表格時間戳記欄位失敗:`, error.message);
      }
    }
  }
}; 