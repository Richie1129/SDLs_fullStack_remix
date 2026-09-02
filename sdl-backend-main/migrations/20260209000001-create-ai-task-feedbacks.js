'use strict';

// 原檔名為 20250209000001-create-ai-task-feedbacks.js，時間戳是 20260209 的筆誤，
// 會排在 20250812094349-initial-schema 之前，導致全新 DB 上 users/projects 尚不存在而失敗。
// 改名後為了相容已用舊檔名執行過的 DB：表已存在就跳過建立，並清掉 SequelizeMeta 的舊檔名紀錄。
const LEGACY_NAME = '20250209000001-create-ai-task-feedbacks.js';

const tableExists = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'string' ? t : t.tableName)).includes(name);
};

const removeLegacyMeta = (queryInterface) =>
  queryInterface.sequelize.query('DELETE FROM "SequelizeMeta" WHERE name = :name', {
    replacements: { name: LEGACY_NAME },
  });

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (await tableExists(queryInterface, 'ai_task_feedbacks')) {
      await removeLegacyMeta(queryInterface);
      return;
    }

    await queryInterface.createTable('ai_task_feedbacks', {
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
        }
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        }
      },
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      helpSeekingLogId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'help_seeking_logs',
          key: 'id'
        }
      },
      feedbackType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'helpful, not_helpful'
      },
      feedbackDetail: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('ai_task_feedbacks', ['userId']);
    await queryInterface.addIndex('ai_task_feedbacks', ['taskId']);
    await queryInterface.addIndex('ai_task_feedbacks', ['helpSeekingLogId']);

    await removeLegacyMeta(queryInterface);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ai_task_feedbacks');
  }
};
