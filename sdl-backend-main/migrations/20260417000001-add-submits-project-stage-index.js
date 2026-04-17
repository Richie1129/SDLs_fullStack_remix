'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('submits', ['projectId', 'stage'], {
      name: 'submits_project_stage_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('submits', 'submits_project_stage_idx');
  },
};
