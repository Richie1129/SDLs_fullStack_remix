"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add project_id column to rag_messages, nullable for backward compatibility
    await queryInterface.addColumn("rag_messages", "project_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "projects", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("rag_messages", "project_id");
  },
};

