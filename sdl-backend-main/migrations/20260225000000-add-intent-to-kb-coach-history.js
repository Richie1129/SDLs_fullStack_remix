/**
 * Migration: Add help_seeking_intent and trigger_source to kb_coach_histories
 *
 * 背景：KB Coach 手動觸發是一種「主動策略型求助」，
 * 需要與 Orchestrator 自動介入區分，並追蹤學生的求助意圖。
 * 詳見 docs/reports/KB_COACH_HELP_SEEKING_ENHANCEMENT.md
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kb_coach_histories', 'help_seeking_intent', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: '學生的求助意圖：proactive_improve / proactive_judge / stuck / null（Orchestrator 觸發時為 null）'
    });

    await queryInterface.addColumn('kb_coach_histories', 'trigger_source', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'manual',
      comment: '觸發來源：manual（學生手動）/ orchestrator（系統自動）'
    });

    await queryInterface.addIndex('kb_coach_histories', ['trigger_source'], {
      name: 'idx_kb_coach_histories_trigger_source'
    });

    await queryInterface.addIndex('kb_coach_histories', ['help_seeking_intent'], {
      name: 'idx_kb_coach_histories_help_seeking_intent'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('kb_coach_histories', 'idx_kb_coach_histories_trigger_source');
    await queryInterface.removeIndex('kb_coach_histories', 'idx_kb_coach_histories_help_seeking_intent');
    await queryInterface.removeColumn('kb_coach_histories', 'help_seeking_intent');
    await queryInterface.removeColumn('kb_coach_histories', 'trigger_source');
  }
};
