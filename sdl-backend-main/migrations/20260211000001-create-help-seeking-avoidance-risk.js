'use strict';

/**
 * 創建 help_seeking_avoidance_risk 資料表
 * 用於存儲求助迴避風險檢測結果
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const logger = console;

    try {
      logger.info('🔧 Creating help_seeking_avoidance_risk table...');

      await queryInterface.createTable('help_seeking_avoidance_risks', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: '學生 ID'
        },
        projectId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'projects',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: '專案 ID'
        },
        riskLevel: {
          type: Sequelize.ENUM('low', 'low_medium', 'medium', 'high'),
          allowNull: false,
          comment: '風險等級'
        },
        riskScore: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '風險分數 (0-3)'
        },
        struggleScore: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '困難信號總分'
        },
        helpActivityScore: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '求助活躍度分數'
        },
        signals: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: '各項信號的詳細分數'
        },
        teacherViewed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '教師是否已查看'
        },
        teacherNotes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '教師備註'
        },
        resolved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '是否已解決'
        },
        resolvedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '解決時間'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      // 創建索引
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['userId']);
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['projectId']);
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['riskLevel']);
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['teacherViewed']);
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['resolved']);
      await queryInterface.addIndex('help_seeking_avoidance_risks', ['userId', 'projectId']);

      logger.info('✅ help_seeking_avoidance_risks table created successfully');

    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const logger = console;

    try {
      logger.info('🔧 Dropping help_seeking_avoidance_risks table...');

      await queryInterface.dropTable('help_seeking_avoidance_risks');

      logger.info('✅ help_seeking_avoidance_risks table dropped');

    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
