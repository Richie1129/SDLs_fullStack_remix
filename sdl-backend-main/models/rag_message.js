// model for rag_message.js
const { DataTypes } = require('sequelize');
const sequelize = require('../util/database');

const Rag_message = sequelize.define('Rag_message', {
    input_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    response_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    author: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    userName: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ragflow_session_id: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: 'rag_messages'
});

module.exports = Rag_message;
