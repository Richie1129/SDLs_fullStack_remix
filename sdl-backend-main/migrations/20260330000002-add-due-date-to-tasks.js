'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tasks', 'dueDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tasks', 'dueDate');
  },
};
