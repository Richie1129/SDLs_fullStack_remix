"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('project_comments', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'userId',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('project_comments', 'username');
  },
};

