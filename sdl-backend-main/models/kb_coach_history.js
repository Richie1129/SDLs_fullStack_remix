/**
 * KB Coach History Model
 * 
 * 儲存所有 KB Coach 的互動記錄，讓使用者可以回顧過往的 AI 建議
 * 
 * 設計原則：
 * - 完整記錄：儲存 AI 的完整回應（思考過程、內容、建議行動）
 * - 可追溯：關聯到專案、節點、使用者
 * - 模型追蹤：記錄使用的 AI 模型（GPT-OSS/Gemma/Gemini）
 * - 支援回饋：可連結到 ai_feedback 表
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const KbCoachHistory = sequelize.define('kb_coach_history', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'project_id',
        comment: '專案 ID'
    },
    ideaWallId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'idea_wall_id',
        comment: '想法牆 ID'
    },
    nodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'node_id',
        comment: '被分析的節點 ID'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
        comment: '觸發 KB Coach 的使用者 ID'
    },
    agentType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'agent_type',
        comment: 'AI Agent 類型: IMPROVER, SYNTHESIZER, DEVIL'
    },
    modelUsed: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'model_used',
        comment: '實際使用的 AI 模型: GPT-OSS-20B, Gemma-3-27B, Gemini-2.5-Flash'
    },
    nodeTitle: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'node_title',
        comment: '節點標題（快取，避免 JOIN）'
    },
    nodeContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'node_content',
        comment: '節點內容（快取）'
    },
    thinkingProcess: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'thinking_process',
        comment: 'AI 的思考過程 (CoT)'
    },
    responseContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'response_content',
        comment: 'AI 的回應內容 (Markdown)'
    },
    suggestedActions: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'suggested_actions',
        comment: '建議的行動列表 (JSON array)'
    },
    contextCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'context_count',
        defaultValue: 0,
        comment: '提供的上下文節點數量'
    },
    responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'response_time_ms',
        comment: 'AI 回應時間（毫秒）'
    },
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'session_id',
        comment: '會話 ID（用於連結 feedback）'
    },
    helpSeekingIntent: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'help_seeking_intent',
        comment: '學生求助意圖：proactive_improve / proactive_judge / stuck / null（Orchestrator 觸發時為 null）'
    },
    triggerSource: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'manual',
        field: 'trigger_source',
        comment: '觸發來源：manual（學生手動）/ orchestrator（系統自動）'
    }
}, {
    tableName: 'kb_coach_histories',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['project_id'] },
        { fields: ['node_id'] },
        { fields: ['user_id'] },
        { fields: ['agent_type'] },
        { fields: ['created_at'] }
    ]
});

module.exports = KbCoachHistory;
