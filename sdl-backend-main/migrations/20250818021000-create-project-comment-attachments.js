"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("project_comment_attachments", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "project_comments", key: "id" },
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

    // Optional: denorm snapshot of comment content for audit, to mirror comment_attachments
    await queryInterface.addColumn('project_comment_attachments', 'comment_content', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("project_comment_attachments");
  },
};

