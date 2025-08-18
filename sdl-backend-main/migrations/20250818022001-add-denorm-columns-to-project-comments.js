"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('project_comments', 'reply_to_username', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'parentId',
    });

    await queryInterface.addColumn('project_comments', 'reply_to_content', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'reply_to_username',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('project_comments', 'reply_to_username');
    await queryInterface.removeColumn('project_comments', 'reply_to_content');
  },
};

