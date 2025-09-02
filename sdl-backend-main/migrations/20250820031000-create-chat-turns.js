"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("chat_turns", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      username: { type: Sequelize.STRING, allowNull: true },
      userContent: { type: Sequelize.TEXT, allowNull: true },
      assistantContent: { type: Sequelize.TEXT, allowNull: true },
      assistantUsername: { type: Sequelize.STRING, allowNull: true, defaultValue: 'AI 導師' },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("chat_turns");
  },
};

