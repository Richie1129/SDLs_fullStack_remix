'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schools', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: '教育部學校代碼'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '學校名稱'
      },
      type: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: '公/私立'
      },
      city: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: '縣市名稱'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('schools', ['city'], { name: 'idx_schools_city' });
    await queryInterface.addIndex('schools', ['name'], { name: 'idx_schools_name' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('schools');
  }
};
