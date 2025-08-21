"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // enable pgcrypto for gen_random_uuid()
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    } catch (_) {}
    await queryInterface.createTable('audit_events', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()') },
      timestamp: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      actorId: { type: Sequelize.BIGINT, allowNull: true },
      actorRole: { type: Sequelize.TEXT, allowNull: true },
      action: { type: Sequelize.TEXT, allowNull: false },
      targetType: { type: Sequelize.TEXT, allowNull: false },
      targetId: { type: Sequelize.TEXT, allowNull: true },
      projectId: { type: Sequelize.BIGINT, allowNull: true },
      requestId: { type: Sequelize.TEXT, allowNull: true },
      ip: { type: Sequelize.STRING, allowNull: true },
      userAgent: { type: Sequelize.TEXT, allowNull: true },
      source: { type: Sequelize.TEXT, allowNull: false, defaultValue: 'server' },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('audit_events', ['action'], { name: 'audit_events_action_idx' });
    await queryInterface.addIndex('audit_events', ['actorId', 'timestamp'], { name: 'audit_events_actor_ts_idx' });
    await queryInterface.addIndex('audit_events', ['targetType', 'targetId', 'timestamp'], { name: 'audit_events_target_ts_idx' });
    await queryInterface.addIndex('audit_events', ['projectId', 'timestamp'], { name: 'audit_events_project_ts_idx' });
    try {
      await queryInterface.sequelize.query('CREATE INDEX audit_events_metadata_gin ON audit_events USING GIN ((metadata));');
    } catch (_) {}
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_events');
  }
};
