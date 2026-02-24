"use strict";

/**
 * Migration: Add thinking_content column to chat_turns table
 *
 * Purpose:
 * - Store AI's reasoning process before the final answer
 * - Support the new "Project Assistant" feature with thinking display
 *
 * Backward Compatibility:
 * - thinking_content is NULLABLE (old records will have NULL)
 * - Old "Learning Assistant" records remain valid
 * - New records may or may not have thinking content (depending on AI response)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chat_turns", "thinking_content", {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: "AI's reasoning process before the final answer (optional)",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("chat_turns", "thinking_content");
  },
};
