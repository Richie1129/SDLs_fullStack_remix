'use strict';

/**
 * 擴展 help_seeking_log 表結構以支持求助成效追蹤
 * 
 * 新增欄位：
 * - task_status_before: 求助前的任務狀態（例如：todo, in_progress, done）
 * - task_status_after_24h: 求助後24小時的任務狀態
 * - status_changed: 任務狀態是否改變（布林值）
 * - effectiveness_score: 成效評分（0-100）
 * - follow_up_needed: 是否需要後續追蹤
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const logger = console;

    try {
      logger.info('🔧 Starting help_seeking_log table extension...');

      // 新增 task_status_before 欄位
      await queryInterface.addColumn('help_seeking_logs', 'task_status_before', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '求助前的任務狀態'
      });
      logger.info('✅ Added task_status_before column');

      // 新增 task_status_after_24h 欄位
      await queryInterface.addColumn('help_seeking_logs', 'task_status_after_24h', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '求助後24小時的任務狀態'
      });
      logger.info('✅ Added task_status_after_24h column');

      // 新增 status_changed 欄位
      await queryInterface.addColumn('help_seeking_logs', 'status_changed', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
        comment: '任務狀態是否改變'
      });
      logger.info('✅ Added status_changed column');

      // 新增 effectiveness_score 欄位
      await queryInterface.addColumn('help_seeking_logs', 'effectiveness_score', {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        },
        comment: '成效評分 (0-100)'
      });
      logger.info('✅ Added effectiveness_score column');

      // 新增 follow_up_needed 欄位
      await queryInterface.addColumn('help_seeking_logs', 'follow_up_needed', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: '是否需要教師後續追蹤'
      });
      logger.info('✅ Added follow_up_needed column');

      // 新增 effectiveness_checked_at 欄位（記錄何時進行成效檢查）
      await queryInterface.addColumn('help_seeking_logs', 'effectiveness_checked_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '成效檢查時間'
      });
      logger.info('✅ Added effectiveness_checked_at column');

      logger.info('✅ Help-seeking log table extension completed successfully');

    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const logger = console;

    try {
      logger.info('🔧 Reverting help_seeking_log table extension...');

      await queryInterface.removeColumn('help_seeking_logs', 'effectiveness_checked_at');
      await queryInterface.removeColumn('help_seeking_logs', 'follow_up_needed');
      await queryInterface.removeColumn('help_seeking_logs', 'effectiveness_score');
      await queryInterface.removeColumn('help_seeking_logs', 'status_changed');
      await queryInterface.removeColumn('help_seeking_logs', 'task_status_after_24h');
      await queryInterface.removeColumn('help_seeking_logs', 'task_status_before');

      logger.info('✅ Help-seeking log table extension reverted');

    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
