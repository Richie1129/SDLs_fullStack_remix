"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("comment_likes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "comments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint('comment_likes', {
      fields: ['commentId', 'userId'],
      type: 'unique',
      name: 'unique_comment_like'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("comment_likes");
  },
};

