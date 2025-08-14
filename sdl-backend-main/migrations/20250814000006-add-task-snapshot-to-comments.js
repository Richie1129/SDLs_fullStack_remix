"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('comments', 'task_title', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('comments', 'task_content', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('comments', 'task_title');
    await queryInterface.removeColumn('comments', 'task_content');
  },
};

