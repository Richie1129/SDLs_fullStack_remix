'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'school_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'schools',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('users', ['school_id'], { name: 'idx_users_school_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_school_id');
    await queryInterface.removeColumn('users', 'school_id');
  }
};
