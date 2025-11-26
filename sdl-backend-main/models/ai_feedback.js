/**
 * AI Feedback Model (Phase 3)
 * 
 * 記錄學生對 AI 回應的評價，用於優化決策邏輯
 * 
 * 設計原則：
 * - 簡單：只記錄「有幫助」或「沒幫助」
 * - 可追溯：關聯到專案、想法牆、Agent 類型
 * - 未來擴充：可加入詳細回饋文字
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const AiFeedback = sequelize.define('ai_feedback', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'project_id'
    },
    ideaWallId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'idea_wall_id'
    },
    nodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'node_id',
        comment: '關聯的節點 ID'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
        comment: '提交 Feedback 的使用者 ID'
    },
    agentType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'agent_type',
        comment: 'AI Agent 類型: IMPROVER, SYNTHESIZER, DEVIL'
    },
    feedbackType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'feedback_type',
        comment: '回饋類型：helpful / not_helpful'
    },
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'session_id',
        comment: 'AI 回應的 session 識別碼'
    },
    additionalComment: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'additional_comment',
        comment: '額外文字回饋（未來擴充）'
    }
}, {
    tableName: 'ai_feedbacks',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['project_id'] },
        { fields: ['agent_type'] },
        { fields: ['feedback_type'] }
    ]
});

module.exports = AiFeedback;
