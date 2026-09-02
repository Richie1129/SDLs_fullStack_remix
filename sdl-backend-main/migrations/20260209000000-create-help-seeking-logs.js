'use strict';

// 原檔名為 20250209000000-create-help-seeking-logs.js，時間戳是 20260209 的筆誤，
// 會排在 20250812094349-initial-schema 之前，導致全新 DB 上 users/projects 尚不存在而失敗。
// 改名後為了相容已用舊檔名執行過的 DB：表已存在就跳過建立，並清掉 SequelizeMeta 的舊檔名紀錄。
const LEGACY_NAME = '20250209000000-create-help-seeking-logs.js';

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
    if (await tableExists(queryInterface, 'help_seeking_logs')) {
      await removeLegacyMeta(queryInterface);
      return;
    }

    await queryInterface.createTable('help_seeking_logs', {
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
      metacognitiveState: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'not_started, thought_unclear, initial_idea, specific_problem, asked_peers'
      },
      helpSeekingType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'adaptive, expedient, mixed'
      },
      askedSources: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of sources asked'
      },
      answers: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON object of guided question answers'
      },
      skippedThinking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether user skipped the thinking phase'
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

    await queryInterface.addIndex('help_seeking_logs', ['userId']);
    await queryInterface.addIndex('help_seeking_logs', ['projectId']);
    await queryInterface.addIndex('help_seeking_logs', ['taskId']);
    await queryInterface.addIndex('help_seeking_logs', ['helpSeekingType']);

    await removeLegacyMeta(queryInterface);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('help_seeking_logs');
  }
};
