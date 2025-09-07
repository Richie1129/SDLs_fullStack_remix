'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('column_change_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      columnId: {
        type: Sequelize.INTEGER,
        allowNull: true, // 刪除時 column 可能已不存在
        references: {
          model: 'columns',
          key: 'id'
        },
        onDelete: 'SET NULL', // 當列表被刪除時，設置為 NULL 而不是刪除記錄
        comment: '列表 ID'
      },
      changeType: {
        type: Sequelize.ENUM('create', 'update', 'delete', 'reorder'),
        allowNull: false,
        comment: '變更類型: 創建、更新、刪除、重新排序'
      },
      fieldName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '變更的欄位名稱 (例如: name, position)'
      },
      oldValue: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '舊值'
      },
      newValue: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '新值'
      },
      changedBy: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '變更者用戶名'
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '所屬專案 ID'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '變更描述'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // 建立索引以優化查詢性能
    await queryInterface.addIndex('column_change_logs', {
      fields: ['projectId', 'createdAt'],
      name: 'column_change_logs_project_time_idx'
    });

    await queryInterface.addIndex('column_change_logs', {
      fields: ['columnId'],
      name: 'column_change_logs_column_idx'
    });

    await queryInterface.addIndex('column_change_logs', {
      fields: ['changeType'],
      name: 'column_change_logs_change_type_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 移除索引
    await queryInterface.removeIndex('column_change_logs', 'column_change_logs_project_time_idx');
    await queryInterface.removeIndex('column_change_logs', 'column_change_logs_column_idx');
    await queryInterface.removeIndex('column_change_logs', 'column_change_logs_change_type_idx');

    // 刪除表格
    await queryInterface.dropTable('column_change_logs');
  }
};