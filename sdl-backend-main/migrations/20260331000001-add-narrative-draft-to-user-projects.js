'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_projects', 'narrative_draft', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn('user_projects', 'draft_updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_projects', 'narrative_draft');
    await queryInterface.removeColumn('user_projects', 'draft_updated_at');
  }
};
