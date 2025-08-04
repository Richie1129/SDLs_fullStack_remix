'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'class', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'seatNumber', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'class');
    await queryInterface.removeColumn('users', 'seatNumber');
  }
};
