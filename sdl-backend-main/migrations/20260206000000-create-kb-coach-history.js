/**
 * Migration: Create KB Coach History Table
 * 
 * 創建歷史記錄表，讓使用者可以回顧過往的 AI 建議
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kb_coach_histories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      project_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '專案 ID'
      },
      idea_wall_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '想法牆 ID'
      },
      node_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '被分析的節點 ID'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '觸發 KB Coach 的使用者 ID'
      },
      agent_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'AI Agent 類型: IMPROVER, SYNTHESIZER, DEVIL'
      },
      model_used: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '實際使用的 AI 模型'
      },
      node_title: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '節點標題（快取）'
      },
      node_content: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '節點內容（快取）'
      },
      thinking_process: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'AI 的思考過程'
      },
      response_content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AI 的回應內容'
      },
      suggested_actions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '建議的行動列表'
      },
      context_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: '提供的上下文節點數量'
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'AI 回應時間（毫秒）'
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '會話 ID'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 創建索引
    await queryInterface.addIndex('kb_coach_histories', ['project_id']);
    await queryInterface.addIndex('kb_coach_histories', ['node_id']);
    await queryInterface.addIndex('kb_coach_histories', ['user_id']);
    await queryInterface.addIndex('kb_coach_histories', ['agent_type']);
    await queryInterface.addIndex('kb_coach_histories', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kb_coach_histories');
  }
};
