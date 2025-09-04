"use strict";

// Adds column `actorName` to `audit_events` if it doesn't exist.
// This is safe to run on databases that already have the column.

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const table = await queryInterface.describeTable('audit_events').catch(() => ({}));
      if (!table || !table.actorName) {
        await queryInterface.addColumn('audit_events', 'actorName', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '使用者名稱（username）',
        });
      }
    } catch (e) {
      // In case of concurrent/duplicate adds across environments, swallow if column now exists
      const msg = (e && e.message) || '';
      if (!/column .* already exists/i.test(msg)) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const table = await queryInterface.describeTable('audit_events').catch(() => ({}));
      if (table && table.actorName) {
        await queryInterface.removeColumn('audit_events', 'actorName');
      }
    } catch (e) {
      // If the column is already gone, ignore
      const msg = (e && e.message) || '';
      if (!/column .* does not exist/i.test(msg)) throw e;
    }
  },
};

