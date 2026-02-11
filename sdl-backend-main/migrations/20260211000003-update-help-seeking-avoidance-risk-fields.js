'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 檢查是否存在 taskId 欄位
      const tableDescription = await queryInterface.describeTable('help_seeking_avoidance_risks');
      
      // 添加 taskId 欄位（如果不存在）
      if (!tableDescription.taskId) {
        await queryInterface.addColumn(
          'help_seeking_avoidance_risks',
          'taskId',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'tasks',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction }
        );
      }

      // 添加 struggleSignals 欄位（如果不存在）
      if (!tableDescription.struggleSignals) {
        await queryInterface.addColumn(
          'help_seeking_avoidance_risks',
          'struggleSignals',
          {
            type: Sequelize.JSON,
            allowNull: true
          },
          { transaction }
        );
      }

      // 添加 riskDetails 欄位（如果不存在）
      if (!tableDescription.riskDetails) {
        await queryInterface.addColumn(
          'help_seeking_avoidance_risks',
          'riskDetails',
          {
            type: Sequelize.JSON,
            allowNull: true
          },
          { transaction }
        );
      }

      // 添加 detectedAt 欄位（如果不存在）
      if (!tableDescription.detectedAt) {
        await queryInterface.addColumn(
          'help_seeking_avoidance_risks',
          'detectedAt',
          {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          { transaction }
        );
      }

      // 添加 teacherConfirmed 欄位（如果不存在）
      if (!tableDescription.teacherConfirmed) {
        await queryInterface.addColumn(
          'help_seeking_avoidance_risks',
          'teacherConfirmed',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log('✅ Successfully updated help_seeking_avoidance_risks table fields');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 移除新增的欄位
      await queryInterface.removeColumn('help_seeking_avoidance_risks', 'taskId', { transaction });
      await queryInterface.removeColumn('help_seeking_avoidance_risks', 'struggleSignals', { transaction });
      await queryInterface.removeColumn('help_seeking_avoidance_risks', 'riskDetails', { transaction });
      await queryInterface.removeColumn('help_seeking_avoidance_risks', 'detectedAt', { transaction });
      await queryInterface.removeColumn('help_seeking_avoidance_risks', 'teacherConfirmed', { transaction });

      await transaction.commit();
      console.log('✅ Successfully reverted help_seeking_avoidance_risks table fields');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
