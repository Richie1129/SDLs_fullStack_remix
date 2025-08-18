"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // comment_likes: add username, comment_content
    await queryInterface.addColumn('comment_likes', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('comment_likes', 'comment_content', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // comment_attachments: add comment_content
    await queryInterface.addColumn('comment_attachments', 'comment_content', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('comment_likes', 'username');
    await queryInterface.removeColumn('comment_likes', 'comment_content');
    await queryInterface.removeColumn('comment_attachments', 'comment_content');
  },
};

