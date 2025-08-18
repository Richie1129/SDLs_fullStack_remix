"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('comments', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'userId',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('comments', 'username');
  },
};

