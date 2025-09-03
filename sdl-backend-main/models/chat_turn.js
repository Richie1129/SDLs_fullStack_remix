const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

// Chat turn: one row contains user input and assistant reply
const ChatTurn = sequelize.define('chat_turn', {
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
}, {
  tableName: 'chat_turns',
  timestamps: true,
});

module.exports = ChatTurn;
