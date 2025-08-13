"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add userId column to submits, referencing users(id)
    await queryInterface.addColumn("submits", "userId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Optional: create index for faster lookups by user
    await queryInterface.addIndex("submits", ["userId"], {
      name: "idx_submits_userId",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("submits", "idx_submits_userId");
    await queryInterface.removeColumn("submits", "userId");
  },
};

