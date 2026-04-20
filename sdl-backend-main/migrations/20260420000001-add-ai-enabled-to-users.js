'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'ai_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addIndex('users', ['ai_enabled'], {
      name: 'idx_users_ai_enabled',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', 'idx_users_ai_enabled');
    await queryInterface.removeColumn('users', 'ai_enabled');
  },
};
