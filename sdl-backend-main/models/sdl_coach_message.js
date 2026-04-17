const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

// SDL Coach 對話訊息：一列代表一輪（user 提問 + assistant 回覆）
// 原名 chat_turn，2026-04-17 rename 為 sdl_coach_message 以反映實際用途
// （見 migration 20260417000002-rename-chat-turns-to-sdl-coach-messages.js）
const SdlCoachMessage = sequelize.define('sdl_coach_message', {
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
    },
    projectName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    userContent: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    assistantContent: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    assistantUsername: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'AI 導師',
    },
    thinkingContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'thinking_content',
    },
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: 'default',
        field: 'session_id',
    },
}, {
    tableName: 'sdl_coach_messages',
    timestamps: true,
});

module.exports = SdlCoachMessage;
