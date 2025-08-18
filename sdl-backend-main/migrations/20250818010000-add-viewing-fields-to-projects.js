"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add columns is_open_for_viewing (BOOLEAN, default false) and allowed_classes (JSON)
    const table = await queryInterface.describeTable('projects');

    if (!table.is_open_for_viewing) {
      await queryInterface.addColumn('projects', 'is_open_for_viewing', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否開放給其他班級觀摩'
      });
    }

    if (!table.allowed_classes) {
      await queryInterface.addColumn('projects', 'allowed_classes', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '可觀摩的班級清單'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('projects');
    if (table.allowed_classes) {
      await queryInterface.removeColumn('projects', 'allowed_classes');
    }
    if (table.is_open_for_viewing) {
      await queryInterface.removeColumn('projects', 'is_open_for_viewing');
    }
  }
};

