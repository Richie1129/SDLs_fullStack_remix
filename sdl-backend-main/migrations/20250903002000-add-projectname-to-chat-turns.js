"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chat_turns', 'projectName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'projectId',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('chat_turns', 'projectName');
  }
};

