"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('observation_logs', 'projectName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'projectId',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('observation_logs', 'projectName');
  }
};

