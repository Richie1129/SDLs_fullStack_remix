'use strict';

/**
 * Migration: 為反思日誌加入階段關聯欄位
 * 
 * 目的：
 * - 允許個人反思日誌關聯特定的學習階段
 * - 允許團隊反思日誌關聯特定的學習階段
 * - 方便按階段篩選和查看反思記錄
 * 
 * 新增欄位：
 * - stage: VARCHAR(10) 可為空，格式如 '1-1', '2-2' 等
 *   空值表示通用反思（不特定於某個階段）
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const logger = require('../config/logger');
    
    try {
      // 為 daily_personals 加入 stage 欄位
      await queryInterface.addColumn('daily_personals', 'stage', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: '關聯階段 (例如: 1-1, 2-2, 空值表示通用反思)',
        after: 'content'
      });
      
      logger.info('✅ Added stage column to daily_personals');
      
      // 為 daily_teams 加入 stage 欄位
      await queryInterface.addColumn('daily_teams', 'stage', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: '關聯階段 (例如: 1-1, 2-2, 空值表示通用反思)',
        after: 'content'
      });
      
      logger.info('✅ Added stage column to daily_teams');
      
      // 為提升查詢效能，加入索引
      await queryInterface.addIndex('daily_personals', ['stage'], {
        name: 'idx_daily_personals_stage'
      });
      
      await queryInterface.addIndex('daily_teams', ['stage'], {
        name: 'idx_daily_teams_stage'
      });
      
      logger.info('✅ Added indexes for stage columns');
      
      // 為複合查詢優化（專案+階段）
      await queryInterface.addIndex('daily_personals', ['projectId', 'stage'], {
        name: 'idx_daily_personals_project_stage'
      });
      
      await queryInterface.addIndex('daily_teams', ['projectId', 'stage'], {
        name: 'idx_daily_teams_project_stage'
      });
      
      logger.info('✅ Added composite indexes for projectId + stage');
      
    } catch (error) {
      logger.error({ err: error }, '❌ Migration failed: add-stage-to-daily-reflections');
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const logger = require('../config/logger');
    
    try {
      // 移除索引
      await queryInterface.removeIndex('daily_personals', 'idx_daily_personals_project_stage');
      await queryInterface.removeIndex('daily_teams', 'idx_daily_teams_project_stage');
      await queryInterface.removeIndex('daily_personals', 'idx_daily_personals_stage');
      await queryInterface.removeIndex('daily_teams', 'idx_daily_teams_stage');
      
      logger.info('✅ Removed stage indexes');
      
      // 移除欄位
      await queryInterface.removeColumn('daily_personals', 'stage');
      await queryInterface.removeColumn('daily_teams', 'stage');
      
      logger.info('✅ Removed stage columns');
      
    } catch (error) {
      logger.error({ err: error }, '❌ Rollback failed: add-stage-to-daily-reflections');
      throw error;
    }
  }
};
