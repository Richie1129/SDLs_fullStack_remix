'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('projects', 'is_open_for_viewing', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否開放給其他班級觀摩'
    });

    await queryInterface.addColumn('projects', 'allowed_classes', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: '可觀摩的班級清單，JSON 格式存儲班級列表'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('projects', 'is_open_for_viewing');
    await queryInterface.removeColumn('projects', 'allowed_classes');
  }
};
