"use strict";

/**
 * Migration: Add index for session-based queries on chat_turns
 *
 * Purpose:
 * - Optimize queries that filter by projectId and sessionId
 * - Support efficient session listing and retrieval
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("chat_turns", ["projectId", "session_id"], {
      name: "idx_chat_turns_project_session",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("chat_turns", "idx_chat_turns_project_session");
  },
};
