'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const logger = require('../config/logger');

    try {
      await queryInterface.addColumn('help_seeking_logs', 'suggestions', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'AI-generated suggestions in JSON format',
        after: 'skippedThinking'
      });

      logger.info('✅ Added suggestions column to help_seeking_logs');
    } catch (error) {
      logger.error({ err: error }, '❌ Migration failed');
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('help_seeking_logs', 'suggestions');
  }
};
