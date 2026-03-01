'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('projects', 'school_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'schools',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('projects', ['school_id'], { name: 'idx_projects_school_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('projects', 'idx_projects_school_id');
    await queryInterface.removeColumn('projects', 'school_id');
  }
};
