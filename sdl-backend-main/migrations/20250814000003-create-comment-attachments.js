"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("comment_attachments", {
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
      fileName: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      originalName: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("comment_attachments");
  },
};

