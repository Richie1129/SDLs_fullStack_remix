"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('audit_events', 'actorName', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '使用者名稱（username）'
      });
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('audit_events', 'actorName');
    } catch (e) {}
  }
};

